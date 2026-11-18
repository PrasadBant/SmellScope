# SmellScope 2.1 — Comprehensive Quality & Test Report

Date: 2026-11-18  
Branch: `feature/project-simplification`  
Execution Status: **100% PASSED (0 FAILURES)**

---

## 1. Executive Summary

| Test Suite | Total Tests | Passed | Failed | Skipped | Execution Time |
|---|---|---|---|---|---|
| **Python Core Scientific (Pytest)** | 26 | 26 | 0 | 0 | ~8.5s |
| **Python Server & API (Pytest)** | 11 | 11 | 0 | 0 | ~31.9s |
| **Frontend Unit & Shell (Vitest)** | 10 | 10 | 0 | 0 | ~3.4s |
| **End-to-End Browser (Playwright)** | 2 | 2 | 0 | 0 | ~23.7s |
| **Standalone Research Demo** | 1 | 1 | 0 | 0 | ~9.7s |
| **TypeScript Compilation (`tsc --noEmit`)** | - | Clean | 0 errors | - | ~2.5s |
| **TOTAL** | **49** | **49** | **0** | **0** | **~79.7s** |

---

## 2. Python Backend & Research Engine Results

### Command
```bash
python -m pytest tests -v
```

### Detailed Breakdown
- `tests/core/test_audit.py`:
  - `test_audit_class_contract_conformance`: PASSED
  - `test_audit_class_fault_isolation`: PASSED
  - `test_audit_class_allowed_exceptions`: PASSED
  - `test_get_cluster_assignments_contract_and_determinism`: PASSED
- `tests/core/test_contract.py`:
  - `test_smellscope_error_codes`: PASSED
  - `test_public_core_signatures`: PASSED
  - `test_split_stub_conformance`: PASSED
- `tests/core/test_eval.py`:
  - `test_fit_and_evaluate_binary_and_multiclass`: PASSED
  - `test_seed_determinism`: PASSED
- `tests/core/test_ggi.py`:
  - `test_ggi_disjoint_subtypes`: PASSED
  - `test_ggi_insufficient_groups`: PASSED
- `tests/core/test_heuristics.py`:
  - `test_ugt_known_mix`: PASSED
  - `test_ugt_missing_port_column`: PASSED
  - `test_wl_clean_vs_noisy_fixture`: PASSED
  - `test_hdf_perfect_single_feature`: PASSED
  - `test_pdd_and_tc_identical_vectors`: PASSED
- `tests/core/test_integration_readiness.py`:
  - `test_integration_realistic_cic_raw_columns`: PASSED
  - `test_integration_all_public_functions_contract`: PASSED
- `tests/core/test_planted.py`:
  - `test_make_planted_dataset_recovery_and_labels`: PASSED
- `tests/core/test_preprocess.py`:
  - `test_train_only_fitting_no_leakage`: PASSED
  - `test_constant_and_nan_columns`: PASSED
- `tests/core/test_reproducibility.py`:
  - `test_identical_seed_identical_output`: PASSED
- `tests/core/test_sfi.py`:
  - `test_sfi_permutation_ranking_and_bounds`: PASSED
  - `test_suspicion_flag_truth_table_all_categories`: PASSED
  - `test_fragility_grid_dimensions_and_corner`: PASSED
- `tests/core/test_taxonomy.py`:
  - `test_classify_known_cic_and_unsw_columns`: PASSED
- `tests/server/test_api_boundary.py`:
  - `test_health_endpoint`: PASSED
  - `test_datasets_endpoints`: PASSED
  - `test_audit_execution_and_results_flow`: PASSED
  - `test_remediation_and_rsm_lifecycle`: PASSED
  - `test_report_generation_and_download`: PASSED
  - `test_production_frontend_serving`: PASSED
  - `test_spa_fallback_routing`: PASSED
  - `test_benchmarks_published_values`: PASSED
  - `test_custom_upload_and_pending_validation_flow`: PASSED
  - `test_rsm_security_enforcement`: PASSED
  - `test_security_path_traversal_prevention`: PASSED

---

## 3. Frontend Unit & Component Test Results

### Command
```bash
npm --prefix frontend run test -- --run
```

### Detailed Breakdown
- `src/test/components.test.tsx`:
  - `renders card with title and children`: PASSED
  - `renders buttons with different variants`: PASSED
  - `renders badges with appropriate styling`: PASSED
  - `renders metric card with formatted values`: PASSED
  - `renders empty state with action trigger`: PASSED
  - `renders workflow bar with active step`: PASSED
- `src/test/app.test.tsx`:
  - `renders brand title, subtitle, and scientific disclaimer`: PASSED
  - `renders 5 primary navigation destinations`: PASSED
  - `renders workflow stages bar`: PASSED
  - `toggles view mode between basic and advanced`: PASSED

---

## 4. Playwright End-to-End Test Results

### Command
```bash
cd frontend; npx playwright test
```

### Detailed Breakdown
- `[chromium] Complete 5-Stage Scientific Audit, Diagnostics, Remediation & Verification Workflow`: **PASSED (20.4s)**
  - Verified Home screen branding and scientific disclaimer.
  - Verified navigation to New Audit screen and benchmark schema inspection.
  - Verified audit execution with Random Forest training and Monte Carlo null calibration.
  - Verified transition to Findings screen and heuristic matrix rendering.
  - Verified EuroS&P 2024 literature comparison toggle.
  - Verified Shortcut Diagnostics tab, KPI cards, and Plotly interactive decay curve.
  - Verified Basic vs Advanced view mode toggle.
  - Verified Remediation screen with prominent OPTIONAL banner and What-If simulation.
  - Verified RSM authorization check.
  - Verified locked test-set verification on Reports screen and offline report button.
- `[chromium] Direct Audit-to-Report Workflow (Remediation is Optional)`: **PASSED (1.4s)**
  - Verified direct navigation from Home -> Audit -> Reports without forcing remediation.
