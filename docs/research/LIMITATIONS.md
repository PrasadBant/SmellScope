# Scientific Limitations & Scope Boundary

SmellScope is engineered to solve a specific scientific auditing challenge. Understanding its limitations is vital for proper academic and industrial application.

---

## 1. Non-Detection Disclaimer

SmellScope is **NOT an active intrusion detection system**:
- It does not process PCAP files in real-time.
- It does not integrate with network firewalls or SIEM agents.
- It cannot detect active cyber threats on enterprise endpoints.
- It is an offline statistical auditor of dataset quality and benchmark integrity.

---

## 2. Classifier Inductive Bias

While SmellScope uses balanced Random Forest and Logistic Regression models as standardized baseline probes, a dataset smell may affect different model families (e.g. Deep Neural Networks, Transformers, GNNs) with varying degrees of severity.

---

## 3. Heuristic Preconditions

Certain heuristics require specific metadata:
- **UGT** requires a destination port column (`dst_port` or `Destination Port`).
- **TC** requires a timestamp column (`timestamp` or `Timestamp`).
When these columns are absent from custom datasets, the corresponding heuristic gracefully yields `N/A` without interrupting the remaining heuristics or the SFI pipeline.

---

## 4. Remediation vs Real-World Retraining

Dataset remediation (R1 feature ablation, R2 flow filtering) is intended to demonstrate shortcut vulnerability and test what-if hypotheses. In actual operational deployments, mitigating dataset shortcuts ideally requires improving data collection procedures at the physical testbed layer rather than post-hoc mathematical filtering alone.
