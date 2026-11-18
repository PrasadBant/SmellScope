# SmellScope 2.1 — Complete Scientific Workflow Specification
## Accurate, Guided and Beginner-Friendly Scientific Dataset Auditing

**Standard:** Workstation Lifecycle Specification v2.1  
**Architecture:** 5 Primary Destinations · 13 Guided Workflow Steps  
**Status:** Approved & Verified via End-to-End Test Suite  

---

## 1. Product Objective & Scientific Stance

SmellScope is a local-first scientific research workstation for auditing Network Intrusion Detection System (NIDS) benchmark datasets. It investigates dataset design weaknesses and determines whether machine-learning model performance depends on suspicious, dataset-specific shortcut artifacts.

> [!IMPORTANT]
> **Scientific Integrity Notice:** SmellScope is a scientific dataset auditor, **NOT** an active intrusion detection system or live traffic monitoring agent.

The workstation guides first-time users and seasoned researchers through dataset upload, health validation, preprocessing, smell diagnosis, performance baselining, shortcut sensitivity analysis, generalisation testing, and offline report generation.

**Remediation is an independent experimental follow-up, never a mandatory stage of an audit.** Users can generate complete, certified baseline audit reports directly without modifying their datasets.

---

## 2. Information Architecture: 5 Primary Destinations

Rather than fragmenting the user experience across 13 separate navigation destinations, SmellScope organizes the workflow into **five primary stages**, with each detailed operation appearing as a guided sub-step within its parent stage:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        01 DATASET (/dataset)                           │
│  Step 1: Upload Dataset  ->  Step 2: Check Health  ->  Step 3: Prepare │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         02 AUDIT (/audit)                              │
│  Step 4: Design Smells   ->  Step 5: Baseline      ->  Step 6: SFI     │
│                          ->  Step 7: Generalisation (GGI)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       03 FINDINGS (/findings)                          │
│  Step 8: Complete Dataset Audit Results (8 Sections, Basic/Advanced)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
┌──────────────────────────────┐        ┌────────────────────────────────┐
│  04 REMEDIATION (OPTIONAL)   │        │     SKIP REMEDIATION PATH      │
│         (/remediation)       │        │  Proceed directly to Stage 05  │
│  Step 9:  Explore Preview    │        │  Baseline Report Generation    │
│  Step 10: RSM Safety Check   │        └────────────────┬───────────────┘
│  Step 11: Apply & Rollback   │                         │
└──────────────┬───────────────┘                         │
               │                                         │
               └────────────────────┬────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   05 VERIFY & REPORT (/reports)                        │
│  Step 12: Verify Impact (Rebenchmark / Locked Test Integrity)          │
│  Step 13: Audit Report Certificate & Standalone Offline HTML Export    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 13 Guided Workflow Steps

### STAGE 1 — DATASET (`/dataset`)

#### STEP 1 — UPLOAD DATASET
- **User-Facing Title:** *Upload Your Dataset*
- **Guidance:** Select a standard cybersecurity benchmark sample or upload your own CSV file. SmellScope inspects it prior to launching the audit.
- **Actions:** Select benchmark (`cic2017_sample_planted`, `nsl_kdd_multiclass`), drag-and-drop CSV, inspect filename, flow count, and cryptographic SHA-256 fingerprint.
- **Transition:** `CONTINUE TO VALIDATION`.

#### STEP 2 — DATASET VALIDATION
- **User-Facing Title:** *Check Dataset Health*
- **Guidance:** SmellScope evaluates whether the dataset contains the information and structure required for reliable analysis.
- **Ten Automated Health Checks:**
  1. *File Readability:* Valid parseable CSV/Parquet format.
  2. *Column Names:* Unique, non-empty header strings.
  3. *Label Column:* Ground truth classification target present.
  4. *Benign Class:* Established baseline normal traffic class.
  5. *Feature Availability:* Sufficient network telemetry columns (>3 features).
  6. *Data Types:* Numeric conversion compatibility.
  7. *Missing Values:* Identification of null and empty values.
  8. *Infinite Values:* Detection of IEEE 754 infinity values.
  9. *Class Distribution:* Attack and benign sample counts.
  10. *Sample Requirements:* Minimum sample count per class (N >= 20).
