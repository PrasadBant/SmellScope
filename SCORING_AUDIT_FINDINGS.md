# SCORING_AUDIT_FINDINGS.md — SmellScope 2.0 Comprehensive Scientific & Mathematical Audit

**Auditor:** Senior Python Architect, Cybersecurity Dataset Researcher & Statistical Auditor  
**Date:** November 19, 2026  
**Repository:** https://github.com/PrasadBant/SmellScope.git  
**Target Commit:** `b93ec5e`  
**Status:** Audit Completed; Corrective Architecture Specified  

---

## Executive Summary

A comprehensive, evidence-driven inspection of the entire SmellScope codebase (`smellscope/`, `tests/`, `frontend/`, `data/`) was conducted. 

While individual class-level research heuristics (UGT, WL, HDF, PDD, TC, SFI, GGI) are faithfully implemented from Flood et al. (EuroS&P 2024), **the repository lacks a dedicated, scientifically sound dataset-level scoring engine**. The system produces raw individual heuristic floats (e.g., `HDF=1.00`, `UGT=0.15`, `SFI z=2.45`) and baseline ML F1 scores, but does not provide normalized, transparent, or decomposed dataset quality scores.

Furthermore, there is a risk of conflating **data quality** (technical cleanliness like missingness, infinite values, formatting) with **shortcut risk** (dataset-level predictive artifacts) and **NIDS research suitability** (class coverage, imbalance realism, feature roles).

Below is the itemized inventory of all identified mathematical, architectural, and functional issues.

---

## Itemized Audit Findings

### FINDING-001: Absence of a Multi-Dimensional Dataset Scoring Architecture
- **Component Inspected:** `smellscope/` (entire package) and `frontend/src/`
- **Existing Implementation:** No scoring modules exist. The application calculates class-level heuristic floats (`paper.UGT`, `paper.HDF`, `sfi.sfi_top`) and ML evaluation metrics (`baseline.f1`), but has zero dataset-level scoring logic.
- **Mathematical / Functional Issue:** Users cannot determine the overall trustworthiness or technical quality of an uploaded dataset. There is no normalized 0–100 scale, no transparent weighting, and no mechanism to track whether a repair improves data quality, reduces shortcut vulnerability, or impacts ML performance.
- **Evidence & File Location:** Absence of `smellscope/scoring/` directory; `frontend/src/features/findings/FindingsScreen.tsx` displays only raw floats without dataset-level summary scores.
- **Severity:** **P0 (Critical / Blocker)**
- **Required Correction:** Build a dedicated `smellscope/scoring/` subsystem with four independent, orthogonal dimensions:
  1. `Dataset Data Quality Score` (0–100, higher = better)
  2. `Dataset Suitability Score for NIDS Research` (0–100, higher = better)
  3. `Shortcut and Leakage Risk Score` (0–100, higher = greater risk)
  4. `ML Evaluation Reliability Score` (0–100, higher = more reliable evaluation)
  5. `Overall Dataset Assessment` (0–100, transparent configurable weighted combination with explicit coverage disclosure).
- **Verification Test:** `tests/scoring/test_scoring.py` verifying all 5 score dimensions on benchmark and synthetic datasets.

---

### FINDING-002: Inversion and Mixing of Quality and Risk Directions
- **Component Inspected:** Heuristics and SFI diagnostic metrics
- **Existing Implementation:** Heuristic metrics (UGT, WL, HDF, PDD, TC, SFI) are risk/smell indicators where higher values indicate *worse* dataset design. Standard quality indicators (completeness, validity) have higher values meaning *better*.
- **Mathematical / Functional Issue:** Averaging raw heuristic scores with quality metrics without directional inversion yields mathematically nonsensical results. A dataset with 100% clean, non-null values that happens to have a planted shortcut port would be erroneously conflated as having "low data quality" rather than "high shortcut risk".
- **Evidence & File Location:** `smellscope/core/heuristics.py:34`, `smellscope/core/sfi.py:46`.
- **Severity:** **P0 (Critical / Scientific Validity)**
- **Required Correction:** Strictly decouple `Data Quality` (cleanliness/integrity) from `Shortcut Risk` (adversarial shortcut vulnerability). In `shortcut_risk_score.py`, higher score = higher risk. In the overall assessment formula, shortcut risk is inverted (`100.0 - risk`) before combination, with explicit documentation and subscore disclosure.
- **Verification Test:** Verification that a synthetically planted shortcut dataset (clean rows, heavy shortcut) achieves >95 on Data Quality but >70 on Shortcut Risk.

