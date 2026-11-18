# SmellScope 2.0 — Backend Test Report

**Execution Date:** November 19, 2026  
**Test Suite:** Pytest 9.1.1, Python 3.13.12 (win32)  
**Total Tests:** 38  
**Passed:** 38 (100%)  
**Failed:** 0  
**Execution Duration:** 50.50s  

---

## 1. Test Suite Summary by Module

| Module | Tests | Result | Duration | Scope |
|---|---|---|---|---|
| `tests/core/test_audit.py` | 3 | PASSED | 4.2s | Audit runner, contract conformance, heuristic execution |
| `tests/core/test_integration_readiness.py` | 5 | PASSED | 1.1s | Public API signatures, Shared Contract v1.0 compliance |
| `tests/core/test_planted.py` | 2 | PASSED | 0.8s | Planted shortcut dataset generation and recovery |
| `tests/core/test_preprocess.py` | 4 | PASSED | 1.4s | Train-only fitting, data leakage prevention, imputation |
| `tests/core/test_reproducibility.py` | 2 | PASSED | 3.2s | Deterministic seed repeatability |
| `tests/core/test_sfi.py` | 6 | PASSED | 8.5s | Monte Carlo null calibration, permutation bounds, fragility grids |
| `tests/core/test_taxonomy.py` | 4 | PASSED | 0.5s | Feature taxonomy classification for CIC and UNSW schemas |
| `tests/server/test_api_boundary.py` | 12 | PASSED | 30.8s | FastAPI HTTP boundary, RSM security, Improvement Centre endpoints |

---

## 2. Detailed Improvement Centre Test Verification

### `test_improvement_centre_workflow`
- **Dataset:** `cic2017_sample_planted`
- **Step 1 (Start Audit):** Returns `202 Accepted` with valid `run_id`.
- **Step 2 (Get Recommendations):** Returns structured recommendations across categories (`DATA_QUALITY`, `SHORTCUT_FRAGILITY`).
- **Step 3 (Preview Repair Plan):** Generates composite preview with `preview_id`, `rsm_report` (`PASS`), and `data_quality_delta`.
- **Step 4 (Apply Repair Plan):** Executes repair, updates view lineage (`view_0001`), and writes versioned CSV to `data/repaired/` with valid SHA-256.
- **Step 5 (Get Comparison):** Verifies locked test integrity (`same_test_ids=True`), returns side-by-side data quality metrics and locked ML benchmark deltas.
- **Step 6 (Download Corrected Dataset):** Streams CSV file with verified `X-SHA256` and `X-View-ID` headers.

---

## 3. Scientific Integrity Guarantees

- **Test Set Records:** Untouched across all repair operations (`same_test_ids=True`).
- **Cryptographic Lineage:** Every training view state has deterministic SHA-256 fingerprinting.
- **RSM Security:** Unauthorized modifications (e.g. unacknowledged warnings or G1–G5 blocks) are rejected at the HTTP boundary with status 400/403.
