# Frequently Asked Questions (FAQ)

### Q1: Is SmellScope an intrusion detection system?
**No.** SmellScope does not monitor network interfaces, capture packets, or detect cyberattacks in production networks. It is a benchmark dataset auditor that analyzes the scientific integrity of training datasets used in network intrusion detection research.

---

### Q2: Do I have to apply remediation to get an audit report?
**No.** Remediation is strictly optional. You can upload a dataset, run an audit, review findings, and immediately download an offline audit certificate without modifying the dataset.

---

### Q3: What happens to my data when I upload a file?
**Nothing leaves your computer.** SmellScope is completely local-first. Uploaded files are written directly to your local file system (`data/uploads/`), processed locally in Python memory, and never sent to external servers or cloud APIs.

---

### Q4: Why are my classifier accuracy scores 99%+ if the dataset has smells?
High baseline accuracy (e.g. 99.8% F1) is often a symptom of shortcut learning. When attack traffic exhibits artifacts like uniform TCP window sizes or artificial unassigned destination ports, machine-learning algorithms latch onto these trivial non-payload features rather than genuine attack semantics. When evaluated in a realistic environment where the attacker changes ports, the classifier completely collapses. SFI directly measures this fragility.

---

### Q5: What does the Remediation Safety Monitor (RSM) do?
The RSM acts as a safety supervisor that evaluates any proposed dataset transformation before applying it. It verifies that:
1. Essential attack classes are not completely obliterated (preventing trivial zero-flow filtering).
2. The locked test set remains completely untouched and isolated.
3. Feature ablation does not strip valid contextual signals.
If a proposed modification violates safety thresholds, the RSM flags a `[BLOCK]` or `[WARN]` verdict.

---

### Q6: Can I revert a dataset remediation?
**Yes.** All remediations create an immutable cryptographically hashed view lineage (`view_0000`, `view_0001`, ...). At any time, you can click "Rollback" to restore earlier views with bit-exact reproducibility.
