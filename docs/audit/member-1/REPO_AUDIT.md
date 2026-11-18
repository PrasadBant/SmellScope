# Repository Audit & Context — Member 1 (Research Core)

**Date:** 2026-11-18  
**Agent:** Member 1 — Research Core Engine  
**Branch:** `feature/member-1-core-engine`  
**Workspace:** `c:\Users\vishu\badsmellpart1`

---

## 1. Environment & Runtime Audit

- **Operating System:** Windows (win32)
- **Python Version:** 3.13.12 (Contract notes target 3.11; Python 3.13 is fully functional with current libraries)
- **Git State:** 
  - Git repository freshly initialized.
  - Active branch: `feature/member-1-core-engine`.
  - Remote: None configured (local-first).
- **Installed Core Packages (Member 1 scope):**
  - `numpy`: 2.2.3 (OK)
  - `pandas`: 2.2.3 (OK)
  - `scikit-learn`: 1.6.1 (OK)
  - `joblib`: 1.4.2 (OK)
  - `PyYAML`: 6.0.2 (OK)
  - `pytest`: 9.1.1 (OK)
  - `jinja2`: 3.1.5 (OK)
  - `pyarrow`: 25.0.1 (OK)
- **UI / Frontend Packages (Member 3 scope):**
  - `streamlit`: Not installed (Out of scope for Member 1)
  - `plotly`: Not installed (Out of scope for Member 1)

---

## 2. Codebase & Data Audit

- **Existing Source Code:** None. Clean greenfield workspace.
- **Existing Research Blueprint / Paper:** Neither `RESEARCH_TO_PROTOTYPE_OVERVIEW.md` nor the PDF paper is committed in the workspace root. All necessary equations, constants, published values, and algorithmic contracts are captured comprehensively in the prompt and frozen contract.
- **Datasets Present:** No datasets in `data/raw/` or `data/samples/`. 
  - Unit tests will rely on deterministic synthetic fixtures (`tests/fixtures/core/`).
  - Shortcut detection and validation will use `planted.py` (generating synthetic ground-truth data).
  - Published comparison (E1) will compare measured synthetic/available runs against published reference values pre-registered in `config/published_values.yaml`.

---

## 3. Existing vs. Missing Matrix (Member 1 Owned Files)

| File / Component | Status | Target Phase | Notes |
|---|---|---|---|
| `smellscope/core/__init__.py` | Missing | Phase 2 (stubs) / Phase 3 | Package export |
| `smellscope/core/preprocess.py` | Missing | Phase 2 (stubs) / Phase 3 | Train-only scaler/imputer/encoder |
| `smellscope/core/heuristics.py` | Missing | Phase 2 (stubs) / Phase 3 | UGT, WL, HDF, PDD, TC |
| `smellscope/core/eval.py` | Missing | Phase 2 (stubs) / Phase 3 | `fit_and_evaluate` baseline RF |
| `smellscope/core/taxonomy.py` | Missing | Phase 2 (stubs) / Phase 3 | Feature categorization A/B/C/D |
| `smellscope/core/sfi.py` | Missing | Phase 2 (stubs) / Phase 3 | SFI, null model, fragility grid |
| `smellscope/core/ggi.py` | Missing | Phase 2 (stubs) / Phase 3 | GGI, group-held-out vs random |
| `smellscope/core/audit.py` | Missing | Phase 2 (stubs) / Phase 3 | `audit_class`, `get_cluster_assignments` |
| `smellscope/core/planted.py` | Missing | Phase 2 (stubs) / Phase 3 | Planted shortcut generator |
| `config/heuristics.yaml` | Missing | Phase 1 (pre-reg) / Phase 3 | Heuristic thresholds & params |
| `config/taxonomy_cic2017.yaml` | Missing | Phase 3 | Feature taxonomy mapping for CIC |
| `config/taxonomy_unsw.yaml` | Missing | Phase 3 | Feature taxonomy mapping for UNSW |
| `config/published_values.yaml` | Missing | Phase 1 / Phase 3 | Paper reference values |
| `tests/fixtures/core/split_stub.py`| Missing | Phase 2 | Contract-compliant split stub |
| `tests/core/test_contract.py` | Missing | Phase 2 | Conformance against contract Section 2 |
| `tests/core/test_heuristics.py` | Missing | Phase 3 | Unit tests for 5 heuristics |
| `tests/core/test_sfi.py` | Missing | Phase 3 | Unit tests for SFI & null model |
| `experiments/e1_reproduction.py`| Missing | Phase 4 | Reproduction vs published |
| `experiments/e2_planted_shortcut.py`| Missing | Phase 4 | Planted shortcut recovery |
| `experiments/e5_generalisation_gap.py`| Missing | Phase 4 | GGI experiment |
| `docs/contracts/SHARED_CONTRACT_v1.0.md`| Missing | Phase 2 | Shared integration contract |
| `docs/research/PREREGISTRATION.md`| Missing | Phase 1 | Pre-registered thresholds |
| `docs/research/CORE_IMPLEMENTATION.md`| Missing | Phase 3 | Paper vs proposed distinctions |
| `docs/research/CORE_API.md` | Missing | Phase 5 | Integration documentation |

---

## 4. Initial Risk Register (Max 8 Risks)

| ID | Risk | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| R-01 | Real NIDS benchmark CSVs (CIC/UNSW) not loaded in local workspace | High | High | Implement deterministic synthetic & planted generators (`planted.py`, fixtures); execute E1/E2 on synthetic ground truth with strict `synthetic` evidence labels. |
| R-02 | Python 3.13 environment vs 3.11 target | Low | High | Ensure no 3.13-only syntax is used; verify all core dependencies (`numpy`, `pandas`, `sklearn`, `joblib`, `yaml`) execute cleanly. |
| R-03 | Computational cost of ENN (WL) and KMeans (PDD/TC) on large datasets | Medium | Medium | Respect subsampling limits (max 20k rows per class); apply `n_jobs` in parallel jobs; use feature sampling caps. |
| R-04 | SFI null distribution drawing takes excessive runtime | Medium | Medium | Implement vectorised perturbation; default 50 draws with allowed fallback to 20 draws (logged in `degradations`); limit permutation evaluation batches. |
| R-05 | Zero test recall ($R(0)=0$) causing division by zero in SFI | Medium | Low | Strict guard: return `n/a` with clear entry in `na_reasons["sfi.recall_baseline"]`. Never divide by zero. |
| R-06 | Data leakage during preprocessing/scaling | High | Low | Enforce train-only fitting for all transformers, encoders, and scalers. Validate with automated test asserting untouched test set. |
| R-07 | Contract divergence between Member 1 and Member 2 | High | Low | Freeze Shared Contract v1.0 in Phase 2; use contract-conformance automated test suite against Section 2 types and keys. |
| R-08 | Time budget overrun (>6.5 hours) | Medium | Medium | Follow strict cut-list: drop LOR, E3, E4, E7, conditional shuffle first. Never cut test-separation, RSM guards, or n/a honesty. |