- **Gating:** Displays `PASS`, `WARN`, `FAIL`, or `N/A`. Invalid datasets cannot enter an audit.
- **Transition:** `CONTINUE TO PREPROCESSING`.

#### STEP 3 — DATA PREPROCESSING
- **User-Facing Title:** *Prepare Your Dataset*
- **Guidance:** SmellScope prepares the data for analysis while preserving its original structure.
- **Sealed Partitioning:**
  - Displays original vs retained rows, dropped Inf/NaN flows, and feature count.
  - Generates sealed **60% Training / 20% Validation / 20% Locked Test** boundaries.
  - Guarantees test set isolation: test set IDs are cryptographically locked and never touched during preprocessing or training.
- **Transition:** `CONTINUE TO AUDIT`.

---

### STAGE 2 — AUDIT (`/audit`)

#### STEP 4 — CHECK DATASET DESIGN SMELLS
- **User-Facing Title:** *Check Dataset Design Smells*
- **Guidance:** Research-based checks investigate potential benchmark dataset design vulnerabilities.
- **Five Heuristic Metrics:**
  - **UGT (Unclear Ground Truth):** Flags unassigned/ghost port mappings.
  - **WL (Wrong Labels / Repetition):** Detects repetition artifacts and suspicious identical packet sizes.
  - **HDF (Highly Dependent Features):** Measures single-feature dominance and artificial correlation.
  - **PDD (Poor Data Diversity):** Measures Gini concentration of flow vectors.
  - **TC (Traffic Collapse):** Detects unrealistic temporal bursts and artificial collection timing.
- **Literature Comparison:** Toggle to compare empirical metrics against published EuroS&P 2024 reference values.
- **Transition:** `CONTINUE TO BASELINE EVALUATION`.

#### STEP 5 — ESTABLISH BASELINE PERFORMANCE
- **User-Facing Title:** *Establish Baseline Performance*
- **Guidance:** Trains a standard baseline Random Forest classifier on the 60/20/20 split to determine nominal detection performance before shortcut testing.
- **Metrics:** Baseline Accuracy, Test F1, Recall (TPR), Specificity (TNR), Confusion Matrix, Random Seed (42).
- **Transition:** `CONTINUE TO SHORTCUT ANALYSIS`.

#### STEP 6 — INVESTIGATE SHORTCUT SENSITIVITY
- **User-Facing Title:** *Investigate Shortcut Sensitivity*
- **Guidance:** Tests whether model decisions collapse when suspicious features are perturbed, comparing against a Monte Carlo null reference distribution.
- **SFI Analysis:**
  - Interactive Plotly feature recall decay curve.
  - 100-draw Monte Carlo null distribution reference envelope.
  - Null-Calibrated Excess Fragility, z-score, 95% Confidence Intervals.
  - Expandable mathematical formulation drawer for research review.
- **Transition:** `CONTINUE TO GENERALISATION ANALYSIS`.

#### STEP 7 — TEST MODEL GENERALISATION
- **User-Facing Title:** *Test Model Generalisation*
- **Guidance:** Compares Random Stratified Splitting vs Subtype-Grouped Splitting to reveal true out-of-distribution transferability.
- **Metrics:**
  - Generalisation Gap Index (GGI): drop from in-distribution to out-of-distribution performance.
  - Leave-One-Group-Out (LOGO) cross-validation evaluation.
  - Clear scientific interpretation of whether nominal test scores are illusory.
- **Transition:** `VIEW AUDIT FINDINGS`.

---

### STAGE 3 — FINDINGS (`/findings`)

#### STEP 8 — COMPLETE DATASET AUDIT RESULTS
- **User-Facing Title:** *Your Dataset Audit Results*
- **Guidance:** Unified executive and research workspace summarizing all diagnostic signals.
- **Dual Presentation Modes:**
  - *Basic View:* Plain-language summaries, color-coded risk badges, and direct operational recommendations.
  - *Advanced View:* Mathematical equations, z-scores, null distributions, and feature controllability taxonomy.
