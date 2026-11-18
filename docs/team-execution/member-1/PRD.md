# Product Requirements Document (PRD) — Core Engine

**Project:** SmellScope — NIDS Benchmark Dataset Trust Auditor  
**Module:** Core Engine (Research, Heuristics, SFI, GGI, Evaluation)  
**Owner:** Member 1  
**Version:** 1.0 (Phase 1 Final)

---

## 1. Vision & Problem Statement

Modern machine learning intrusion detection systems (NIDS) regularly report test classification metrics above 99.5%. However, recent research (Flood et al., EuroS&P 2024; D'hooge et al., DIMVA 2022) demonstrates that these models often learn non-causal dataset artefacts (such as destination port correlations, TCP window sizes, or synthetic packet generator fingerprints) rather than malicious behaviour.

**Problem:** Standard dataset metrics offer no calibration of whether a high-performing feature is a genuine behavioural signature or a fragile collection artefact. Furthermore, dataset maintainers lack automated diagnostics to inspect shortcut fragility and generalisation gaps.

**Vision:** SmellScope provides an open, reproducible, local-first auditing library that computes five literature baseline smell heuristics and introduces a null-calibrated Shortcut Fragility Index (SFI) and Generalisation Gap Index (GGI) to quantify dataset trust.

---

## 2. Core User Personas

1. **Researcher Rhea (NIDS Benchmark Evaluator):**
   - *Goal:* Evaluating whether an IDS model trained on CIC-IDS-2017 or UNSW-NB15 is learning genuine attack indicators or dataset artefacts.
   - *Needs:* Objective per-class audit outputs with transparent flags, feature controllability annotations, and uncertainty intervals.
2. **Reviewer Raj (Peer Reviewer / Panelist):**
   - *Goal:* Verifying that reported benchmark improvements are statistically valid and not relying on leaky features.
   - *Needs:* Explicit evidence labelling (`[published]`, `[target]`, `[measured]`, `[synthetic]`), honest `n/a` handling for unsupported classes, and pre-registered decision thresholds.

---

## 3. Product Scope & Priority Hierarchy

### In Scope
- Robust train-only preprocessing pipeline.
- High-fidelity reimplementation of 5 paper heuristics: UGT, WL, HDF, PDD, TC.
- Baseline RandomForest model evaluation with train/val/test segregation.
- Four-tier feature controllability taxonomy (A, B, C, D, UNMAPPED) for CIC-IDS-2017 and UNSW-NB15.
- Null-calibrated Shortcut Fragility Index (SFI) with perturbation bounds.
- Fragility response grid for pairwise feature exploration.
- Generalisation Gap Index (GGI) using provenance or proxy cluster splits.
- Deterministic synthetic shortcut generator (`planted.py`) for ground-truth verification.
- Pre-registered experiments E1, E2, E5.

### Explicitly Out of Scope
- Raw PCAP inspection or packet payload reassembly (Artificial Diversity smell is out of scope).
- Automated label rewriting or destructive cleaning (owned as what-if views by Member 2).
- Web user interface, charting, or report generation (owned by Member 3).
- Deep learning or online intrusion detection inference.

---

## 4. Feature Prioritisation (MoSCoW / Tiered)

- **P0 (Critical Foundation):**
  - FR-001 (Preprocessing), FR-002 (UGT), FR-003 (WL), FR-004 (HDF), FR-005 (PDD), FR-006 (TC), FR-007 (`fit_and_evaluate`), FR-015 (`audit_class` integration & `n/a` handling), FR-021 (Paper vs Proposed doc), FR-022 (Seed reproducibility).
- **P1 (Core Innovations & Experiments):**
  - FR-008 (Taxonomy), FR-009 (SFI core), FR-010 (SFI null model), FR-011 (Suspicion flag logic), FR-012 (Fragility grid), FR-013 (GGI), FR-014 (Cluster assignments export), FR-016 (Planted generator), FR-017 (Published values config), FR-018 (E1 Reproduction), FR-019 (E2 Planted recovery), FR-020 (E5 Generalisation gap).
- **P2 (Cut-List Order — Cut First if Time Constrained):**
  - 1. LOR (Local Overfitting Ratio).
  - 2. E3 (Agreement with manual findings).
  - 3. E4 (Feature ablation variants).
  - 4. E7 (Stability over multiple runs).
  - 5. Fragility grid high-resolution polish.
  - 6. Conditional shuffle perturbation alternative.
  - 7. Null draws reduction from 50 to 20 (logged in degradations).
  - 8. GGI (fallback to `n/a`).

---

## 5. Success Criteria & Quantitative Targets

- **Reproducibility:** Seed 42 gives bit-identical numerical results across runs.
- **E1 Target:** Re-implemented heuristics match published values within $\pm 0.10$ on benchmark classes where preprocessing matches.
- **E2 Target:** Planted shortcut detector flags $\ge 90\%$ of synthetic shortcut cases and $\le 10\%$ of clean controls across $\ge 20$ seeds.
- **Performance:** Single-class `audit_class` executes in $\le 90$ seconds on 20k rows on a standard 16GB multi-core CPU.
