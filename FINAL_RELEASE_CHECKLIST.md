# SmellScope 2.0 / 2.1 — Final Release Acceptance Checklist

## 1. Release Verification Overview

- **Product:** SmellScope 2.0 / 2.1 — Intelligent Cybersecurity Dataset Auditing & Improvement Workstation
- **Release Target:** `main` branch
- **Test Results:** 61 Backend Pytests (100% Pass) · 16 Frontend Vitests (100% Pass) · 4 Playwright E2E Tests (100% Pass)
- **Sign-off Date:** November 19, 2026
- **Status:** **APPROVED FOR RELEASE (30 / 30 PASS)**

---

## 2. 30-Item Acceptance Criteria Verification Matrix

| # | Item / Acceptance Criterion | Verification Method / Evidence | Status |
| :---: | :--- | :--- | :---: |
| **1** | **Local-First Architecture** | Standalone localhost operation; zero cloud or third-party telemetry dependencies. | **PASS** |
| **2** | **React + TypeScript Frontend** | Vite 5 build completes with zero errors; clean responsive components. | **PASS** |
| **3** | **FastAPI Backend Server** | Pydantic v2 schemas; asynchronous non-blocking job manager; clean JSON endpoints. | **PASS** |
| **4** | **Python Research Engine** | In-process execution of heuristics, Monte Carlo perturbations, and Random Forest models. | **PASS** |
| **5** | **Obsidian Black Theme** | Deep dark palette (`#0a0e14`, `#111822`, `#1a2230`) with cyan and emerald accents. | **PASS** |
| **6** | **Explicit 'None' Dataset Option** | Option A includes `<option value="">None — Do not select...</option>`; prevents accidental audits. | **PASS** |
| **7** | **Custom CSV Upload & Hashing** | Multipart file upload generates SHA-256 fingerprint and column profile. | **PASS** |
| **8** | **Validation Parameter Persistence** | Updating label, benign ID, or seed does not disconnect active dataset ID or clear metadata. | **PASS** |
| **9** | **Schema Datalist Autocompletion** | Input fields offer `<datalist>` dropdowns populated from dataset schema columns and classes. | **PASS** |
| **10** | **Integer Seed Validation** | Requires integer $\ge 0$; gracefully rejects negative or non-integer seeds. | **PASS** |
| **11** | **Train-Only Preprocessing** | Scalers and imputers fit strictly on $60\%$ train split; zero test leakage. | **PASS** |
| **12** | **Locked Test Invariance** | Test partition ($20\%$) verified bit-for-bit identical before and after all modifications. | **PASS** |
| **13** | **Five Heuristics (UGT, WL, HDF, PDD, TC)** | All heuristics return calibrated floats or `null` with explicit mathematical explanation. | **PASS** |
| **14** | **SFI Perturbation Ranking** | Monte Carlo null calibration with $20$ draws across $\delta \in [0.1, 1.0]$. | **PASS** |
| **15** | **SFI Zero-Candidate Explanation** | Explicit educational alert rendered when zero eligible numerical features exist for SFI. | **PASS** |
| **16** | **Generalisation Gap Index (GGI)** | Computes $F_{1, \text{random}} - F_{1, \text{grouped}}$ across subnets or cluster assignments. | **PASS** |
| **17** | **Leakage-Odds Ratio (LOR)** | Quantifies split duplication odds; flags contamination when $\text{LOR} > 2.0$. | **PASS** |
| **18** | **Train vs. Val vs. Locked Test Metrics** | Distinct partition cards; training accuracy is never presented as generalisation accuracy. | **PASS** |
| **19** | **100% Accuracy Diagnostic Trigger** | Automatically triggers comprehensive investigation whenever any split accuracy $\ge 0.99$. | **PASS** |
| **20** | **14-Dimension Diagnostic Matrix** | Inspects train/val gap, test support, port shortcuts, answer encoding, LOR, and duplicates. | **PASS** |
| **21** | **Cases A–E Synthesis** | Accurately assigns Case A (Overfitting), Case B (Leakage), Case C (Shortcut), Case D (Real), or Case E (Small N). | **PASS** |
| **22** | **Per-Class Smell Heatmap Matrix** | Interactive matrix table color-coded by severity across all attack classes. | **PASS** |
| **23** | **Feature Importance & Taxonomy Matrix** | Features ranked and tagged by Category A, B, C, or D with ablation advisories. | **PASS** |
| **24** | **Dataset Improvement Centre** | Automated generation of prioritized recommendations (Categories A, B, and C). | **PASS** |
| **25** | **RSM Safety Governance** | Strict enforcement of class retention ($\ge 80\%$), cluster diversity, and test protection. | **PASS** |
| **26** | **Reversible Rollback Ledger** | View lineage tracking (`view_0000` $\to$ `view_0001`) with cryptographic parent restore. | **PASS** |
| **27** | **Original vs. Corrected Comparison** | Side-by-side data quality table, ML performance deltas, and evidence-based summary. | **PASS** |
| **28** | **Model Registry Persistence** | Persists model `.joblib`, preprocessor, and `metadata.json` under `data/models/{model_id}/`. | **PASS** |
| **29** | **Reusable 11-File Training Bundle (.zip)** | Complete self-contained archive with datasets, manifests, configs, and binaries. | **PASS** |
| **30** | **Cryptographic Offline HTML Report** | Generates standalone, self-contained HTML audit certificate with embedded charts. | **PASS** |

---

## 3. Final Sign-off

The SmellScope 2.0 / 2.1 application is fully functional, scientifically validated, thoroughly tested across all layers, and ready for deployment.
