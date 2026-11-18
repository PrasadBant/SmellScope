# SmellScope 2.0 — Scientific Dataset Scoring Methodology

**Document Version:** 1.0.0  
**Date:** November 2026  
**Status:** Authoritative Scientific Contract  
**Applies To:** `smellscope.scoring` subsystem, SmellScope 2.0 REST API, Frontend Workstation, Offline Audit Reports  

---

## 1. Executive Scientific Rationale

In Network Intrusion Detection System (NIDS) machine learning research, evaluating a dataset with a single scalar "quality" number or relying exclusively on benchmark accuracy (such as 99.8% Random Forest test accuracy) is fundamentally invalid. Prior academic research has repeatedly demonstrated that standard NIDS benchmark datasets (e.g., CIC-IDS-2017, UNSW-NB15) frequently suffer from severe experimental artifacts:

1. **Protocol Artifacts & Ephemeral Port Bindings (UGT):** Classifiers memorize testbed-specific destination or source port numbers rather than semantic attack behavior.
2. **Deterministic Sequence Repetition (WL):** Identical packet length sequences or timing intervals repeated artificially during traffic capture allow trivial fingerprinting.
3. **Single-Feature Dominance (HDF):** A single non-behavioral attribute (e.g., TCP initial window size or flow duration) separates attack flows from benign traffic with near-zero error.
4. **Shortcut Reliance & Attacker Evasion (SFI):** Classifiers rely on trivial Category A features that an adversary can mutate with near-zero cost, leading to catastrophic recall decay in deployment.
5. **Data Leakage & Test Pollution:** Preprocessing statistics (imputers, scalers, encoders) computed across the entire dataset or leaky partition splits yield falsely optimistic evaluation scores.

A dataset can simultaneously possess **flawless technical hygiene** (zero missing cells, zero infinite values, zero unlabelled records) while being **scientifically toxic** (riddled with spurious shortcut features). Conversely, a realistic network capture may naturally exhibit high class imbalance (e.g., 98% benign traffic to 2% attack traffic) while providing a robust, realistic foundation for model evaluation.

To resolve these contradictions, **SmellScope 2.0 decomposes dataset evaluation into four strictly orthogonal, mathematically verified dimensions**, synthesized into an explicit, transparent overall trust assessment.

---

## 2. Four Orthogonal Evaluation Dimensions

```
+--------------------------------------------------------------------------------------------------+
|                                 SMELLSCOPE 2.0 SCORING ARCHITECTURE                              |
+--------------------------------------------------------------------------------------------------+
                                                  |
         +----------------------------------------+----------------------------------------+
         |                                        |                                        |
+------------------+                    +-------------------+                    +--------------------+
|  DIMENSION 1     |                    |   DIMENSION 2     |                    |    DIMENSION 3     |
|  DATA QUALITY    |                    |  NIDS SUITABILITY |                    |   SHORTCUT RISK    |
|  Score: 0 - 100  |                    |  Score: 0 - 100   |                    |   Score: 0 - 100   |
| (Higher = Better)|                    | (Higher = Better) |                    |(HIGHER = MORE RISK)|
+------------------+                    +-------------------+                    +--------------------+
         |                                        |                                        |
         |                                        |                                        |
         +--------------------+-------------------+--------------------+-------------------+
                              |                                        |
                     +------------------+                     +------------------+
                     |   DIMENSION 4    |                     |     SYNTHESIS    |
                     | EVAL RELIABILITY |                     |  OVERALL TRUST   |
                     |  Score: 0 - 100  |                     |  Score: 0 - 100  |
                     | (Higher = Better)|                     | (Higher = Better)|
                     +------------------+                     +------------------+
```

### Dimension 1: Dataset Data Quality Score ($S_{\text{DQ}}$)
- **Scale:** 0.0 to 100.0 (Higher = cleaner, higher integrity).
- **Core Purpose:** Measures raw technical hygiene, completeness, and syntactical validity of the data file.
- **Evaluation Criteria:**
  - Absence of missing values (NaN / Null / blank cells).
  - Absence of floating-point overflow or infinite values ($\pm\infty$).
  - Record uniqueness (proportion of non-duplicate telemetry vectors).
  - Valid numeric parsing (absence of corrupt characters or strings in numeric telemetry fields).
  - Column entropy (absence of zero-variance constant features).
  - Ground-truth label completeness (absence of unlabelled or corrupt class records).

