# PHASE 0 — REPOSITORY AUDIT & SAFETY REPORT

**Project:** SmellScope 2.0 — Scientific Dataset Trust Audit Workstation  
**Author:** Principal Software Architect & Migration Lead  
**Timestamp:** 2026-11-18T19:35:00+05:30  
**Branch:** `feature/react-frontend` (created from `feature/member-1-core-engine` @ `9cb0890`)  
**Safety Protocol:** Non-Destructive Preservation Active  

---

## 1. Executive Summary

This audit establishes the baseline state and safety guardrails for migrating SmellScope from Streamlit to a modern **React + TypeScript + Vite + Tailwind CSS + Radix/shadcn + Plotly.js + FastAPI + Pydantic** architecture.

All scientific research algorithms, contracts, unit tests, and empirical evidence developed by Member 1 (Research Core Engine) are intact, operational, and verified. The baseline test suite passes at 100% (26/26 tests passed in 18.46 seconds).

---

## 2. Git & Environment Baseline

| Parameter | Observed Value | Verification Status |
|---|---|---|
| **Repository Root** | `c:\Users\vishu\badsmellpart1` | Verified |
| **Active Branch** | `feature/react-frontend` | Dedicated branch verified |
| **Base Commit** | `9cb0890` (`[M1][P6] Phase 6 - Final Delivery...`) | Clean working tree |
| **Python Runtime** | Python 3.13.12 (win32) | Verified |
| **FastAPI** | 0.136.1 | Verified |
| **Pydantic** | 2.13.3 | Verified |
| **Uvicorn** | 0.34.0 | Verified |
| **Node.js** | v24.15.0 | Verified |
| **npm** | 11.9.0 | Verified |
| **Scientific Stack** | numpy 2.2.3, pandas 2.2.3, scikit-learn 1.6.1, joblib 1.4.2 | Verified |

---

## 3. Existing Asset Inventory & Health

### 3.1 Research Core Engine (`smellscope/core`)
- `preprocess.py`: Fit-on-train-only data standardization, inf/nan handling, constant feature pruning.
- `heuristics.py`: Vectorized UGT, WL ($k=4$), HDF, PDD, and TC heuristics.
- `eval.py`: `fit_and_evaluate` binary and multiclass baseline evaluation (RandomForest).
- `taxonomy.py`: Feature controllability classification ($A, B, C, D$, UNMAPPED).
- `sfi.py`: Null-calibrated Shortcut Fragility Index (SFI), Monte Carlo null baselines, 2D fragility grid.
- `ggi.py`: Generalisation Gap Index with LOR test.
- `audit.py`: `audit_class` and `get_cluster_assignments` contract conformance.
- `planted.py`: Synthetic shortcut generation and benchmark validation.
- `errors.py`: Contract-compliant `SmellScopeError` and error codes.

### 3.2 Baseline Test Execution
Executed on dedicated branch before any code modification:
```
pytest tests/core -v
26 passed in 18.46s (100% pass rate)
```
All contract conformance, fault isolation, reproducibility, and mathematical boundary tests succeeded.

### 3.3 Authoritative Shared Contract v1.0
Located at `docs/contracts/SHARED_CONTRACT_v1.0.md`.
- Contract is frozen.
- All data schemas (`LoadedDataset`, `SplitManifest`, `ClassAuditResult`, `RunResult`, `TrainingView`, `RemediationPreview`, `RSMReport`, `ChangeLogEntry`, `RebenchmarkResult`) are strictly respected.
- Error codes (`E_SCHEMA`, `E_LABEL_COLUMN`, `E_BENIGN_LABEL_MISSING`, `E_CLASS_TOO_SMALL`, `E_SPLIT_INVALID`, `E_TEST_LEAK`, `E_CONFIG`, `E_MEASURE_FAILED`, `E_RULE_UNAVAILABLE`, `E_RSM_BLOCK`, `E_RSM_WARN_UNACKED`, `E_ROLLBACK_MISMATCH`, `E_FILE`, `E_INTERNAL`) are frozen.

---

## 4. Architectural Gap Analysis & Migration Scope

To achieve the complete SmellScope 2.0 workstation, the following components are scheduled for implementation and integration:

1. **Pipeline & Facade Layer (`smellscope/pipeline`, `smellscope/api`)**:
   - `load_dataset` with SHA-256 fingerprinting, validation, and subsampling.
   - `make_locked_split` with train/val/test hashing and `assert_test_untouched` leak detection.
   - `run_audit` multi-class orchestrator with granular progress tracking and error capture.
   - Public facade `smellscope.api` matching Section 2.9 of Shared Contract v1.0.

2. **Remediation & RSM Layer (`smellscope/remediation`)**:
   - `TrainingView` immutable state and lineage graph.
   - R1 Feature Ablation.
   - R2 Flow Quarantine (e.g. port/service clustering).
   - Remediation Safety Monitor (RSM) with PASS, WARN, BLOCK status and acknowledgement verification.
   - Cryptographic rollback engine with exact `view_hash` state verification.
   - `rebenchmark` function with locked test-set reuse verification.

3. **Reporting Layer (`smellscope/reporting`)**:
   - Standalone offline HTML report generator with embedded CSS and methodology disclosure.

4. **FastAPI HTTP Boundary (`smellscope/server`)**:
   - Modular routers: `/api/v1/health`, `/api/v1/datasets`, `/api/v1/audits`, `/api/v1/remediations`, `/api/v1/reports`.
   - Typed Pydantic request/response models.
   - NaN/Infinity sanitization to standard JSON `null`.
   - Local-first security: loopback binding (`127.0.0.1`), path traversal protection, sanitized filenames.
   - Async audit execution worker with real-time status and non-fabricated progress.

5. **Streamlit Fallback (`app.py`)**:
   - Retain lightweight, functional Streamlit application wrapping `smellscope.api` to guarantee fallback continuity until acceptance testing is complete.

6. **Frontend Workstation (`frontend/`)**:
   - React 18/19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Radix UI + Plotly.js.
   - 5-stage research workflow bar: 01 INGEST, 02 OVERVIEW, 03 DIAGNOSE, 04 REMEDIATE, 05 VERIFY.
   - Screen 1: Command Center Overview.
   - Screen 2: Dataset Ingestion & Locked Split.
   - Screen 3: Cross-Class Smell Matrix (Heatmap).
   - Screen 4: Shortcut Diagnostic Lab (SFI curve, null baseline, 2D fragility, taxonomy, GGI).
   - Screen 5: Remediation Lab & RSM (Ablation, Quarantine preview, rollback).
   - Screen 6: Verification & Offline Reporting.

---

## 5. Non-Negotiable Preservation Verification

- [x] Dedicated branch `feature/react-frontend` created.
- [x] All existing Member 1 core files intact.
- [x] Shared Contract v1.0 untouched.
- [x] Baseline test suite passed (26/26).
- [x] No git force-push or destructive operations performed.
- [x] Scientific integrity upheld: SmellScope clearly designated as a benchmark dataset auditor, not a live NIDS.

**Audit Status:** PHASE 0 COMPLETE — PROCEEDING TO PHASE 1.
