# PHASE 5 — REMEDIATION LAB & RSM GOVERNANCE REPORT

**Project:** SmellScope 2.0 — Scientific Dataset Trust Audit Workstation  
**Author:** Principal Software Architect & QA Engineer  
**Timestamp:** 2026-11-18T20:00:00+05:30  
**Branch:** `feature/react-frontend`  
**Component:** Screen 5 (`RemediationScreen.tsx`)  

---

## 1. Executive Summary

Phase 5 delivers the experimental remediation interface and the independent **Remediation Safety Monitor (RSM)** governance layer.

SmellScope provides counterfactual remediation without corrupting or modifying underlying benchmark files. Every modification advances through an immutable, hashed `TrainingView` lineage graph. Crucially, the frontend cannot bypass safety rules: every preview and application request is independently evaluated and authorized by the backend Python engine.

---

## 2. Remediation Capabilities Implemented

1. **R1 Feature Ablation:**
   - Evaluates model performance when candidate shortcut features (identified by SFI and taxonomy) are ablated from the feature space during training.
   - Preserves all rows and flow sequences.

2. **R2 Candidate Flow Quarantine:**
   - Evaluates model performance when flows exhibiting severe heuristic anomalies (e.g. ephemeral destination ports $> 49151$ or zero TCP window size) are quarantined from the training partition.
   - Enforces non-negotiable test isolation: **only training flows are quarantined; the locked test partition is never modified**.

---

## 3. Remediation Safety Monitor (RSM) Enforcement

RSM protects research experiments from catastrophic data destruction or misleading conclusions:

| RSM Status | Visual Badge | Backend Enforcement Rule | Frontend UI Behavior |
|---|---|---|---|
| **PASS** | Green (`#16A34A`) | All class retentions $\ge 50\%$, cluster retentions $\ge 25\%$, ablated features $\le 10$, remaining training flows $\ge 10$. | "Apply Remediation" button enabled. Execution proceeds upon click. |
| **WARN** | Amber (`#D97706`) | Class retention between $20\%$ and $50\%$, or cluster retention between $10\%$ and $25\%$, or $> 10$ features ablated. | Requires explicit checkbox acknowledgement (`warning_ack=True`). Button remains disabled until checked. |
| **BLOCK** | Red (`#DC2626`) | Class retention $< 20\%$ (class erasure), or cluster retention $< 10\%$ (cluster obliteration), or total remaining training flows $< 10$. | Button completely disabled. Backend independently raises `E_RSM_BLOCK` (`HTTP 403 Forbidden`) if invoked directly. |

---

## 4. Cryptographic Lineage & Rollback Engine

- Every state is captured in an immutable `TrainingView` object:
  ```json
  {
    "view_id": "view_0001",
    "parent_view_id": "view_0000",
    "split_hash": "...",
    "n_included": 192,
    "included_hash": "...",
    "excluded_features": ["Destination Port"],
    "quarantined_count": 0,
    "view_hash": "8f3a..."
  }
  ```
- Visual transition chain (`view_0000` &rarr; `view_0001` &rarr; `view_0002`) renders the state progression.
- Rollback executes via `POST /api/v1/audits/{run_id}/rollback`:
  - Re-computes cryptographic hash over restored training row IDs, excluded features, and split hash.
  - Verifies exact match against parent `view_hash`. Raises `E_ROLLBACK_MISMATCH` if any byte differs.

---

## 5. Verification & Test Evidence

- Verified by automated backend integration test `test_remediation_and_rsm_lifecycle`:
  - R1 preview generated with PASS/WARN evaluation.
  - Authorized apply advances view to `view_0001`.
  - Rebenchmark executed on identical test rows.
  - Rollback verified with cryptographic hash check, returning state cleanly to `view_0000`.

**Status:** PHASE 5 COMPLETE — PROCEEDING TO PHASE 6 DOCUMENTATION.
