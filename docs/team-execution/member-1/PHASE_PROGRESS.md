# Member 1 Phase Progress — Research Core Engine

**Member:** Member 1 (Research Core: heuristics, SFI, GGI, evaluation)  
**Branch:** `feature/member-1-core-engine`  
**Total Allocated Budget:** 6.5 person-hours  
**Cumulative Hours Used:** 0.8 h  

---

## Phase Summary Table

| Phase | Description | Budget (h) | Actual (h) | Status | Authorization Date / Note |
|---|---|---|---|---|---|
| **Phase 0** | Context & Repository Audit | 0.3 | 0.3 | **Completed** | Authorized by initial prompt |
| **Phase 1** | Requirements & Specifications | 0.5 | 0.5 | **Completed** | Authorized by user ("next") |
| **Phase 2** | Architecture & Contracts | 0.7 | 0.0 | Pending | Awaiting user authorization |
| **Phase 3** | Core Implementation (Freeze at end) | 2.8 | 0.0 | Pending | Pending Phase 2 sign-off |
| **Phase 4** | Testing & Validation (E1, E2, E5) | 1.0 | 0.0 | Pending | Pending Phase 3 sign-off |
| **Phase 5** | Integration Readiness | 0.7 | 0.0 | Pending | Pending Phase 4 sign-off |
| **Phase 6** | Final Delivery & Handover | 0.5 | 0.0 | Pending | Pending Phase 5 sign-off |

---

## Phase 1 Execution Record

- **Status:** Completed
- **Objectives:** Formalize PRD, FRD (FR-001 to FR-022), NFR, traceability matrix, and pre-register all heuristic thresholds and SFI parameters before running any evaluation.
- **Deliverables Produced:**
  - `config/heuristics.yaml` (Pre-registered heuristic, baseline, SFI, and GGI configuration)
  - `docs/research/PREREGISTRATION.md` (Formal pre-registration document for hypotheses H1/H0 and thresholds)
  - `docs/team-execution/member-1/PRD.md` (Product requirements)
  - `docs/team-execution/member-1/FRD.md` (Functional requirements FR-001 to FR-022 with exact tolerances)
  - `docs/team-execution/member-1/NFR.md` (Non-functional performance, reliability, and security requirements)
  - `docs/team-execution/member-1/TRACEABILITY.md` (Full traceability matrix, Phase 3 hour allocations, cut-list)
- **Verification Details:**
  - Every functional requirement (FR-001 to FR-022) mapped to a test case and experiment.
  - Pre-registered parameters locked: $k=3$, $\delta \in [0.05, 0.10, 0.20, 0.30]$, $n_{\text{null}}=50$, $z \ge 2.0$, $HDF \ge 0.90$, quantiles $[0.01, 0.99]$.
  - Phase 3 budget broken down exactly to 2.8 hours across 7 work packages.
  - Cut-list prioritized: LOR, E3, E4, E7 first; sacrosanct safeguards preserved.
- **Key Decisions:**
  - D-003: Pre-registered $HDF_{\text{high}} = 0.90$ and $z_{\text{threshold}} = 2.0$ in `config/heuristics.yaml` and `PREREGISTRATION.md` to prevent post-hoc metric tuning.
  - D-004: Allocated Phase 3 work packages to guarantee that P0 components (preprocessing, 5 heuristics, baseline evaluation, `audit_class` wrapper) are fully functioning by hour 1.3 of Phase 3.
- **Blockers / Issues:** None. Ready for Phase 2.
