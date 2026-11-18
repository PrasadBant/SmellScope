# SmellScope 2.0 — Dataset Improvement & Intelligent Repair Validation Report

**Document Version:** 1.0.0  
**Date:** November 2026  
**Status:** Verification Signoff  
**Components Evaluated:** `smellscope.remediation.recommender`, `smellscope.remediation.manager`, `smellscope.remediation.rsm`, `Dataset Improvement Centre`  

---

## 1. Executive Summary

SmellScope 2.0 transforms dataset auditing from a passive reporting tool into an active, intelligent dataset improvement workstation. This report validates that:
1. The **Intelligent Recommendation Engine** generates scientifically grounded repair plans directly from heuristic audit evidence.
2. The **Repair Manager** executes non-destructive, virtual dataset views without corrupting original source files.
3. The **Remediation Safety Monitor (RSM)** strictly enforces class retention floors, cluster diversity constraints, and locked test-set invariance.
4. Dataset repairs are **100% reversible** with verified rollback ledgers and cryptographic change logs.
5. Repaired datasets export safely with full audit metadata.

---

## 2. Intelligent Recommendation Rule Mapping

The Recommendation Engine parses multi-class audit outputs and maps detected smells into targeted, actionable repair candidates:

| Heuristic Trigger | Empirical Condition | Recommended Strategy | Target Scope | RSM Safety Check |
| :--- | :--- | :--- | :--- | :--- |
| **HDF Dominance** | $\text{HDF} \ge 0.60$ or $0.85$ | **R1 Feature Ablation** | Dominant feature (e.g. `Destination Port`) | Column count floor ($\ge 2$ features remaining) |
| **SFI Fragility** | $z \ge 2.0 \lor \text{flag} = \text{True}$ | **R1 Feature Ablation** | Category A shortcut feature | Column count floor |
| **UGT Ghost Port** | $\text{UGT} \ge 0.10$ | **R1 Feature Ablation** | Ephemeral port column | Column count floor |
| **WL Repetition** | $\text{WL} \ge 0.30$ | **R2 Flow Quarantine** | Repeated sequence cluster flows | Class retention $> 50\%$, Cluster retention $> 30\%$ |
| **Data Quality NaNs** | $\text{Missing Cells} > 0$ | **Median Imputation** | Feature columns with missing values | Non-null verification |

---

## 3. The Reversible Virtual View Architecture

Rather than performing destructive in-place writes to raw CSV benchmarks, SmellScope 2.0 utilizes an immutable virtual view pipeline:

```
[Raw Dataset (Original)]  <--- IMMUTABLE ON DISK
          │
          ├── View 0 (Base / Train Split)
          │         │
          │         ├── Apply R1 / R2 Repair Plan
          │         │
          │         ▼
          └── View 1 (Corrected / Remediated)  <--- Virtual View Manifest
                    │
                    ├── Rollback (Restores View 0 with exact SHA-256 match)
                    │
                    └── Export to CSV (data/repaired/{run_id}_corrected.csv)
```

### Safety Guarantees:
- **No File Mutation:** Raw benchmark samples (`data/samples/`) are never overwritten.
- **Rollback Verification:** `manager.rollback_view()` restores any parent view from `change_log.json`, cryptographically validated.
- **Audit Lineage:** Every view records `parent_view_id`, `excluded_features`, `quarantined_row_ids`, timestamp, and user approval metadata.

---

## 4. Remediation Safety Monitor (RSM) Enforcement

The RSM operates as an automated gatekeeper. If a user or automated repair plan violates scientific safety constraints, the operation is blocked:

```
                                  [Proposed Repair Plan]
                                            │
                                            ▼
                           +----------------------------------+
                           |   RSM SAFETY EVALUATION ENGINE   |
                           +----------------------------------+
                                            │
               +----------------------------+----------------------------+
               |                            |                            |
      Class Retention < 50%?        Cluster Retention < 30%?      Test Set Tampered?
               │                            │                            │
               ▼                            ▼                            ▼
        [BLOCK / REJECT]             [BLOCK / REJECT]             [BLOCK / REJECT]
               │                            │                            │
               +----------------------------+----------------------------+
                                            │ (If all checks satisfy thresholds)
                                            ▼
                                  [APPROVE / EXECUTE]
```

### Empirical Test Evidence:
1. **Security Enforcement Test (`test_rsm_security_enforcement`):**
   - Attempted applying an unapproved repair without required acknowledgement flag $\to$ Rejected with `E_RSM_UNAUTHORIZED`.
   - Verified that forced class deletion violates the 50% class floor $\to$ Blocked with `RSM_BLOCK`.
2. **Path Traversal Prevention (`test_security_path_traversal_prevention`):**
   - Attempted malicious directory traversal in dataset identifiers $\to$ Blocked with `400 Bad Request`.
3. **End-to-End Improvement Workflow (`test_improvement_centre_workflow`):**
   - Created repair plan preview $\to$ Received exact affected row counts by class.
   - Applied approved plan $\to$ View incremented from `v0` to `v1`.
   - Re-benchmarked model $\to$ Verified that locked test partition was untouched.

---

## 5. Verification Signoff

- **Automated Tests:** `tests/server/test_api_boundary.py`
  - `test_remediation_and_rsm_lifecycle` $\to$ **PASS**
  - `test_improvement_centre_workflow` $\to$ **PASS**
  - `test_rsm_security_enforcement` $\to$ **PASS**
- **RSM Pass Rate:** 100% adherence to Shared Contract v1.0 Section 2.7.
