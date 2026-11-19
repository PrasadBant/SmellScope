# SmellScope 2.0 / 2.1 — Dataset Audit Methodology & Mathematical Reference

## 1. Introduction

Machine learning models for Network Intrusion Detection Systems (NIDS) routinely achieve $\ge 99\%$ accuracy on academic benchmark datasets, yet perform poorly when deployed on live network links. 

SmellScope implements an evidence-driven scientific audit pipeline designed to detect whether classifier success is driven by genuine network attack signatures or by dataset design weaknesses ("dataset smells").

---

## 2. The Five Published Dataset Smell Heuristics

### 2.1. UGT — Uniform Flow-Group Top-Port Concentration
- **Scientific Objective:** Detects whether an attack class exclusively targets one or two specific destination ports (e.g. PortScan exclusively targeting port 80 or 443).
- **Mathematical Formulation:**
  Let $P = \{p_1, p_2, \dots, p_m\}$ be the empirical port distribution for attack class $c$.
  $$\text{UGT}(c) = 1 - \frac{H(P)}{\log_2 |P|}$$
  where $H(P) = -\sum_{i=1}^m p_i \log_2 p_i$ is the Shannon entropy over destination ports.
  When all flows target a single port, $H(P) = 0 \implies \text{UGT} = 1.0$.
- **Severity Thresholds:**
  - $\text{UGT} < 0.40$: Normal dispersion.
  - $0.40 \le \text{UGT} \le 0.80$: Port concentration warning.
  - $\text{UGT} > 0.80$: Critical smell; model will act as a trivial port filter.

### 2.2. WL — Watershed Leakage
- **Scientific Objective:** Quantifies feature value leakage between benign and attack classes caused by shared network environment characteristics or identical capture parameters.
- **Mathematical Formulation:**
  $$\text{WL}(f) = 1 - \text{Overlap}(P_{\text{attack}}(f), P_{\text{benign}}(f))$$
  where $\text{Overlap}$ evaluates the Bhattacharyya coefficient or histogram intersection between normalized class distributions.
- **Severity Thresholds:**
  - $\text{WL} > 0.80$: Severe distribution separation driven by capture environment rather than attack semantics.

### 2.3. HDF — Heavy-Hitter Distinct Features
- **Scientific Objective:** Determines if a single numerical feature achieves near-perfect separability without multi-variate modeling.
- **Mathematical Formulation:**
  $$\text{HDF}(c) = \max_{f \in \mathcal{F}} \text{ROC-AUC}(f, y_c)$$
- **Severity Thresholds:**
  - $\text{HDF} > 0.85$: A single feature dominates decision boundaries, creating vulnerability to evasion via slight parameter modulation.

### 2.4. PDD — Pairwise Distinct Duplicates
- **Scientific Objective:** Quantifies duplicate and near-duplicate feature vectors across training, validation, and test splits.
- **Mathematical Formulation:**
  $$\text{PDD} = \frac{|\mathcal{X}_{\text{train}} \cap \mathcal{X}_{\text{test}}|}{|\mathcal{X}_{\text{test}}|}$$
- **Severity Thresholds:**
  - $\text{PDD} > 0.05$: Greater than $5\%$ split contamination; test accuracy is inflated by memorization.

### 2.5. TC — Temporal Coherence
- **Scientific Objective:** Identifies whether attack traffic was collected in contiguous bursts, creating temporal autocorrelation artifacts.
- **Mathematical Formulation:**
  $$\text{TC}(c) = \text{Lag-1 Autocorrelation of class appearance sequence}$$
- **Severity Thresholds:**
  - $\text{TC} > 0.50$: Attacks appear in isolated time blocks; shuffling inflates cross-validation performance.

---

## 3. Advanced Novel Evaluators

### 3.1. Shortcut Fragility Index (SFI)
- **Objective:** Evaluates whether model performance collapses when top-ranking features are subjected to bounded perturbations.
- **Procedure:**
  1. Rank features by Gini importance or permutation drop: $\mathcal{F}_{\text{top}} = \{f_1, \dots, f_k\}$ ($k=3$).
  2. For perturbation scale $\delta \in [0.1, 1.0]$:
     - Perturb top features: $x'_{f} = x_f \cdot (1 + \delta \cdot \mathcal{N}(0, 1))$.
     - Draw $N_{\text{null}} = 20$ random non-top feature subsets $\mathcal{F}_{\text{null}}$ and perturb identically.
  3. Compute Recall drop:
     $$\Delta \text{SFI} = \text{Recall}_{\text{baseline}} - \text{Recall}_{\text{perturbed}}(\mathcal{F}_{\text{top}})$$
  4. Flag Condition:
     $$\text{Flag} = \text{True} \iff \Delta \text{SFI} > 0.20 \quad \text{AND} \quad z = \frac{\Delta \text{SFI} - \mu_{\text{null}}}{\sigma_{\text{null}}} > 2.0$$

### 3.2. Generalisation Gap Index (GGI) & LOR
- **Objective:** Compares model performance under standard random splitting vs. grouped splitting (by subnet, capture day, or attack tool).
- **Formulation:**
  $$\text{GGI} = F_{1, \text{random}} - F_{1, \text{grouped}}$$
  $$\text{LOR} = \frac{\text{Odds}(\text{Duplicate in same group})}{\text{Odds}(\text{Duplicate in holdout group})}$$
- **Interpretation:**
  $\text{GGI} > 0.20$ proves that the model failed to generalize beyond the specific capture environment or network subnet.
