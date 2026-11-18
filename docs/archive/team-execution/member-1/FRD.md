# Functional Requirements Document (FRD) — Core Engine

**Module:** Core Engine (FR-001 to FR-099 namespace)  
**Author:** Member 1 — Research Core Engineer  
**Status:** Approved for Implementation (Phase 1)

---

## Requirements Specifications & Acceptance Criteria

### FR-001: Robust Train-Only Preprocessing
- **Priority:** P0
- **Description:** Provide `preprocess.fit_preprocessor(train_df, feature_cols, schema_id, cfg)` returning a transformer object with `.transform(df)`. The transformer performs median/mode imputation, one-hot/ordinal encoding, and min-max feature scaling.
- **Rules:**
  - Scaler, imputer, and encoders are fitted **strictly on `train_df`**.
  - Any column starting with `__` (e.g. `__row_id`) is strictly excluded from features.
  - Constant features (zero variance on train) are scaled to 0.0 without divide-by-zero errors.
  - Unseen categories in validation/test are imputed or handled safely without raising exceptions.
- **Acceptance Criteria & Tolerance:**
  - Automated test confirms `transform(test_df)` produces values in $[0.0, 1.0]$ for bounded columns and does not alter fitted mean/min/max attributes.
  - Zero NaNs or Infs present in transformed matrix.

### FR-002: Unclear Ground Truth (UGT) Heuristic
- **Priority:** P0
- **Description:** Compute $UGT_C$, the fraction of class $C$ flows whose destination port is in the background port set:
  $$\text{BG} = \{0, 53, 67, 68, 111, 123, 137, 161, 179, 389, 427, 520, 1723, 1900\}$$
- **Rules:** If `column_roles.dst_port` is `null` or missing, return `null` and record in `na_reasons["paper.UGT"] = "Destination port column not mapped"`.
- **Acceptance Criteria & Tolerance:**
  - Synthetic fixture with 80% background ports returns $UGT = 0.80 \pm 10^{-5}$.
  - Missing port column returns `null` with correct `na_reasons`.

### FR-003: Wrong Label (WL) Heuristic
- **Priority:** P0
- **Description:** Compute $WL_C$, the fraction of class $C$ samples misclassified by Edited Nearest Neighbour (ENN).
- **Rules:**
  - Implemented using $k=4$ nearest neighbours (via `NearestNeighbors(n_neighbors=5)` excluding self-query).
  - Ties are strictly broken in favour of the mislabelled class (per Flood et al.).
  - Secondary metric `details.wl_no_tie_bias` recorded without tie-breaking bias.
  - Subsampling cap applied (default 5000 rows) to bound $O(N^2)$ computation.
- **Acceptance Criteria & Tolerance:**
  - Separable fixture with 10% deliberately injected label flips returns $WL \ge 0.08$ and $\le 0.12$.
  - Clean separable synthetic fixture returns $WL = 0.0 \pm 10^{-5}$.

### FR-004: Highly Dependent Features (HDF) Heuristic
- **Priority:** P0
- **Description:** Compute $HDF_C$, the maximum single-feature $F1$ score obtained by training a shallow Random Forest (30 trees, depth $\le 8$) on each individual feature to separate class $C$ from benign.
- **Rules:** Parallelised across CPU cores using `joblib`. Return top feature name in `details.hdf_top_feature`.
- **Acceptance Criteria & Tolerance:**
  - Fixture with one perfectly predictive shortcut feature yields $HDF = 1.00 \pm 10^{-4}$ and identifies the exact feature name.
  - Random Gaussian noise features yield $HDF < 0.60$.

