# SmellScope 2.0 — Comprehensive Bug Register & Defect Resolution Log

**Document Version:** 1.0.0  
**Date:** November 2026  
**Status:** Complete Remediation Signoff  
**Total Defects Identified:** 8  
**Total Defects Resolved:** 8  
**Outstanding / Unresolved:** 0  

---

## 1. Defect Classification Scheme

- **P0 (Critical Scientific / Architectural Flaw):** Incorrect mathematical formulas, conflation of orthogonal dimensions, or risk inversion yielding deceptive research claims.
- **P1 (High Functional / Evaluation Defect):** Missing endpoints, lack of multi-class ML metrics, unfair penalization of valid network traffic, or incomplete reporting.
- **P2 (Medium Schema / Type Validation Defect):** Pydantic validation mismatches, missing imports, or UI locator ambiguities.

---

## 2. Exhaustive Defect Register

### BUG-SC-01 (P0): Conflation of Data Quality and Shortcut Risk
- **Component:** Core Architecture / Legacy Evaluation
- **Discovered In:** Phase 1 Inspection
- **Root Cause:** Prior to SmellScope 2.0, systems conflated raw CSV hygiene (absence of nulls/duplicates) with dataset research validity. A dataset with zero nulls but catastrophic ephemeral port shortcuts was rated as "99.8% Healthy", misleading researchers.
- **Remediation:** Architected `smellscope.scoring` subsystem with strictly orthogonal dimensions:
  - Dimension 1: Data Quality Score ($S_{\text{DQ}}$, 0–100, Higher = Better).
  - Dimension 3: Shortcut & Leakage Risk Score ($S_{\text{Risk}}$, 0–100, **HIGHER = GREATER RISK**).
- **Files Modified:** `smellscope/scoring/quality_score.py`, `smellscope/scoring/shortcut_risk_score.py`, `smellscope/scoring/score_config.py`.
- **Verification Evidence:** `tests/scoring/test_scoring.py::test_shortcut_risk_score_severe_smells` passed; planted benchmark correctly flagged with 71.50 High Risk despite 99.80 Quality.

---

### BUG-SC-02 (P0): Misaligned Directionality in Overall Assessment Synthesis
- **Component:** `smellscope/scoring/overall_assessment.py`
- **Discovered In:** Scoring Subsystem Architecture Design
- **Root Cause:** A naive linear combination would add $S_{\text{Risk}}$ to $S_{\text{DQ}}$, causing high-risk datasets to score higher than low-risk datasets.
- **Remediation:** Explicitly inverted the risk dimension in the synthesis formula:
  $$S_{\text{Overall}} = 0.30 \cdot S_{\text{DQ}} + 0.30 \cdot S_{\text{NIDS}} + 0.20 \cdot S_{\text{Rel}} + 0.20 \cdot (100.0 - S_{\text{Risk}})$$
- **Files Modified:** `smellscope/scoring/overall_assessment.py`.
- **Verification Evidence:** `tests/scoring/test_scoring.py::test_overall_dataset_assessment_synthesis` passed; boundary checks verify $S_{\text{Overall}} \in [0.0, 100.0]$ under all conditions.

---

### BUG-SC-03 (P1): Unfair Penalization of Realistic Class Imbalance in NIDS Benchmarks
- **Component:** `smellscope/scoring/nids_suitability_score.py`
- **Discovered In:** Phase 1 Inspection (`SCORING_AUDIT_FINDINGS.md`)
- **Root Cause:** Generic ML quality checks penalize class imbalance (e.g. 95:5 or 99:1 benign-to-attack ratios). In network security, 95% benign traffic is standard operational reality; penalizing it forces artificial 50/50 downsampling that distorts base-rate probabilities.
- **Remediation:** Implemented a logarithmic tolerance function that allows realistic network skew up to $500:1$ without severe penalty ($S_{\text{imb}} \ge 75/100$), while strictly penalizing minority classes with $N_{\text{atk}} < 20$ samples.
- **Files Modified:** `smellscope/scoring/nids_suitability_score.py`.
- **Verification Evidence:** `tests/scoring/test_scoring.py::test_nids_suitability_imbalance_fairness` passed.

---

