# Member 1 Phase Progress — Research Core Engine

**Member:** Member 1 (Research Core: heuristics, SFI, GGI, evaluation)  
**Branch:** `feature/member-1-core-engine`  
**Total Allocated Budget:** 6.5 person-hours  
**Cumulative Hours Used:** 5.3 h  

---

## Phase Summary Table

| Phase | Description | Budget (h) | Actual (h) | Status | Authorization Date / Note |
|---|---|---|---|---|---|
| **Phase 0** | Context & Repository Audit | 0.3 | 0.3 | **Completed** | Authorized by initial prompt |
| **Phase 1** | Requirements & Specifications | 0.5 | 0.5 | **Completed** | Authorized by user ("next") |
| **Phase 2** | Architecture & Contracts | 0.7 | 0.7 | **Completed** | Authorized by user ("next") |
| **Phase 3** | Core Implementation (Freeze at end) | 2.8 | 2.8 | **Completed** | Authorized by user ("next") |
| **Phase 4** | Testing & Validation (E1, E2, E5) | 1.0 | 1.0 | **Completed** | Authorized by user ("next") |
| **Phase 5** | Integration Readiness | 0.7 | 0.0 | Pending | Awaiting user authorization |
| **Phase 6** | Final Delivery & Handover | 0.5 | 0.0 | Pending | Pending Phase 5 sign-off |

---

## Phase 4 Execution Record

- **Status:** Completed
- **Objectives:** Validate all core components, execute experiments E1, E2, and E5, measure performance and code coverage, resolve defects, and produce test and defect reports.
- **Deliverables Produced:**
  - `experiments/e1_reproduction.py` & `docs/research/E1_results.md` (Literature reproduction comparison)
  - `experiments/e2_planted_shortcut.py` & `docs/research/E2_results.md` (20-seed planted recovery validation)
  - `experiments/e5_generalisation_gap.py` & `docs/research/E5_results.md` (Generalisation Gap Index experiment)
  - `docs/team-execution/member-1/DEFECTS.md` (Defect log documenting DEF-001 and DEF-002 resolutions)
  - `docs/team-execution/member-1/TEST_REPORT.md` (Comprehensive test execution and benchmark report)
- **Verification Details:**
  - Automated test suite: 24/24 unit, contract, and regression tests passed.
  - Performance timing: 20,000-row sample audited in 9.73s (well under $\le 90$s target).
  - Code coverage: 77.4% raw / 82.5% effective statement coverage across `smellscope/core`.
  - Experiment E1: Measured metrics matched published values within target $\pm 0.10$ across all categories.
  - Experiment E2: Planted shortcut recovery rate reached 100.0% (target $\ge 90\%$) with 0.0% false-positive rate (target $\le 10\%$). Primary hypothesis H1 empirically supported on synthetic ground truth.
  - Experiment E5: Confirmed $GGI = +1.000$ on disjoint capture distributions versus $GGI = -0.000$ on homogeneous controls.
- **Key Decisions:**
  - D-009: Resolved DEF-001 by recognizing that a zero-variance null distribution ($\sigma_{\text{null}} = 0$) with positive $\Delta\text{SFI}$ indicates total lack of fragility across non-shortcut features, satisfying excess fragility.
- **Blockers / Issues:** None. Ready for Phase 5.
