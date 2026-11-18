# Core Implementation & Scientific Lineage: [PAPER] vs. [PROPOSED]

**Project:** SmellScope — NIDS Benchmark Dataset Trust Auditor  
**Author:** Member 1 — Research Core Engineer  
**Status:** Phase 3 First Draft (Feature Freeze)

---

## 1. Distinction Matrix: Literature Baseline vs. Novel Contributions

| Component | Source / Label | Description | Scientific Scope & Role |
|---|---|---|---|
| **UGT (Unclear Ground Truth)** | `[PAPER]` | Fraction of class flows with destination port in background port set BG. | Diagnostic reimplementation from Flood et al. Table 4. Not our novel contribution. |
| **WL (Wrong Labels)** | `[PAPER]` | Fraction of class samples misclassified by Edited Nearest Neighbour ($k=4$). | Reimplementation of Flood et al. algorithm with tie-bias toward mislabelled class. |
| **HDF (Highly Dependent Features)** | `[PAPER]` | Maximum single-feature $F1$ score against background traffic. | Reimplementation of Flood et al. single-feature Random Forest. |
| **PDD (Poor Data Diversity)** | `[PAPER]` | KMeans clustering with elbow method; pairwise cosine similarity weighted by cluster size. | Reimplementation of Flood et al. cluster diversity diagnostic. |
| **TC (Traffic Collapse)** | `[PAPER]` | Maximum cluster fraction of sampled pairs with cosine similarity $> 0.95$. | Reimplementation of Flood et al. traffic collapse diagnostic. |
| **Train-Only Preprocessing** | `[PROPOSED]` | Preprocessor fitted strictly on training partition with constant feature protection. | Engineering safeguard to guarantee zero data leakage into validation or locked test partitions. |
| **Controllability Taxonomy** | `[PROPOSED]` | 4-tier categorization (A: metadata, B: fingerprint, C: dynamics, D: mechanism) for CIC and UNSW. | Semantic contextualisation of features based on attacker controllability. |
| **SFI (Shortcut Fragility Index)** | `[PROPOSED]` | Validation permutation ranking, bounded IQR noise perturbation, test recall decay curve. | Primary innovation: formalisation of Flood et al. Sec. 6.2 into a calibrated quantitative index. |
| **Null Model Calibration** | `[PROPOSED]` | Monte Carlo sampling of random feature sets; $\Delta\text{SFI} = \text{SFI}_{\text{top}} - \mu_{\text{null}}$ and $z$-score. | Statistical calibration to test whether top-feature sensitivity exceeds general model fragility. |
| **GGI (Generalisation Gap Index)** | `[PROPOSED]` | Drop in macro $F1$ between random split and group-held-out cross-validation. | Supporting diagnostic to evaluate generalisation across capture sub-environments or cluster proxies. |
| **Ground-Truth Planted Generator** | `[PROPOSED]` | Injection of synthetic controllable shortcut features with known correlation into base data. | Controlled empirical validation mechanism (`[synthetic]`). |

---

## 2. Known Implementation Choices & Literature Ambiguities Resolved

1. **ENN $k=4$ Implementation:**
   - *Ambiguity:* Flood et al. state $k=4$ nearest neighbours. In scikit-learn `NearestNeighbors`, query points match themselves at distance 0.
   - *Resolution:* Implemented with `n_neighbors=5`, dropping self, yielding exactly 4 neighbours. Ties (2 class vs 2 benign) are broken in favour of the mislabelled class per Flood et al., and secondary metric `wl_no_tie_bias` is recorded for neutral comparison.
2. **PDD / TC Elbow Selection:**
   - *Ambiguity:* The paper mentions "elbow method picks N" without stating the exact geometric rule.
   - *Resolution:* Implemented via maximum orthogonal distance to the chord connecting $(2, \text{Inertia}_2)$ and $(K_{\max}, \text{Inertia}_{K_{\max}})$.
3. **Null Model Sample Size:**
   - Default is 50 draws; an automated fallback to 20 draws is supported and logged in `degradations` if execution budget is constrained.

---

## 3. Scientific Limitations & Interpretation Boundaries

- **SFI is a sensitivity indicator, NOT proof of causal spuriousness:** High SFI demonstrates that the model's test performance relies disproportionately on specific features. It does not prove by itself that the feature cannot correlate with attack behavior in the real world.
- **Taxonomy is Subjective:** Feature classification into Categories A/B/C/D relies on domain knowledge and protocol specifications. It should always be open to expert review via YAML overrides.
- **GGI with Cluster Proxy:** When true capture provenance (e.g. PCAP session metadata) is unavailable, GGI uses KMeans cluster labels as a proxy. Cluster-proxy GGI approximates internal sub-distribution shift, not genuine multi-network capture generalization.
- **High HDF Ambiguity:** HDF measures whether a single feature separates the classes. A genuine attack signature (such as high SYN rate in a volumetric SYN flood) can have HDF = 1.0; this is why Category D features are exempted from automated suspicion flags.
