# SmellScope 2.1 — End-User Guide

Welcome to **SmellScope 2.1: The Scientific Dataset Trust Audit Workstation**.

SmellScope is an offline, local-first research platform designed to audit Network Intrusion Detection System (NIDS) benchmark datasets (such as CIC-IDS-2017, CSE-CIC-IDS2018, and UNSW-NB15) to determine whether published machine-learning accuracy is scientifically trustworthy or driven by experimental artifacts and dataset-specific shortcuts.

---

## 1. What SmellScope Is and Is NOT

> [!IMPORTANT]
> **SmellScope is NOT a live intrusion detection system.**
> It does not sniff live packets, monitor network traffic, or trigger intrusion alerts in operations. It is a scientific auditing instrument designed for researchers and engineers evaluating benchmark datasets and training datasets.

---

## 2. Core Navigation & The 5-Stage Workflow

SmellScope 2.1 organizes auditing into a strict, linear 5-stage workflow with persistent state tracking:

```
[HOME] ──> [01 DATASET & 02 AUDIT] ──> [03 FINDINGS] ──> [04 REMEDIATION (OPT.)] ──> [05 REPORTS]
                                             │                                            ▲
                                             └──────────── (Direct Skip) ─────────────────┘
```

### Destination Screens

1. **Home (`/home`)**
   - Introduces product objectives and research context.
   - First-time auditor checklist (dismissible).
   - Most recent audit execution summary card.
   - Quick one-click entry to start a new audit.

2. **New Audit (`/audit`)**
   - **Step 1 · Dataset Source**: Select bundled benchmarks (`cic2017_sample_planted`, `cic2017_sample_raw`) or upload custom `.csv` / `.parquet` files.
   - **Step 2 · Schema Inspection**: Real-time cryptographic fingerprinting (SHA-256), loaded row counts, dropped Inf/NaN verification, column role mapping (`dst_port`, `timestamp`, `label`), and class distribution charts.
   - **Step 3 · Audit Launch**: Configurable stratified 60/20/20 train/val/locked-test split parameters, random seed, and class row caps. Live multi-step execution progress bar.

3. **Findings (`/findings`)**
   - **Tab 1: Five Dataset Smells (Matrix)**: Displays class-by-class heuristic evaluations (UGT, WL, HDF, PDD, TC) with traffic-light risk thresholds. Includes one-click comparison against EuroS&P 2024 literature values.
   - **Tab 2: Shortcut Diagnostics (SFI & GGI)**: Evaluates whether classifier accuracy collapses when suspicious features are zeroed out or permuted. Features an interactive Plotly decay curve juxtaposed against a Monte Carlo null distribution.
   - **Tab 3: Feature Controllability Taxonomy**: Ranks features by importance and maps them into Category A (Trivial Evasion), Category B (Semantic), and Category C/D (Context).

4. **Remediation (`/remediation`) — *STRICTLY OPTIONAL***
   - Prominently marked with an **OPTIONAL WORKFLOW STAGE** banner.
   - Users can safely skip remediation and go straight to report export.
   - If evaluated: allows non-destructive What-If simulations of **R1 Feature Ablation** (zeroing out shortcut columns) and **R2 Flow Quarantine** (filtering anomalous rows).
   - Enforces the **Remediation Safety Monitor (RSM)**: prevents data leakage, distribution collapse, and unmeasured alterations.

5. **Reports (`/reports`)**
   - Validates that the locked 20% test partition was preserved bit-for-bit without data snooping.
   - Displays cryptographic lineage hashes for all transformations.
   - Exports self-contained, offline HTML audit certificates ready for peer review or compliance archiving.

---

## 3. Basic vs Advanced View Modes

At the top right of every screen, the workstation provides a **View Mode Switch**:
- **Basic View (Default)**: Plain-English terminology, visual indicator badges, human-readable explanations of every smell, and guidance on how to interpret scores.
- **Advanced View**: Scientific symbols, mathematical definitions, z-scores, p-values, feature taxonomies, and high-density technical telemetry.

---

## 4. Key Terminology Quick Reference

- **UGT (Unassigned Ghost Traffic)**: Detects whether attacks exclusively target unassigned protocol port numbers.
- **WL (Window Repetition)**: Detects fixed or repeated TCP window sizes artificially hardcoded by attack scripts.
- **HDF (High-Dominance Feature)**: Flags features that achieve near-perfect classification on their own without learning attack behavior.
- **PDD (Packet Dynamics Disparity)**: Identifies extreme divergence in inter-arrival times or packet lengths compared to benign traffic.
- **TC (Temporal Clustering)**: Identifies whether attacks were captured in short, continuous bursts separated in time from background noise.
- **SFI (Shortcut Fragility Index)**: Measures model recall collapse when a candidate feature is masked, null-calibrated against Monte Carlo random draws.
- **GGI (Generalisation Gap Index)**: Measures performance drop when evaluating on held-out attack subclasses versus random train/test splits.
- **RSM (Remediation Safety Monitor)**: Guardrail enforcing statistical constraints before accepting dataset modifications.
