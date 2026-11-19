# SmellScope 2.0 / 2.1 — 100% Accuracy Diagnostic Audit Reference

## 1. The 100% Accuracy Problem in NIDS Research

In machine learning for Network Intrusion Detection Systems, achieving **100% (or $\ge 99\%$) accuracy** is frequently celebrated in literature, but in practice is an urgent warning sign requiring investigation.

### Scientific Axioms
1. **Never assume 100% accuracy means overfitting:** Overfitting typically manifests as high training accuracy accompanied by degraded test accuracy ($Acc_{\text{train}} \gg Acc_{\text{test}}$). If test accuracy is also 100%, overfitting alone does not explain the result.
2. **Never assume 100% accuracy means good generalisation:** Perfect test accuracy often stems from data contamination, identical duplicate flows across splits, or dataset-specific environment artifacts (e.g. all attacks originating from a single IP address or targeting a single port).
3. **Always investigate across multiple empirical dimensions:** SmellScope triggers the **"100% Accuracy — Verification Required"** diagnostic protocol whenever any partition accuracy $\ge 0.99$.

---

## 2. The 14 Inspection Dimensions

| # | Inspection Dimension | Evaluation Method | Critical / Concern Threshold |
| :---: | :--- | :--- | :--- |
| **1** | **Train vs. Validation Gap** | $|Acc_{\text{train}} - Acc_{\text{val}}|$ | $\text{Gap} > 0.05 \implies$ Overfitting concern. |
| **2** | **Train vs. Test Gap** | $|Acc_{\text{train}} - Acc_{\text{test}}|$ | $\text{Gap} > 0.05 \implies$ Overfitting / distribution shift. |
| **3** | **Exact Duplicate Records Across Splits** | $|\mathcal{X}_{\text{train}} \cap \mathcal{X}_{\text{test}}|$ | $> 0 \implies$ Contamination / memorization leak. |
| **4** | **Leakage-Odds Ratio (LOR)** | Odds ratio of split duplication | $\text{LOR} > 2.0 \implies$ Significant split contamination. |
| **5** | **Direct Label Correlation** | $\max_f |\rho(f, y)|$ (Pearson / Point-Biserial) | $|\rho| > 0.95 \implies$ Target encoding or surrogate label. |
| **6** | **Answer-Encoding Features** | Search for flag, status, code, flow ID | Column names resembling class labels. |
| **7** | **Category A Feature Reliance** | Permutation importance on port/IP/subnet | Top predictive feature is Category A. |
| **8** | **Port Number Shortcuts** | $\text{UGT} > 0.80$ (Gini coefficient on ports) | Model acts as a simple firewall rule. |
| **9** | **Collection-Source Dependence** | Information gain on IP or MAC address | Attack tied to single collection machine. |
| **10** | **Class Imbalance Masking** | Minority class fraction $< 0.01$ | High accuracy masking 0% recall on attacks. |
| **11** | **Locked Test Support Adequacy** | $N_{\text{test, attack}} < 30$ | Sample size too small for statistical power. |
| **12** | **Generalisation Gap Index (GGI)** | $F_{1, \text{random}} - F_{1, \text{grouped}}$ | $\text{Gap} > 0.20 \implies$ Domain generalisation failure. |
| **13** | **Zero-Variance / Degenerate Features** | $\sigma^2(f) = 0$ in train or test | Features that collapse or become constant. |
| **14** | **Seed Invariance & Stability** | Variance across seeds $\{42, 1337, 2026\}$ | $\sigma_{\text{acc}} > 0.02 \implies$ Fragile optimization fluke. |

---

## 3. Case Taxonomy: Cases A Through E

SmellScope automatically synthesizes the 14 inspection dimensions into one of five mutually exclusive scientific findings:

### Case A: Severe Overfitting
- **Condition:** $Acc_{\text{train}} \ge 0.99$, but $Acc_{\text{val}} < 0.95$ or $Acc_{\text{test}} < 0.95$.
- **Diagnosis:** The classifier memorized idiosyncrasies of the training partition; decision boundaries fail to generalize to holdout data.
- **Action:** Regularize model parameters (e.g., limit tree depth, increase `min_samples_leaf`), apply feature selection, or gather more diverse training examples.

### Case B: Dataset Contamination & Split Leakage
- **Condition:** Exact duplicates found across splits ($N_{\text{dup}} > 0$), or $\text{LOR} > 2.0$.
- **Diagnosis:** Test set records are identical or nearly identical to training records. The 100% test score is an artifact of memorization, not learning.
- **Action:** Deduplicate dataset across splits before partitioning; apply grouped splitting by capture day or subnet.

### Case C: Environment Shortcut Dependence
- **Condition:** $\text{UGT} > 0.80$, or SFI flag triggered on a Category A feature (e.g. `Destination Port`).
- **Diagnosis:** The model is not detecting malicious network packet dynamics; it is detecting the fixed port, IP address, or collection environment where the attack was generated.
- **Action:** Apply R1 Feature Ablation to suppress the shortcut feature (e.g. ablate `Destination Port`), then re-train and re-evaluate on the locked test partition.

### Case D: High Inherent Separability (Validated Genuine Benchmark)
- **Condition:** $Acc \ge 0.99$ across Train, Val, and Locked Test; zero duplicate leakage ($N_{\text{dup}} = 0$); no Category A reliance; balanced class support ($N_{\text{test}} \ge 30$); stable across seeds.
- **Diagnosis:** Valid scientific result. The attack pattern produces distinct physical packet dynamics (e.g. volumetric flood or systematic SYN sweep) that are genuinely distinguishable from normal background traffic.
- **Action:** Document the complete experimental methodology and locked test invariant in the research report; confirm using grouped cross-validation (GGI).

### Case E: Small Sample Size Deficiency
- **Condition:** Total test sample count $N_{\text{test}} < 30$ flows.
- **Diagnosis:** Insufficient statistical power to conclude 100% accuracy. A single missed flow would cause a drastic multi-percentage drop.
- **Action:** Augment dataset with additional verified capture sessions to ensure test partition contains at least $100$ independent attack flows.
