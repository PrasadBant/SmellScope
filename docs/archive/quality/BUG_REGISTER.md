# SMELLSCOPE 2.0 — BUG REGISTER

This register tracks all discovered defects, their root causes, fixes, and regression test verifications.

**Current Summary**: 7 Total Defects Discovered | 7 Fixed | 7 Verified (0 Open Defects)

---

## Defect Inventory & Resolution Status

### BUG-001: SPA Routing 404 on Browser Refresh
- **Severity:** P1 (Core Functionality)
- **Component:** `smellscope.server.main`
- **Root Cause:** Standard Starlette `StaticFiles(directory="frontend/dist", html=True)` mounted at `/` attempted to match filesystem paths directly. Routes like `/overview` or `/ingestion` had no corresponding static HTML file on disk, resulting in `404 Not Found` upon browser refresh or deep URL navigation.
- **Expected Behavior:** Any non-API route must return `frontend/dist/index.html` to allow React Router to render the appropriate client-side view.
- **Fix:** Mounted `/assets` directory for static JS/CSS bundles and implemented HTML5 catch-all route `/{full_path:path}` serving `frontend/dist/index.html` for client-side routing while safely preserving `/api/v1/*`, `/docs`, and `/openapi.json`.
- **Regression Test:** `tests/server/test_api_boundary.py::test_spa_fallback_routing`
- **Status:** **VERIFIED**

---

### BUG-002: Custom Dataset Upload Fails to Register Pending Metadata
- **Severity:** P1 (Core Ingestion)
- **Component:** `smellscope.server.routers.datasets` & `smellscope.server.dependencies`
- **Root Cause:** When an uploaded CSV/Parquet file did not match the default label column (`Label`), `load_dataset` raised an exception and `upload_dataset` failed to register the file in `dataset_registry`. Subsequent calls to `getDatasetMetadata` or `getDatasetPreview` threw 404, preventing users from seeing column names to configure the correct label column.
- **Expected Behavior:** Uploading any valid CSV/Parquet file must register a previewable metadata stub with available column names so the user can select their label column and benign class.
- **Fix:** Implemented `DatasetRegistry.register_raw(...)` to extract column schemas and row counts directly using pandas chunk inspection. Updated `get_dataset_metadata` and `get_dataset_preview` to serve preview data for pending datasets.
- **Regression Test:** `tests/server/test_api_boundary.py::test_custom_upload_and_pending_validation_flow`
- **Status:** **VERIFIED**

---

### BUG-003: Non-Interactive SFI Decay Plot
- **Severity:** P2 (Interaction & Visual)
- **Component:** `frontend/src/features/diagnostics/ShortcutDiagnosticsScreen.tsx`
- **Root Cause:** Static SVG fallback polyline was rendered instead of an interactive Plotly.js chart component with zoom, pan, hover, and dark theme as mandated by Master Prompt Sections 3 and 13.
- **Expected Behavior:** Interactive Plotly.js chart rendering empirical decay curve and Monte Carlo null baseline mean with custom hover tooltips, zoom, pan, and scientific workstation dark styling (`#0B0F19`, `#182234`, `#38BDF8`).
- **Fix:** Authored `frontend/src/features/diagnostics/SfiDecayPlot.tsx` utilizing `createPlotlyComponent(Plotly)` from `plotly.js-dist-min` and hooked into `ShortcutDiagnosticsScreen.tsx`.
- **Regression Test:** `frontend/src/test/app.test.tsx` (Vitest) & `frontend/e2e/workstation.spec.ts` (Playwright E2E assert `.js-plotly-plot`).
- **Status:** **VERIFIED**

---

### BUG-004: Published Reference Benchmark Values Endpoint Missing
- **Severity:** P2 (Scientific Feature)
- **Component:** `smellscope.server.routers.benchmarks` & `frontend/src/features/heatmap/SmellMatrixScreen.tsx`
- **Root Cause:** Published literature reference values existed in `config/published_values.yaml` (Flood et al. EuroS&P 2024), but no API endpoint exposed them to the frontend. The "Compare Published" button had no live data to display.
- **Expected Behavior:** Endpoint `GET /api/v1/benchmarks/published-values` exposes literature reference heuristics for CIC-IDS-2017, UNSW-NB15, and CTU-13.
- **Fix:** Created `smellscope/server/routers/benchmarks.py`, mounted at `/api/v1/benchmarks/published-values`, and hooked into `SmellMatrixScreen.tsx` with dynamic side-by-side comparison badges and citation summary table.
- **Regression Test:** `tests/server/test_api_boundary.py::test_benchmarks_published_values` & Playwright E2E.
- **Status:** **VERIFIED**

---

### BUG-005: Inconsistent Rule Resolution in R2 Apply
- **Severity:** P2 (Remediation Governance)
- **Component:** `smellscope.remediation.manager`
- **Root Cause:** `propose_remediation` and `apply_remediation` evaluated quarantine conditions independently. If custom rules were configured, `apply_remediation` fell back to hardcoded strings, causing divergence between preview and actual applied training views.
- **Expected Behavior:** Both propose and apply must evaluate the exact same quarantine mask logic.
- **Fix:** Refactored condition logic into a shared helper `_evaluate_quarantine_mask` invoked identically by both `propose_remediation` and `apply_remediation`.
- **Regression Test:** `tests/server/test_api_boundary.py::test_remediation_and_rsm_lifecycle`
- **Status:** **VERIFIED**

---

### BUG-006: Missing Headless Demonstration Script `examples/run_demo.py`
- **Severity:** P3 (Documentation & Demo)
- **Component:** `examples/run_demo.py`
- **Root Cause:** Script was mandated by Master Prompt Section 9 and Shared Contract Section 2.12 but was missing from the repository.
- **Expected Behavior:** Complete standalone CLI script executing the full 7-step sequence: ingestion, audit, heuristics, null-calibrated SFI, GGI, RSM check, training view creation, locked rebenchmarking, reversible rollback, and offline HTML report export.
- **Fix:** Authored `examples/run_demo.py` utilizing the public Python API `smellscope.api`.
- **Regression Test:** Executed `python examples/run_demo.py` returning exit code 0 in 10.91s.
- **Status:** **VERIFIED**

---

### BUG-007: Server Restart Cache Recovery Omits Split Manifest
- **Severity:** P3 (Backend Resilience)
- **Component:** `smellscope.server.dependencies`
- **Root Cause:** `AuditJobManager.get_job` restored `results.json` from disk on cache hit, but left `job.split = None` instead of loading `split_manifest.json`, preventing subsequent rebenchmarking or view operations after a server restart.
- **Expected Behavior:** Recovered job includes both `result` and `split` manifests loaded from disk.
- **Fix:** Updated `AuditJobManager.get_job` to restore `job.split` from `split_manifest.json` if available on disk.
- **Regression Test:** `tests/server/test_api_boundary.py::test_audit_execution_and_results_flow`
- **Status:** **VERIFIED**
