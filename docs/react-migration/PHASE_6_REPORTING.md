# PHASE 6 — VERIFICATION & OFFLINE REPORTING REPORT

**Project:** SmellScope 2.0 — Scientific Dataset Trust Audit Workstation  
**Author:** Principal Software Architect & QA Lead  
**Timestamp:** 2026-11-18T20:02:00+05:30  
**Branch:** `feature/react-frontend`  
**Component:** Screen 6 (`ReportsScreen.tsx`) & Standalone HTML Generator  

---

## 1. Executive Summary

Phase 6 implements the scientific verification workspace and the offline HTML report generator.

SmellScope provides complete transparency into counterfactual model evaluation: it compares baseline vs remediated model performance on the **exact same locked test partition** and generates self-contained, offline HTML audit reports containing full cryptographic provenance, heuristic matrices, and scientific limitations.

---

## 2. Locked Test-Set Verification

The workstation guarantees that evaluation results are never distorted by test leakage:
- **Locked Test Rows Count:** Displays exact row count of the locked test partition.
- **Cryptographic Split Hash:** Displays SHA-256 hash computed over sorted partition indices.
- **Same-Test-IDs Verification:** Confirms `same_test_ids: True`, proving both baseline and remediated models were evaluated on identical test flow indices.
- **Non-Negotiable Leak Detection:** `assert_test_untouched` raises `E_TEST_LEAK` if any test row is touched during training or remediation.

---

## 3. Before vs After Rebenchmark Evaluation

When users trigger `Run Locked Rebenchmark`, the engine:
1. Fits the baseline model on the original training view (`view_0000`).
2. Evaluates performance on the locked test partition.
3. Fits the counterfactual model on the remediated training view (e.g. `view_0001`).
4. Evaluates performance on the exact same locked test partition.
5. Displays accuracy, macro F1, recall (TPR), specificity (TNR), and their respective performance deltas ($\Delta$).

**Scientific Interpretation Rule:**
A performance drop after feature ablation indicates that the classifier was dependent on that feature under the tested protocol. It does not by itself prove that the feature was an invalid dataset artifact.

---

## 4. Standalone Offline HTML Report Generator

The workstation compiles a self-contained offline report via `POST /api/v1/audits/{run_id}/reports`:
- **Fully Embedded CSS:** No external CDN links, web fonts, or tracking scripts required. Works in completely air-gapped research networks.
- **Visual Design:** Dark theme matching workstation design tokens (`#0B0F19`, `#111827`, `#6366F1`, `#38BDF8`).
- **Complete Provenance:** Includes raw file SHA-256 fingerprint, locked split hash, config hash, Python/NumPy/Pandas/Scikit-learn versions, and execution timestamp.
- **Comprehensive Audit Content:**
  - Executive summary KPIs.
  - Cross-class smell matrix table (UGT, WL, HDF, PDD, TC).
  - Shortcut diagnostic findings (top feature, SFI, GGI gap, category A/B/C/D).
  - Remediation change log and RSM authorization records.
  - Before/after rebenchmark comparison metrics.
  - Mandatory scientific disclaimer and methodological caveats.
- **Direct Download:** Downloadable via `GET /api/v1/audits/{run_id}/reports/{report_id}/download`.

---

## 5. Verification & Test Evidence

- Tested via automated backend test `test_report_generation_and_download`:
  - Successfully generated HTML report.
  - Downloaded report file and verified HTTP 200, `text/html` MIME type, and presence of mandatory scientific notices.

**Status:** PHASE 6 COMPLETE — PROCEEDING TO PHASE 7 (Integration & Release Validation).
