# PHASE 1 — FASTAPI BACKEND BOUNDARY & CONTRACT REPORT

**Project:** SmellScope 2.0 — Scientific Dataset Trust Audit Workstation  
**Author:** Principal Software Architect & Python Backend Engineer  
**Timestamp:** 2026-11-18T19:42:00+05:30  
**Branch:** `feature/react-frontend`  
**Test Suite Status:** 31 Passed / 0 Failed (100% Pass Rate in 38.13s)  

---

## 1. Executive Summary

Phase 1 establishes the production-grade HTTP boundary connecting the SmellScope Python research core to the incoming modern React frontend. 

The API layer is built with **FastAPI** and **Pydantic v2**, strictly adhering to **Shared Contract v1.0**. It exposes versioned endpoints under `/api/v1/`, enforces non-negotiable test isolation, guards remediation with the Remediation Safety Monitor (RSM), provides cryptographic state tracking, and manages asynchronous audit execution without blocking the event loop or fabricating progress indicators.

---

## 2. API Endpoints Architecture

All endpoints are hosted at prefix `/api/v1/` with loopback binding (`127.0.0.1:8000`):

### 2.1 System Health
- `GET /api/v1/health`
  - Returns backend status, API version (`1.0.0`), research engine availability, local-first mode, and the mandatory scientific disclaimer:
    > *"SmellScope is a scientific benchmark dataset auditor, NOT an active network intrusion detection system."*

### 2.2 Dataset Ingestion & Inspection
- `GET /api/v1/datasets`: Lists all registered and sample datasets with row counts and SHA-256 fingerprints.
- `POST /api/v1/datasets/upload`: Handles local `.csv` and `.parquet` uploads with path-traversal sanitization and streaming SHA-256 calculation.
- `GET /api/v1/datasets/{dataset_id}`: Returns full metadata, schema identification (`cic-ids-2017`, `unsw-nb15`, `synthetic-planted`), column roles (`dst_port`, `timestamp`, `group`), and class distributions.
- `GET /api/v1/datasets/{dataset_id}/preview`: Returns bounded data preview rows (default 50), column data types, missing value counts, and infinite value tallies.
- `POST /api/v1/datasets/{dataset_id}/validate`: Executes strict validation against target label and benign categories, verifying $\ge 2$ classes and calculating drop counts.

### 2.3 Scientific Audit Execution
- `POST /api/v1/audits`: Accepts dataset ID, target classes, seed, and subsample limits. Returns `HTTP 202 Accepted` with a unique `run_id`. Dispatches computation to an isolated background thread.
- `GET /api/v1/audits`: Lists all past and running audit jobs.
- `GET /api/v1/audits/{run_id}`: Returns real-time status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`), current audited class, completed steps, total steps, and exact elapsed seconds.
- `GET /api/v1/audits/{run_id}/results`: Returns the complete `RunResult` conforming to Shared Contract v1.0 Section 2.8.
- `GET /api/v1/audits/{run_id}/classes/{class_id}/diagnostics`: Drill-down diagnostics for a specific class (SFI curve, null distribution parameters, GGI subtype comparisons, heuristic breakdowns).
- `POST /api/v1/audits/{run_id}/fragility-grid`: Evaluates 2D joint feature perturbation fragility grid across perturbation steps.

### 2.4 Remediation & RSM Governance
- `POST /api/v1/audits/{run_id}/remediations/preview`: Generates what-if preview for R1 (Feature Ablation) or R2 (Candidate Flow Quarantine) and evaluates independent backend RSM rules.
- `POST /api/v1/audits/{run_id}/remediations/apply`: Authorizes and applies remediation only if RSM approves (`PASS` or `WARN` with explicit `warning_ack`). Any attempt to apply a `BLOCK` operation raises `HTTP 403 Forbidden` (`E_RSM_BLOCK`).
- `GET /api/v1/audits/{run_id}/views`: Returns complete history of `TrainingView` states, cryptographic `view_hash` lineage, and change log records.
- `POST /api/v1/audits/{run_id}/rollback`: Executes cryptographic rollback to a parent view, independently verifying `view_hash` equality before completing.
- `POST /api/v1/audits/{run_id}/rebenchmark`: Fits baseline and remediated models on their respective training views and evaluates both on the **exact same locked test set** (`same_test_ids: True`).

### 2.5 Offline Reporting
- `POST /api/v1/audits/{run_id}/reports`: Compiles a self-contained offline HTML audit report with embedded styling, provenance hashes, and scientific limitations.
- `GET /api/v1/audits/{run_id}/reports/{report_id}/download`: Streams the generated HTML file for offline local storage.

---

## 3. Data Integrity & Contract Conformance

| Contract Rule | Implementation Detail | Status |
|---|---|---|
| **Float Serialization** | Recursive sanitization converts all `NaN` and `+/-inf` values to standard JSON `null`. Non-standard float tokens are rejected. | Verified |
| **Locked Split Isolation** | `make_locked_split` computes SHA-256 `split_hash` over sorted partition indices. `assert_test_untouched` verifies test set rows never leak into training context. | Verified |
| **Deterministic Seed** | Global default seed 42 applied to all stochastic operations. | Verified |
| **Error Format** | Standard domain errors formatted as `{"code", "message", "details", "measure"?, "class"?}` using `SmellScopeError`. | Verified |
| **RSM Safety Floor** | Enforces minimum class retention (50% warn, 20% block), minimum cluster retention (25% warn, 10% block), and ablation feature thresholds. | Verified |

---

## 4. Verification & Test Evidence

Test execution command:
```bash
pytest tests -v
```
Output:
```text
tests/core/test_audit.py (4 tests) .............................. PASSED
tests/core/test_contract.py (3 tests) ........................... PASSED
tests/core/test_eval.py (2 tests) ............................... PASSED
tests/core/test_ggi.py (2 tests) ................................ PASSED
tests/core/test_heuristics.py (5 tests) ......................... PASSED
tests/core/test_integration_readiness.py (2 tests) .............. PASSED
tests/core/test_planted.py (1 test) ............................. PASSED
tests/core/test_preprocess.py (2 tests) ......................... PASSED
tests/core/test_reproducibility.py (1 test) ..................... PASSED
tests/core/test_sfi.py (3 tests) ................................ PASSED
tests/core/test_taxonomy.py (1 test) ............................ PASSED
tests/server/test_api_boundary.py::test_health_endpoint ......... PASSED
tests/server/test_api_boundary.py::test_datasets_endpoints ...... PASSED
tests/server/test_api_boundary.py::test_audit_execution_and_results_flow PASSED
tests/server/test_api_boundary.py::test_remediation_and_rsm_lifecycle .. PASSED
tests/server/test_api_boundary.py::test_report_generation_and_download . PASSED

31 passed in 38.13s (100% pass rate)
```

**Status:** PHASE 1 COMPLETE — PROCEEDING TO PHASE 2 (React Foundation & Design System).