---

### FINDING-003: Naive Penalization of Real-World NIDS Class Imbalance
- **Component Inspected:** `smellscope/remediation/recommender.py:168` (`rec_dd_class_imbalance`)
- **Existing Implementation:** Recommender flags any dataset with class imbalance ratio > 8.0:1 as a "MEDIUM severity defect" and suggests resampling.
- **Mathematical / Functional Issue:** Real-world network traffic is naturally and severely imbalanced (often 99% benign, <1% attack). Penalizing a NIDS benchmark purely for exhibiting real-world imbalance without context is scientifically misleading. Artificial class balancing alters the empirical prior and causes extreme false-positive inflation in live deployments.
- **Evidence & File Location:** `smellscope/remediation/recommender.py:186-196`.
- **Severity:** **P1 (High / Domain Methodology)**
- **Required Correction:** In `nids_suitability_score.py`, evaluate class imbalance using Gini/entropy metrics while explicitly accounting for network realism. Penalize pathological sample counts (e.g. minority class < 10 samples) rather than natural high benign-to-attack ratios. Explicitly document in explanations that high benign proportion reflects realistic operational environments.
- **Verification Test:** Verify that realistic 95:5 benign-to-attack datasets receive high suitability if sample count is adequate, whereas 1-sample attack classes receive statistical power penalties.

---

### FINDING-004: Lack of Before/After Score Recalculation in Comparison Workstation
- **Component Inspected:** `smellscope/remediation/manager.py:857` (`get_dataset_comparison`)
- **Existing Implementation:** `get_dataset_comparison()` compares only raw counts (`total_rows`, `total_columns`, `missing_values`, `infinite_values`, `duplicate_records`) and locked ML rebenchmark metrics (`acc`, `f1`). It does NOT recompute or compare the dataset scores before vs after repair.
- **Mathematical / Functional Issue:** Users cannot see how applied repairs systematically changed the dataset's Data Quality Score, NIDS Suitability Score, Shortcut Risk Score, or Evaluation Reliability Score.
- **Evidence & File Location:** `smellscope/remediation/manager.py:883-925`.
- **Severity:** **P1 (High / Functional Completeness)**
- **Required Correction:** Update `get_dataset_comparison()` to invoke the scoring engine on both `original_view` and `remediated_view`, providing an authoritative before/after scoring delta table across all dimensions.
- **Verification Test:** Integration test verifying `comparison["scores"]["delta"]` reflects positive data quality improvement and reduced shortcut risk upon feature ablation.

---

### FINDING-005: Undefined Multiclass ROC-AUC & PR-AUC Fallback Handling
- **Component Inspected:** `smellscope/core/eval.py:60-100` (`fit_and_evaluate`)
- **Existing Implementation:** Model evaluation calculates Accuracy, Precision, Recall, Macro F1, Weighted F1, and Confusion Matrix, but omits ROC-AUC and PR-AUC.
- **Mathematical / Functional Issue:** For imbalanced NIDS benchmarks, accuracy is misleading (a trivial classifier predicting BENIGN achieves 99% accuracy). Macro F1, PR-AUC, and ROC-AUC are essential. However, ROC-AUC is mathematically undefined or sensitive to class availability in multiclass or single-class evaluation splits.
- **Evidence & File Location:** `smellscope/core/eval.py:64-96`.
- **Severity:** **P1 (High / ML Evaluation Rigor)**
- **Required Correction:** Enhance `fit_and_evaluate()` to calculate macro and weighted ROC-AUC and PR-AUC using `predict_proba` when mathematically applicable (multi-class one-vs-rest with all classes present in test split), with graceful fallback to `None` and explanatory notes when probabilities or classes are unavailable.
- **Verification Test:** Unit test in `tests/core/test_eval.py` verifying ROC-AUC and PR-AUC computation on multiclass test split with probability validation.

