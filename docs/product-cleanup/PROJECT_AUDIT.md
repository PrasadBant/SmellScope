# SmellScope 2.1 — Complete Project-Wide Audit

**Date:** November 18, 2026  
**Auditor:** Principal Software & UI/UX Architect  
**Branch:** `feature/project-simplification`  
**Status:** Audit Complete — Phase 0  

---

## 1. Executive Assessment

SmellScope 2.0 has successfully demonstrated a working React + TypeScript + FastAPI implementation with a robust Python research core and passing test suites. However, the application has accumulated technical and architectural debt from rapid iterative migrations:
1. **Confusing Navigation & Redundant Screens:**
   - The user must currently navigate across 6 disparate screens (`/overview`, `/ingestion`, `/heatmap`, `/diagnostics`, `/remediation`, `/reports`).
   - The Smell Matrix (`/heatmap`) and Shortcut Diagnostics (`/diagnostics`) are logically twin views of the **Findings** domain, forcing artificial context-switching.
   - The Overview page previously acted as both an audit dashboard and an audit starter, creating competing calls to action.
2. **Forced Remediation Impression:**
   - The sequential 5-stage stepper previously implied that Remediation (`04 REMEDIATE`) was a mandatory prerequisite before a user could verify or download an audit report. In reality, dataset trust auditing is valid and complete without any remediation.
3. **Overly Technical Terminology for Beginners:**
   - Terms like UGT, WL, HDF, PDD, TC, SFI, GGI, and RSM are presented without progressive disclosure, intimidating new researchers.
4. **Documentation Sprawl:**
   - Multiple disconnected folders exist in `docs/` (`docs/audit/`, `docs/contracts/`, `docs/quality/`, `docs/react-migration/`, `docs/team-execution/`, `docs/ui-refinement/`, `docs/research/`), with no single unified user guide or quickstart.
5. **Frontend Redundancies & Overlap:**
   - Redundant state keys in `AuditContext`.
   - Separate routes for features that belong in single tabbed views.

---

## 2. Inventory & Classification Table

| Item / File | Classification | Action | Rationale |
|---|---|---|---|
| **`smellscope/core/*`** (audit, errors, eval, ggi, heuristics, planted, preprocess, sfi, taxonomy) | Required Functionality | **Preserve Intact** | Core scientific algorithms and mathematical foundations. Never touch or degrade. |
| **`smellscope/pipeline/*`** (config, loader, orchestrator, split) | Required Functionality | **Preserve Intact** | Manages 60/20/20 locked test splits and dataset loading. |
| **`smellscope/remediation/*`** (manager, rsm) | Required Functionality | **Preserve Intact** | Enforces RSM G1–G5 guardrails and reversible training views. |
| **`smellscope/reporting/*`** (generator) | Required Functionality | **Preserve Intact** | Offline HTML audit report generator. |
| **`smellscope/server/*`** (main, routers, schemas) | Required Functionality | **Preserve Intact** | FastAPI REST endpoints powering the workstation. |
| **`frontend/src/features/heatmap/` & `diagnostics/`** | Fragmented UX | **Consolidate into `findings/`** | Merge matrix and diagnostics into one cohesive, tabbed `FindingsScreen` with beginner/advanced views. |
| **`frontend/src/features/ingestion/`** | Fragmented UX | **Simplify into `audit/NewAuditScreen`** | Streamline dataset selection, validation, and audit launch into a clean 3-step wizard. |
| **`frontend/src/features/overview/`** | Competing Navigation | **Transform into `home/HomeScreen`** | Redesign as a friendly welcome home and executive dashboard with beginner cards and onboarding checklist. |
| **`frontend/src/components/ui/StatCard.tsx`** | Duplicate Component | **Consolidate with `MetricCard.tsx`** | Standardize on `MetricCard` with evidence badges while keeping `StatCard` as a thin wrapper for backward-compatibility. |
| **Documentation Folders** (`docs/quality/`, `docs/react-migration/`, etc.) | Scattered Docs | **Consolidate into Standard `docs/` Structure** | Reorganize into `getting-started/`, `research/`, `architecture/`, `operations/`, `development/`, and archive historical execution reports in `docs/archive/`. |
| **Streamlit Fallback (`app.py`)** | Safety Fallback | **Preserve** | Maintained as an independent local fallback. |
| **Sample Datasets (`data/samples/`)** | Required Data | **Preserve** | Used for pre-calibrated benchmarks and reproducible test runs. |
| **Pytest Suite (`tests/*`)** | Required Quality Gate | **Preserve & Expand** | 37 tests covering core research, server boundary, and RSM security. |
| **Playwright & Vitest (`frontend/src/test/`, `frontend/e2e/`)** | Required Quality Gate | **Update & Expand** | Update selectors to reflect unified 5-stage navigation while maintaining end-to-end verification. |

---

## 3. Workflow Simplification Map

### Legacy Workflow (Confusing & Fragmented):
```text
[Overview] -> [Ingestion] -> [Smell Matrix] -> [Shortcut Diagnostics] -> [Mandatory Remediation?] -> [Reports]
(6 disparate screens, competing launch triggers, unclear whether remediation is required)
```

### Simplified Scientific User Journey (SmellScope 2.1):
```text
┌─────────────────────────────────────────────────────────────┐
│ 1. HOME: Welcome, Product Purpose & Guided First-Time Onboarding │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. NEW AUDIT: Dataset Selection -> Validation -> Run Audit   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FINDINGS: Unified Matrix + SFI Diagnostics + Taxonomy    │
│    (Basic View for Beginners / Advanced View for Researchers)│
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐     ┌──────────────────────────────┐
│ 4. REMEDIATION (OPTIONAL)    │     │ SKIP TO REPORT (DIRECT)      │
│    Safe ablation with RSM    │     │ Generate original audit report│
└───────────┬──────────────────┘     └──────────────┬───────────────┘
            │                                       │
            └──────────────────┬────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. VERIFY & REPORT: Locked Test Evaluation & HTML Download   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Phase-by-Phase Execution Plan

1. **Phase 1 — Workflow Specification:** Define `WORKFLOW_SPECIFICATION.md` establishing the 5 stages and state transitions.
2. **Phase 2 — Guided First-Time UX:** Implement the Welcome screen, onboarding checklist, and plain-English tooltips for technical terms.
3. **Phase 3 — Navigation & Screen Consolidation:**
   - Consolidate navigation to 5 primary destinations (`Home`, `New Audit`, `Findings`, `Remediation`, `Reports`).
   - Create unified `FindingsScreen.tsx` (Matrix + SFI + Taxonomy).
   - Create unified `NewAuditScreen.tsx` (Select -> Validate -> Launch).
   - Update `AppShell.tsx` and `App.tsx` with backward-compatible route redirects.
4. **Phase 4 — State Management:** Refine `AuditContext.tsx` to handle the 5-stage lifecycle with state persistence and stale-result invalidation.
5. **Phase 5 — Progressive Disclosure & Visual Polish:** Implement Basic View (clear summaries) vs Advanced View (math formulas, null distributions, full tables).
6. **Phase 6 — Repository Cleanup & Documentation:** Reorganize `docs/`, update root `README.md`, clean unused assets, author `CLEANUP_REGISTER.md`.
7. **Phase 7 & 8 — Testing & Validation:** Execute Vitest, Playwright, Pytest, author final reports.
