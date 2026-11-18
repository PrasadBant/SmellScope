# SmellScope Scientific Methodology & Evaluation Protocol

## 1. Scientific Objective
SmellScope evaluates benchmark datasets used for Network Intrusion Detection Systems (NIDS) to identify experimental artifacts, data leakage, and shortcut reliance.

The core hypothesis is that high reported performance (often >99% F1) on synthetic benchmarks is frequently an artifact of non-behavioral shortcuts rather than authentic attack detection.

---

## 2. Three-Way Split Protocol (Strict Leakage Prevention)

To guarantee scientific rigor and avoid data snooping:
1. **Training Partition (60%)**: Used solely for training baseline and remediated classifiers. All feature scalers, encoders, and statistics are fit exclusively on this split.
2. **Validation Partition (20%)**: Used for null calibration, Monte Carlo permutation testing, and hyperparameter tuning.
3. **Locked Test Partition (20%)**: Held strictly inviolate. It is NEVER used for fitting, feature selection, threshold tuning, or what-if exploratory remediation previews. It is only touched during the final rebenchmarking step to evaluate genuine generalization performance.

---

## 3. Cryptographic Lineage & Bit-Exact Tracking

Every artifact in the workflow is tracked using SHA-256 cryptographic hashing:
- Raw dataset SHA-256 fingerprint.
- Partition split indices SHA-256 fingerprint (`split_hash`).
- State view lineage (`view_0000`, `view_0001`, ...) with parent hashes.
- Final offline HTML report verification signatures.

---

## 4. Multi-Class Auditing Pipeline

Rather than treating the dataset as a monolithic binary problem, SmellScope audits each attack class independently against the benign background:
1. Stratified extraction of the target attack class and representative benign background flows.
2. Calculation of the five core dataset smell heuristics (UGT, WL, HDF, PDD, TC).
3. Null-calibrated Shortcut Fragility Index (SFI) estimation using Monte Carlo random permutations ($N \ge 100$).
4. Feature controllability taxonomy assignment (Category A, B, C, D).
5. Generalisation Gap Index (GGI) evaluation across disjoint subtypes.
