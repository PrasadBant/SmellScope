# Ownership & Boundaries — Member 1 (Research Core)

**Owner:** Member 1 — Research Core Engineer  
**Role:** Scientific correctness of heuristics, SFI, GGI, and baseline evaluation.  
**Branch:** `feature/member-1-core-engine`

---

## 1. Files Owned by Member 1 (Read / Write / Create)

Member 1 has exclusive write ownership over the following directories and files:

### Core Package
- `smellscope/core/__init__.py`
- `smellscope/core/preprocess.py` (train-only fitting of scalers/encoders)
- `smellscope/core/heuristics.py` (UGT, WL, HDF, PDD, TC)
- `smellscope/core/eval.py` (`fit_and_evaluate` baseline Random Forest)
- `smellscope/core/taxonomy.py` (Regex & override classification into A/B/C/D/UNMAPPED)
- `smellscope/core/sfi.py` (SFI calculation, perturbation, null calibration, fragility grid)
- `smellscope/core/ggi.py` (GGI random vs grouped split, proxy clustering)
- `smellscope/core/audit.py` (`audit_class` aggregator, `get_cluster_assignments`)
- `smellscope/core/planted.py` (Ground-truth synthetic shortcut data generation)

### Configuration
- `config/heuristics.yaml` (Pre-registered thresholds, port lists, hyperparameters)
- `config/taxonomy_cic2017.yaml` (Feature categorisation rules for CIC-IDS-2017)
- `config/taxonomy_unsw.yaml` (Feature categorisation rules for UNSW-NB15)
- `config/published_values.yaml` (Literature reference values from Flood et al.)

### Tests & Fixtures
- `tests/core/` (All unit, negative, and contract tests for core functionality)
- `tests/fixtures/core/` (Deterministic synthetic test fixtures, including `split_stub.py`)

### Experiments & Research Docs
- `experiments/e1_reproduction.py` (Reproduction against published values)
- `experiments/e2_planted_shortcut.py` (Planted shortcut recovery experiment)
- `experiments/e5_generalisation_gap.py` (GGI experiment)
- `experiments/e3_agreement.py` (Optional / P2 agreement evaluation)
- `docs/research/` (Research design, preregistration, experiment results, API docs)
- `docs/audit/member-1/` (Audit reports, ownership, understanding)
- `docs/team-execution/member-1/` (Phase progress, PRD, FRD, NFR, Traceability, Handover)
- `docs/team-execution/INTEGRATION_PROGRESS.md` (Member 1 marker section ONLY)
- `docs/team-execution/CONTRACT_CHANGES.md` (Member 1 section ONLY)

---

## 2. Shared Files (Identical Content — No Unilateral Edits)

- `docs/contracts/SHARED_CONTRACT_v1.0.md` (Byte-identical across all three members)

---

## 3. Read-Only Files (Owned by Other Members)

Member 1 may read these files for integration reference, but must NEVER modify them:
- `config/default.yaml` (Member 2)
- `config/remediation_rules.yaml` (Member 2)
- `config/ui.yaml` (Member 3)
- `smellscope/data/*` (Member 2)
- `smellscope/pipeline/*` (Member 2)
- `smellscope/remediation/*` (Member 2)
- `smellscope/api.py` (Member 2)
- `smellscope/ui/*` (Member 3)
- `smellscope/report/*` (Member 3)

---

## 4. Forbidden Actions

1. Modifying source CSV files in `data/raw/` or `data/samples/`.
2. Modifying test data or peeking at test labels during preprocessing or feature selection.
3. Overwriting or editing other members' code or mock files.
4. Git operations that push to remotes, merge branches, or force-push without user command.
5. Making breaking changes to contract interfaces without following the Contract Change Protocol.

---

## 5. Mocks & Stubs in Use

- **`tests/fixtures/core/split_stub.py`:** Stand-in for Member 2's `make_locked_split` and `load_dataset` during Phases 2–4. Produces a valid `SplitManifest` and `LoadedDataset` structure conforming to contract Sections 2.4 and 2.5.
