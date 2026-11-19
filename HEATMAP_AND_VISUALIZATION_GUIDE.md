# Scientific Heatmaps and Visualization Suite Guide

## 1. Overview of Heatmap Architecture

SmellScope 2.0 provides a comprehensive scientific visualization suite designed to reveal multi-class vulnerability patterns, feature reliance, and telemetry correlations at a glance.

The suite comprises three primary matrices accessible via dedicated FastAPI endpoints:
1. **Per-Class Smell Severity Matrix** (`GET /api/v1/audits/{run_id}/heatmaps/smell-matrix`)
2. **Features $\times$ Classes Importance Matrix** (`GET /api/v1/audits/{run_id}/heatmaps/feature-importance`)
3. **Telemetry Feature Correlation Heatmap** (`GET /api/v1/audits/{run_id}/heatmaps/correlations`)
4. **SFI Monte Carlo Decay Curves** (Visualized in Findings and Diagnostics)

---

## 2. Heatmap Specifications

### Heatmap 1: Per-Class Smell Severity Heatmap

* **Endpoint:** `GET /api/v1/audits/{run_id}/heatmaps/smell-matrix`
* **Rows:** All audited attack classes (e.g. `PortScan`, `DDoS`, `Botnet`)
* **Columns (7 Metrics):**
  - **UGT:** Unclear Ground Truth (Threshold: $0.10$)
  - **WL:** Wrong Labels / Packet Length Repetition (Threshold: $0.30$)
  - **HDF:** Highly Dependent Features / Single Feature Dominance (Threshold: $0.60$)
  - **PDD:** Pattern Diversity Disparity (Threshold: $0.25$)
  - **TC:** Traffic Collapse / Cosine Concentration (Threshold: $0.85$)
  - **SFI:** Excess Fragility / SFI Area (Threshold: $0.15$)
  - **GGI:** Generalization Gap Index (Threshold: $0.10$)
* **Color Map:**
  - **Normal / Safe:** `rgba(16, 185, 129, 0.15)` (Emerald)
  - **Moderate / Warning:** `rgba(245, 158, 11, 0.25)` (Amber)
  - **Critical Smell:** `rgba(244, 63, 94, 0.35)` (Rose)
* **Single-Class Invariance:** If the dataset has 0 attack classes (single-class BENIGN), the endpoint returns `is_single_class: True` and explains that attack smells require contrastive malicious traffic.

### Heatmap 2: Features $\times$ Classes Predictive Reliance Matrix

* **Endpoint:** `GET /api/v1/audits/{run_id}/heatmaps/feature-importance`
* **Rows:** Top predictive and candidate shortcut features across audited classes.
* **Columns:** Discovered attack classes.
* **Cell Values:** Normalized relative predictive reliance in $[0.0, 1.0]$.
* **Color Map:** Continuous obsidian-to-cyan gradient highlighting whether classifiers rely on different feature sets per attack or converge onto common testbed artifacts.

### Heatmap 3: Telemetry Feature Correlation Matrix

* **Endpoint:** `GET /api/v1/audits/{run_id}/heatmaps/correlations?max_features=12`
* **Features:** Top numeric feature columns ranked by variance.
* **Cell Values:** Pairwise Pearson correlation coefficient in $[-1.0, 1.0]$.
* **Color Map:** Diverging palette:
  - Strong Negative: Purple / Indigo ($-1.0$)
  - Neutral / Uncorrelated: Slate / Obsidian ($0.0$)
  - Strong Positive: Cyan / Emerald ($+1.0$)

### Heatmap 4: SFI Fragility Decay Curves

* **Component:** `SfiDecayPlot` (using Plotly.js / Canvas)
* **X-Axis:** Perturbation Intensity $\delta \in [0.0, 1.0]$
* **Y-Axis:** Attack Recall (TPR) on Locked Test Partition
* **Curves Rendered:**
  1. **Cyan Solid Line:** Empirical target feature perturbation response ($R_{\text{ablate}}(\delta)$).
  2. **Purple Dashed Line:** Monte Carlo Null Reference Mean ($R_{\text{null\_mean}}(\delta)$).
  3. **Purple Shaded Envelope:** Null reference 95% confidence interval ($\mu_{\text{null}} \pm 1.96 \cdot \sigma_{\text{null}}$).
* **Interpretation:**
  - If the cyan curve dives steeply below the null envelope, excess fragility is proven ($z \ge 2.0$), confirming shortcut learning.

---

## 3. UI Integration & Accessibility

* In `FindingsScreen.tsx`: Tab 3 provides the interactive Heatmap Suite with real-time hover inspection, class tooltips, and empirical value badges.
* In `AuditScreen.tsx`: Step 4 displays interactive metric cards with color-coded safety badges and EuroS&P literature comparison benchmarks.
