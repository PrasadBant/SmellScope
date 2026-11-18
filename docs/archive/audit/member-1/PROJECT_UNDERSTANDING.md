# Project Understanding — SmellScope Core Engine

**Role:** Member 1 — Research Core (heuristics, SFI, GGI, evaluation)  
**Context:** CyberScape NIDS benchmark dataset trust audit

---

## 1. What SmellScope Is (and Is Not)

**SmellScope** is a local-first, CSV-based auditor for network-intrusion-detection (NIDS) benchmark datasets.
- **It is:** An analytical diagnostic tool that inspects labelled flow CSVs to measure data design flaws, quantify shortcut reliance, and audit generalisation gaps.
- **It is NOT:** An intrusion detection system, an online classifier, or a novel deep learning algorithm. No new learning algorithm is claimed.

## 2. Core Research Foundation

### The Source Paper [PAPER]
Flood, Engelen, Aspinall, Desmet — *Bad Design Smells in Benchmark NIDS Datasets*, IEEE EuroS&P 2024.
The paper established that benchmark NIDS datasets suffer from severe collection and feature artefacts:
1. **Unclear Ground Truth (UGT):** Attack traffic routed to standard background server ports.
2. **Wrong Labels (WL):** Ambiguous or mislabelled flows identified via Edited Nearest Neighbour (ENN).
3. **Highly Dependent Features (HDF):** A single feature yielding near-perfect separation (F1 ≈ 1.0) between attack and background.
4. **Poor Data Diversity (PDD):** Tight clustering where flows within clusters exhibit high pairwise cosine similarity.
5. **Traffic Collapse (TC):** Clusters where flow pairs have extreme cosine similarity (> 0.95).
*(Note: Artificial diversity requires raw PCAP and is out of scope for CSV flows).*

### Our Proposed Additions [PROPOSED]
1. **Shortcut Fragility Index (SFI) [Primary Innovation]:** A null-calibrated diagnostic formalising Flood et al. Section 6.2. SFI perturbs top validation-ranked features over bounded distributions ($\delta \in \{0.05, 0.10, 0.20, 0.30\}$), compares recall degradation against a random-feature null distribution ($\Delta\text{SFI} = \text{SFI}_{\text{top}} - \text{mean}(\text{SFI}_{\text{null}})$), and contextualises this with a feature controllability taxonomy (A: metadata, B: host fingerprint, C: timing/size, D: mechanism).
2. **Generalisation Gap Index (GGI) [Supporting]:** Quantifies drop in performance between a random split and a group-held-out split ($F1_{\text{random}} - F1_{\text{group}}$) using provenance groups or cluster proxies.
3. **Safe Remediation & Safety Monitor (RSM) [Supporting, Member 2]:** Guarded what-if cleaning (feature ablation, quarantine) without modifying source CSVs.

## 3. Scientific Hypotheses & Evidence Standard

- **Hypothesis H1:** On artefact-driven classes, perturbing top-ranked features degrades recall significantly more than perturbing random features of equal size ($\Delta\text{SFI} > 0$), and $\Delta\text{SFI}$ ranks artefact-driven classes above controls better than HDF alone.
- **Null Hypothesis H0 (Falsifier):** Perturbing top-ranked features shows no greater sensitivity than random features ($\Delta\text{SFI} \le 0$). A null result is an entirely valid, reportable scientific outcome.
- **Evidence Labels:** Every number reported in documentation and output must bear one of:
  `[published]`, `[target]`, `[measured]`, `[synthetic]`, `[cached]`, `[mock]`.

## 4. Key Engineering & Research Constraints

- **Strict Separation of Train and Test:** Preprocessing, scalers, encoders, and feature selection are fit exclusively on training data. Test data is locked before any remediation and never peeked at.
- **Graceful Failure (`n/a` over crash):** Incomputable metrics return `null` and a descriptive reason in `na_reasons`.
- **Pre-Registration:** All heuristic thresholds (`hdf_high`, `z_threshold`, etc.) are committed in configuration prior to evaluation.
