# Technical Design Document — SmellScope Research Core Engine

**Module:** `smellscope.core`  
**Author:** Member 1 — Research Core Engineer  
**Status:** Approved Architecture (Phase 2)  
**Contract Version:** Shared Contract v1.0

---

## 1. System Architecture & Component Interaction

```mermaid
flowchart TB
    subgraph InputData["Input Data & Partitions"]
        DF["LoadedDataset (df, label_col, benign_label)"]
        SM["SplitManifest (train_ids, val_ids, test_ids)"]
    end

    subgraph PreprocessingPipeline["Preprocessing (Train-Only Fitted)"]
        PRE["preprocess.fit_preprocessor"]
        TR_SCALER["Fitted Imputer, Encoder, MinMax Scaler"]
        PRE --> TR_SCALER
    end

    subgraph Diagnostics["Core Analytical Engines"]
        direction TB
        HEUR["heuristics.py<br/>• compute_ugt<br/>• compute_wl (ENN k=4)<br/>• compute_hdf (Parallel RF)<br/>• compute_pdd_and_tc (KMeans Elbow)"]
        EVAL["eval.py<br/>• fit_and_evaluate (Baseline RF)"]
        TAX["taxonomy.py<br/>• classify_features (A/B/C/D/UNMAPPED)"]
        SFI["sfi.py<br/>• Permutation Importance on Val<br/>• Bounded IQR Perturbation<br/>• Monte Carlo Null Model (50 draws)<br/>• Suspicion Flag Evaluator<br/>• fragility_grid"]
        GGI["ggi.py<br/>• Random vs Group-Held-Out F1<br/>• Cluster Proxy Split"]
    end

    subgraph Integration["Aggregator & Downstream Export"]
        AUD["audit.py: audit_class"]
        CLUST["audit.py: get_cluster_assignments"]
        RES["ClassAuditResult (Contract Sec 2.6)"]
    end

    DF --> PRE
    SM --> PRE
    TR_SCALER --> HEUR
    TR_SCALER --> EVAL
    TR_SCALER --> SFI
    TR_SCALER --> GGI
    TAX --> SFI
    HEUR -->|PDD Clusters| GGI
    HEUR --> AUD
    EVAL --> AUD
    SFI --> AUD
    GGI --> AUD
    HEUR --> CLUST
    AUD --> RES
```

---

## 2. Detailed Data Flow & Execution Sequence

```mermaid
sequenceDiagram
    participant API as smellscope.api / Orchestrator (M2)
    participant AUD as audit.audit_class (M1)
    participant PRE as preprocess.fit_preprocessor (M1)
    participant H as heuristics.py (M1)
    participant EV as eval.fit_and_evaluate (M1)
    participant SFI as sfi.compute_sfi (M1)
    participant GGI as ggi.compute_ggi (M1)

    API->>AUD: audit_class(df, label_col, cls, benign, cfg, split)
    Note over AUD: Extract train, val, test subsets using split IDs
    AUD->>PRE: fit_preprocessor(train_df, feature_cols, schema_id, cfg)
    PRE-->>AUD: Preprocessor (fitted on train only)
    
    par Run Heuristics & Baseline
        AUD->>H: compute_ugt(df, label_col, cls, dst_port_col, cfg)
        AUD->>H: compute_wl(df, label_col, cls, benign, feature_cols, cfg)
        AUD->>H: compute_hdf(train_df, test_df, label_col, cls, benign, feature_cols, cfg)
        AUD->>H: compute_pdd_and_tc(df, label_col, cls, feature_cols, cfg)
        AUD->>EV: fit_and_evaluate(train_df, test_df, label_col, benign, feature_cols, cfg, target_class=cls)
    end

    Note over AUD: Obtain PDD cluster labels for class flows
    AUD->>SFI: compute_sfi(df, label_col, cls, benign, feature_cols, cfg, split)
    AUD->>GGI: compute_ggi(df, label_col, cls, benign, feature_cols, cfg, split, cluster_labels)
    
    Note over AUD: Trap individual measure exceptions into na_reasons
    AUD-->>API: ClassAuditResult dictionary
```

---

## 3. Algorithmic Specifications

### 3.1 Preprocessing (`preprocess.py`)
- **Train-Only Guarantee:** Imputation values (median for continuous, mode for categorical) and MinMax scaling bounds ($x_{\min}, x_{\max}$) are computed strictly over `train_df`. Validation and test frames are transformed via:
  $$x_{\text{scaled}} = \frac{x - x_{\min}^{\text{train}}}{x_{\max}^{\text{train}} - x_{\min}^{\text{train}} + \epsilon}$$
- **Zero Variance Protection:** If $x_{\max}^{\text{train}} - x_{\min}^{\text{train}} = 0$, all values map to $0.0$.
- **Column Exclusion:** Columns starting with `__` (e.g. `__row_id`) or matching `label_col` are strictly excluded from feature sets.

### 3.2 Five Literature Heuristics (`heuristics.py`)

#### 1. Unclear Ground Truth ($UGT_C$)
Fraction of class $C$ flows whose destination port is in Flood et al.'s background port set:
$$UGT_C = \frac{\sum_{i \in C} \mathbb{I}[x_{i, \text{port}} \in \text{BG}]}{|C|}$$
Where $\text{BG} = \{0, 53, 67, 68, 111, 123, 137, 161, 179, 389, 427, 520, 1723, 1900\}$. If destination port is unavailable, returns `null` with `na_reasons["paper.UGT"]`.

