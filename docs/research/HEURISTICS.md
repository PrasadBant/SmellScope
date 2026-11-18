# The Five Dataset Smell Heuristics

SmellScope operationalizes five key statistical and protocol anomalies identified in cybersecurity benchmark literature (notably Flood et al., EuroS&P 2024).

---

## 1. UGT — Unassigned Ghost Traffic

### Concept
Measures the proportion of attack flows that target unassigned or invalid destination ports (as defined by IANA service port assignments). In synthetic testbeds, attack generation scripts often broadcast traffic against non-standard or unregistered port numbers that benign traffic never uses, creating a trivial non-payload discriminator.

### Formulation
$$\text{UGT} = \frac{|\{f \in \mathcal{F}_{\text{attack}} : \text{port}(f) \notin \mathcal{P}_{\text{IANA}}\}|}{|\mathcal{F}_{\text{attack}}|}$$

### Threshold
- **Safe**: $< 0.10$
- **High Risk**: $\ge 0.10$ (indicates significant protocol divergence)

---

## 2. WL — Window Repetition / Fixed TCP Window Size

### Concept
Attack tools frequently use static TCP stack implementations (e.g. `scapy` defaults or fixed socket buffers), causing every attack packet to exhibit identical TCP window sizes, whereas benign operating systems negotiate dynamic window sizes.

### Formulation
Calculated as the dominant frequency of the most common TCP window value in attack flows relative to benign entropy:
$$\text{WL} = \max_{w} \Pr(W = w \mid \text{class} = \text{attack})$$

### Threshold
- **Safe**: $< 0.30$
- **High Risk**: $\ge 0.30$ (indicates tool-specific artifact leakage)

---

## 3. HDF — High-Dominance Feature

### Concept
Detects whether a single feature (e.g. `Init_Win_bytes_backward`, `Dst_Port`, or `Flow_Duration`) can separate the attack class from benign background with near-perfect accuracy without learning any behavioral interaction.

### Formulation
$$\text{HDF} = \max_{j} \text{ROC-AUC}(X_j, y)$$

### Threshold
- **Safe**: $< 0.60$
- **High Risk**: $\ge 0.60$ (indicates potential single-feature shortcut)

---

## 4. PDD — Packet Dynamics Disparity

### Concept
Measures extreme divergence in flow-level statistical moments (inter-arrival time distribution, packet length variance, flow duration) between attack traffic and baseline benign traffic using Wasserstein distance and Kolmogorov-Smirnov statistics.

### Formulation
$$\text{PDD} = \frac{1}{|K|} \sum_{k \in K} \text{WD}(\mathcal{D}_{\text{attack}}^k, \mathcal{D}_{\text{benign}}^k)$$

### Threshold
- **Safe**: $< 0.50$
- **High Risk**: $\ge 0.50$

---

## 5. TC — Temporal Clustering

### Concept
Identifies whether attacks were captured in short, continuous bursts clustered within a specific timeframe rather than being interleaved across normal network operations. Models trained on temporally clustered data often memorize diurnal cycles or timestamp artifacts.

### Formulation
Evaluates the temporal dispersion ratio $\sigma_t / \Delta T_{\text{total}}$ of attack events across the collection window.

### Threshold
- **Safe**: $< 0.50$
- **High Risk**: $\ge 0.50$
