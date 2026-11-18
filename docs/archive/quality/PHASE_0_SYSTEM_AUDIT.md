# PHASE 0 — COMPLETE SYSTEM AUDIT REPORT

**Project:** SmellScope 2.0 Stabilization & Quality Assurance  
**Lead Auditor:** Principal Software Architect & QA Lead  
**Timestamp:** 2026-11-18T20:12:00+05:30  
**Branch:** `feature/react-frontend`  
**Commit:** `21b49a1`  

---

## 1. Executive Summary

This system audit examines the complete SmellScope 2.0 application across all layers: React frontend, FastAPI backend boundary, research engine algorithms, data pipelines, infrastructure scripts, and testing harnesses.

While all unit tests currently pass (32/32 Python tests, 4/4 Vitest tests), deep inspection of real-world interactions identified **7 concrete defects** spanning SPA routing, custom dataset ingestion, interactive chart controls, published benchmark comparisons, R2 rule synchronization, and cached job recovery.

---

## 2. Comprehensive System Health Assessment

### 2.1 Research Engine (`smellscope/core`) — STATUS: HEALTHY
- **Heuristics (UGT, WL, HDF, PDD, TC):** All 5 heuristics implement vectorized NumPy/Pandas logic conforming to Shared Contract v1.0. Unit test pass rate is 100% (26/26 tests passing).
- **SFI & Null Calibration:** Null distribution generation ($N=100$ draws) and fragility curve calculations match preregistered bounds.
- **GGI:** GroupKFold provenance testing and cluster proxy evaluation work as contracted.
- **Locked Split Guard:** `make_locked_split` and `assert_test_untouched` prevent test leakage.

### 2.2 FastAPI Backend (`smellscope/server`) — STATUS: STABILIZATION REQUIRED
- **Health Endpoint:** Functional on `GET /api/v1/health` with scientific disclaimer.
- **Async Execution:** Multi-class audits execute asynchronously via threaded job manager without blocking the event loop.
- **Serialization:** NaN and Inf values are recursively sanitized to `null`.
- **Defects Identified:**
  1. *SPA Routing:* Refreshing client-side routes (`/overview`, `/ingestion`, etc.) returns `404 Not Found` due to lack of HTML5 fallback in Starlette static mount.
  2. *Upload Ingestion Flow:* Uploading datasets with custom or unverified label columns fails silently to register metadata, breaking the preview and validation UI.
  3. *Cached Split Recovery:* Recovering previous audit runs from disk fails to restore `job.split` from `split_manifest.json`.

### 2.3 React Frontend (`frontend/src`) — STATUS: HARDENING REQUIRED
- **Design System:** Palette tokens strictly adhere to `#0B0F19`, `#182234`, `#38BDF8`, etc.
- **Shell & Navigation:** Sidebar and 5-stage research workflow bar are fully responsive.
- **Defects Identified:**
  1. *SFI Decay Chart:* Uses a static SVG polyline instead of an interactive Plotly.js chart component with zoom, pan, hover tooltips, and reset controls.
  2. *Published Benchmark Values:* The "Compare Published" toggle lacks backend endpoint integration to display EuroS&P 2024 literature reference values.

---

## 3. Discovered Defects & Prioritization

| Bug ID | Severity | Component | Summary | Proposed Action |
|---|---|---|---|---|
| **BUG-001** | **P1** | Backend / Server | SPA routing returns 404 on browser refresh for non-root paths. | Implement SPA fallback route returning `index.html`. |
| **BUG-002** | **P1** | Backend / Ingestion | Custom dataset upload fails to register pending metadata for column selection. | Register pending dataset stub on upload failure to allow inspection. |
| **BUG-003** | **P2** | Frontend / Diagnostics | SFI decay plot is static SVG instead of interactive Plotly.js chart. | Replace with interactive Plotly.js component with dark theme controls. |
| **BUG-004** | **P2** | Full Stack / Heatmap | "Compare Published" toggle in Smell Matrix has no data integration. | Add `GET /api/v1/benchmarks/published-values` endpoint and render comparisons. |
| **BUG-005** | **P2** | Backend / Remediation | R2 flow quarantine rule resolution differs between propose and apply. | Unify rule resolution from `config/remediation_rules.yaml`. |
| **BUG-006** | **P3** | Infrastructure | Missing headless demonstration script `examples/run_demo.py`. | Implement complete end-to-end scientific demo script. |
| **BUG-007** | **P3** | Backend / Server | Server restart cache recovery omits `split_manifest.json` loading. | Load split manifest during cached job recovery. |

---

## 4. Phase 0 Audit Conclusion & Next Steps

All 7 defects have been classified and logged in `docs/quality/BUG_REGISTER.md`. We immediately proceed to **Phase 1 (Backend & API Stabilization)** to resolve BUG-001, BUG-002, BUG-004, BUG-005, and BUG-007 with regression tests.
