# SmellScope 2.1 — Complete User Workflow Test Report
## Empirical Verification of Guided Scientific Auditing & Dual Workflow Paths

**Report Date:** November 19, 2026  
**Test Suite:** Playwright E2E · Vitest Unit Suite · Pytest Scientific Core Suite · Standalone Demo CLI  
**Verdict:** 100% PASSED (All Verification Criteria Satisfied)  

---

## 1. Executive Summary

This report documents the verification of the complete 13-step guided workflow implemented across the 5 primary destinations in SmellScope 2.1:
- **Stage 01: Dataset** (`/dataset`) — Steps 1, 2, 3
- **Stage 02: Audit** (`/audit`) — Steps 4, 5, 6, 7
- **Stage 03: Findings** (`/findings`) — Step 8
- **Stage 04: Remediation (Optional)** (`/remediation`) — Steps 9, 10, 11
- **Stage 05: Verify & Report** (`/reports`) — Steps 12, 13

Both primary scientific paths were rigorously exercised in automated browser testing, API validation, and core algorithms:
- **Path A (No Remediation):** Direct path from baseline audit findings to final report certificate.
- **Path B (With Remediation):** Experimental path exercising preview generation, RSM guardrail authorization, view application, locked test rebenchmarking, and report certificate.

---

## 2. End-to-End Automated Browser Test Results (Playwright)

Executed using Playwright on headless Chromium against the live local FastAPI backend and React frontend:

```text
Running 2 tests using 1 worker

  ok 1 [chromium] › e2e\workstation.spec.ts:4:3 › SmellScope 2.1 Complete Guided Scientific Workflow E2E Verification › Path A — No Remediation: Complete 13-Step Guided Audit directly to Offline Report (3.6s)
  ok 2 [chromium] › e2e\workstation.spec.ts:122:3 › SmellScope 2.1 Complete Guided Scientific Workflow E2E Verification › Path B — With Remediation: Preview -> RSM -> Apply -> Rebenchmark -> Final Report (2.7s)

  2 passed (7.6s)
```

### Detailed Trace — Path A (No Remediation Flow)
1. **Home Screen (`/`)**: Brand header, subtitle, and scientific disclaimer ("SmellScope is a scientific benchmark dataset auditor, NOT an active intrusion detection system") rendered.
2. **Step 1 (Upload Your Dataset)**: Benchmark selector rendered; `cic2017_sample_planted` selected; SHA-256 fingerprint verified.
3. **Step 2 (Check Dataset Health)**: Ingestion validation executes 10 checks (File Readability, Column Names, Label Column, Benign Class, Feature Availability, Data Types, Missing Values, Infinite Values, Class Distribution, Sample Requirements); all pass.
4. **Step 3 (Prepare Your Dataset)**: Sealed 60/20/20 train/val/test boundaries displayed; retained rows verified.
5. **Step 4 (Check Dataset Design Smells)**: 5 heuristics evaluated (UGT, WL, HDF, PDD, TC); literature comparison toggle verified.
6. **Step 5 (Establish Baseline Performance)**: Random Forest baseline classifier metrics (F1, Accuracy, Recall, Specificity) rendered.
7. **Step 6 (Investigate Shortcut Sensitivity)**: SFI decay curve plotted with Plotly; Monte Carlo null calibration rendered.
8. **Step 7 (Test Model Generalisation)**: GGI calculation (Random vs Grouped split) verified.
9. **Step 8 (Your Dataset Audit Results)**: Findings workspace loaded; Basic vs Advanced toggle verified; user selects `[ Skip Remediation — Go to Final Report ]`.
10. **Step 12 (Verify the Impact - Baseline)**: Shows *"Original Benchmark Baseline Audit (No Remediation Applied)"* and verifies locked test partition integrity without displaying fake comparison metrics.
11. **Step 13 (Your SmellScope Audit Report)**: HTML report generation triggered and verified.

### Detailed Trace — Path B (With Remediation Flow)
1. **Step 8 (Findings Workspace)**: User clicks `[ Explore Remediation ]`.
2. **Step 9 (Explore Possible Improvements)**: Optional experimental notice displayed; R1 Feature Ablation preview requested.
3. **Step 10 (Check Remediation Safety)**: Remediation Safety Monitor (RSM) runs 6 checks; status `[PASS]` verified.
4. **Step 11 (Apply Approved Changes)**: `view_0001` generated with cryptographic parent hash; rollback ledger verified.
5. **Step 12 (Verify the Impact - Rebenchmark)**: Before vs After comparison evaluated on identical locked test partition (`same_test_ids=True`).
6. **Step 13 (Your SmellScope Audit Report)**: Offline audit certificate generated with remediation lineage.

---

## 3. Scientific Core Algorithm Verification (Pytest)

