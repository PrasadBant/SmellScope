# SmellScope 2.0 — Quality Bug Register & Architectural Gap Analysis

**Date:** November 19, 2026  
**Status:** Completed & Verified (All P0, P1, P2 items resolved)  
**Scope:** Complete Software Engineering, Dataset Auditing, Intelligent Repair, Remediation, Before/After Analysis & Professional UX  

---

## 1. Defect Classification & Severity Standards

- **P0 (Critical / Blocker):** Core architectural gap, broken user workflow, data leakage, test-set corruption, or inability to complete an audit/repair journey.
- **P1 (High):** Missing major functional requirement (e.g. intelligent repair generator, dedicated comparison screen, corrected dataset export).
- **P2 (Medium):** Incomplete telemetry, suboptimal error handling, missing progress indicators, or missing explanatory text for first-time users.
- **P3 (Low):** Minor UI styling inconsistency, code duplication, or non-blocking layout alignment.

---

## 2. Bug & Architectural Gap Inventory

| ID | Category | Severity | Description | Status | Resolution |
|---|---|---|---|---|---|
| **BUG-001** | Intelligent Repair | **P0** | **Missing Intelligent Repair Recommendation Engine:** Backend lacked an automated recommendation engine mapping audit smells and data quality defects to structured repair suggestions. | **RESOLVED** | Implemented `smellscope/remediation/recommender.py` generating prioritized, evidence-based suggestions across DATA_QUALITY, DATASET_DESIGN, and SHORTCUT_FRAGILITY. |
| **BUG-002** | Dataset Export | **P0** | **Missing Corrected Dataset Download Endpoint:** Users could not download versioned repaired datasets. | **RESOLVED** | Implemented `GET /api/v1/audits/{run_id}/export/dataset` streaming versioned CSV with `X-SHA256` and `X-View-ID` headers from `data/repaired/`. |
| **BUG-003** | Comparison Screen | **P1** | **Missing Dedicated Before/After Comparison Screen:** Lacked side-by-side data quality deltas and ML metric comparisons on locked test sets. | **RESOLVED** | Built `frontend/src/features/comparison/ComparisonScreen.tsx` with locked test set integrity badge, data quality delta table, ML performance metrics, and view lineage. |
| **BUG-004** | Workflow Navigation | **P1** | **Incomplete Navigation Architecture:** Lacked routes for Improvement Centre, Comparison, and History. | **RESOLVED** | Registered `/improvement`, `/comparison`, and `/history` routes in `App.tsx` and added corresponding icons with active indicators in `AppShell.tsx`. |
| **BUG-005** | Repair Plan Selection | **P1** | **Missing Multi-Fix Selection & Batch Preview:** Could not preview and apply multiple discrete repairs with composite RSM check. | **RESOLVED** | Implemented composite repair preview (`POST /audits/{run_id}/repair-plan/preview`) and application (`POST /audits/{run_id}/repair-plan/apply`) in `manager.py`. |
| **BUG-006** | Test Dataset | **P1** | **Missing Benchmark Synthetic Dataset:** `smellscope_nids_synthetic_test.csv` was missing. | **RESOLVED** | Generated 6,000-row, 21-column, 5-class synthetic benchmark dataset with planted shortcut port 44444 and data quality defects; registered in `data/samples/`. |
| **BUG-007** | Beginner Explainability | **P2** | **Technical Cognitive Overload:** First-time users lacked plain-language definitions and guides. | **RESOLVED** | Added comprehensive methodology help modal in `AppShell.tsx`, plain-language explanations in cards, and collapsible evidence sections in `ImprovementScreen.tsx`. |
| **BUG-008** | RSM Authorization | **P1** | **RSM Policy Customization & Independent Enforcement:** Backend needed strict validation independent of frontend. | **RESOLVED** | Added independent RSM authorization check in `apply_repair_plan()` with warning acknowledgment enforcement and automatic block on G1–G5 violations. |
| **BUG-009** | Reversibility Ledger | **P2** | **View Lineage Visualization:** View lineage lacked visual display and excluded features tracking. | **RESOLVED** | Added visual lineage chips, parent-child transitions, and excluded feature badges on both `ComparisonScreen` and `RemediationScreen`. |
| **BUG-010** | Offline Report Completeness | **P2** | **Report Lacks Repair Recommendations Summary:** Offline HTML report omitted repair recommendations. | **RESOLVED** | Export metadata, recommendations, and locked test split verification hashes are included in report state and lineage. |

---

## 3. Verification Evidence

1. **Backend Test Suite:** 38/38 unit and integration tests passing (`python -m pytest tests -v`).
2. **Frontend Test Suite:** 10/10 Vitest component and unit tests passing (`npm --prefix frontend run test -- --run`).
3. **End-to-End Test Suite:** 3/3 Playwright tests passing (`npx playwright test`):
   - Path A: 13-step guided audit without remediation directly to report.
   - Path B: Full remediation with preview, RSM, apply, and rebenchmark.
   - Journey C: Complete Improvement Centre flow with recommendations, multi-fix preview, apply, and comparison.
4. **Build Verification:** 0 TypeScript errors (`tsc && vite build`).
