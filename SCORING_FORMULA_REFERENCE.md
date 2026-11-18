# SmellScope 2.0 — Scoring Formula Reference & Mathematical Specification

**Document Version:** 1.0.0  
**Date:** November 2026  
**Status:** Authoritative Mathematical Specification  
**Applies To:** `smellscope/scoring/*.py`, `smellscope/server/routers/improvement.py`, `smellscope/remediation/manager.py`  

---

## 1. Mathematical Utility Functions

All score computations are guarded by three defensive primitives to guarantee zero-division immunity, floating-point sanity, and strict boundary compliance:

### 1.1 Score Clamping Function
$$\text{clamp}(x, \text{default}=0.0) = \begin{cases} 
\text{default}, & \text{if } x \text{ is NaN, } \pm\infty \text{ or None} \\
0.0, & \text{if } x < 0.0 \\
100.0, & \text{if } x > 100.0 \\
x, & \text{otherwise}
\end{cases}$$

### 1.2 Safe Division Operator
$$\text{safe\_ratio}(a, b, \text{default}=0.0) = \begin{cases}
\text{default}, & \text{if } b = 0 \text{ or } b \text{ is NaN/}\pm\infty \\
\text{default}, & \text{if } a \text{ is NaN/}\pm\infty \\
\frac{a}{b}, & \text{otherwise}
\end{cases}$$

### 1.3 Recursive Floating-Point Sanitizer
$$\text{sanitize}(v) = \begin{cases}
0.0, & \text{if } v \in \mathbb{R} \text{ and } (v = \text{NaN} \lor v = \pm\infty) \\
\text{round}(v, 4), & \text{if } v \in \mathbb{R} \\
\text{recursively mapped}, & \text{if } v \text{ is list or dict} \\
v, & \text{otherwise}
\end{cases}$$

---

## 2. Dimension 1: Dataset Data Quality Score ($S_{\text{DQ}}$)

Evaluates the raw physical hygiene, data-type validity, and parsing integrity of the dataset.

### 2.1 Component Formulations
Let $N_{\text{rows}}$ be total rows, $N_{\text{feat}}$ be total feature columns, and $C_{\text{total}} = N_{\text{rows}} \times N_{\text{feat}}$ be total feature cells.

1. **Missing Values Subscore ($S_{\text{miss}}$):**
   $$r_{\text{miss}} = \text{safe\_ratio}(N_{\text{null\_cells}}, C_{\text{total}})$$
   $$S_{\text{miss}} = \text{clamp}\left(100.0 \cdot \left(1.0 - \min(1.0, r_{\text{miss}} \cdot 5.0)\right)\right)$$
   *(Note: 0% missing $\to$ 100.0; 1% missing $\to$ 95.0; $\ge 20\%$ missing $\to$ 0.0).*

2. **Infinite Values Subscore ($S_{\text{inf}}$):**
   $$r_{\text{inf}} = \text{safe\_ratio}(N_{\text{inf\_cells}}, N_{\text{rows}} \cdot N_{\text{numeric\_cols}})$$
   $$S_{\text{inf}} = \text{clamp}\left(100.0 \cdot \left(1.0 - \min(1.0, r_{\text{inf}} \cdot 10.0)\right)\right)$$
   *(Note: 0% inf $\to$ 100.0; 0.5% inf $\to$ 95.0; $\ge 10\%$ inf $\to$ 0.0).*

3. **Duplicate Records Subscore ($S_{\text{dup}}$):**
   $$r_{\text{dup}} = \text{safe\_ratio}(N_{\text{dup\_rows}}, N_{\text{rows}})$$
   $$S_{\text{dup}} = \text{clamp}\left(100.0 \cdot \left(1.0 - \min(1.0, r_{\text{dup}} \cdot 2.0)\right)\right)$$
   *(Note: 0% duplicates $\to$ 100.0; 5% duplicates $\to$ 90.0; $\ge 50\%$ duplicates $\to$ 0.0).*

4. **Invalid Numeric Parsing Subscore ($S_{\text{num}}$):**
   Let $N_{\text{inv\_cells}}$ be non-numeric string corruptions in numeric feature columns.
   $$r_{\text{inv}} = \text{safe\_ratio}(N_{\text{inv\_cells}}, C_{\text{total}})$$
   $$S_{\text{inv}} = \text{clamp}\left(100.0 \cdot \left(1.0 - \min(1.0, r_{\text{inv}} \cdot 10.0)\right)\right)$$

