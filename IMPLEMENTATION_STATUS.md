# SmellScope 2.0 / 2.1 — Implementation Status & Architecture Map

## 1. Executive Summary

SmellScope is a local-first scientific workstation for auditing Network Intrusion Detection System (NIDS) benchmark datasets. It rigorously investigates dataset design weaknesses, feature artifacts, shortcut learning, and generalisation gaps.

This document provides a component-by-component verification and status report for the entire codebase.

---

## 2. Core Scientific Engine (`smellscope/core/`)

| Component | File Path | Implementation Status | Test Status | Key Responsibility |
| :--- | :--- | :---: | :---: | :--- |
| **Preprocessing & Leakage Prevention** | [`preprocess.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/preprocess.py) | **COMPLETE** | `test_train_only_fitting_no_leakage` (PASS) | Fits scalers/encoders strictly on training split ($60\%$), preventing target and test leaks. |
| **Paper Heuristic: UGT** | [`heuristics.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/heuristics.py) | **COMPLETE** | `test_ugt_known_mix` (PASS) | Measures Uniform Flow-Group Top-Port Concentration ($Gini$ coefficient over target ports). |
| **Paper Heuristic: WL** | [`heuristics.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/heuristics.py) | **COMPLETE** | `test_wl_clean_vs_noisy_fixture` (PASS) | Measures Watershed Leakage (mutual information and direct flow-level leakage). |
| **Paper Heuristic: HDF** | [`heuristics.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/heuristics.py) | **COMPLETE** | `test_hdf_perfect_single_feature` (PASS) | Measures Heavy-Hitter Distinct Features (single-feature separability). |
| **Paper Heuristic: PDD** | [`heuristics.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/heuristics.py) | **COMPLETE** | `test_pdd_and_tc_identical_vectors` (PASS) | Measures Pairwise Distinct Duplicates (cross-split and intra-class vector collisions). |
| **Paper Heuristic: TC** | [`heuristics.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/heuristics.py) | **COMPLETE** | `test_pdd_and_tc_identical_vectors` (PASS) | Measures Temporal Coherence and collection sequence order artifacts. |
| **Shortcut Fragility Index (SFI)** | [`sfi.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/sfi.py) | **COMPLETE** | `test_sfi_permutation_ranking_and_bounds` (PASS) | Evaluates recall degradation ($\Delta \text{SFI}$) under targeted vs null Monte Carlo feature perturbations. |
| **Generalisation Gap Index (GGI)** | [`ggi.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/ggi.py) | **COMPLETE** | `test_ggi_disjoint_subtypes` (PASS) | Compares random cross-validation $F_1$ against grouped cross-validation across subnets or attack subtypes. |
| **Leakage-Odds Ratio (LOR)** | [`ggi.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/ggi.py) | **COMPLETE** | `test_ggi_insufficient_groups` (PASS) | Odds ratio of split duplication rate to quantify holdout contamination. |
| **Baseline ML Evaluator** | [`eval.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/eval.py) | **COMPLETE** | `test_fit_and_evaluate_binary_and_multiclass` (PASS) | Balanced Random Forest ($100$ trees) evaluated independently across Train, Val, and Locked Test partitions. |
| **100% Accuracy Diagnostic Engine** | [`perfect_accuracy.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/perfect_accuracy.py) | **COMPLETE** | `test_perfect_accuracy_investigation_cases` (PASS) | 14-point scientific diagnostic audit classifying results into Cases A through E. |
| **Class-Level Audit Orchestration** | [`audit.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/core/audit.py) | **COMPLETE** | `test_audit_class_contract_conformance` (PASS) | Orchestrates all heuristics, SFI, GGI, and baseline evaluations per attack class. |

---

## 3. Scoring System (`smellscope/scoring/`)

| Dimension | Formula | Weight | Implemented Status |
| :--- | :--- | :---: | :---: |
| **Technical Data Quality ($S_{\text{DQ}}$)** | $100 - (\text{missing\_pen} + \text{inf\_pen} + \text{dup\_pen} + \text{col\_pen})$ | $20\%$ | **COMPLETE** |
| **NIDS Suitability ($S_{\text{NIDS}}$)** | $100 - (\text{imbalance\_pen} + \text{volume\_pen} + \text{telemetry\_pen})$ | $25\%$ | **COMPLETE** |
| **Shortcut Risk ($S_{\text{SR}}$)** | $100 - (\text{UGT\_pen} + \text{HDF\_pen} + \text{SFI\_pen} + \text{CatA\_pen})$ | $30\%$ | **COMPLETE** |
| **Evaluation Reliability ($S_{\text{ER}}$)** | $100 - (\text{GGI\_pen} + \text{LOR\_pen} + \text{test\_leak\_pen})$ | $25\%$ | **COMPLETE** |
| **Overall Dataset Trust Score ($S_{\text{O}}$)** | $\sum_{i} w_i \cdot S_i$ | $100\%$ | **COMPLETE** |

---

## 4. Remediation, Safety & Model Persistence

| Module | File Path | Status | Key Responsibility |
| :--- | :--- | :---: | :--- |
| **Intelligent Recommender** | [`recommender.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/remediation/recommender.py) | **COMPLETE** | Generates prioritized repair recommendations (Categories A, B, and C). |
| **Remediation Safety Monitor (RSM)** | [`rsm.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/remediation/rsm.py) | **COMPLETE** | Enforces class retention ($\ge 80\%$), cluster diversity, and feature survival bounds. |
| **Repair & View Manager** | [`manager.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/remediation/manager.py) | **COMPLETE** | Applies transformations, computes view hashes, generates comparison deltas, and stores active estimators. |
| **Model Registry & Training Bundles** | [`registry.py`](file:///c:/Users/vishu/badsmellpart1/smellscope/models/registry.py) | **COMPLETE** | Saves models to `data/models/`, validates schema compatibility, and compiles 11-file reproducible ZIP archives. |

---

## 5. Web API & Frontend Workstation

| Layer | Technology | Key Routes / Features | Status |
| :--- | :--- | :--- | :---: |
| **FastAPI Server** | Python 3.13 + Starlette | `/api/v1/datasets`, `/api/v1/audits`, `/api/v1/scores`, `/api/v1/models` | **OPERATIONAL** |
| **React Workstation** | React 18 + TS + Tailwind | 5-stage progressive workflow: Dataset $\to$ Audit $\to$ Findings $\to$ Improvement $\to$ Comparison $\to$ Reports | **OPERATIONAL** |
| **100% Accuracy Panel** | React component | 14-item diagnostic inspection grid with case badges (Cases A–E) | **OPERATIONAL** |
| **Scientific Heatmaps** | React component | Per-class smell heatmap, feature importance taxonomy, and SFI decay curves | **OPERATIONAL** |
| **Model Deployment UI** | React component | Save Model dialog, Persisted Models Registry drawer, and bundle downloads | **OPERATIONAL** |
