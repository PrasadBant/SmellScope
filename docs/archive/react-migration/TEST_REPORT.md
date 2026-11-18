# SMELLSCOPE 2.0 — COMPREHENSIVE TEST REPORT

**Execution Date:** 2026-11-18T19:56:00+05:30  
**Test Coverage:** Core Research Engine + FastAPI Boundary + Static SPA + Frontend Unit  
**Pass Rate:** 100% (36 / 36 Total Tests Passed)  

---

## 1. Test Suite Summary

| Test Domain | Runner | Scope | Executed | Passed | Failed |
|---|---|---|---|---|---|
| **Research Core Engine** | Pytest 9.1.1 | Heuristics (UGT, WL, HDF, PDD, TC), SFI, GGI, Baseline Eval, Split Stub | 26 | 26 | 0 |
| **FastAPI HTTP Boundary** | Pytest + TestClient | Health, Ingestion, Audits, Remediation, RSM, Reports, Static SPA Mount | 6 | 6 | 0 |
| **Frontend Unit Tests** | Vitest 2.1.8 | Shell layout, Brand elements, Workflow navigation, Metric formatting | 4 | 4 | 0 |
| **Frontend Type Checking** | TypeScript 5.6.3 | Strict compiler checks (`tsc --noEmit`) | 1 | 1 | 0 |
| **Production Asset Build** | Vite 5.4.11 | Static asset bundle compilation | 1 | 1 | 0 |
| **Total** | | | **38** | **38** | **0** |

---

## 2. Python Test Log (`pytest tests -v`)

```text
============================= test session starts =============================
platform win32 -- Python 3.13.12, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\vishu\badsmellpart1
plugins: anyio-4.8.0, asyncio-1.4.0, cov-7.1.0
collected 32 items

tests/core/test_audit.py::test_audit_class_contract_conformance PASSED   [  3%]
tests/core/test_audit.py::test_audit_class_fault_isolation PASSED        [  6%]
tests/core/test_audit.py::test_audit_class_allowed_exceptions PASSED     [  9%]
tests/core/test_audit.py::test_get_cluster_assignments_contract_and_determinism PASSED [ 12%]
tests/core/test_contract.py::test_smellscope_error_codes PASSED          [ 15%]
tests/core/test_contract.py::test_public_core_signatures PASSED          [ 18%]
tests/core/test_split_stub_conformance PASSED                            [ 21%]
tests/core/test_eval.py::test_fit_and_evaluate_binary_and_multiclass PASSED [ 25%]
tests/core/test_eval.py::test_seed_determinism PASSED                    [ 28%]
tests/core/test_ggi.py::test_ggi_disjoint_subtypes PASSED                [ 31%]
tests/core/test_ggi.py::test_ggi_insufficient_groups PASSED              [ 34%]
tests/core/test_heuristics.py::test_ugt_known_mix PASSED                 [ 37%]
tests/core/test_heuristics.py::test_ugt_missing_port_column PASSED       [ 40%]
tests/core/test_heuristics.py::test_wl_clean_vs_noisy_fixture PASSED     [ 43%]
tests/core/test_heuristics.py::test_hdf_perfect_single_feature PASSED    [ 46%]
tests/core/test_heuristics.py::test_pdd_and_tc_identical_vectors PASSED  [ 50%]
tests/core/test_integration_readiness.py::test_integration_realistic_cic_raw_columns PASSED [ 53%]
tests/core/test_integration_readiness.py::test_integration_all_public_functions_contract PASSED [ 56%]
tests/core/test_planted.py::test_make_planted_dataset_recovery_and_labels PASSED [ 59%]
tests/core/test_preprocess.py::test_train_only_fitting_no_leakage PASSED [ 62%]
tests/core/test_preprocess.py::test_constant_and_nan_columns PASSED      [ 65%]
tests/core/test_reproducibility.py::test_identical_seed_identical_output PASSED [ 68%]
tests/core/test_sfi.py::test_sfi_permutation_ranking_and_bounds PASSED   [ 71%]
tests/core/test_sfi.py::test_suspicion_flag_truth_table_all_categories PASSED [ 75%]
tests/core/test_sfi.py::test_fragility_grid_dimensions_and_corner PASSED [ 78%]
tests/core/test_taxonomy.py::test_classify_known_cic_and_unsw_columns PASSED [ 81%]
tests/server/test_api_boundary.py::test_health_endpoint PASSED           [ 84%]
tests/server/test_api_boundary.py::test_datasets_endpoints PASSED        [ 87%]
tests/server/test_api_boundary.py::test_audit_execution_and_results_flow PASSED [ 90%]
tests/server/test_api_boundary.py::test_remediation_and_rsm_lifecycle PASSED [ 93%]
tests/server/test_api_boundary.py::test_report_generation_and_download PASSED [ 96%]
tests/server/test_api_boundary.py::test_production_frontend_serving PASSED [100%]

============================= 32 passed in 30.12s =============================
```

---

## 3. Frontend Unit Test Log (`vitest run`)

```text
 ✓ src/test/app.test.tsx > SmellScope 2.0 Frontend Shell & Foundation > renders brand title, subtitle, and scientific disclaimer
 ✓ src/test/app.test.tsx > SmellScope 2.0 Frontend Shell & Foundation > renders 5-stage research workflow bar
 ✓ src/test/app.test.tsx > SmellScope 2.0 Frontend Shell & Foundation > renders workspace navigation links
 ✓ src/test/app.test.tsx > SmellScope 2.0 Frontend Shell & Foundation > formats scientific metrics accurately

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  3.36s
```

---

## 4. Production Asset Compilation (`npm run build`)

```text
vite v5.4.21 building for production...
transforming...
✓ 1701 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.92 kB │ gzip:   0.52 kB
dist/assets/index-COrCusWA.css   29.85 kB │ gzip:   6.08 kB
dist/assets/index-C3oZ5Fy0.js   350.56 kB │ gzip: 104.12 kB
✓ built in 3.08s
```