5. **Constant Columns Subscore ($S_{\text{const}}$):**
   Let $N_{\text{const\_cols}}$ be columns where $\text{nunique} \le 1$.
   $$r_{\text{const}} = \text{safe\_ratio}(N_{\text{const\_cols}}, N_{\text{feat}})$$
   $$S_{\text{const}} = \text{clamp}\left(100.0 \cdot \left(1.0 - \min(1.0, r_{\text{const}} \cdot 3.0)\right)\right)$$

6. **Label Completeness Subscore ($S_{\text{lbl}}$):**
   Let $N_{\text{null\_labels}}$ be missing or whitespace-only records in the ground truth label column.
   $$r_{\text{lbl\_miss}} = \text{safe\_ratio}(N_{\text{null\_labels}}, N_{\text{rows}})$$
   $$S_{\text{lbl}} = \text{clamp}\left(100.0 \cdot \left(1.0 - \min(1.0, r_{\text{lbl\_miss}} \cdot 10.0)\right)\right)$$

### 2.2 Linear Synthesis
$$S_{\text{DQ}} = w_1 S_{\text{miss}} + w_2 S_{\text{inf}} + w_3 S_{\text{dup}} + w_4 S_{\text{num}} + w_5 S_{\text{const}} + w_6 S_{\text{lbl}}$$

$$\vec{w}_{\text{DQ}} = [0.25, 0.20, 0.15, 0.10, 0.15, 0.15], \quad \sum w_i = 1.00$$

---

## 3. Dimension 2: NIDS Research Suitability Score ($S_{\text{NIDS}}$)

Evaluates whether the dataset reflects genuine network telemetry roles, diversity, and statistical power.

### 3.1 Component Formulations

1. **Class Coverage & Attack Diversity ($S_{\text{cov}}$):**
   Let $N_{\text{atk}}$ be the number of unique non-benign attack classes, and $B \in \{0, 1\}$ be the presence of verified benign traffic.
   $$S_{\text{cov}} = \begin{cases}
   100.0, & \text{if } B = 1 \text{ and } N_{\text{atk}} \ge 3 \\
   85.0, & \text{if } B = 1 \text{ and } N_{\text{atk}} = 2 \\
   70.0, & \text{if } B = 1 \text{ and } N_{\text{atk}} = 1 \\
   25.0, & \text{if } B = 0 \text{ and } N_{\text{atk}} \ge 1 \\
   0.0, & \text{if } N_{\text{atk}} = 0
   \end{cases}$$

2. **Minority Class Representation ($S_{\text{min}}$):**
   Let $N_{\text{min\_atk}} = \min_{c \in \text{Attacks}} (\text{count}(c))$.
   $$S_{\text{min}} = \begin{cases}
   100.0, & \text{if } N_{\text{min\_atk}} \ge 100 \\
   85.0, & \text{if } 50 \le N_{\text{min\_atk}} < 100 \\
   70.0, & \text{if } 20 \le N_{\text{min\_atk}} < 50 \\
   40.0, & \text{if } 5 \le N_{\text{min\_atk}} < 20 \\
   15.0, & \text{if } 1 \le N_{\text{min\_atk}} < 5 \\
   0.0, & \text{otherwise}
   \end{cases}$$

3. **Class Imbalance Fairness ($S_{\text{imb}}$):**
   Let $R_{\text{imb}} = \frac{\max_c \text{count}(c)}{\min_c \text{count}(c)}$.
   $$S_{\text{imb}} = \begin{cases}
   100.0, & \text{if } R_{\text{imb}} \le 20.0 \\
   90.0, & \text{if } 20.0 < R_{\text{imb}} \le 100.0 \\
   75.0, & \text{if } 100.0 < R_{\text{imb}} \le 500.0 \quad \text{(Realistic NIDS skew)} \\
   50.0, & \text{if } 500.0 < R_{\text{imb}} \le 2000.0 \\
   25.0, & \text{if } R_{\text{imb}} > 2000.0
   \end{cases}$$

4. **Essential Telemetry Features ($S_{\text{feat}}$):**
   Evaluates 4 core protocol telemetry roles:
   - Port role ($P \in \{0, 25\}$): `dst_port`, `sport`, `port`.
   - Packet count role ($K \in \{0, 25\}$): `total_fwd_packets`, `packet_count`.
   - Byte volume role ($B \in \{0, 25\}$): `total_length_of_fwd_packets`, `bytes`.
   - Timing role ($T \in \{0, 25\}$): `flow_duration`, `flow_iat_mean`.
   $$S_{\text{feat}} = P + K + B + T, \quad S_{\text{feat}} \in [0.0, 100.0]$$

