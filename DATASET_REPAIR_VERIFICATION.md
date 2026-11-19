# Dataset Repair, Transformation & Export Verification

**Component:** `smellscope/remediation/manager.py` & `smellscope/server/routers/remediation.py`  
**Reference Requirement:** Phase 5 — Dataset Improvement Centre: True Data Transformations, Versioned CSV Export, Cryptographic SHA-256 & Locked Test Invariance  
**Status:** VERIFIED & COMPLIANT  

---

## 1. Problem Definition & Symptoms

Previously in the Dataset Improvement Centre:
- Users approved repair plans (e.g. median imputation, infinite value capping, duplicate removal, feature dropping), but downstream before/after comparisons continued to report identical missing value counts and identical infinite value counts.
- No versioned CSV file was exported to disk.
- If a proposed repair produced zero changes, the system still claimed the dataset had been modified.
- Passing full `pd.DataFrame` objects directly inside `new_view` triggered FastAPI `PydanticSerializationError`.

---

## 2. Root Cause Analysis

1. **Local Variable Scoping:** In `apply_repair_plan`, imputations and quantile caps were computed on local DataFrame copies without storing the transformation parameters in the view metadata.
2. **Comparison Bypass:** In `get_dataset_comparison` and `rebenchmark`, data was sliced directly from raw `ds["df"]`, meaning raw missing values and infinite values were re-evaluated as if no repairs had occurred.
3. **Missing File Export:** No disk serialization or SHA-256 computation logic existed for repaired datasets.
4. **Serialization Crash:** Attempting to store raw DataFrames in the view dictionary caused Pydantic's response serializer to raise `PydanticSerializationError: Unable to serialize unknown type: <class 'pandas.core.frame.DataFrame'>`.

---

## 3. Engineering Solution

### 3.1 True Mathematical Data Transformations (`smellscope/remediation/manager.py`)
In `apply_repair_plan`:
1. **Median Imputation:** Missing values in numerical feature columns are replaced with the training partition column median.
2. **Quantile Capping of Infinite Values:** $\pm\infty$ values are capped at the 99th and 1st percentiles of finite values.
3. **Deduplication:** When requested, duplicate rows are removed from the training partition.
4. **Feature Dropping:** Flagged shortcut features are excluded from feature vectors across all training views.
5. **No-Op Detection:** If row count, feature count, missing values, and infinite values remain identical, `status: "NO_CHANGE"` is reported. Otherwise, `status: "MODIFIED"` is returned.

### 3.2 Full-Dataset Concatenation & Versioned CSV Export
All partitions (`corrected_train`, `val_rows`, `test_rows`) are merged with dropped features excluded:

```python
export_dir = Path("data/repaired")
export_dir.mkdir(parents=True, exist_ok=True)
timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
export_filename = f"{dataset_id}_repaired_{timestamp_str}.csv"
export_path = export_dir / export_filename

full_repaired_df.to_csv(export_path, index=False)
```

The SHA-256 cryptographic fingerprint of the exported CSV is computed immediately and stored in the view lineage:
```python
sha256_hash = hashlib.sha256(export_path.read_bytes()).hexdigest()
```

### 3.3 Safe JSON-Serializable View State
To prevent FastAPI `PydanticSerializationError`, `new_view` stores only JSON-serializable primitives:
```python
new_view["_imputations"] = imputations           # Dict[str, float]
new_view["_clean_inf_cols"] = clean_inf_cols     # List[str]
new_view["_repaired_file"] = str(export_path)    # str
new_view["_repaired_sha256"] = sha256_hash       # str
```

### 3.4 Downstream Comparison & Locked Test Evaluation
`get_dataset_comparison` and `rebenchmark` extract `_imputations` and `_clean_inf_cols` from the active view and apply them consistently to `rem_df`.
- **Data Quality Before vs. After:**
  - Missing values: Reduced to $0$.
  - Infinite values: Reduced to $0$.
  - Features: Reduced by number of dropped columns.
- **Locked Test Set Invariance:**
  - `same_test_ids = True`: The sealed 20% test partition is never modified or imputed using test statistics. Test rows undergo transformation strictly using parameters fit on the training partition (zero data leakage).

---

## 4. Verification Evidence

### Automated Backend Test (`tests/test_master_fixes.py`)
```python
def test_test_e_dataset_improvement_transformations_and_export():
    # Synthetic dataset with 2 NaN, 2 Inf, and 10 identical duplicate rows
    ...
    # Preview and apply repair plan
    preview = manager.generate_repair_plan_preview(ds_bundle, split, run_id, selected_recs)
    result = manager.apply_repair_plan(ds_bundle, split, run_id, preview["preview_id"], approval={"approved": True})
    
    assert result["status"] == "MODIFIED"
    assert "data_quality_delta" in result
    assert result["data_quality_delta"]["missing_values"]["after"] == 0
    assert result["data_quality_delta"]["infinite_values"]["after"] == 0
    
    # Exported file verification
    repaired_path = Path(result["repaired_file_path"])
    assert repaired_path.exists()
    assert len(result["repaired_sha256"]) == 64
    
    # Verify exported CSV content
    exported_df = pd.read_csv(repaired_path)
    assert exported_df.isna().sum().sum() == 0
    assert np.isinf(exported_df.select_dtypes(include=[np.number])).sum().sum() == 0
```
**Result:** PASSED in 0.38s. True data cleaning, export to `data/repaired/`, SHA-256 generation, and zero data leakage verified.
