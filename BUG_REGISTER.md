# Comprehensive Bug Register & Defect Resolution Log

## 1. Defect Classification System
* **Severity Levels:**
  - `CRITICAL`: System crash, unhandled 500 error, data corruption, or workflow block.
  - `HIGH`: Incorrect mathematical calculations, wrong recommendations, or broken state persistence.
  - `MEDIUM`: UI presentation error, missing context explanation, or unhandled undefined values.
  - `LOW`: Cosmetic polish, label typo, or non-blocking layout overflow.

---

## 2. Resolved Defects Log

### BUG-001: Single-Class `E_SCHEMA` Block on BENIGN-only Datasets
* **Severity:** `CRITICAL`
* **Symptoms:** When uploading or selecting a single-class dataset (such as `monday.csv` from CIC-IDS-2017), validation threw `SmellScopeError: E_SCHEMA: Dataset must contain at least 2 distinct classes, found 1: {'BENIGN'}`. The frontend marked `valid: false` and displayed an amber error notice, blocking the user from proceeding to Preprocessing or Auditing.
* **Root Cause:** `smellscope/pipeline/loader.py` contained an unconditional assertion `if len(unique_labels) < 2: raise SmellScopeError(E_SCHEMA, ...)`. Furthermore, `smellscope/pipeline/split.py` called `train_test_split(..., stratify=labels)`, which raises a `ValueError` in scikit-learn when only 1 class is present.
* **Fix Applied:**
  1. Updated `load_dataset` with `allow_single_class: bool = True`. When `len(unique_labels) == 1`, set `is_single_class = True` and load normally.
  2. In `make_locked_split`, if `is_single_class`, split random indices into 60/20/20 without `stratify=labels`.
  3. In `validate_dataset` and `DatasetScreen.tsx`, set `valid: True`, display informative "SINGLE-CLASS BENCHMARK" notice, and enable "CONTINUE TO PREPROCESSING".
* **Verification:** `tests/test_dynamic_workflow.py` and Playwright `Journey E` passed.

### BUG-002: Hardcoded Feature Names in Recommendation Engine
* **Severity:** `HIGH`
* **Symptoms:** Datasets with dominant feature issues received recommendations mentioning hardcoded `"Init_Win_bytes_backward"`, even when that feature did not exist in the dataset.
* **Root Cause:** `smellscope/remediation/recommender.py` contained hardcoded fallback: `dominant_feature = roles.get("dst_port") or ("Init_Win_bytes_backward" if "Init_Win_bytes_backward" in feature_cols else feature_cols[0])`.
* **Fix Applied:** Refactored dominant feature discovery to dynamically extract the top feature from `class_info["paper"]["details"]["hdf_top_feature"]` or `class_info["hdf"]["dominant_feature"]`. Verified that candidate features exist in `working_df.columns` and are not already in `view.excluded_features`.
* **Verification:** `tests/test_dynamic_workflow.py` confirmed 0 hardcoded feature recommendations.

### BUG-003: Phantom Recommendations on Clean Control Datasets
* **Severity:** `HIGH`
* **Symptoms:** Clean synthetic datasets received spurious repair recommendations.
* **Root Cause:** Recommendation triggers lacked guards checking `affected_records > 0`, `dup_count > 0`, and `missing_by_col` emptiness.
* **Fix Applied:** Added strict pre-condition checks for every rule. If zero defects are detected, `generate_repair_recommendations` returns `[]`.
* **Verification:** `test_clean_control_dataset_produces_zero_recommendations` passed.

### BUG-004: Frontend `TypeError: Cannot read properties of undefined (reading 'toFixed')`
* **Severity:** `MEDIUM`
* **Symptoms:** In `FindingsScreen.tsx`, when `sfi_top` was undefined, numeric formatting threw a runtime error.
* **Root Cause:** `c.sfi.sfi_top !== null` evaluated `true` when `sfi_top` was `undefined`.
* **Fix Applied:** Wrapped numeric formatting in `typeof c.sfi?.sfi_top === "number" ? c.sfi.sfi_top.toFixed(3) : "N/A"`.
* **Verification:** Vitest and Playwright passed.

### BUG-005: Playwright Locator Strict Mode Violations
* **Severity:** `LOW`
* **Symptoms:** Playwright test failures due to strict mode violations resolving to multiple matching text nodes (e.g. `getByText('Recall (TPR)')` or `getByText(/SINGLE-CLASS DATASET DETECTED/i)`).
* **Root Cause:** Tables and badges both contained the exact search phrase.
* **Fix Applied:** Targeted locators with `.first()` to resolve to the intended primary badge or card element.
* **Verification:** All 5 Playwright journeys passed in 26.1s.
