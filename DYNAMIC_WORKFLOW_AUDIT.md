# SmellScope 2.0 — Dynamic Workflow Audit & Architectural Traceability

## 1. Executive Summary & Purpose

SmellScope 2.0 is a local-first scientific workstation designed for auditing Network Intrusion Detection System (NIDS) benchmark datasets. Unlike live intrusion detection systems, SmellScope evaluates the structural and statistical integrity of datasets to determine whether machine-learning classifiers are learning genuine attack invariants or exploiting non-generalizable testbed artifacts (dataset smells).

This document audits the **fully dynamic, dataset-aware architecture** of SmellScope 2.0, establishing that every workflow stage—from ingestion, health check, preprocessing, and auditing, through to intelligent repair recommendations, comparison, and export—adapts deterministically to the actual dataset uploaded by the researcher.

---

## 2. Core Workflow Stages & Dynamic Routing

```
[ Upload Dataset (CSV/Parquet) ]
               │
               ▼
[ Authoritative DatasetProfile Computation (26 Dimensions) ]
               │
               ├─────────────────────────────────────────────┐
               ▼                                             ▼
   { Single-Class: BENIGN-only }                { Binary / Multi-Class Attack }
               │                                             │
               ▼                                             ▼
 [ Step 2: Health Check ]                      [ Step 2: Health Check ]
  - Data Quality: AVAILABLE                     - Data Quality: AVAILABLE
  - Supervised ML: NOT_APPLICABLE               - Supervised ML: AVAILABLE
  - Attack Smells: NOT_APPLICABLE               - Attack Smells: AVAILABLE
               │                                             │
               ▼                                             ▼
 [ Step 3: Preprocessing & Split ]             [ Step 3: Preprocessing & Split ]
  - Non-stratified 60/20/20 split               - Stratified 60/20/20 split
               │                                             │
               ▼                                             ▼
 [ Step 4-7: Scientific Audit ]                [ Step 4-7: Scientific Audit ]
  - Profile Missing/Inf/Dups/Constants          - 5 Smells (UGT, WL, HDF, PDD, TC)
  - Compute S_DQ (Data Quality Score)           - Baseline ML (Train/Val/Locked Test)
  - Record NOT_APPLICABLE with reasons          - 100% Accuracy Diagnostic (Cases A-E)
                                                - SFI Monte Carlo Null Calibration
                                                - GGI Subtype Generalization Gap
               │                                             │
               ├─────────────────────────────────────────────┘
               ▼
 [ Step 8: Execution Logs & Traceability (/audits/{id}/logs) ]
               │
               ▼
 [ Scientific Scoring Synthesis (S_DQ, S_SUIT, S_REL, S_SHORT) ]
               │
               ▼
 [ Dynamic Intelligent Recommendations Engine ]
  - DATA_QUALITY: Missing, Infinite, Duplicates, Constants (if present)
  - DATASET_DESIGN: Rebalancing (if multi-class & imbalance > 8:1)
  - SHORTCUT_FRAGILITY: SFI, HDF, UGT, WL (derived from data, no hardcoding)
  - Clean Datasets: Return [] ("No actionable improvements identified")
               │
               ▼
 [ Versioned Training View & Safety Verification (RSM G1-G4) ]
               │
               ▼
 [ Original vs. Corrected Comparison Workstation ]
  - Identical Locked Test Set Retention Guarantee
               │
               ▼
 [ Model Persistence & Reproducible .zip Training Bundle ]
```

---

## 3. Dataset Topology Scenarios & Dynamic Adaptation

### Scenario A — Single-Class / BENIGN-only Datasets (e.g. CIC-IDS-2017 `monday.csv`)
* **Behavior:** Monday in CIC-IDS-2017 contains 371,624 flows labeled exclusively `BENIGN` with 0 attack flows.
* **Ingestion & Loader:** `load_dataset()` detects `len(unique_classes) == 1`, sets `is_single_class = True`, and does **not** raise an `E_SCHEMA` error.
* **Partition Split:** `make_locked_split()` recognizes single-class structure and performs a non-stratified random permutation split (60/20/20) avoiding sklearn stratification exceptions.
* **Capability Matrix:** Data quality diagnostics (`missing_values`, `infinite_values`, `duplicate_rows`, `constant_features`, `distribution_profiling`) are marked `AVAILABLE`. Supervised classification, SFI, GGI, and the 5 attack smells are marked `NOT_APPLICABLE` with explicit explanation: *"Single-class dataset has no attack traffic to contrast with benign baseline."*
* **Scoring:** Computes high Data Quality score ($S_{\text{DQ}}$), sets Shortcut Risk to 0.0 (no shortcut vulnerability detected), and reports honest $S_{\text{SUIT}}$ indicating baseline-only capture.
* **Recommendations:** Recommends only empirical data cleaning if technical defects exist. Generates **zero** attack-specific recommendations (e.g. never recommends port ablation or rebalancing).

