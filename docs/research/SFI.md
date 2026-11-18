# Shortcut Fragility Index (SFI) & Monte Carlo Null Calibration

## 1. Motivation
Standard feature importance metrics (e.g. Gini importance, permutation importance) indicate which features a model uses, but they do NOT indicate whether the model's reliance on that feature represents an artificial dataset shortcut or legitimate attack behavior.

The **Null-Calibrated Shortcut Fragility Index (SFI)** quantifies how catastrophically a model's recall drops when candidate features are perturbed relative to an empirical null distribution of random feature perturbations.

---

## 2. Mathematical Definition

Let $M$ be a trained classifier, and let $R(M, D)$ be the recall on evaluation set $D$.
For a candidate feature $j$ and perturbation level $\delta \in [0, 1]$, we define the empirical fragility:

$$\text{Fragility}(j, \delta) = R(M, D) - R(M, \tilde{D}_j(\delta))$$

Where $\tilde{D}_j(\delta)$ represents the dataset with feature $j$ perturbed or masked by fraction $\delta$.

Integrating across $\delta \in [0, 1]$ yields the raw fragility area:
$$\text{SFI}_{\text{top}} = \int_0^1 \text{Fragility}(j^*, \delta) \, d\delta$$

---

## 3. Monte Carlo Null Calibration

To determine whether the observed fragility is statistically anomalous, SmellScope generates a Monte Carlo null distribution by drawing $B \ge 100$ random non-shortcut feature subsets $S_b$:

$$\text{SFI}_{\text{null}, b} = \int_0^1 \text{Fragility}(S_b, \delta) \, d\delta$$

From this distribution, we compute the sample mean $\mu_{\text{null}}$ and sample standard deviation $\sigma_{\text{null}}$.
The calibrated z-score is:

$$z = \frac{\text{SFI}_{\text{top}} - \mu_{\text{null}}}{\sigma_{\text{null}}}$$

---

## 4. Suspicion Criteria

A feature is flagged as a verified shortcut if and only if all three conditions are satisfied:
1. **Excess Fragility**: $\text{SFI}_{\text{top}} > \mu_{\text{null}} + 2\sigma_{\text{null}}$ ($z > 2.0$, or $p < 0.05$).
2. **High Dominance Precondition**: The feature exhibits $\text{HDF} \ge 0.60$.
3. **Controllability Risk**: The feature belongs to **Category A** (trivial attacker evasion, such as port numbers or window sizes).
