# SmellScope 2.0 / 2.1 — Machine Learning Evaluation Protocol

## 1. Non-Negotiable Scientific Principles

In accordance with rigorous empirical standards:

1. **Separation of Training Convergence from Generalisation:**
   - Training accuracy measures optimization fit and capacity; it **must never** be presented as generalisation performance.
   - SmellScope reports three distinct partition evaluations:
     - **Train Split (60%):** Model fitting reference and internal convergence.
     - **Validation Split (20%):** Hyperparameter tuning and model checkpoint selection.
     - **Locked Test Split (20%):** Unseen holdout evaluation strictly for generalisation measurement.

2. **Locked Test Partition Invariance:**
   - The test partition is sealed prior to any exploration:
     $$\mathcal{X}_{\text{test}}^{(\text{before})} \equiv \mathcal{X}_{\text{test}}^{(\text{after})}$$
   - Preprocessing transformers, imputation medians, scalers, and quantile bounds are fit **strictly on the training split** and applied transform-only to validation and test splits. Zero leakage is permitted.
   - Cryptographic verification: A SHA-256 hash of the locked test partition is computed at initialization and verified at every re-benchmark. If any test ID changes or leaks into training, execution is blocked (`E_TEST_LEAK`).

---

## 2. Reference Classifier Architecture

SmellScope establishes dataset baseline performance using a standardized, deterministic Random Forest classifier:

- **Estimator Class:** `sklearn.ensemble.RandomForestClassifier`
- **Number of Estimators:** $100$ trees
- **Max Tree Depth:** `None` (unbounded growth to observe raw capacity)
- **Class Weighting:** `balanced_subsample` (automatically adjusts weights inversely proportional to class frequencies)
- **Random State:** Deterministically pinned to the run seed (default: `seed = 42`)
- **Parallel Workers:** In-process single-thread or loky workers with deterministic random seeds.

---

## 3. Comprehensive Evaluation Metrics

For every partition (Train, Val, Test), SmellScope computes:

| Metric | Formulation | Notes |
| :--- | :--- | :--- |
| **Accuracy** | $\frac{\text{TP} + \text{TN}}{\text{TP} + \text{TN} + \text{FP} + \text{FN}}$ | Global proportion of correct classifications. |
| **Precision** | $\frac{\text{TP}}{\text{TP} + \text{FP}}$ | Positive predictive value (attack specificity). |
| **Recall (TPR)** | $\frac{\text{TP}}{\text{TP} + \text{FN}}$ | True Positive Rate / Sensitivity on attack traffic. |
| **Specificity (TNR)** | $\frac{\text{TN}}{\text{TN} + \text{FP}}$ | True Negative Rate on benign traffic. |
| **False Positive Rate (FPR)** | $1 - \text{TNR} = \frac{\text{FP}}{\text{TN} + \text{FP}}$ | Proportion of benign flows falsely flagged as attacks. |
| **False Negative Rate (FNR)** | $1 - \text{TPR} = \frac{\text{FN}}{\text{TP} + \text{FN}}$ | Proportion of attacks missed by the classifier. |
| **Macro $F_1$ Score** | $\frac{1}{C} \sum_{c=1}^C F_{1, c}$ | Unweighted mean of per-class harmonic means; protects against minority class neglect. |
| **Weighted $F_1$ Score** | $\sum_{c=1}^C \frac{N_c}{N} F_{1, c}$ | Class-frequency weighted harmonic mean. |
| **ROC-AUC** | Area under ROC Curve | Computed via `predict_proba` with One-vs-Rest strategy. |
| **PR-AUC** | Area under Precision-Recall Curve | Robust to extreme class imbalance ($> 100:1$). |

---

## 4. Re-benchmarking After Dataset Improvement

When dataset improvements (such as feature ablation, deduplication, or finite clipping) are applied:
1. The new training view $\mathcal{V}_{\text{new}}$ is formed on the training split only.
2. A new baseline Random Forest is trained from scratch on $\mathcal{V}_{\text{new}}$.
3. The trained model is evaluated against the identical locked holdout test set $\mathcal{X}_{\text{test}}$.
4. **Performance Delta ($\Delta$):**
   $$\Delta \text{Metric} = \text{Metric}(\mathcal{V}_{\text{new}}, \mathcal{X}_{\text{test}}) - \text{Metric}(\mathcal{V}_{\text{orig}}, \mathcal{X}_{\text{test}})$$
5. **Trade-off Interpretation:**
   - If test $F_1$ decreases slightly ($\le 3\%$) while shortcut reliance ($\text{SFI}$) drops significantly ($\ge 40\%$), the improvement is scientifically successful: the model was stripped of superficial shortcuts and forced to rely on robust packet dynamics.
