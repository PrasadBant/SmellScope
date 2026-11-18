# Member 1 Phase Progress — Research Core Engine

**Member:** Member 1 (Research Core: heuristics, SFI, GGI, evaluation)  
**Branch:** `feature/member-1-core-engine`  
**Total Allocated Budget:** 6.5 person-hours  
**Cumulative Hours Used:** 4.3 h  

---

## Phase Summary Table

| Phase | Description | Budget (h) | Actual (h) | Status | Authorization Date / Note |
|---|---|---|---|---|---|
| **Phase 0** | Context & Repository Audit | 0.3 | 0.3 | **Completed** | Authorized by initial prompt |
| **Phase 1** | Requirements & Specifications | 0.5 | 0.5 | **Completed** | Authorized by user ("next") |
| **Phase 2** | Architecture & Contracts | 0.7 | 0.7 | **Completed** | Authorized by user ("next") |
| **Phase 3** | Core Implementation (Freeze at end) | 2.8 | 2.8 | **Completed** | Authorized by user ("next") |
| **Phase 4** | Testing & Validation (E1, E2, E5) | 1.0 | 0.0 | Pending | Awaiting user authorization |
| **Phase 5** | Integration Readiness | 0.7 | 0.0 | Pending | Pending Phase 4 sign-off |
| **Phase 6** | Final Delivery & Handover | 0.5 | 0.0 | Pending | Pending Phase 5 sign-off |

---

## Phase 3 Execution Record

- **Status:** Completed (**FEATURE FREEZE ENACTED**)
- **Objectives:** Implement all P0 and P1 core components, including preprocessing, 5 heuristics, baseline evaluation, feature taxonomy, null-calibrated SFI, fragility grid, GGI, cluster assignments, planted dataset generator, and published reference data.
- **Deliverables Produced:**
  - `smellscope/core/preprocess.py`: Train-only fitting, imputation, encoding, min-max scaling, constant protection.
  - `smellscope/core/heuristics.py`: Complete implementation of UGT, WL (ENN $k=4$ with tie bias), HDF (parallel single-feature RF), PDD and TC (KMeans elbow chord-distance + pairwise cosine).
  - `smellscope/core/eval.py`: Baseline RandomForest (100 trees) evaluation for binary and multiclass.
  - `smellscope/core/taxonomy.py`: Automated classification into Categories A, B, C, D, and UNMAPPED.
  - `config/taxonomy_cic2017.yaml`, `config/taxonomy_unsw.yaml`: Schema mappings.
  - `smellscope/core/sfi.py`: Full SFI algorithm: validation permutation ranking, bounded IQR noise, Monte Carlo null model ($N_{\text{null}}=50$), $z$-score, suspicion flag truth table, and `fragility_grid`.
  - `smellscope/core/ggi.py`: Generalisation Gap Index comparing random vs group-held-out (provenance or cluster-proxy).
  - `smellscope/core/audit.py`: `audit_class` wrapper with fault isolation, and `get_cluster_assignments`.
  - `smellscope/core/planted.py`: Synthetic ground-truth planted shortcut dataset generator.
  - `config/published_values.yaml`: Pre-registered literature benchmark values from Flood et al.
  - `docs/research/CORE_IMPLEMENTATION.md`: Research lineage document cleanly delineating `[PAPER]` reimplementations from `[PROPOSED]` additions.
  - Test suite (24 tests total): `test_preprocess.py`, `test_heuristics.py`, `test_eval.py`, `test_taxonomy.py`, `test_sfi.py`, `test_ggi.py`, `test_audit.py`, `test_reproducibility.py`.
- **Verification Details:**
  - Automated test execution: 24/24 tests passed in 16.50s.
  - Contract conformance: `audit_class` verified against every field and type of Shared Contract v1.0 Section 2.6.
  - Fault isolation: Injected failures (missing port column, broken feature) safely trapped into `na_reasons` without crashing audit.
  - Reproducibility: Bit-identical results on repeated runs with seed 42.
- **Key Decisions:**
  - D-007: Implemented 2D vector cross-product directly without calling deprecated numpy 2.0 `np.cross(2d)` to prevent warning logs.
  - D-008: Enacted **HARD FEATURE FREEZE** at cumulative hour 4.3. No new features will be introduced in Phases 4–6.
- **Blockers / Issues:** None. Ready for Phase 4.