### FR-005: Poor Data Diversity (PDD) Heuristic
- **Priority:** P0
- **Description:** Apply KMeans clustering to class $C$ flows, determining optimal cluster count $N$ via the elbow method (inertia curvature). Compute average pairwise cosine similarity over 100 randomly sampled pairs per cluster, weighted by cluster size.
- **Rules:** Record cluster count in `details.pdd_n_clusters`. Fixed random seed.
- **Acceptance Criteria & Tolerance:**
  - Perfectly identical feature vectors yield $PDD = 1.00 \pm 10^{-4}$.
  - Two well-separated orthogonal clusters yield $N \ge 2$ and $PDD \approx 1.0$ within each cluster.

### FR-006: Traffic Collapse (TC) Heuristic
- **Priority:** P0
- **Description:** Using the same KMeans clusters from PDD, compute the maximum across clusters of the fraction of sampled pairs having cosine similarity $> 0.95$.
- **Acceptance Criteria & Tolerance:**
  - Identical vectors yield $TC = 1.00 \pm 10^{-4}$.
  - Uniformly distributed sphere points yield $TC < 0.05$.

### FR-007: Baseline Model Evaluation (`fit_and_evaluate`)
- **Priority:** P0
- **Description:** Train baseline RandomForest (100 trees) on `train_df` and evaluate on `test_df`. Preprocessing fitted strictly on `train_df`.
- **Rules:** Supports binary (`target_class` specified) and multiclass (`target_class=None`). Computes accuracy, F1, TPR, TNR, per-class precision/recall/F1/support.
- **Acceptance Criteria & Tolerance:**
  - Contract-compliant return dictionary matching Section 2.7.
  - Deterministic: two calls with seed 42 produce identical metrics.

### FR-008: Feature Controllability Taxonomy
- **Priority:** P1
- **Description:** Classify dataset column names into 4 categories:
  - **Category A:** Identifier / Network Metadata (IPs, Ports, Flow IDs, Timestamps).
  - **Category B:** Host / OS Fingerprint (TTL, Window size, MSS).
  - **Category C:** Controllable Packet Dynamics (Packet length stats, inter-arrival times).
  - **Category D:** Protocol Mechanism (SYN/FIN/RST flag counts, volumetric rates).
  - **UNMAPPED:** Any unrecognized column.
- **Rules:** Mappings defined in `config/taxonomy_cic2017.yaml` and `config/taxonomy_unsw.yaml` via regex and explicit overrides.
- **Acceptance Criteria & Tolerance:**
  - `Destination Port` $\to$ `A`; `sttl` $\to$ `B`; `Fwd Packet Length Mean` $\to$ `C`; `SYN Flag Count` $\to$ `D`.
  - Unrecognized column name returns `UNMAPPED` (never crashes).

### FR-009: Shortcut Fragility Index (SFI) Core
- **Priority:** P1
- **Description:** Calculate $SFI_{\text{top}}$ by perturbing the top-$k$ validation-ranked features of class $C$ test samples across $\delta \in \{0.05, 0.10, 0.20, 0.30\}$ scaled by feature IQR.
- **Rules:**
  - Feature ranking computed via permutation importance on validation set.
  - Perturbations clipped to training 1st–99th percentiles.
  - $R(0) = 0$ or test rows $< 10 \to$ return `null` and record in `na_reasons`.
- **Acceptance Criteria & Tolerance:**
  - Top feature of planted shortcut dataset ranks #1 in validation permutation importance.
  - Perturbed values strictly within $[q_{0.01}, q_{0.99}]$.
  - $SFI_{\text{top}} = 1 - \frac{1}{|\Delta|} \sum_{\delta} \frac{R(\delta)}{R(0)}$.

### FR-010: SFI Null Model Calibration
- **Priority:** P1
- **Description:** Draw $N_{\text{null}} = 50$ (fallback $20$) random feature subsets of size $k$ (excluding top-$k$). Compute null distribution of $SFI$, yielding $\mathbb{E}[SFI_{\text{null}}]$, $\sigma_{\text{null}}$, and $z = \frac{\Delta\text{SFI}}{\sigma_{\text{null}}}$.
- **Acceptance Criteria & Tolerance:**
  - Null draws exclude top-$k$ features.
  - If $\sigma_{\text{null}} = 0$, $z$ is returned as `null`.

