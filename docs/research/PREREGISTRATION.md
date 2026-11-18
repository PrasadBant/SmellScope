# Pre-Registration of Hypotheses, Metrics, and Decision Thresholds

**Date of Pre-Registration:** 2026-11-18  
**Author:** Member 1 — Research Core Engineer  
**Status:** FROZEN BEFORE EVALUATION (Phase 1)

---

## 1. Scientific Hypotheses

### Primary Hypothesis (H1)
On NIDS benchmark attack classes exhibiting artefact-driven separation, perturbing top validation-ranked features will degrade test recall substantially more than perturbing random feature subsets of equal cardinality:
$$\Delta\text{SFI} = \text{SFI}_{\text{top}} - \mathbb{E}[\text{SFI}_{\text{null}}] > 0$$
Furthermore, $\Delta\text{SFI}$ combined with the feature-controllability taxonomy separates shortcut-driven classes from genuine behavioural indicators more reliably than High Feature Dependency ($HDF$) alone.

### Null Hypothesis / Falsifier (H0)
Perturbing top-ranked features produces no degradation exceeding the random null distribution ($\Delta\text{SFI} \le 0$ or $z < z_{\text{threshold}}$). Under $H0$, the proposed SFI offers no discriminative signal beyond single-feature F1 ($HDF$). A finding supporting $H0$ will be reported transparently as a valid scientific result.

---

## 2. Pre-Registered Parameter Values

These values are codified in `config/heuristics.yaml` and will **not** be tuned on test set outcomes.

| Parameter | Pre-registered Value | Rationale / Source |
|---|---|---|
| `sfi.k` | `3` | Permutation importance validation top-k; focuses on dominant shortcut candidates. |
| `sfi.deltas` | `[0.05, 0.10, 0.20, 0.30]` | Bounded perturbation scaling relative to feature training Interquartile Range (IQR). |
| `sfi.n_null` | `50` | Number of Monte Carlo draws for random feature null distribution (fallback `20` logged). |
| `sfi.hdf_high` | `0.90` | Condition (a) for suspicion flag: single feature achieves $F1 \ge 0.90$. |
| `sfi.z_threshold` | `2.0` | Condition (b) for excess fragility: $z = \Delta\text{SFI} / \sigma_{\text{null}} \ge 2.0$ ($p \approx 0.023$ one-tailed). |
| `sfi.quantiles` | `[0.01, 0.99]` | Strict bounding: perturbed values are clipped to training 1st and 99th percentiles. |
| `sfi.min_test_examples` | `10` | Classes with $< 10$ test rows return `n/a` to prevent high-variance artifacts. |
| `heuristics.bg_ports` | `[0, 53, 67, 68, 111, 123, 137, 161, 179, 389, 427, 520, 1723, 1900]` | Set of background server ports from Flood et al. EuroS&P 2024 Table 4. |
| `heuristics.enn.k` | `4` | $k=4$ nearest neighbours (5 NN minus self) with tie-breaking biased toward mislabelled class. |
| `heuristics.clustering.tc_threshold`| `0.95` | Traffic Collapse threshold for pairwise cosine similarity from Flood et al. |
| `ggi.min_groups` | `3` | Minimum partitions required to compute group-held-out cross-validation. |
| `ggi.lor_threshold` | `0.95` | Local Overfitting Ratio cosine similarity threshold. |

---

## 3. Suspicion Flag Truth Table (Pre-Registered)

The overall suspicion flag (`ClassAuditResult.sfi.flag`) evaluates as `True` if and only if **all three** criteria are satisfied:
1. **$HDF$ Condition:** $HDF \ge 0.90$.
2. **Excess Fragility Condition:** $\Delta\text{SFI} > 0$ AND $z \ge 2.0$ (with $\sigma_{\text{null}} > 0$).
3. **Category Eligibility:**
   - If any top feature is in **Category A** (metadata/identifier) or **Category B** (host/environment fingerprint) $\to$ Eligible (`flag = True`).
   - If top features are only in **Category C** (packet size/timing) $\to$ Flag set to `True` with note `"needs context"`.
   - If top features are strictly in **Category D** (protocol mechanism, e.g., SYN flag in SYN flood) $\to$ Ineligible (`flag = False`).

Any deviation from this logic in Phase 3 or 4 will be treated as an explicit defect.
