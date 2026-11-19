# SmellScope 2.0 / 2.1 — Remediation Safety Monitor (RSM) Specification

## 1. Safety Governance Philosophy

Modifying cybersecurity datasets carries acute risks:
- Over-aggressive filtering can eliminate rare attack variants.
- Feature ablation can strip necessary protocol dynamics.
- Data balancing can inadvertently invert class distributions.

The **Remediation Safety Monitor (RSM)** acts as an autonomous gatekeeper that inspects all proposed dataset transformations prior to execution.

---

## 2. RSM Evaluation Rules & Decision Matrix

| Rule Code | Rule Description | Threshold / Trigger | Severity | System Behavior |
| :--- | :--- | :--- | :---: | :--- |
| **`RSM_CLASS_RETENTION`** | Minimum flow retention per class | Retention $< 80\%$ of baseline rows | **WARN** | Requires explicit user acknowledgment before applying. |
| **`RSM_CLASS_DEPLETION`** | Severe flow depletion | Retention $< 50\%$ or $N_{\text{class}} < 10$ | **BLOCK** | Execution strictly prevented; repair plan rejected. |
| **`RSM_CLUSTER_SURVIVAL`** | Behavioral attack diversity | Any attack subtype cluster eliminated | **WARN** | Warns that attack variant coverage is diminished. |
| **`RSM_CLUSTER_EXTINCTION`** | Complete subtype loss | $> 50\%$ of attack clusters eliminated | **BLOCK** | Execution strictly prevented. |
| **`RSM_FEATURE_EXTINCTION`** | Minimum remaining features | Feature count $< 3$ features | **BLOCK** | Execution strictly prevented; insufficient dimensions. |
| **`RSM_TEST_LEAK`** | Test partition isolation | Proposed transformation touches test row IDs | **BLOCK** | Execution strictly prevented; violation of sealed holdout. |

---

## 3. Cryptographic Verification & Rollback Ledger

Every transformation creates a tamper-evident audit record stored in `runs/{run_id}/change_log.jsonl`:

```json
{
  "entry_id": "chg_20261119_054036_a1b2c3",
  "timestamp": "2026-11-19T05:40:36.123456+00:00",
  "action": "repair_plan_apply",
  "parent_view_id": "view_0000",
  "new_view_id": "view_0001",
  "seed": 42,
  "params": {
    "deduplicate": true,
    "ablate_features": ["Destination Port"],
    "impute_median": true
  },
  "before_counts": { "BENIGN": 800, "PortScan": 200 },
  "after_counts": { "BENIGN": 800, "PortScan": 200 },
  "rsm_status": "PASS",
  "approval": {
    "approved": true,
    "warning_ack": true,
    "approved_at": "2026-11-19T05:40:36.120000+00:00"
  }
}
```

If a researcher decides that a modification introduced undesirable artifacts, SmellScope restores the exact state of `parent_view_id` and verifies the dataset hash against the original split manifest.
