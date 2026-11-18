# PHASE 4 — RESEARCH INTELLIGENCE REPORT

**Project:** SmellScope 2.0 — Scientific Dataset Trust Audit Workstation  
**Author:** Data Visualization Specialist & Senior React Engineer  
**Timestamp:** 2026-11-18T19:58:00+05:30  
**Branch:** `feature/react-frontend`  
**Components:** Screen 3 (`SmellMatrixScreen.tsx`) & Screen 4 (`ShortcutDiagnosticsScreen.tsx`)  

---

## 1. Screen 3 — Cross-Class Smell Matrix

The Cross-Class Smell Matrix provides an interactive overview of statistical artifacts across all target attack classes in the evaluated benchmark dataset.

### Capabilities Implemented:
- **Heuristic Dimensions Evaluated:**
  - **UGT (Unassigned/Ghost Traffic):** Evaluates flows targeting reserved/ephemeral port spaces.
  - **WL (Window Length Anomaly):** 4-gram repetition analysis detecting synthetic periodicity.
  - **HDF (High Dimension Feature Dominance):** Gini concentration of single-feature importances.
  - **PDD (Partition Distance Disparity):** KMeans cluster separation disparity between benign and attack flows.
  - **TC (Temporal Concentration):** Burstiness within inter-arrival time windows.
- **Interactive Heatmap & Table Modes:**
  - One-click toggle between responsive grid heatmap and dense tabular comparison.
  - Three-tier color mapping:
    - Green (`#16A34A`): Baseline / low artifact severity.
    - Amber (`#D97706`): Moderate artifact concentration (&ge; threshold).
    - Red (`#DC2626`): Severe statistical abnormality (&ge; 1.5x threshold).
    - Gray (`#263244`): N/A (metric uncomputable, accompanied by explicit `na_reasons`).
- **Metric Inspector:**
  - Interactive hover state reveals full metric definition, rationale, and threshold reference.
- **Published vs Measured Toggle:**
  - Allows comparing measured values against published benchmark literature where registered.
- **Seamless Drill-Down:**
  - Clicking any class cell immediately loads that class into the Shortcut Diagnostic Lab.

---

## 2. Screen 4 — Shortcut Diagnostic Lab

Screen 4 provides scientific drill-down into shortcut vulnerability and generalisation gaps.

### Capabilities Implemented:
- **Summary KPIs:**
  - Baseline Random Forest Test F1, Precision, and Recall on the locked test partition.
  - Null-calibrated Shortcut Fragility Index (SFI).
  - Monte Carlo null baseline mean and z-score standard deviation.
  - Generalisation Gap Index (GGI) comparing random vs grouped evaluation splits.
- **Interactive SFI Decay Plot:**
  - Plots recall collapse across perturbation values $\delta \in [0.0, 1.0]$.
  - Plots empirical curve for candidate shortcut feature vs Monte Carlo null baseline mean.
  - Renders excess fragility indicator, HDF dominance prerequisite, and category eligibility.
- **Feature Controllability Taxonomy Ranking:**
  - Top candidate features ranked by single-feature performance drop.
  - Feature taxonomy badges based on domain rules:
    - `CAT A`: Controllable / High Risk (e.g. Destination Port, Ephemeral Ports).
    - `CAT B`: Semantic / Domain Meaningful (e.g. Flow Duration, Packet Lengths).
    - `CAT C`: Context Dependent.
    - `CAT D`: Invariant / Uncontrollable Artifacts.
- **2D Joint Perturbation Fragility Grid:**
  - Interactive matrix perturbing top 2 shortcut features simultaneously across grid values $\delta_1 \times \delta_2$.
- **Scientific Interpretation Panel:**
  - Clear, calibrated guidance explaining that SFI measures sensitivity under the evaluated protocol and does not by itself prove malicious causality.

---

## 3. Verification & Evidence

- Heuristic values and SFI curves are populated directly from `ClassAuditResult` returned by the Python core.
- No calculations are duplicated in JavaScript.
- Typechecked and verified across all test fixtures.

**Status:** PHASE 4 COMPLETE — PROCEEDING TO PHASE 5 DOCUMENTATION.
