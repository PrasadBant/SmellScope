# Dataset Capability Matrix & Diagnostic Support Specification

## 1. Concept: Dynamic Capability Resolution

In SmellScope 2.0, no diagnostic check is run unconditionally or fails with an unhandled exception. Instead, upon dataset ingestion and validation, the engine evaluates the schema, class topology, and semantic column roles to construct an authoritative **Capability Matrix**.

Every diagnostic check is assigned one of four definitive states:
* `AVAILABLE`: The diagnostic can be fully evaluated on the dataset.
* `NOT_APPLICABLE`: The diagnostic is mathematically or scientifically inapplicable due to dataset design (e.g. supervised attack heuristics on single-class baseline data). An explicit, human-readable scientific reason is provided.
* `UNSUPPORTED_SCHEMA`: The dataset lacks the specific telemetry fields required by the heuristic (e.g. port columns for $UGT$, packet lengths for $WL$).
* `INSUFFICIENT_DATA`: The sample size for a targeted class is too small to yield statistically reliable conclusions (e.g. $< 10$ examples).

---

## 2. Complete Diagnostic Capability Matrix

| Diagnostic Key | Category | Requirement | Single-Class (e.g. Monday) | Binary Attack (e.g. Planted) | Multi-Class (e.g. Friday) | Schema Without Ports |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`data_quality_profiling`** | Data Integrity | Any tabular data | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`missing_values_audit`** | Data Integrity | Feature columns | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`infinite_values_audit`** | Data Integrity | Numeric columns | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`duplicate_rows_audit`** | Data Integrity | Feature columns | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`constant_features_audit`** | Data Integrity | Numeric columns | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`feature_distributions`** | Data Integrity | Numeric columns | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`class_balance_audit`** | Design Topology | $\ge 2$ classes | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`ugt_ephemeral_ports`** | Attack Smells | Attacks + Ports | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **UNSUPPORTED_SCHEMA** |
| **`wl_packet_repetition`** | Attack Smells | Attacks + Packet Lens | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`hdf_feature_dominance`** | Attack Smells | $\ge 1$ Attack class | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`pdd_tc_clustering`** | Attack Smells | $\ge 1$ Attack class | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`sfi_shortcut_fragility`** | Fragility Index | $\ge 1$ Attack class | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`ggi_generalization_gap`**| Generalization | $\ge 1$ Attack class | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`supervised_ml_benchmark`**| Model Evaluation| $\ge 2$ classes | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`perfect_accuracy_investigation`**| Diagnostic | Supervised ML Run | **NOT_APPLICABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** |

---

## 3. Concrete Inapplicability Justifications

### When `is_single_class == True`:
* **Supervised ML Benchmark:** *"Supervised classification requires at least 2 distinct classes to train decision boundaries."*
* **SFI (Shortcut Fragility Index):** *"SFI evaluates recall collapse of attack classes under feature perturbation relative to benign traffic. Single-class datasets contain no attack traffic to perturb."*
* **UGT Heuristic:** *"Single-class dataset contains only BENIGN traffic. Evaluating attack port artifacts requires at least one target attack class."*
* **HDF Heuristic:** *"Requires at least one attack class to evaluate single-feature decision tree dominance."*
* **Class Imbalance:** *"Single-class dataset contains only 1 class; class imbalance analysis is not applicable."*

### When Port Telemetry is Missing:
* **UGT Heuristic:** *"No port telemetry columns detected in dataset schema."*