All 37 unit and integration tests covering the core scientific research engine passed:

```text
tests/core/test_audit.py::test_audit_class_contract_conformance PASSED   [  2%]
tests/core/test_audit.py::test_audit_class_fault_isolation PASSED        [  5%]
tests/core/test_audit.py::test_audit_class_allowed_exceptions PASSED     [  8%]
tests/core/test_audit.py::test_get_cluster_assignments_contract_and_determinism PASSED [ 10%]
tests/core/test_contract.py::test_smellscope_error_codes PASSED          [ 13%]
tests/core/test_contract.py::test_public_core_signatures PASSED          [ 16%]
tests/core/test_contract.py::test_split_stub_conformance PASSED          [ 18%]
tests/core/test_eval.py::test_fit_and_evaluate_binary_and_multiclass PASSED [ 21%]
tests/core/test_eval.py::test_seed_determinism PASSED                    [ 24%]
tests/core/test_ggi.py::test_ggi_disjoint_subtypes PASSED                [ 27%]
tests/core/test_ggi.py::test_ggi_insufficient_groups PASSED              [ 29%]
tests/core/test_heuristics.py::test_ugt_known_mix PASSED                 [ 32%]
tests/core/test_heuristics.py::test_ugt_missing_port_column PASSED       [ 35%]
tests/core/test_heuristics.py::test_wl_clean_vs_noisy_fixture PASSED     [ 37%]
tests/core/test_heuristics.py::test_hdf_perfect_single_feature PASSED    [ 40%]
tests/core/test_heuristics.py::test_pdd_and_tc_identical_vectors PASSED  [ 43%]
tests/core/test_integration_readiness.py::test_integration_realistic_cic_raw_columns PASSED [ 45%]
tests/core/test_integration_readiness.py::test_integration_all_public_functions_contract PASSED [ 48%]
tests/core/test_planted.py::test_make_planted_dataset_recovery_and_labels PASSED [ 51%]
tests/core/test_preprocess.py::test_train_only_fitting_no_leakage PASSED [ 54%]
tests/core/test_preprocess.py::test_constant_and_nan_columns PASSED      [ 56%]
tests/core/test_reproducibility.py::test_identical_seed_identical_output PASSED [ 59%]
tests/core/test_sfi.py::test_sfi_permutation_ranking_and_bounds PASSED   [ 62%]
tests/core/test_sfi.py::test_suspicion_flag_truth_table_all_categories PASSED [ 64%]
tests/core/test_sfi.py::test_fragility_grid_dimensions_and_corner PASSED [ 67%]
tests/core/test_taxonomy.py::test_classify_known_cic_and_unsw_columns PASSED [ 70%]
tests/server/test_api_boundary.py::test_health_endpoint PASSED           [ 72%]
tests/server/test_api_boundary.py::test_datasets_endpoints PASSED        [ 75%]
tests/server/test_api_boundary.py::test_audit_execution_and_results_flow PASSED [ 78%]
tests/server/test_api_boundary.py::test_remediation_and_rsm_lifecycle PASSED [ 81%]
tests/server/test_api_boundary.py::test_report_generation_and_download PASSED [ 83%]
tests/server/test_api_boundary.py::test_production_frontend_serving PASSED [ 86%]
tests/server/test_api_boundary.py::test_spa_fallback_routing PASSED      [ 89%]
tests/server/test_api_boundary.py::test_benchmarks_published_values PASSED [ 91%]
tests/server/test_api_boundary.py::test_custom_upload_and_pending_validation_flow PASSED [ 94%]
tests/server/test_api_boundary.py::test_rsm_security_enforcement PASSED  [ 97%]
tests/server/test_api_boundary.py::test_security_path_traversal_prevention PASSED [100%]

======================= 37 passed in 46.45s ========================
```

---

## 4. Frontend Unit Test Verification (Vitest)

All 10 frontend unit tests passed:

```text
 ✓ src/test/components.test.tsx (6 tests) 139ms
 ✓ src/test/app.test.tsx (4 tests) 278ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Duration  3.54s
```

---

## 5. Standalone Scientific Demonstration Script

The standalone CLI verification script (`examples/run_demo.py`) executed cleanly end-to-end:
- **Dataset Ingestion:** 360 rows loaded; SHA-256 fingerprint verified.
- **Audit Execution:** 5 heuristic metrics and null-calibrated SFI calculated in 9.26s.
- **Remediation & RSM:** R1 ablation proposed, RSM verdict `[PASS]`, `view_0001` applied.
- **Locked Rebenchmark:** Test set identity preserved (`same_test_ids=True`).
- **Rollback:** `view_0000` restored with bit-exact hash verification.
- **HTML Certificate Export:** Exported `reports/demo_audit_certificate.html` (11,963 bytes).
