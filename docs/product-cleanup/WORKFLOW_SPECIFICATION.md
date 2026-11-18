# SmellScope 2.1 — Scientific Workflow Specification

**Standard:** Workstation Lifecycle Specification v2.1  
**Author:** SmellScope Principal Software & UX Architecture Team  
**Date:** November 18, 2026  
**Status:** Approved  

---

## 1. Core Principles

1. **Intuitive for Beginners, Powerful for Researchers:**
   A first-time user should be able to audit a dataset in under 2 minutes without needing deep prior knowledge of Monte Carlo null distributions or Gini concentrations.
2. **Remediation is Strictly Optional:**
   Dataset trust auditing is complete and scientifically valid without any remediation. An audit report can be generated directly from the original benchmark dataset.
3. **Scientific Integrity & Security Authority:**
   The backend remains the authoritative gatekeeper for data validation, 60/20/20 fit-only split isolation, and RSM guardrail enforcement. The frontend provides immediate visual feedback but never bypasses backend verification.

---

## 2. Five-Stage Scientific User Journey

```text
┌─────────────────────────────────────────────────────────────┐
│                       STEP 1: DATASET                       │
│ Select pre-calibrated benchmark or upload local file (.csv) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        STEP 2: AUDIT                        │
│ Validate column roles -> Configure parameters -> Run Audit  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      STEP 3: FINDINGS                       │
│ Cross-class smell matrix, null-calibrated SFI, GGI & taxonomy│
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  STEP 4: REMEDIATION (OPT.)  │     │       SKIP REMEDIATION       │
│ Counterfactual ablation /    │     │ Proceed directly to report   │
│ flow quarantine guarded by   │     │ generation for original      │
│ RSM (PASS / WARN / BLOCK)    │     │ benchmark dataset            │
└───────────┬──────────────────┘     └──────────────┬───────────────┘
            │                                       │
            └──────────────────┬────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   STEP 5: VERIFY & REPORT                   │
│ Locked test set evaluation, before/after delta, HTML report │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Stage Requirements

### Step 1 — DATASET (Selection & Upload)
- **Primary Goal:** Identify the benchmark dataset to audit.
- **Inputs:**
  - Option A: Pre-calibrated standard benchmark (e.g. `cic2017_sample_planted`, `nsl_kdd_multiclass`).
  - Option B: Drag-and-drop local file upload (`.csv` or `.parquet`).
- **Validation:** Automatic check of file readability, row count, column count, and SHA-256 computation.
- **Output State:** `DATASET_SELECTED` -> `VALIDATING`.

### Step 2 — AUDIT (Validation & Execution)
- **Primary Goal:** Confirm dataset structure and execute the stratified multi-class audit.
- **Inspection:** Verify label column, benign class label, target port column, and timestamp column.
- **Execution:** Trigger `/api/v1/audits/start` with random seed and max rows per class.
- **Progress Tracking:** Real-time polling showing active attack class, current step, and percentage.
- **Output State:** `AUDIT_RUNNING` -> `AUDIT_COMPLETED`.

### Step 3 — FINDINGS (Matrix & Shortcut Diagnostics)
- **Primary Goal:** Understand dataset design flaws and machine-learning fragility.
- **Consolidated Views:**
  - *Heuristic Matrix:* Cross-class heatmap evaluating UGT, WL, HDF, PDD, and TC with EuroS&P 2024 literature comparison.
  - *Shortcut Diagnostics:* Null-calibrated SFI decay curve vs 100 Monte Carlo draws.
  - *Feature Controllability Taxonomy:* Category A (trivial evasion), Category B (semantic), Category C/D (environmental).
  - *Generalisation Gap Index (GGI):* Subtype cross-partition drop.
- **Progressive Disclosure:**
  - *Basic View:* Plain-English summaries and clear severity badges (`CLEAN`, `BORDERLINE`, `SEVERE`).
  - *Advanced View:* Mathematical formulas, null distribution parameters, z-scores, and 2D fragility matrices.
- **Output State:** `FINDINGS_READY`.

### Step 4 — REMEDIATION (OPTIONAL)
- **Primary Goal:** Experiment with safe counterfactual interventions.
- **Explicit Framing:** A prominent notice clarifies: *"Remediation is optional. You may skip this step and generate a report on your original dataset at any time."*
- **Capabilities:**
  - R1: Feature Ablation (suppress candidate shortcut features).
  - R2: Flow Quarantine (quarantine ephemeral ports or zero window flows in training split only).
- **Safety Governance:**
  - Remediation Safety Monitor (RSM) executes rules G1–G5.
  - Authorization outcomes: `PASS` (safe to apply), `WARN` (requires user acknowledgment), `BLOCK` (prohibited by safety floor).
  - Deterministic training view chain (`view_0000` -> `view_0001`) with cryptographic rollback.
- **Output State:** `REMEDIATION_PREVIEW_READY` -> `RSM_PASS`/`WARN`/`BLOCK` -> `REMEDIATION_APPLIED`.

### Step 5 — VERIFY & REPORT (Locked Evaluation & HTML Report)
- **Primary Goal:** Validate model performance on strictly locked test sets and download report.
- **Locked Test Isolation:** Verified using `same_test_ids=True` to guarantee zero test leakage.
- **Performance Evaluation:**
  - If remediation was applied: Side-by-side Before vs After performance delta table (Accuracy, Macro F1, Recall, Specificity).
  - If remediation was skipped: Original baseline evaluation on locked test split.
- **Report Generation:** One-click compilation of a self-contained offline HTML audit report with executive summary, smell matrix, and cryptographic lineage signatures.
- **Output State:** `REPORT_READY`.

---

## 4. State Transition Machine

```text
[EMPTY]
   │
   ▼ (select dataset)
[DATASET_SELECTED]
   │
   ▼ (validate schema)
[VALIDATING] ──(fail)──> [VALIDATION_FAILED]
   │
   ▼ (pass)
[DATASET_VALIDATED]
   │
   ▼ (trigger audit)
[AUDIT_RUNNING] ──(error)──> [AUDIT_FAILED]
   │
   ▼ (success)
[AUDIT_COMPLETED]
   │
   ▼ (load results)
[FINDINGS_READY]
   │
   ├─────────────────────────────────────────┐
   ▼ (optional remediation)                  ▼ (skip remediation)
[REMEDIATION_PREVIEW_READY]                  │
   │                                         │
   ├─[RSM_BLOCK] (prohibited)                │
   ├─[RSM_WARN] (requires ack)               │
   └─[RSM_PASS] (authorized)                 │
         │                                   │
         ▼ (apply view)                      │
   [REMEDIATION_APPLIED]                     │
         │                                   │
         ▼ (locked rebenchmark)              │
   [VERIFICATION_COMPLETED]                  │
         │                                   │
         └─────────────────┬─────────────────┘
                           ▼
                     [REPORT_READY]
```

---

## 5. Security & Invalidation Invariants

1. **Dataset Mutation Invalidation:** When a user selects or uploads a new dataset, all downstream state (`activeRunId`, `latestRunResult`, `viewsData`, `rebenchResult`, `generatedReport`) is invalidated.
2. **Locked Test Partition Guard:** Test set IDs are strictly frozen at the initial split (`view_0000`). No remediation is ever permitted to alter, re-sample, or prune test rows.
3. **No Phantom Progress:** The workflow stepper and buttons must only indicate completed stages when verified by backend responses.