5. **Sample Size Adequacy ($S_{\text{size}}$):**
   $$S_{\text{size}} = \begin{cases}
   100.0, & \text{if } N_{\text{rows}} \ge 5000 \\
   90.0, & \text{if } 2000 \le N_{\text{rows}} < 5000 \\
   80.0, & \text{if } 1000 \le N_{\text{rows}} < 2000 \\
   65.0, & \text{if } 500 \le N_{\text{rows}} < 1000 \\
   50.0, & \text{if } 200 \le N_{\text{rows}} < 500 \\
   25.0, & \text{if } N_{\text{rows}} < 200
   \end{cases}$$

### 3.2 Linear Synthesis
$$S_{\text{NIDS}} = w_1 S_{\text{cov}} + w_2 S_{\text{min}} + w_3 S_{\text{imb}} + w_4 S_{\text{feat}} + w_5 S_{\text{size}}$$

$$\vec{w}_{\text{NIDS}} = [0.25, 0.20, 0.15, 0.25, 0.15], \quad \sum w_i = 1.00$$

---

## 4. Dimension 3: Shortcut & Leakage Risk Score ($S_{\text{Risk}}$)

Quantifies the degree to which machine-learning classifiers rely on testbed artifacts or non-behavioral shortcuts.

> **SCALE CONVENTION:** $0.0 \to$ Nominal Risk (Safe), $100.0 \to$ Catastrophic Risk.

### 4.1 Component Formulations

1. **SFI Null-Calibrated Excess Fragility Risk ($R_{\text{SFI}}$):**
   For each audited class $c$, let $z_c = \frac{\Delta_c - \mu_{\text{null}, c}}{\sigma_{\text{null}, c}}$ and $E_c = \Delta_c - \mu_{\text{null}, c}$.
   $$r_{\text{SFI}, c} = \begin{cases}
   \min(100.0, 50.0 + (z_c - 2.0) \cdot 15.0 + E_c \cdot 100.0), & \text{if } z_c \ge 2.0 \lor \text{flag}_c = \text{True} \\
   \min(40.0, \max(0.0, z_c \cdot 15.0)), & \text{otherwise}
   \end{cases}$$
   $$R_{\text{SFI}} = \max_c (r_{\text{SFI}, c})$$

2. **HDF Single-Feature Dominance Risk ($R_{\text{HDF}}$):**
   Let $\text{HDF}_c$ be the single-feature decision tree AUC for class $c$.
   $$r_{\text{HDF}, c} = \begin{cases}
   \min(100.0, 70.0 + (\text{HDF}_c - 0.85) \cdot 200.0), & \text{if } \text{HDF}_c \ge 0.85 \\
   40.0 + (\text{HDF}_c - 0.60) \cdot 120.0, & \text{if } 0.60 \le \text{HDF}_c < 0.85 \\
   \frac{\text{HDF}_c}{0.60} \cdot 30.0, & \text{if } \text{HDF}_c < 0.60
   \end{cases}$$
   $$R_{\text{HDF}} = \max_c (r_{\text{HDF}, c})$$

3. **UGT Ephemeral Port Artifact Risk ($R_{\text{UGT}}$):**
   Let $\text{UGT}_c$ be the port divergence score for class $c$.
   $$r_{\text{UGT}, c} = \begin{cases}
   \min(100.0, 40.0 + \text{UGT}_c \cdot 150.0), & \text{if } \text{UGT}_c \ge 0.10 \\
   \text{UGT}_c \cdot 300.0, & \text{if } \text{UGT}_c < 0.10
   \end{cases}$$
   $$R_{\text{UGT}} = \max_c (r_{\text{UGT}, c})$$

4. **WL Packet Length Repetition Risk ($R_{\text{WL}}$):**
   Let $\text{WL}_c$ be the window-length repetition frequency.
   $$r_{\text{WL}, c} = \begin{cases}
   \min(100.0, 40.0 + \text{WL}_c \cdot 150.0), & \text{if } \text{WL}_c \ge 0.30 \\
   \text{WL}_c \cdot 100.0, & \text{if } \text{WL}_c < 0.30
   \end{cases}$$
   $$R_{\text{WL}} = \max_c (r_{\text{WL}, c})$$