- **Eight Comprehensive Sections:**
  1. *Executive Summary:* Overall dataset trust assessment.
  2. *Dataset Health Summary:* Ingestion validation findings.
  3. *Dataset Smell Heuristics:* Five smell results with literature comparison.
  4. *Baseline ML Performance:* Reference classifier metrics.
  5. *Shortcut Fragility Analysis:* SFI decay and top shortcut candidate features.
  6. *Generalisation Analysis:* GGI drop and out-of-distribution evaluation.
  7. *Feature Controllability Taxonomy:* Category A (trivial evasion), B (semantic), C/D (environmental).
  8. *Scientific Recommendations:* Concrete dataset curation guidance.
- **Two Equal Exploration Paths:**
  - `[ Explore Remediation ]`: Proceed to Stage 04 to investigate counterfactual interventions.
  - `[ Skip Remediation — Go to Final Report ]`: Bypass remediation and proceed directly to Stage 05.

---

### STAGE 4 — REMEDIATION (OPTIONAL) (`/remediation`)

#### STEP 9 — EXPLORE POSSIBLE IMPROVEMENTS
- **User-Facing Title:** *Explore Possible Improvements*
- **Notice:** Clear banner confirming remediation is strictly experimental and completely optional.
- **Actions:**
  - *R1 Feature Ablation:* Remove identified candidate shortcut features from training.
  - *R2 Flow Quarantine:* Isolate suspicious outlier flows in training only.
- **Live Preview:** Displays affected row counts, class balance changes, and parent vs proposed view comparisons.
- **Transition:** `CONTINUE TO SAFETY CHECK`.

#### STEP 10 — CHECK REMEDIATION SAFETY
- **User-Facing Title:** *Check Remediation Safety*
- **Governance:** Remediation Safety Monitor (RSM) runs 6 deterministic guardrail checks:
  1. Partition integrity (locked test set strictly untouched).
  2. Row retention floor.
  3. Class retention floor.
  4. Class balance threshold.
  5. Feature schema validity.
  6. Cryptographic reversibility.
- **Authorization Status:**
  - `PASS`: Changes are safe and authorized.
  - `WARN`: Requires explicit user checkbox acknowledgment.
  - `BLOCK`: Unsafe modification strictly prevented by safety floor.
- **Transition:** `APPLY APPROVED REMEDIATION`.

#### STEP 11 — APPLY APPROVED CHANGES
- **User-Facing Title:** *Apply Approved Changes*
- **Execution:**
  - Generates a new reversible view (`view_0001`) with cryptographic SHA-256 fingerprint.
  - Raw source data and locked test partition IDs remain unaltered.
  - Complete rollback ledger allowing instant, bit-exact view restoration.
- **Transition:** `RE-BENCHMARK MODEL`.

---

### STAGE 5 — VERIFY & REPORT (`/reports`)

#### STEP 12 — VERIFY THE IMPACT
- **User-Facing Title:** *Verify the Impact*
- **Two Distinct Presentation Flows:**
  - **When Remediation Was Applied:** Side-by-side Before vs After performance comparison evaluated on the identical locked test partition (`same_test_ids=True`). Highlights performance drops that expose shortcut dependence.
  - **When Remediation Was Skipped:** Prominently displays *"Original Benchmark Baseline Audit (No Remediation Applied)"* with locked test partition integrity certificate, without showing fake or empty comparison tables.
- **Transition:** `PROCEED TO FINAL REPORT`.

#### STEP 13 — YOUR SMELLSCOPE AUDIT REPORT
- **User-Facing Title:** *Your SmellScope Audit Report*
- **Deliverable:** Self-contained offline HTML audit certificate report.
- **Contents:**
  - Executive audit summary and dataset integrity fingerprints.
  - Smell heuristic evaluations and EuroS&P reference alignments.
  - SFI and GGI diagnostic results.
  - Cryptographic view lineage ledger and safety authorization signatures.
- **Action:** One-click offline HTML download.
