# Requirements Traceability & Execution Matrix

**Author:** Member 1 — Research Core Engineer  
**Status:** Approved for Implementation (Phase 1)

---

## 1. Requirements Traceability Matrix (FR $\to$ Test $\to$ Experiment)

| FR ID | Requirement Name | Priority | Test File | Test Case Name | Experiment / Target |
|---|---|---|---|---|---|
| **FR-001** | Train-Only Preprocessing | P0 | `tests/core/test_preprocess.py` | `test_train_only_fitting_no_leakage`, `test_constant_and_nan_columns` | Baseline integrity |
| **FR-002** | Unclear Ground Truth (UGT) | P0 | `tests/core/test_heuristics.py` | `test_ugt_known_mix`, `test_ugt_missing_port_column` | E1 Reproduction |
| **FR-003** | Wrong Labels (WL) | P0 | `tests/core/test_heuristics.py` | `test_wl_clean_vs_noisy_fixture`, `test_wl_tie_breaking_bias` | E1 Reproduction |
| **FR-004** | Highly Dependent Features (HDF) | P0 | `tests/core/test_heuristics.py` | `test_hdf_perfect_single_feature`, `test_hdf_random_noise` | E1 & E2 comparison |
| **FR-005** | Poor Data Diversity (PDD) | P0 | `tests/core/test_heuristics.py` | `test_pdd_identical_rows`, `test_pdd_separated_clusters` | E1 Reproduction |
| **FR-006** | Traffic Collapse (TC) | P0 | `tests/core/test_heuristics.py` | `test_tc_identical_vectors`, `test_tc_diffuse_vectors` | E1 Reproduction |
| **FR-007** | Baseline Evaluator | P0 | `tests/core/test_eval.py` | `test_fit_and_evaluate_binary_and_multiclass`, `test_seed_determinism` | Baseline evaluation |
| **FR-008** | Feature Taxonomy | P1 | `tests/core/test_taxonomy.py` | `test_classify_known_cic_and_unsw_columns`, `test_unmapped_columns` | SFI suspicion logic |
| **FR-009** | SFI Core Calculation | P1 | `tests/core/test_sfi.py` | `test_sfi_permutation_ranking`, `test_sfi_bounded_perturbation` | E2 Planted recovery |
| **FR-010** | SFI Null Calibration | P1 | `tests/core/test_sfi.py` | `test_sfi_null_draws_exclusion`, `test_sfi_z_score_calculation` | E2 Planted recovery |
| **FR-011** | Suspicion Flag Truth Table | P1 | `tests/core/test_sfi.py` | `test_suspicion_flag_truth_table_all_categories` | E2 Planted recovery |
| **FR-012** | Fragility Grid | P1 | `tests/core/test_sfi.py` | `test_fragility_grid_dimensions_and_corner` | Sensitivity visualisation |
| **FR-013** | Generalisation Gap Index (GGI) | P1 | `tests/core/test_ggi.py` | `test_ggi_disjoint_subtypes`, `test_ggi_insufficient_groups` | E5 Generalisation gap |
| **FR-014** | Cluster Assignments Export | P1 | `tests/core/test_audit.py` | `test_get_cluster_assignments_contract_and_determinism` | Remediation cluster guard |
| **FR-015** | Integrated `audit_class` | P0 | `tests/core/test_audit.py` | `test_audit_class_contract_conformance`, `test_audit_class_fault_isolation` | Core pipeline integration |
| **FR-016** | Planted Shortcut Generator | P1 | `tests/core/test_planted.py` | `test_make_planted_dataset_recovery_and_labels` | E2 Planted recovery |
| **FR-017** | Published Values Config | P1 | `tests/core/test_heuristics.py` | `test_published_values_yaml_validity` | E1 Literature ground truth |
| **FR-018** | Experiment E1 Reproduction | P1 | `experiments/e1_reproduction.py` | Standalone script execution | Output: `docs/research/E1_results.md` |
| **FR-019** | Experiment E2 Planted Recovery | P1 | `experiments/e2_planted_shortcut.py`| Standalone script execution | Output: `docs/research/E2_results.md` |
| **FR-020** | Experiment E5 Generalisation Gap | P1/P2 | `experiments/e5_generalisation_gap.py`| Standalone script execution | Output: `docs/research/E5_results.md` |
| **FR-021** | Research Documentation | P0 | Inspection | `docs/research/CORE_IMPLEMENTATION.md` | Paper vs Proposed review |
| **FR-022** | Strict Reproducibility | P0 | `tests/core/test_reproducibility.py`| `test_identical_seed_identical_output` | NFR-007 compliance |

---

## 2. Phase 3 Time Allocation Budget (Total: 2.8 h)

| Work Package | Requirements Covered | Allocated Hours | Focus / Deliverables |
|---|---|---|---|
| **WP-1: Preprocess & Heuristics** | FR-001, FR-002, FR-003, FR-004 | **0.6 h** | Train-only scaler/imputer, UGT, WL (ENN k=4), HDF (parallel RF) |
| **WP-2: Clustering & Collapse** | FR-005, FR-006, FR-014 | **0.4 h** | KMeans elbow determination, PDD weighted cosine, TC collapse, cluster export |
| **WP-3: Eval & Audit Assembly** | FR-007, FR-015, FR-021, FR-022 | **0.3 h** | Baseline RF, `audit_class` fault-isolated wrapper, reproducibility tests |
| **WP-4: Taxonomy** | FR-008 | **0.2 h** | YAML taxonomy mappings for CIC-2017 & UNSW, regex classifier |
| **WP-5: SFI, Null Model & Grid**| FR-009, FR-010, FR-011, FR-012 | **0.8 h** | Validation permutation ranking, bounded IQR noise, null model, z-score, flag |
| **WP-6: GGI & Cluster Proxy** | FR-013 | **0.3 h** | GroupKFold vs random-split F1, cluster proxy grouping |
| **WP-7: Planted Generator & Config**| FR-016, FR-017 | **0.2 h** | Synthetic ground-truth generator, literature reference YAML |
| **TOTAL** | All P0 & P1 Requirements | **2.8 h** | **Hard Freeze at End of Phase 3** |

---

## 3. Pre-Approved Cut-List Order

If any work package exceeds its budgeted time during Phase 3, features will be trimmed strictly according to this prioritized sequence:
1. **LOR (Local Overfitting Ratio):** Drop test neighbour search.
2. **Experiment E3:** Drop empirical agreement with manual findings.
3. **Experiment E4:** Drop feature ablation variants.
4. **Experiment E7:** Drop repeated multi-seed stability analysis.
5. **Fragility Grid Polish:** Restrict grid to $3 \times 3$ or omit interactive grid calculation.
6. **Conditional Shuffle Perturbation:** Maintain noise-based perturbation only; drop shuffle check.
7. **SFI Null Draws Fallback:** Reduce null draws from 50 to 20 (log as degradation).
8. **GGI Fallback:** Return `null` with `na_reasons["ggi.gap"] = "GGI disabled under time budget"`.

*Sacrosanct Features (NEVER Cut):*
- Train-only fitting and zero-leakage guarantee.
- Fault-isolation wrapper in `audit_class` (`n/a` over crash).
- Contract type and key conformance.
- Pre-registered decision thresholds.