### Dimension 2: NIDS Research Suitability Score ($S_{\text{NIDS}}$)
- **Scale:** 0.0 to 100.0 (Higher = more suitable for empirical intrusion detection research).
- **Core Purpose:** Evaluates whether the dataset structure reflects realistic network telemetry and provides statistical sample power for machine learning.
- **Evaluation Criteria:**
  - Attack diversity and baseline presence (presence of verified benign traffic plus $\ge 1$ distinct attack categories).
  - Minority class sample power ($\ge 20$ rows in smallest attack class to prevent small-sample evaluation noise).
  - Network class imbalance fairness (rewards realistic network skew while penalizing anomalous single-sample classes).
  - Essential NIDS telemetry coverage (presence of ports, packet volumes, byte counters, and flow timing/duration).
  - Benchmark sample size adequacy (sufficient volume for locked train/val/test splits without severe variance).

### Dimension 3: Shortcut & Leakage Risk Score ($S_{\text{Risk}}$)
- **Scale:** 0.0 to 100.0 (**HIGHER = GREATER SCIENTIFIC RISK**).
- **Directionality Warning:** Unlike quality scores, a higher risk score indicates severe dataset pathology. A score of 0 denotes nominal artifact risk; 100 denotes catastrophic shortcut contamination.
- **Core Purpose:** Quantifies the presence of spurious artifacts, protocol shortcuts, and testbed signatures that allow models to achieve high accuracy without learning true attack behaviors.
- **Evaluation Criteria:**
  - **SFI Excess Fragility:** Monte Carlo null-calibrated degradation in attack recall when top features are perturbed ($z \ge 2.0$).
  - **HDF Single-Feature Dominance:** Detection of individual attributes achieving $F_1 \ge 0.85$ or $0.60$ without supporting context.
  - **UGT Ephemeral Port Artifacts:** Attack classification driven by unassigned or ephemeral port assignments ($> 0.10$).
  - **WL Repetition Artifacts:** Repetitive packet length sequences indicating synthetic generator loops ($> 0.30$).
  - **TC Traffic Collapse:** Disparity between benign and attack cluster distributions indicating synthetic homogeneity.

### Dimension 4: ML Evaluation Reliability Score ($S_{\text{Rel}}$)
- **Scale:** 0.0 to 100.0 (Higher = more reproducible and leak-free).
- **Core Purpose:** Evaluates whether the experimental pipeline satisfies rigorous machine learning evaluation standards.
- **Evaluation Criteria:**
  - **Locked Test Partition Isolation:** Verification that test set row IDs remain disjoint from training rows and unchanged across repair operations ($\text{same\_test\_ids} = \text{True}$).
  - **Train-Only Preprocessing Fitting:** Verification that imputation medians, standard scalers, and cluster centroids are fit exclusively on training rows.
  - **Deterministic Experiment Reproducibility:** Fixed pseudorandom seed provenance and manifest hashing.
  - **Multi-Class Metric Rigor:** Evaluation across macro-averaged $F_1$, weighted $F_1$, per-class precision/recall, ROC-AUC, PR-AUC, FPR, and confusion matrix.
  - **Metric Safety:** Defensive zero-division protection and handling of unobserved classes.

---

## 3. Overall Dataset Assessment Synthesis

To provide an executive summary without obscuring individual dimensional dynamics, SmellScope 2.0 synthesizes the four dimensions using an explicit, configurable weighted formula:

$$S_{\text{Overall}} = w_{\text{DQ}} \cdot S_{\text{DQ}} + w_{\text{NIDS}} \cdot S_{\text{NIDS}} + w_{\text{Rel}} \cdot S_{\text{Rel}} + w_{\text{Safe}} \cdot (100.0 - S_{\text{Risk}})$$

### Default Canonical Weights ($v1.0.0$)
| Dimension | Weight Symbol | Default Weight | Scientific Rationale |
| :--- | :---: | :---: | :--- |
| **Data Quality** | $w_{\text{DQ}}$ | **0.30** | Fundamental baseline prerequisite; corrupt data undermines all downstream analysis. |
| **NIDS Suitability** | $w_{\text{NIDS}}$ | **0.30** | Determines whether the dataset actually represents usable network intrusion traffic. |
| **Evaluation Reliability** | $w_{\text{Rel}}$ | **0.20** | Ensures experimental findings are leak-free, reproducible, and verifiable. |
| **Shortcut Safety ($100 - S_{\text{Risk}}$)** | $w_{\text{Safe}}$ | **0.20** | Inverts risk so that low artifact reliance directly increases overall trust. |
| **Sum** | $\sum w$ | **1.00** | Strictly normalized to $[0.0, 1.0]$. |