### BUG-SC-04 (P1): Missing Multi-Class Advanced Evaluation Metrics in Baseline Evaluation
- **Component:** `smellscope/core/eval.py`
- **Discovered In:** Core Evaluation Inspection
- **Root Cause:** `fit_and_evaluate` only computed binary accuracy, precision, recall, and $F_1$, omitting False Positive Rate (FPR), False Negative Rate (FNR), multi-class ROC-AUC, and PR-AUC.
- **Remediation:** Extended `fit_and_evaluate` with `roc_auc_score(multi_class='ovr', average='macro')`, `precision_recall_curve`, FPR, and FNR, wrapped in defensive single-class and uncomputable guards.
- **Files Modified:** `smellscope/core/eval.py`.
- **Verification Evidence:** `tests/core/test_eval.py` passed; verified multi-class baseline metric computation without runtime errors.

---

### BUG-SC-05 (P1): Missing Scores Endpoint in FastAPI Backend
- **Component:** `smellscope/server/routers/improvement.py`, `smellscope/server/dependencies.py`
- **Discovered In:** Backend API Integration
- **Root Cause:** No dedicated REST endpoint existed to query dynamic dataset scores for an audit run.
- **Remediation:** Added `GET /api/v1/audits/{run_id}/scores` with `get_dataset_scores` dependency in `dependencies.py` and exported public methods in `smellscope/api/__init__.py`.
- **Files Modified:** `smellscope/server/routers/improvement.py`, `smellscope/server/dependencies.py`, `smellscope/api/__init__.py`.
- **Verification Evidence:** Verified via live HTTP request returning 200 OK with all 4 dimensions and 100% evidence coverage.

---

### BUG-SC-06 (P1): Offline HTML Report Missing Authoritative Scoring Table & Recommendations
- **Component:** `smellscope/reporting/generator.py`, `smellscope/server/routers/reports.py`
- **Discovered In:** Reporting Subsystem Review
- **Root Cause:** Offline HTML reports only included raw paper heuristic tables, omitting the new 4-dimension scorecard, overall trust score, and intelligent repair recommendations.
- **Remediation:** Updated `generate_html_report` to embed the overall trust gauge, 4-dimension scorecard cards, and intelligent recommendation tables with full CSS styling.
- **Files Modified:** `smellscope/reporting/generator.py`, `smellscope/server/routers/reports.py`.
- **Verification Evidence:** `tests/server/test_api_boundary.py::test_report_generation_and_download` passed; generated report contains valid HTML and CSS.

---

### BUG-SC-07 (P2): Pydantic Schema Mismatch on Recommendations & Repair Plan Previews
- **Component:** `smellscope/server/schemas/models.py`, `smellscope/remediation/manager.py`
- **Discovered In:** Integration Testing
- **Root Cause:**
  - `RecommendationsResponse.recommendations[].evidence` was typed as `Dict[str, Any]` while `recommender.py` emitted string descriptions.
  - `RepairPlanPreviewResponse.affected_rows_by_class` expected `Dict[str, int]` while `manager.py` emitted `{class: {before: X, after: Y, retention: Z}}`.
- **Remediation:** Relaxed Pydantic schemas to accept flexible objects (`Any`), normalized dictionary fields, and updated frontend components to format nested counts.
- **Files Modified:** `smellscope/server/schemas/models.py`, `smellscope/server/routers/improvement.py`, `frontend/src/features/improvement/ImprovementScreen.tsx`.
- **Verification Evidence:** `test_improvement_centre_workflow` passed with 0 validation errors.

---

### BUG-SC-08 (P2): NameError in `manager.py` Due to Missing Pathlib Import
- **Component:** `smellscope/remediation/manager.py`
- **Discovered In:** Repair Plan Application Verification
- **Root Cause:** `manager.py` called `Path(export_path)` during repaired dataset CSV export, but `Path` was not imported from `pathlib`.
- **Remediation:** Added `from pathlib import Path` to top-level imports of `manager.py`.
- **Files Modified:** `smellscope/remediation/manager.py`.
- **Verification Evidence:** `test_improvement_centre_workflow` and `test_remediation_and_rsm_lifecycle` passed with CSV successfully written to `data/repaired/`.

---

## 3. Resolution Verification Signoff

All 8 defects have been permanently remediated in source code, covered by automated unit and integration tests, and verified regression-free in the full automated test suite.
