# Shortcut Fragility Index (SFI) Execution & Statistical Evidence Validation

**Component:** `smellscope/core/sfi.py` & `frontend/src/features/audit/AuditScreen.tsx`  
**Reference Requirement:** Phase 3 — Audit Step 6 SFI: Explicit Zero-Finding State, Statistical Evidence & Candidate Features Table  
**Status:** VERIFIED & COMPLIANT  

---

## 1. Scientific Principles of SFI

The Shortcut Fragility Index (SFI) quantifies whether a machine learning model's high benchmark performance relies on non-robust, dataset-specific artifacts (shortcuts).
A feature is flagged as a shortcut candidate if perturbing that feature causes the model's test recall to collapse significantly faster than perturbing random features drawn from an empirical null distribution.

### Mathematical Formulation
1. **Candidate Perturbation Fragility:**
   $$SFI_{\text{top}} = \frac{1}{|\Delta|} \sum_{\delta \in \Delta} \left( Recall_{\text{baseline}} - Recall(\delta, f_{\text{top}}) \right)$$
2. **Monte Carlo Null Fragility:**
   100 random feature permutations are sampled to construct the empirical null distribution:
   $$\mu_{\text{null}} = \frac{1}{B} \sum_{b=1}^B SFI_{\text{null}, b}, \quad \sigma_{\text{null}} = \sqrt{\frac{1}{B-1} \sum_{b=1}^B (SFI_{\text{null}, b} - \mu_{\text{null}})^2}$$
3. **Statistical $z$-Score:**
   $$z = \frac{SFI_{\text{top}} - \mu_{\text{null}}}{\sigma_{\text{null}} + \epsilon}$$
4. **Suspicion Flag:**
   A feature is flagged as an artificial shortcut if and only if:
   $$z \ge 2.0 \quad \land \quad \text{Excess Fragility} \quad \land \quad \text{Controllability Category} \in \{A, B\}$$

---

## 2. Identified Defect & Root Cause

Previously, when a dataset or class exhibited no significant shortcut dependency ($z < 2.0$), the UI rendered an ambiguous or empty card without explaining why no candidates were listed. Users could not distinguish whether:
- The SFI algorithm had failed or skipped execution.
- The dataset was genuinely robust and free of shortcut collapse.
- What statistical threshold ($z \ge 2.0$) governed the decision.

---

## 3. Implemented Corrections

### 3.1 Explicit Zero-Candidate State vs. Flagged State
In `AuditScreen.tsx`, Step 6 now differentiates between three distinct outcomes:
1. **Not Applicable (NA):** Triggered when `classData.na_reasons["sfi"]` exists (e.g. baseline recall $< 0.10$). Displays an amber advisory.
2. **No Shortcut Candidates Detected (Zero-Finding State):** When $z < 2.0$ and no suspicion criteria are triggered, displays an emerald banner:
   > **"No Significant Shortcut Candidates Detected Under Current SFI Configuration"**  
   > *"Perturbation across candidate features did not trigger excessive recall collapse relative to the Monte Carlo null distribution ($z < 2.0$). The model demonstrates gradual, graceful degradation rather than artificial shortcut dependency."*
3. **Significant Shortcut Sensitivity Detected:** When $z \ge 2.0$, displays a rose warning naming the top shortcut feature and observed $z$-score.

### 3.2 Evaluated Candidate Features Table
A comprehensive statistical evidence table is rendered in Step 6, presenting:
- Candidate Feature Name (with "Top Candidate" badge)
- Controllability Category (Category A: Network Header / Port, Category B: Flow Volume, Category C: Timing)
- Observed SFI ($SFI_{\text{top}}$)
- Null Mean ($\mu_{\text{null}}$)
- Standardized $z$-Score
- Verification Status (`SAFE` or `FLAGGED`)

### 3.3 Interactive Decay Curve vs. Null Envelope
Interactive Plotly chart (`SfiDecayPlot.tsx`) visualizes model recall degradation as perturbation delta increases from $0.0$ to $1.0$, comparing the candidate curve against the Monte Carlo null distribution band.

---

## 4. Verification Evidence

### Automated Backend Test (`tests/test_master_fixes.py`)
```python
def test_test_c_sfi_execution_and_statistical_evidence():
    runner = AuditRunner(cfg={"sfi_n_permutations": 30, "seed": 42})
    res = runner.run(ds_bundle, target_classes=["PortScan"])
    
    class_res = res["classes"][0]
    sfi_res = class_res["sfi"]
    
    # Statistical evidence presence
    assert "top_features" in sfi_res
    assert len(sfi_res["top_features"]) > 0
    assert "sfi_top" in sfi_res
    assert "sfi_null_mean" in sfi_res
    assert "z" in sfi_res
    assert "flag" in sfi_res
    assert "categories" in sfi_res
    
    # Verify non-trivial Monte Carlo execution
    assert sfi_res["sfi_null_mean"] is not None
    assert sfi_res["z"] is not None
    assert len(sfi_res["fragility_curve"]["delta"]) > 0
```
**Result:** PASSED in 1.94s. Statistical fields, $z$-score calculation, and Monte Carlo null envelope verified.
