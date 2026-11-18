# Generalisation Gap Index (GGI)

## 1. Overview
The **Generalisation Gap Index (GGI)** evaluates whether a classifier trained on a benchmark dataset is learning generalizable attack patterns or merely memorizing specific tool signatures and collection environment parameters.

---

## 2. Evaluation Formulation

GGI compares evaluation performance under two distinct evaluation splits:

1. **Random IID Split ($F_{1, \text{random}}$)**: Standard stratified 60/20/20 train/test split where attack variants and tools are randomly mixed across both sets.
2. **Grouped / Subtype-Disjoint Split ($F_{1, \text{grouped}}$)**: Split where specific tool variants, IP subnets, or recording days are held out exclusively in the test set.

$$\text{GGI} = \max(0, F_{1, \text{random}} - F_{1, \text{grouped}})$$

---

## 3. Interpretation

- **$\text{GGI} \le 0.05$ (Robust Generalization)**: The classifier maintains its predictive capability across unseen attack variations and configurations.
- **$0.05 < \text{GGI} < 0.20$ (Moderate Gap)**: The model demonstrates minor dependence on specific script configurations.
- **$\text{GGI} \ge 0.20$ (Severe Shortcut Dependence)**: The model exhibits severe generalization collapse. While achieving near-perfect scores on IID test splits, it fails when encountering variations of the same attack family.