### FR-011: Suspicion Flag Logic
- **Priority:** P1
- **Description:** Evaluate composite suspicion flag against pre-registered criteria:
  $HDF \ge 0.90 \land \Delta\text{SFI} > 0 \land z \ge 2.0 \land \text{CategoryEligible}$.
- **Acceptance Criteria & Tolerance:**
  - Truth table test confirms: Category D alone never triggers flag. Category A or B triggers flag. Category C triggers flag with `category_c_needs_context=True`.

### FR-012: Fragility Grid
- **Priority:** P1
- **Description:** Compute 2D fragility response grid for two selected features across a $\delta_1 \times \delta_2$ matrix.
- **Acceptance Criteria & Tolerance:**
  - Grid matches $(5 \times 5)$ shape. Point $(0, 0)$ equals baseline recall $R(0) \pm 10^{-5}$.

### FR-013: Generalisation Gap Index (GGI)
- **Priority:** P1
- **Description:** Compute $GGI_C = F1_{\text{random}} - F1_{\text{group}}$ using GroupKFold on provenance column if present, or KMeans proxy cluster labels if absent (`grouping: "cluster_proxy"`).
- **Acceptance Criteria & Tolerance:**
  - Disjoint cluster shortcut yields $GGI > 0.30$. Uniform distribution yields $GGI \approx 0.0 \pm 0.05$.

### FR-014: Cluster Assignments Export
- **Priority:** P1
- **Description:** Export cluster assignments matching PDD KMeans for downstream remediation cluster-coverage checks.
- **Acceptance Criteria & Tolerance:** Returns pandas Series indexed by `__row_id`.

### FR-015: Integrated `audit_class`
- **Priority:** P0
- **Description:** Orchestrate all core diagnostics for a single class. Wrap every measurement in an isolated try-except block so that individual failures return `null` and set `na_reasons`.
- **Acceptance Criteria & Tolerance:**
  - Exact match with Shared Contract Section 2.6 schema.
  - Injected runtime error in one metric does not crash the audit.

### FR-016: Ground-Truth Planted Shortcut Generator
- **Priority:** P1
- **Description:** Synthesize planted shortcut datasets by injecting a synthetic feature with specified predictive strength and label correlation.
- **Acceptance Criteria & Tolerance:**
  - Injected feature perfectly separates class in deterministic mode.
  - Ground truth dictionary returned containing injected column and correlation.

### FR-017: Pre-Registered Published Reference Values
- **Priority:** P1
- **Description:** Store Flood et al. published benchmark results in `config/published_values.yaml` with explicit paper citations (table/page).

### FR-018: Experiment E1 — Reproduction Analysis
- **Priority:** P1
- **Description:** Compare core heuristic outputs against published reference values. Record deviations and write `docs/research/E1_results.md` labeled `[measured]` or `[synthetic]`.

### FR-019: Experiment E2 — Planted Shortcut Recovery
- **Priority:** P1
- **Description:** Evaluate SFI sensitivity across $\ge 20$ seeds with planted shortcuts vs. clean controls. Verify recovery rate $\ge 90\%$ and false positive rate $\le 10\%$.

### FR-020: Experiment E5 — Generalisation Gap Analysis
- **Priority:** P1 / P2
- **Description:** Measure GGI across benchmark/synthetic classes and document findings in `docs/research/E5_results.md`.

### FR-021: Research Documentation: Paper vs. Proposed Separation
- **Priority:** P0
- **Description:** Create `docs/research/CORE_IMPLEMENTATION.md` detailing the clear distinction between Flood et al.'s work and SmellScope's proposed innovations.

### FR-022: Strict Reproducibility and Seed Invariance
- **Priority:** P0
- **Description:** All stochastic operations accept explicit seeds. Two runs with identical seeds yield identical results.
