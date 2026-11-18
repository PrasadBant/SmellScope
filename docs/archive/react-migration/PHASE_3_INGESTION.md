# PHASE 3 — OVERVIEW & DATASET INGESTION REPORT

**Project:** SmellScope 2.0 — Scientific Dataset Trust Audit Workstation  
**Author:** Product Designer & Senior React Engineer  
**Timestamp:** 2026-11-18T19:56:00+05:30  
**Branch:** `feature/react-frontend`  
**Components:** Screen 1 (`OverviewScreen.tsx`) & Screen 2 (`IngestionScreen.tsx`)  

---

## 1. Screen 1 — Overview Command Center

The Command Center provides a high-level scientific overview of benchmark evaluation integrity without fabricating false activity.

### Capabilities Implemented:
- **Hero Display:**
  - Headline: *"Understand what your NIDS benchmark is really learning."*
  - Subtitle: *"Investigate dataset design flaws, shortcut dependencies and the reliability of machine-learning evaluation."*
  - Quick actions: `START NEW AUDIT` and `VIEW AUDIT HISTORY`.
- **Real-Time KPI Suite:**
  - Active Benchmark Dataset identifier and total evaluated flows.
  - Number of audited attack classes with cryptographic locked split hash.
  - Shortcut candidates tally highlighting flagged attack classes.
  - Exact audit runtime from the Python orchestrator.
- **Key Findings & Diagnostic Inspector:**
  - Displays each attack class with its baseline F1, top SFI value, and candidate shortcut feature.
  - Displays feature controllability category badges (`CAT A`, `CAT B`, `CAT C`, `CAT D`).
  - Summarizes the 5 heuristics (UGT, WL, HDF, PDD, TC) in high-density compact cells.
  - One-click drill-down to Class Diagnostic Lab.
- **Audit Execution History:**
  - Chronological list of local audit runs with status badges (`COMPLETED`, `RUNNING`, `FAILED`).
  - Allows selecting previous runs to reload their results into the workstation context.
- **Empty State:**
  - Clean, informative prompt when no audit has been executed yet, directing users to Ingestion.

---

## 2. Screen 2 — Dataset Ingestion & Inspection

Screen 2 delivers a secure dataset upload and validation experience.

### Capabilities Implemented:
- **Benchmark Source Selection:**
  - Dropdown selector for pre-calibrated sample benchmarks (`cic2017_sample_planted`, `unsw_nb15_sample`).
  - Drag-and-drop file upload zone supporting local `.csv` and `.parquet` files.
  - Streaming SHA-256 calculation for immutable provenance verification.
- **Audit Configuration Controls:**
  - Configurable ground-truth label column (default `Label`).
  - Configurable benign class label (default `BENIGN`).
  - Deterministic random seed input (default `42`).
  - Subsampling limit per class (default `20,000`).
- **Dataset Inspection Summary:**
  - Total raw flows vs loaded flows after numeric coercion.
  - Missing and infinite value drop counts.
  - Detected specialized column roles (`dst_port`, `timestamp`, `group`).
  - Class distribution progress bars with exact counts and percentages.
- **Locked Split Specification:**
  - Displays the 60% train, 20% validation, 20% locked test split protocol.
  - Discloses test-set integrity guarantees (Shared Contract v1.0 Section 2.5).
- **Asynchronous Multi-Class Audit Initiation:**
  - `RUN MULTI-CLASS AUDIT` button dispatches non-blocking background job (`POST /api/v1/audits`).
  - Real-time polling tracks active class, completed steps, total steps, and exact elapsed seconds.
  - On completion, automatically persists `RunResult` and navigates to the Cross-Class Smell Matrix.
- **Bounded Data Preview Table:**
  - First 25 rows rendered with formatted columns and explicit `null` indicators.

---

## 3. Verification & Evidence

- Both screens connect directly to the FastAPI endpoints (`/api/v1/datasets`, `/api/v1/audits`).
- Data contracts verified through automated backend tests (`test_datasets_endpoints`, `test_audit_execution_and_results_flow`).
- Frontend typechecking confirmed with zero TypeScript compilation errors.

**Status:** PHASE 3 COMPLETE — PROCEEDING TO PHASE 4 DOCUMENTATION.