5. **TC Traffic Collapse Disparity Risk ($R_{\text{TC}}$):**
   Let $\text{TC}_c$ be the cluster silhouette/disparity metric.
   $$R_{\text{TC}} = \max_c (\min(100.0, \text{TC}_c \cdot 100.0))$$

### 4.2 Linear Synthesis
$$S_{\text{Risk}} = \text{clamp}(w_1 R_{\text{SFI}} + w_2 R_{\text{HDF}} + w_3 R_{\text{UGT}} + w_4 R_{\text{WL}} + w_5 R_{\text{TC}})$$

$$\vec{w}_{\text{Risk}} = [0.35, 0.25, 0.15, 0.15, 0.10], \quad \sum w_i = 1.00$$

---

## 5. Dimension 4: ML Evaluation Reliability Score ($S_{\text{Rel}}$)

Evaluates methodological soundness, test isolation, and evaluation reproducibility.

### 5.1 Component Formulations

1. **Locked Test Partition Isolation ($S_{\text{iso}}$):**
   Let $I_{\text{train}}$ and $I_{\text{test}}$ be the set of sample IDs in train and test splits respectively.
   $$N_{\text{leak}} = |I_{\text{train}} \cap I_{\text{test}}|$$
   $$S_{\text{iso}} = \begin{cases}
   100.0, & \text{if } N_{\text{leak}} = 0 \text{ and } \text{split\_hash verified} \\
   0.0, & \text{if } N_{\text{leak}} > 0 \quad \text{(Catastrophic Data Leakage)} \\
   50.0, & \text{if no split manifest present}
   \end{cases}$$

2. **Train-Only Preprocessing Fitting ($S_{\text{fit}}$):**
   $$S_{\text{fit}} = \begin{cases}
   100.0, & \text{if scalers/imputers fit strictly on } I_{\text{train}} \\
   0.0, & \text{if global fit leakage detected} \\
   70.0, & \text{if unverified}
   \end{cases}$$

3. **Deterministic Reproducibility ($S_{\text{rep}}$):**
   $$S_{\text{rep}} = \begin{cases}
   100.0, & \text{if explicit integer seed is fixed and recorded} \\
   40.0, & \text{if unseeded}
   \end{cases}$$

4. **Multi-Class Metric Rigor ($S_{\text{rigor}}$):**
   Evaluates presence of macro $F_1$ ($30\text{ pts}$), weighted $F_1$ ($25\text{ pts}$), per-class metrics ($25\text{ pts}$), and confusion matrix ($20\text{ pts}$).
   $$S_{\text{rigor}} = \text{clamp}(P_{\text{macro}} + P_{\text{weighted}} + P_{\text{per\_class}} + P_{\text{cm}})$$

5. **Metric Safety & Division Guards ($S_{\text{safe}}$):**
   $$S_{\text{safe}} = 100.0 \quad (\text{zero-division guards verified in FPR, FNR, ROC-AUC})$$

### 5.2 Linear Synthesis
$$S_{\text{Rel}} = w_1 S_{\text{iso}} + w_2 S_{\text{fit}} + w_3 S_{\text{rep}} + w_4 S_{\text{rigor}} + w_5 S_{\text{safe}}$$

$$\vec{w}_{\text{Rel}} = [0.30, 0.25, 0.20, 0.15, 0.10], \quad \sum w_i = 1.00$$

---

## 6. Overall Dataset Assessment Synthesis ($S_{\text{Overall}}$)

The four dimensional scores are synthesized into a single authoritative trust assessment:

$$S_{\text{Overall}} = \text{clamp}\left(0.30 \cdot S_{\text{DQ}} + 0.30 \cdot S_{\text{NIDS}} + 0.20 \cdot S_{\text{Rel}} + 0.20 \cdot (100.0 - S_{\text{Risk}})\right)$$

### 6.1 Boundary Invariance Guarantees
- If all four dimensions are perfect ($S_{\text{DQ}}=100, S_{\text{NIDS}}=100, S_{\text{Rel}}=100, S_{\text{Risk}}=0$):
  $$S_{\text{Overall}} = 0.30(100) + 0.30(100) + 0.20(100) + 0.20(100) = 100.0$$
- If all four dimensions are degraded ($S_{\text{DQ}}=0, S_{\text{NIDS}}=0, S_{\text{Rel}}=0, S_{\text{Risk}}=100$):
  $$S_{\text{Overall}} = 0.30(0) + 0.30(0) + 0.20(0) + 0.20(0) = 0.0$$
- For any valid inputs, $S_{\text{Overall}} \in [0.0, 100.0]$ with strict mathematical determinism.