#### 2. Wrong Labels ($WL_C$)
Fraction of class $C$ samples misclassified by Edited Nearest Neighbour ($k=4$).
- Implemented via `sklearn.neighbors.NearestNeighbors(n_neighbors=5)` to exclude query point $i$.
- Ties ($2\text{ vs }2$) are broken in favour of the mislabelled class (per Flood et al.).
- Also records `details.wl_no_tie_bias` (neutral tie-break).
- Subsampling cap: $N \le 5000$ to bound runtime.

#### 3. Highly Dependent Features ($HDF_C$)
Max single-feature $F1$ score against benign:
$$HDF_C = \max_{j \in \text{Features}} F1\left(\text{RandomForest}_{30\text{ trees}, \text{depth}\le 8}(x_{\cdot, j})\right)$$
Parallelised across available cores via `joblib.Parallel(n_jobs=-1)`. Identifies `details.hdf_top_feature`.

#### 4. Poor Data Diversity ($PDD_C$) & 5. Traffic Collapse ($TC_C$)
- **Elbow Cluster Selection ($N$):** Fit KMeans for $K \in [2, K_{\max}]$ (default $K_{\max}=10$). The optimal $N$ is chosen at the point of maximum orthogonal distance from the chord connecting $(2, \text{Inertia}_2)$ and $(K_{\max}, \text{Inertia}_{K_{\max}})$.
- **Pairwise Cosine Sampling:** Within each cluster $k \in \{1, \dots, N\}$, sample up to 100 random pairs $(u, v)$ without replacement. Compute cosine similarity:
  $$S(u, v) = \frac{u \cdot v}{\|u\|_2 \|v\|_2}$$
- **$PDD_C$:** Weighted average similarity across clusters:
  $$PDD_C = \sum_{k=1}^N \frac{n_k}{|C|} \left( \frac{1}{|P_k|} \sum_{(u,v) \in P_k} S(u, v) \right)$$
- **$TC_C$:** Maximum fraction of sampled pairs with extreme collapse:
  $$TC_C = \max_{k \in \{1,\dots,N\}} \frac{1}{|P_k|} \sum_{(u,v) \in P_k} \mathbb{I}[S(u, v) > 0.95]$$

---

### 3.3 Shortcut Fragility Index (SFI) Formulation (`sfi.py`)

1. **Top-$k$ Ranking:** Train baseline RF on train partition. Compute permutation importance on **validation** partition to identify the top-$k$ ($k=3$) most critical features.
2. **Baseline Recall:** Evaluate class $C$ recall on the locked test partition: $R(0)$. If $R(0) = 0$ or $N_{\text{test}} < 10$, return `null` and record in `na_reasons`.
3. **Distribution-Aware Perturbation:** Perturb test class $C$ samples on top-$k$ features. Perturbation noise is scaled by the feature's training Interquartile Range ($IQR_j = Q_{0.75}(j) - Q_{0.25}(j)$):
   $$\tilde{x}_{i, j} = \text{clip}\left( x_{i, j} + \mathcal{N}\left(0, (\delta \cdot IQR_j)^2\right), Q_{0.01}(j), Q_{0.99}(j) \right)$$
   For $\delta \in \{0.05, 0.10, 0.20, 0.30\}$.
4. **SFI Score:**
   $$SFI_{\text{top}} = 1 - \frac{1}{|\Delta|} \sum_{\delta \in \Delta} \frac{R(\delta)}{R(0)}$$
5. **Monte Carlo Null Model:** Draw $N_{\text{null}} = 50$ random feature subsets of size $k$ (excluding top-$k$). Calculate $SFI_{\text{null}}^{(b)}$ for each draw, yielding mean $\mu_{\text{null}}$ and standard deviation $\sigma_{\text{null}}$.
   $$\Delta\text{SFI} = SFI_{\text{top}} - \mu_{\text{null}}, \quad z = \frac{\Delta\text{SFI}}{\sigma_{\text{null}}} \quad (\text{if } \sigma_{\text{null}} > 0)$$
6. **Suspicion Flag:**
   $$\text{Flag} = (HDF \ge 0.90) \land (\Delta\text{SFI} > 0) \land (z \ge 2.0) \land \text{CategoryEligible}$$

---

### 3.4 Generalisation Gap Index (GGI) Formulation (`ggi.py`)
$$GGI_C = F1_{\text{random-split}} - F1_{\text{group-held-out}}$$
Where group-held-out uses `group_col` if present (provenance capture), or KMeans proxy cluster labels if absent (`grouping: "cluster_proxy"`). Minimum 3 groups required.

---

## 4. Module Dependency Matrix

| Module | Depends On (Internal) | External Dependencies |
|---|---|---|
| `smellscope.core.preprocess` | `errors` | `numpy`, `pandas`, `sklearn` |
| `smellscope.core.heuristics` | `preprocess`, `errors` | `numpy`, `pandas`, `sklearn`, `joblib`, `yaml` |
| `smellscope.core.eval` | `preprocess`, `errors` | `numpy`, `pandas`, `sklearn` |
| `smellscope.core.taxonomy` | `errors` | `yaml`, `re` |
| `smellscope.core.sfi` | `preprocess`, `taxonomy`, `eval`, `errors` | `numpy`, `pandas`, `sklearn` |
| `smellscope.core.ggi` | `preprocess`, `eval`, `errors` | `numpy`, `pandas`, `sklearn` |
| `smellscope.core.audit` | all above modules | `numpy`, `pandas`, `sklearn` |
| `smellscope.core.planted` | `errors` | `numpy`, `pandas` |
