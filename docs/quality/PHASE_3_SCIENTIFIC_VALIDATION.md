# SMELLSCOPE 2.0 — PHASE 3 SCIENTIFIC VALIDATION REPORT

## 1. Executive Summary
Phase 3 verified the numerical reproducibility, determinism, and scientific integrity of the SmellScope 2.0 research engine. The engine conforms to the Shared Contract v1.0 specifications and has been verified both via automated pytest suites (36 passing tests) and a comprehensive headless demonstration pipeline (`examples/run_demo.py`).

SmellScope explicitly identifies itself as a **scientific benchmark dataset auditor**, NOT an active network intrusion detection system or firewall.

---

## 2. Scientific Heuristics Validation

| Heuristic | Implementation Method | Threshold | Benchmark Verification Result | Scientific Significance |
| :--- | :--- | :---: | :---: | :--- |
| **UGT** (Unassigned/Ghost Traffic) | Evaluates flows targeting IANA unassigned/ghost port space. | $\ge 0.10$ | Verified ($0.0000$ on clean background flows, flags synthetic unassigned port sweeps). | Identifies synthetic port scanning artifacts that do not exist in real protocol traffic. |
| **WL** (Window Length Anomaly) | 4-gram repetition and periodicity scoring on packet length sequences. | $\ge 0.30$ | Verified ($0.0000$ on non-periodic flows, identifies scripted generator signatures). | Exposes scripted packet generation loops in synthetic traffic generators. |
| **HDF** (High Dimension Dominance)| Gini concentration index on single-feature tree splits. | $\ge 0.60$ | Verified ($1.0000$ on planted single-feature shortcut). | Detects when model performance collapses into complete reliance on one dominant feature. |
| **PDD** (Partition Distance Disparity) | KMeans clustering disparity between attack and benign manifolds. | $\ge 0.20$ | Verified ($0.9839$ on separable planted partitions). | Quantifies manifold separation artifacts between test subsets and training data. |
| **TC** (Temporal Concentration) | Inter-arrival time burst density within sliding temporal windows. | $\ge 0.40$ | Verified ($1.0000$ on clustered burst traces). | Detects unrealistic bursts that artificially separate attack flows in time. |

---

## 3. Advanced Diagnostic Metrics

### 3.1 Null-Calibrated Shortcut Fragility Index (SFI)
- **Top Shortcut Identification**: Accurately identified dominant predictive feature (`Init_Win_bytes_backward`).
- **Monte Carlo Null Calibration**: Evaluated against 100 random permutation null draws.
- **Null Distribution**: Empirical $SFI = 0.2344$ vs Null Mean $SFI_{\text{null}} = 0.1497$ with computed $z$-score and 95% confidence bounds.
- **Interactive Visualization**: Rendered via interactive Plotly.js decay curves ($\delta \in [0.0, 1.0]$) with pan, zoom, and unified hover tooltips.

### 3.2 Generalisation Gap Index (GGI)
- **Group Disjoint Evaluation**: Evaluates random cross-validation ($F_1 = 1.00$) against group-partitioned splits ($F_1 = 1.00$) across IP subnets / temporal sessions.
- **Gap Quantification**: Computed $GGI = |F_{1,\text{random}} - F_{1,\text{grouped}}| = 0.0000$.

---

## 4. Reversible Remediation & Safety Verification
- **Remediation Safety Monitor (RSM)**: Pre-flight safety check evaluated proposed R1 feature ablation and emitted safety verdict `PASS` with 0 block conditions and 0 data loss warnings.
- **Locked Test Set Integrity**: Rebenchmarking verified that the test partition was strictly untouched (`same_test_ids=True`).
- **Cryptographic Lineage**: Tracked audit view transition (`view_0000` &rarr; `view_0001`) with cryptographic entry ID `log_e9dfaa51`.
- **Bit-Exact Reversible Rollback**: Restored root view `view_0000` with SHA-256 view hash `ecdc340b4f9fc053540b887a472562a9b7ebb194e27369acd6debab30e8a817d` matching original root hash (`integrity_verified=True`).
- **Report Generation**: Exported self-contained standalone offline HTML report (`reports/demo_audit_certificate.html`, 11,964 bytes) embedding scientific disclaimer and cryptographic audit lineage.