---

### FINDING-006: Missing Score Breakdown & Transparent Explanation Table
- **Component Inspected:** Frontend findings and reporting
- **Existing Implementation:** No score breakdown table exists. Reports and dashboards display raw numbers without breaking down constituent subscores, weights, measured values, or improvement recommendations.
- **Mathematical / Functional Issue:** First-time users face technical cognitive overload; they see opaque floats without knowing why a score was assigned or what concrete actions can improve it.
- **Evidence & File Location:** `frontend/src/features/findings/FindingsScreen.tsx`, `smellscope/reporting/generator.py`.
- **Severity:** **P1 (High / Usability & Transparency)**
- **Required Correction:** Build a structured `ScoreBreakdown` schema and interactive UI component showing:
  - Metric name
  - Measured value (e.g. 15 NaN cells, 0.25% missing)
  - Calculated subscore (e.g. 97.5/100)
  - Configured weight (e.g. 25%)
  - Contribution to dimension (e.g. 24.4 pts)
  - Human explanation & recommended fix
- **Verification Test:** Frontend test verifying score breakdown modal renders all rows with matching contributions.

---

### FINDING-007: Edge-Case Robustness: Empty, Single-Class, or Non-Numeric Datasets
- **Component Inspected:** Preprocessing, heuristics, and evaluation pipeline
- **Existing Implementation:** Several modules assume at least two classes (attack + benign) and numeric columns. While `smellscope/core/errors.py` raises `E_BENIGN_LABEL_MISSING`, scoring functions must handle these degenerate cases cleanly without uncaught zero-division or unhandled exceptions.
- **Mathematical / Functional Issue:** Uploading an empty CSV, a dataset with only benign traffic, or non-numeric columns can trigger unhandled division-by-zero or NaN score propagation.
- **Evidence & File Location:** `smellscope/core/heuristics.py:27`, `smellscope/core/preprocess.py:53`.
- **Severity:** **P1 (High / Robustness)**
- **Required Correction:** Implement `smellscope/scoring/score_validation.py` with defensive boundary assertions:
  - Bounded strictly within `[0.0, 100.0]`.
  - Zero-division guards across all ratios (`n_rows > 0`, `n_cols > 0`).
  - Graceful handling of single-class datasets (suitability penalized, explanation provided).
  - Sanitization of all intermediate floats (`nan` / `inf` converted to bounded defaults).
- **Verification Test:** Automated parameter tests on 16 realistic and pathological dataset fixtures.

---

### FINDING-008: Missing Scoring Summary in Cryptographic Offline HTML Report
- **Component Inspected:** `smellscope/reporting/generator.py:120-220`
- **Existing Implementation:** HTML report generator outputs the 5 paper heuristics and baseline F1, but omits the 4 dataset scoring dimensions, radar summary, and data quality breakdown.
- **Mathematical / Functional Issue:** Offline audit certificates generated for archival or compliance lack the primary summary score indicators required to evaluate dataset health at a glance.
- **Evidence & File Location:** `smellscope/reporting/generator.py:140-180`.
- **Severity:** **P2 (Medium / Reporting Completeness)**
- **Required Correction:** Update `generate_offline_html_report()` to embed the 4-dimension scorecard, overall score, breakdown tables, and before-and-after score deltas directly in the standalone HTML output.
- **Verification Test:** Test verifying generated HTML contains `Dataset Data Quality`, `NIDS Suitability`, `Shortcut Risk`, and `Evaluation Reliability` section cards.

---

## Conclusion & Action Plan

All 8 identified findings will be systematically corrected in **Phases 2 through 16**:
1. Implement the complete `smellscope/scoring/` modular architecture.
2. Extend `fit_and_evaluate()` with ROC-AUC, PR-AUC, and FPR/FNR metrics.
3. Update `manager.py` and API boundary to recalculate all scores on before/after views.
4. Update frontend with interactive scorecards, detail modals, and history tracking.
5. Update offline HTML report generator with comprehensive score breakdown tables.
6. Build extensive test suite (`tests/scoring/test_scoring.py`) with 16 realistic scenarios.
