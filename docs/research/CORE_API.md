# Core Research Engine API & Integration Guide

**Package:** `smellscope.core`  
**Author:** Member 1 — Research Core Engineer  
**Status:** Integration Ready (Phase 5)  
**Contract Version:** Shared Integration Contract v1.0

---

## 1. Quick Start & Developer Setup

### Prerequisites
- Python 3.11+ (verified fully compatible with 3.13)
- Required libraries: `numpy`, `pandas`, `scikit-learn`, `joblib`, `pyyaml`, `pytest`

### Running the Test Suite
From the repository root:
```bash
# Run all core tests
python -m pytest tests/core -v

# Run contract & integration readiness tests specifically
python -m pytest tests/core/test_contract.py tests/core/test_integration_readiness.py -v
```

---

## 2. Public API Specification

All functions can be imported directly from `smellscope.core`:
```python
from smellscope.core import (
    audit_class,
    get_cluster_assignments,
    fit_and_evaluate,
    fragility_grid,
    classify_features,
    make_planted_dataset,
    fit_preprocessor,
    compute_ugt,
    compute_wl,
    compute_hdf,
    compute_pdd_and_tc,
    compute_sfi,
    compute_ggi,
    SmellScopeError,
)
```

---

### 2.1 Primary Orchestration Interface: `audit_class`

```python
def audit_class(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    cfg: dict[str, Any],
    split: dict[str, Any],
) -> dict[str, Any]
```

- **Consumer:** Member 2 `smellscope.pipeline.orchestrator.run_audit`
- **Description:** Runs all 5 paper heuristics, baseline evaluation, null-calibrated SFI, and GGI for target attack class `cls` against `benign_label`.
- **Fault-Isolation Guarantee:** Individual metric failures never raise uncaught exceptions; they return `null` and record reasons in `na_reasons["<metric_path>"]`.
- **Allowed Exceptions:**
  - `E_SCHEMA`: Input `df` is not a DataFrame or missing required metadata.
  - `E_LABEL_COLUMN`: `label_col` not found in `df`.
  - `E_BENIGN_LABEL_MISSING`: `benign_label` not present in `df[label_col]`.
  - `E_CLASS_TOO_SMALL`: Target class `cls` missing or has $< 2$ rows.
  - `E_SPLIT_INVALID`: `split` dictionary missing `train_ids`, `val_ids`, or `test_ids`.
- **Return Type:** Dictionary adhering strictly to `ClassAuditResult` (Contract Section 2.6).

#### Usage Example for Member 2:
```python
from smellscope.core import audit_class

result = audit_class(
    df=loaded_dataset["df"],
    label_col=loaded_dataset["label_col"],
    cls="DoS-Attack",
    benign_label="BENIGN",
    cfg=merged_config,
    split=locked_split_manifest,
)

print("HDF Score:", result["paper"]["HDF"])
print("SFI Top Features:", result["sfi"]["top_features"])
print("Suspicion Flag:", result["sfi"]["flag"])
if result["na_reasons"]:
    print("Non-fatal metric warnings:", result["na_reasons"])
```

---

### 2.2 Remediation & Guard Interfaces

#### `get_cluster_assignments`
```python
def get_cluster_assignments(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    cfg: Optional[dict[str, Any]] = None,
    seed: int = 42,
) -> pd.Series
```
- **Consumer:** Member 2 `remediation.rsm.RSM` (Cluster-coverage guard)
- **Description:** Returns a `pd.Series` of integer cluster assignments for class flows using the identical KMeans model and elbow parameter $N$ as the PDD diagnostic. Indexed by `__row_id`.

#### `fit_and_evaluate`
```python
def fit_and_evaluate(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    label_col: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: Optional[dict[str, Any]] = None,
    seed: int = 42,
    target_class: Optional[str] = None,
) -> dict[str, Any]
```
- **Consumer:** Member 2 `remediation.rebenchmark`
- **Description:** Fits baseline RandomForest on `train_df` (train-only preprocessing) and evaluates against the locked `test_df`.
- **Target Class Argument:**
  - `target_class="DoS"`: Binary classification (attack vs. benign).
  - `target_class=None`: Multiclass classification across all labels.
- **Return Type:** `EvalResult` conforming to Contract Section 2.7.

---

### 2.3 Exploratory & Interactive Interfaces

#### `fragility_grid`
```python
def fragility_grid(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    features: list[str],
    cfg: Optional[dict[str, Any]],
    split: dict[str, Any],
) -> dict[str, Any]
```
- **Consumer:** Member 3 UI (2D Fragility Surface Plot)
- **Description:** Returns a $5 \times 5$ matrix of recall values over $\delta_1 \times \delta_2 \in [0.0, 0.05, 0.10, 0.20, 0.30]$ for two selected features. Point $(0, 0)$ equals baseline recall.

#### `classify_features`
```python
def classify_features(
    columns: list[str],
    schema_id: str,
    cfg: Optional[dict[str, Any]] = None,
) -> dict[str, str]
```
- **Description:** Maps feature column names to `'A'`, `'B'`, `'C'`, `'D'`, or `'UNMAPPED'`.

---

## 3. Integration Checklist for Member 2

1. **Pre-Filter Features:** `smellscope.core` automatically ignores any column beginning with `__` (e.g. `__row_id`). Member 2 does not need to remove `__row_id` before passing `df`.
2. **Column Roles:** Pass `column_roles.dst_port` in `cfg` if available, or name the column `Destination Port` / `dsport` / `dst_port` for automated resolution.
3. **Locked Split Requirement:** Ensure `split` dictionary contains `train_ids`, `val_ids`, and `test_ids` matching the row IDs in `df["__row_id"]`.
4. **Seed Consistency:** Pass `cfg["seed"]` to maintain bit-identical determinism across audit and re-benchmarking runs.

---

## 4. Known Limitations & Diagnostic Boundaries

1. **SFI is a Sensitivity Signal, Not Causal Proof:** A positive $\Delta\text{SFI}$ and high $z$-score confirm that the model's test recall relies heavily on the top-ranked features. It indicates high fragility to feature shifts, not definitive mathematical proof that the feature is illegitimate.
2. **Taxonomy Subjectivity:** Categorisations are pre-defined in `config/taxonomy_*.yaml`. Reviewers and users should adjust overrides in YAML if specific feature semantics differ in bespoke captures.
3. **Provenance vs. Cluster-Proxy GGI:** If no `group_col` is provided, GGI relies on KMeans cluster proxies. This tests intra-dataset multi-modal generalization rather than cross-capture physical sensor invariance.