### Scenario B — Binary Benchmark (e.g. `cic2017_sample_planted`: BENIGN + PortScan)
* **Behavior:** Pre-configured benchmark containing 360 rows with a 95% planted port shortcut on PortScan.
* **Audit Execution:** Automatically detects 2 classes, trains baseline Random Forest, executes Monte Carlo null-calibration (N=100 draws), and evaluates UGT, WL, HDF, PDD, and TC.
* **Diagnostics:** Detects $HDF = 0.85$, $SFI_{\text{excess}} = 0.42$ ($z = 3.65$), triggering Case B/C in 100% Accuracy Investigation.
* **Recommendations:** Dynamically identifies `Destination Port` from empirical SFI/HDF findings, recommends R1 Feature Ablation, and gates preview through RSM.

### Scenario C — Multi-Class Attack Datasets (e.g. `friday.csv` or `smellscope_nids_synthetic_test.csv`)
* **Behavior:** Discovers all unique attack classes from the label column dynamically (e.g. PortScan, DDoS, Botnet, Infiltration).
* **Audit Execution:** Dispatches independent multi-class audit jobs evaluating each attack class against the benign baseline.
* **Per-Class Heatmap:** Generates an $N \times 7$ smell matrix showing cross-class vulnerability variations.
* **Target Class Selector:** Allows one-click switching across all discovered classes in Audit and Findings screens.

### Scenario D — Custom / Unfamiliar Schema
* **Behavior:** Discovers arbitrary column names and data types without assuming CIC-IDS-2017 naming.
* **Column Role Detection:** Fuzzy matches roles (ports, packet lengths, timestamps, grouping) when present, but gracefully preserves unmapped columns without hallucinating semantics.
* **Capability Matrix:** If port columns are absent, UGT is marked `UNSUPPORTED_SCHEMA` ("No port telemetry columns detected in dataset schema"), rather than crashing.

### Scenario E — Clean Control Dataset
* **Behavior:** Clean, well-balanced synthetic dataset with zero missing values, zero duplicates, and zero shortcut artifacts.
* **Recommendations:** Returns empty list `[]` and displays: *"No actionable improvements were identified from the current audit evidence. The dataset exhibits good quality and low shortcut reliance across evaluated dimensions."*

---

## 4. Verification Evidence Summary

| Test ID | Scenario / Stage | Test Command / Function | Observed Status |
| :--- | :--- | :--- | :--- |
| **TEST-DYN-01** | Single-Class Ingestion | `tests/test_dynamic_workflow.py::test_example_a_single_class_benign_only_pipeline` | **PASS** |
| **TEST-DYN-02** | Single-Class Split | `tests/test_dynamic_workflow.py::test_example_a_single_class_benign_only_pipeline` | **PASS** |
| **TEST-DYN-03** | Capability Matrix Resolution | `tests/test_dynamic_workflow.py::test_example_a_single_class_benign_only_pipeline` | **PASS** |
| **TEST-DYN-04** | Clean Control Zero-Recs | `tests/test_dynamic_workflow.py::test_clean_control_dataset_produces_zero_recommendations` | **PASS** |
| **TEST-DYN-05** | Heatmap Suite Endpoints | `tests/test_dynamic_workflow.py::test_audit_logs_and_heatmaps_api` | **PASS** |
| **TEST-DYN-06** | Browser E2E Single-Class | `frontend/e2e/workstation.spec.ts` (Journey E) | **PASS** |
| **TEST-DYN-07** | Full Pytest Suite | `pytest tests/` (65 tests) | **65 / 65 PASSED** |
| **TEST-DYN-08** | Frontend Vitest Suite | `npm --prefix frontend run test -- --run` (16 tests) | **16 / 16 PASSED** |
| **TEST-DYN-09** | Full Browser E2E Suite | `npx playwright test` (5 tests) | **5 / 5 PASSED** |
