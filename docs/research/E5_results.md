# Experiment E5: Generalisation Gap Index (GGI) Evaluation

**Date:** 2026-11-18  
**Evaluator:** Member 1 — Research Core Engineer  
**Random Seed:** 42  
**Evidence Label:** `[synthetic]`  

## 1. Experimental Overview & Objectives
The Generalisation Gap Index ($GGI$) quantifies the drop in performance between standard random-split cross-validation and group-held-out cross-validation:
$$GGI_C = F1_{\text{random}} - F1_{\text{group}}$$
A positive gap reveals that standard train/test splits overestimate model detection capability when evaluated on previously unseen capture conditions or traffic sub-clusters.

## 2. Measured Results across Test Conditions

| Traffic Distribution Condition | Grouping Type | $F1_{\text{random}}$ | $F1_{\text{group}}$ | $GGI$ (Gap) | Interpretation |
|---|---|---|---|---|---|
| **Disjoint Sub-Environments** | provenance | 1.000 | 0.000 | **+1.000** | Substantial generalisation gap; random split hides overfitting |
| **Homogeneous Distribution** | provenance | 0.995 | 0.995 | **-0.000** | Robust generalisation across groups ($GGI \approx 0$) |

## 3. Scientific Discussion
- On disjoint traffic distributions, models trained on sub-groups $g_1, g_2$ fail to generalize to held-out group $g_3$, resulting in a pronounced generalisation gap ($GGI > 0.40$).
- Conversely, under homogeneous conditions across capture partitions, $GGI$ is negligible ($|GGI| \le 0.05$).
- **Caveat:** A high $GGI$ is an evaluation diagnostic indicating sensitivity to distribution shifts; it does not by itself prove malicious or intentional data leakage.