### Evidence Coverage Metric ($C_{\text{Evidence}}$)
The overall assessment computes an explicit empirical coverage ratio ($C_{\text{Evidence}} \in [0.0, 1.0]$):
- Measures the proportion of heuristic and evaluation metrics actually executed vs. pending.
- Pre-audit uploads display lower coverage (e.g., $0.50$); fully audited datasets with locked splits and baseline evaluations achieve $1.00$.

---

## 4. Key Scientific Principles & Edge-Case Defenses

### 4.1 Realistic Class Imbalance Fairness
In live network security monitoring, normal traffic accounts for $95\%$ to $99.9\%$ of total volume. A benchmark dataset exhibiting a 95:5 or 99:1 benign-to-attack ratio is reflecting realistic operational conditions. 

*Flawed Approach:* Penalizing datasets purely because `benign_count / attack_count` is large.  
*SmellScope Approach:* SmellScope evaluates class balance with a logarithmic tolerance function that accommodates realistic network skew up to $500:1$ without harsh penalty ($S_{\text{imb}} \ge 75/100$), but imposes severe penalties if any minority attack class drops below $N_{\text{min}} = 20$ samples, which introduces severe statistical variance in test-set evaluation.

### 4.2 Locked Test Set Invariance
When applying repair recommendations (R1 Feature Ablation or R2 Flow Quarantine), the test partition must **NEVER** be modified or regenerated:
- Test record indices ($\text{test\_ids}$) are frozen.
- Test partition cryptographic SHA-256 hash ($\text{split\_hash}$) is verified before and after repair.
- The Remediation Safety Monitor (RSM) enforces $\text{same\_test\_ids} = \text{True}$.
- Evaluation scores before and after repair evaluate model generalization on the exact same locked test samples.

### 4.3 Monte Carlo Null Reference Calibration
In SFI calculations, raw recall drop under feature ablation is insufficient to prove shortcut reliance because random noise or sample attrition can cause minor score fluctuations. SmellScope executes $N_{\text{null}} = 5$ random Monte Carlo feature permutations to establish an empirical null distribution:

$$z = \frac{\Delta_{\text{top}} - \mu_{\text{null}}}{\sigma_{\text{null}}}$$

A feature is flagged as a statistically significant shortcut only when $z \ge 2.0$ ($p < 0.05$ under Gaussian assumption) and excess fragility $\Delta_{\text{top}} - \mu_{\text{null}} > 0$.

---

## 5. Qualitative Interpretation Bands

Both Quality dimensions (Higher = Better) and Risk dimensions (Higher = Worse) map to clear, standardized qualitative bands:

### Quality & Reliability Bands (Higher = Better)
| Band Key | Score Range | Label | Hex Color | Interpretation |
| :--- | :---: | :--- | :--- | :--- |
| `EXCELLENT` | 90.00 – 100.00 | Excellent | `#16A34A` | Pristine integrity; exemplary research standard. |
| `GOOD` | 75.00 – 89.99 | Good | `#2563EB` | Minor acceptable variance; fully usable for benchmark evaluation. |
| `MODERATE` | 60.00 – 74.99 | Moderate | `#D97706` | Noticeable deficiencies; documented caveats required. |
| `POOR` | 40.00 – 59.99 | Poor | `#EA580C` | Substantial structural defects; results may be unstable. |
| `CRITICAL` | 0.00 – 39.99 | Critical | `#DC2626` | Severe data corruption or invalid experimental setup. |

### Shortcut & Leakage Risk Bands (HIGHER = GREATER RISK)
| Band Key | Score Range | Label | Hex Color | Interpretation |
| :--- | :---: | :--- | :--- | :--- |
| `LOW` | 0.00 – 24.99 | Low Risk | `#16A34A` | Minimal artifact reliance; model learns semantic attack patterns. |
| `MODERATE` | 25.00 – 49.99 | Moderate Risk | `#D97706` | Isolated secondary shortcuts detected; model requires monitoring. |
| `HIGH` | 50.00 – 74.99 | High Risk | `#EA580C` | Significant shortcut features dominate classifier decision boundary. |
| `CRITICAL` | 75.00 – 100.00 | Critical Risk | `#DC2626` | Severe artifact memorization; benchmark metrics are illusory. |

---

## 6. Scientific Disclaimer

> **Official Notice:** SmellScope scores reflect internal research heuristic evaluations, statistical null calibrations, and mathematical integrity diagnostics. They are intended for academic dataset auditing and research quality improvement, not as an ISO/IEC commercial product certification.
