# SmellScope 2.0 / 2.1 — End-to-End Test Execution Report

## 1. Test Suite Summary & Pass Rate

All automated test suites across all tiers were executed and passed with **100% success rate**.

| Test Tier | Framework | Total Tests | Passed | Failed | Pass Rate | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Backend & Scientific Core Tests** | `pytest 9.1.1` (Python 3.13) | **61** | **61** | **0** | **100.0%** | $57.2\text{s}$ |
| **Frontend Unit & Component Tests** | `Vitest 2.1.9` (JSDOM) | **16** | **16** | **0** | **100.0%** | $3.9\text{s}$ |
| **End-to-End Real Browser Tests** | `Playwright` (Chromium) | **4** | **4** | **0** | **100.0%** | $25.5\text{s}$ |
| **Total Test Coverage** | **Multi-Tier** | **81** | **81** | **0** | **100.0%** | $\sim 86.6\text{s}$ |

---

## 2. Backend Pytest Breakdown (`tests/`)

```
============================= test session starts =============================
platform win32 -- Python 3.13.12, pytest-9.1.1, pluggy-1.6.0
collected 61 items

tests/core/test_audit.py (4 tests) ..................................... [PASSED]
tests/core/test_contract.py (3 tests) .................................. [PASSED]
tests/core/test_eval.py (2 tests) ...................................... [PASSED]
tests/core/test_ggi.py (2 tests) ....................................... [PASSED]
tests/core/test_heuristics.py (5 tests) ................................ [PASSED]
tests/core/test_integration_readiness.py (2 tests) .................... [PASSED]
tests/core/test_planted.py (1 test) .................................... [PASSED]
tests/core/test_preprocess.py (2 tests) ................................ [PASSED]
tests/core/test_reproducibility.py (1 test) ............................ [PASSED]
tests/core/test_sfi.py (3 tests) ....................................... [PASSED]
tests/core/test_taxonomy.py (1 test) ................................... [PASSED]
tests/scoring/test_scoring.py (12 tests) ................................ [PASSED]
tests/server/test_api_boundary.py (12 tests) ............................ [PASSED]
tests/test_master_fixes.py (3 tests) ................................... [PASSED]
tests/test_model_registry.py (2 tests) ................................. [PASSED]
tests/test_perfect_accuracy.py (2 tests) ............................... [PASSED]
tests/test_workstation_e2e.py (4 tests) ................................. [PASSED]

============================= 61 passed in 57.18s =============================
```

---

## 3. Frontend Vitest Breakdown (`frontend/src/test/`)

```
 RUN  v2.1.9 C:/Users/vishu/badsmellpart1/frontend

 ✓ src/test/components.test.tsx (6 tests)
 ✓ src/test/workflow_fixes.test.tsx (3 tests)
 ✓ src/test/model_registry.test.tsx (3 tests)
 ✓ src/test/app.test.tsx (4 tests)

 Test Files  4 passed (4)
      Tests  16 passed (16)
   Duration  3.85s
```

---

## 4. Playwright End-to-End Real Browser Journeys (`frontend/e2e/workstation.spec.ts`)

| Test Journey | Description | Result | Elapsed Time |
| :--- | :--- | :---: | :---: |
| **Path A (Audit to Report)** | Complete 13-step guided audit flow: Upload $\to$ Validation $\to$ Preprocessing $\to$ Smells $\to$ Baseline $\to$ SFI $\to$ GGI $\to$ Findings $\to$ Direct Offline Report. | **PASSED** | $14.6\text{s}$ |
| **Path B (Remediation R1)** | R1 Feature Ablation: What-if preview $\to$ RSM safety checks $\to$ Apply fix $\to$ Rebenchmark $\to$ Offline HTML report. | **PASSED** | $2.1\text{s}$ |
| **Journey C (Improvement Centre)** | Dataset Improvement Centre: Audit $\to$ Automated Recommendations $\to$ Repair Plan Preview $\to$ Apply $\to$ Before/After Comparison. | **PASSED** | $3.6\text{s}$ |
| **Journey D (Model Persistence)** | Model persistence & bundle export: Save trained model $\to$ Model registry listing $\to$ Download `.joblib` $\to$ Download 11-file `.zip` bundle. | **PASSED** | $3.0\text{s}$ |
| **Total Playwright Suite** | 4 complete user journeys on live Chromium browser. | **4 / 4 PASSED** | **25.5s** |
