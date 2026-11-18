# SmellScope 2.1 — Cleanup & Simplification Register

This register records every file reorganized, consolidated, simplified, or preserved during the SmellScope 2.1 project transformation.

---

## 1. Documentation Reorganization Register

| Original Path | New Path | Action | Rationale & Verification |
|---|---|---|---|
| `docs/audit/` | `docs/archive/audit/` | Archived | Historical audit from initial 3-member team setup. Preserved intact for lineage. |
| `docs/contracts/` | `docs/archive/contracts/` | Archived | Early contract v1.0 specifications. Preserved for provenance. |
| `docs/team-execution/` | `docs/archive/team-execution/` | Archived | Historical sprint notes, PRDs, and handovers. Preserved in archive. |
| `docs/react-migration/` | `docs/archive/react-migration/` | Archived | Historical phase reports from the 2.0 React migration. |
| `docs/quality/` | `docs/archive/quality/` | Archived | Historical system hardening & quality audit reports. |
| `docs/ui-refinement/` | `docs/archive/ui-refinement/` | Archived | Historical UI audit & black-theme refinement documents. |
| (New) | `docs/getting-started/QUICKSTART.md` | Created | Beginner-friendly 5-minute setup and audit walkthrough. |
| (New) | `docs/getting-started/USER_GUIDE.md` | Created | Comprehensive guide explaining the 5 workflow stages and screens. |
| (New) | `docs/getting-started/FAQ.md` | Created | Answers to top 6 common questions regarding purpose, remediation, and privacy. |
| (New) | `docs/research/METHODOLOGY.md` | Created | Scientific split protocol, leakage prevention, and multi-class pipeline. |
| (New) | `docs/research/HEURISTICS.md` | Created | Detailed math, logic, and thresholds for UGT, WL, HDF, PDD, and TC. |
| (New) | `docs/research/SFI.md` | Created | Formula, Monte Carlo null calibration, and suspicion criteria for SFI. |
| (New) | `docs/research/GGI.md` | Created | Formulation and thresholds for Generalisation Gap Index across attack subtypes. |
| (New) | `docs/research/LIMITATIONS.md` | Created | Transparent academic limitations, scope boundary, and non-detection disclaimer. |
| (New) | `docs/architecture/SYSTEM_ARCHITECTURE.md` | Created | Modular architecture diagram, core layers, and directory layout. |
| (New) | `docs/architecture/API_CONTRACT.md` | Created | REST API reference for all FastAPI v1 endpoints. |
| (New) | `docs/architecture/DATA_FLOW.md` | Created | Sequence diagram illustrating the full audit lifecycle and invalidation rules. |
| (New) | `docs/operations/INSTALLATION.md` | Created | Step-by-step installation instructions for Python and Node.js. |
| (New) | `docs/operations/TROUBLESHOOTING.md` | Created | Troubleshooting for port conflicts, dist building, and joblib warnings. |
| (New) | `docs/operations/SECURITY.md` | Created | Local-first guarantees, air-gapping, sanitization, and cryptographic hashes. |
| (New) | `docs/development/TESTING.md` | Created | Overview and commands for running unit, server, Vitest, and Playwright tests. |
| (New) | `docs/development/CONTRIBUTING.md` | Created | Principles and instructions for open-source contributors. |
| (New) | `docs/development/RELEASE_HISTORY.md` | Created | Changelog detailing v2.0.0 and v2.1.0 changes. |

---

## 2. Frontend Source Simplification Register

| Module | Action | Details | Verification |
|---|---|---|---|
| `frontend/src/features/home/HomeScreen.tsx` | Created | Clean landing hub with mission, 3 simple step cards, and dismissible checklist. | Verified in Vitest & Playwright |
| `frontend/src/features/audit/NewAuditScreen.tsx` | Created | Consolidates dataset selection, drag-and-drop upload, schema fingerprinting, and audit launch into a single 3-step wizard. | Verified in Vitest & Playwright |
| `frontend/src/features/findings/FindingsScreen.tsx` | Created | Merges Smell Matrix, SFI Diagnostics, and Feature Taxonomy into one cohesive tabbed screen with Basic and Advanced view modes. | Verified in Vitest & Playwright |
| `frontend/src/features/remediation/RemediationScreen.tsx` | Modified | Added prominent "OPTIONAL WORKFLOW STAGE" banner and direct "Skip to Reports ->" button. | Verified in Playwright E2E |
| `frontend/src/features/reports/ReportsScreen.tsx` | Modified | Clarified that reports can be generated for baseline audits without requiring remediation. | Verified in Playwright E2E |
| `frontend/src/layouts/AppShell.tsx` | Simplified | Replaced 6 scattered links with 5 clear workflow destinations; added top-bar Basic vs Advanced toggle. | Verified in Vitest & Playwright |
| `frontend/src/components/common/WorkflowBar.tsx` | Simplified | Replaced 6-step progress stepper with clear 5-step numbered stages. | Verified in Vitest & Playwright |
| `frontend/src/stores/AuditContext.tsx` | Enhanced | Added `viewMode` ("basic" \| "advanced"), `onboardingDismissed` state persistence, and automatic cache invalidation on dataset change. | Verified in Vitest & Playwright |
| `frontend/src/utils/explanations.ts` | Created | Centralized dictionary of plain-English explanations, formulas, thresholds, and rationales for all heuristics and indices. | Verified in Vitest |
| `frontend/src/App.tsx` | Updated | Added backward-compatible redirects from legacy routes (`/overview`, `/ingestion`, `/heatmap`, `/diagnostics`) to simplified routes (`/home`, `/audit`, `/findings`). | Verified in Vitest & Playwright |

---

## 3. Preserved Scientific Artifacts Register

| Component | Status | Verification Proof |
|---|---|---|
| `smellscope/core/heuristics.py` | 100% Preserved | Pytest: `test_ugt_known_mix`, `test_wl_clean_vs_noisy_fixture`, `test_hdf_perfect_single_feature`, `test_pdd_and_tc_identical_vectors` all PASSED |
| `smellscope/core/sfi.py` | 100% Preserved | Pytest: `test_sfi_permutation_ranking_and_bounds`, `test_suspicion_flag_truth_table_all_categories` all PASSED |
| `smellscope/core/ggi.py` | 100% Preserved | Pytest: `test_ggi_disjoint_subtypes`, `test_ggi_insufficient_groups` all PASSED |
| `smellscope/core/taxonomy.py` | 100% Preserved | Pytest: `test_classify_known_cic_and_unsw_columns` PASSED |
| `smellscope/remediation/rsm.py` | 100% Preserved | Pytest: `test_rsm_security_enforcement`, `test_remediation_and_rsm_lifecycle` all PASSED |
| `smellscope/reporting/` | 100% Preserved | Standalone demo: exported 11,963 byte offline HTML report with SHA-256 lineage |
| `app.py` (Streamlit fallback) | Preserved | Kept intact as emergency fallback in root directory |
