# Dynamic Intelligent Recommendation Engine — Specification & Evidence Rules

## 1. Engine Objective

The SmellScope 2.0 Intelligent Recommendation Engine translates raw statistical findings, data quality defects, and shortcut fragility metrics into actionable, scientifically verified correction plans.

Every recommendation conforms to the following schema:
* `id: str` (Deterministic unique recommendation identifier)
* `category: "DATA_QUALITY" | "DATASET_DESIGN" | "SHORTCUT_FRAGILITY"`
* `problem_name: str` (Human-readable problem title)
* `severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"`
* `detected: str` (Quantified empirical detection description)
* `why_it_matters: str` (Scientific justification for remediation)
* `affected_columns: List[str]` (Specific columns requiring intervention)
* `affected_records: int` (Actual row count impacted in training split)
* `evidence: str` (Mathematical and statistical evidence backing the finding)
* `suggested_correction: str` (Recommended scientific intervention)
* `action_type: str` (Executable transformation identifier)
* `action_params: Dict[str, Any]` (Structured parameters for the transformation engine)
* `expected_benefit: str` (Expected change in dataset or model robustness)
* `potential_risk: str` (Scientific tradeoffs of applying the fix)
* `is_reversible: bool` (Always True under SmellScope versioned training views)
* `rsm_tier: "PASS" | "WARN" | "BLOCK"` (Preliminary Safety Gate rating)

---

## 2. Category Rules & Trigger Conditions

### Category A — Data Quality Defects

#### 1. Missing Feature Values (NaN / Null)
* **Pre-condition:** `working_df[col].isna().sum() > 0` for at least one feature column not excluded in view.
* **Action:** `IMPUTE_NUMERIC` (`{"strategy": "median"}`)
* **RSM Safety Tier:** `PASS`
* **Guarantee:** Imputes using training split medians only. Locked test set is never seen during fit.

#### 2. Infinite Values (IEEE 754 Inf / -Inf)
* **Pre-condition:** `np.isinf(working_df[col]).sum() > 0` for numeric feature columns.
* **Action:** `CLEAN_INFINITE` (`{"method": "percentile_cap", "percentile": 99.9}`)
* **RSM Safety Tier:** `PASS`
* **Guarantee:** Guarantees finite values required for matrix decompositions and gradient descent.

#### 3. Duplicate Records
* **Pre-condition:** `working_df[feature_cols].duplicated().sum() > 0`
* **Action:** `DEDUPLICATE_TRAIN` (`{"keep": "first"}`)
* **RSM Safety Tier:** `PASS`
* **Guarantee:** Removes redundancy from training partition while leaving locked test set completely untouched.

#### 4. Constant Features (Zero Variance)
* **Pre-condition:** `working_df[col].nunique() <= 1` for numeric feature columns.
* **Action:** `DROP_CONSTANT_FEATURES` (`{"features": constant_cols}`)
* **RSM Safety Tier:** `PASS`
* **Guarantee:** Eliminates non-informative columns without entropy loss.

---

### Category B — Dataset Design Problems

#### 5. Severe Class Imbalance
* **Pre-condition:** Dataset contains $> 1$ class, AND `majority_count / minority_count > 8.0`.
* **Single-Class Invariance:** If dataset is single-class (e.g. `monday.csv`), this check is skipped.
* **Action:** `STRATIFIED_RESAMPLE_TRAIN` (`{"target_ratio": min(imbalance_ratio, 5.0)}`)
* **RSM Safety Tier:** `PASS`

---

### Category C — Shortcut & Fragility Problems

#### 6. SFI Flagged Shortcut Reliance (Highest Priority)
* **Pre-condition:**
  - `sfi_info.get("flag") == True` OR `sfi_info.get("excess_fragility", 0.0) > 0.15`
  - $z$-score $\ge 2.0$ relative to Monte Carlo null reference distribution ($N=100$ draws)
  - `top_feature` is present in `feature_cols` and NOT in `view.excluded_features`
* **Action:** `FEATURE_ABLATION` (`{"features": [top_feature]}`)
* **RSM Safety Tier:** `PASS`

#### 7. HDF: Extreme Single-Feature Dominance
* **Pre-condition:**
  - `heuristics.get("HDF") >= 0.60`
  - Dominant feature dynamically identified from decision tree details or correlation
  - Dominant feature is present in `feature_cols` and NOT in `view.excluded_features`
* **Action:** `FEATURE_ABLATION` (`{"features": [dominant_feature]}`)
* **RSM Safety Tier:** `WARN` (if feature removal may cause significant baseline accuracy drop)

#### 8. UGT: Ephemeral Port Mappings
* **Pre-condition:**
  - `heuristics.get("UGT") >= 0.10`
  - Port column detected in schema and feature list
  - `affected_records = ((working_df[port_col] > 49151) & (working_df[label_col] == cls_name)).sum() > 0`
* **Action:** `FLOW_QUARANTINE` (`{"rule": "quarantine_ephemeral_ports", "classes": [cls_name]}`)
* **RSM Safety Tier:** `PASS` (protected by RSM G2 class floor)

#### 9. WL: Packet Length Repetition
* **Pre-condition:**
  - `heuristics.get("WL") >= 0.30`
  - Packet length / size columns detected in feature list
* **Action:** `FEATURE_ABLATION` (`{"features": pkt_cols[:2]}`)
* **RSM Safety Tier:** `PASS`

---

## 3. Clean Dataset Handling

When no defects or shortcut vulnerabilities are present:
1. `generate_repair_recommendations()` returns `[]`.
2. The Dataset Improvement Centre UI displays:
   - Green Shield Checkmark
   - Title: **"No Actionable Improvements Identified"**
   - Description: *"No actionable improvements were identified from the current audit evidence. The dataset exhibits good quality and low shortcut reliance across evaluated dimensions."*
3. No fake, phantom, or default recommendations are ever generated.
