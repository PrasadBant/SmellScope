# Defect Register & Resolution Log — Core Engine

**Module:** Core Engine (`smellscope.core`)  
**Author:** Member 1 — Research Core Engineer  
**Status:** All Defects Closed (Phase 4)

---

## Closed Defects

### DEF-001: Zero-Variance Null Distribution Handling in SFI
- **Severity:** High (Functional / Scientific)
- **Component:** `smellscope/core/sfi.py`
- **Description:** On datasets where the model relies exclusively on a single dominant shortcut feature (e.g. planted destination port), all 50 random null feature draws produced identical baseline test recall ($\text{SFI}_{\text{null}} = 0.0$). Consequently, the null standard deviation was exactly zero ($\sigma_{\text{null}} = 0.0$). The division-by-zero guard returned $z = \text{null}$, which subsequently caused `cond_excess_fragility = (z >= 2.0)` to evaluate to `False`, failing to flag perfectly planted shortcuts.
- **Root Cause:** A null distribution with zero standard deviation represents infinite statistical certainty that the null features do not affect model predictions. Treating $z = \text{null}$ as lack of significance was an improper evaluation of degenerate null variance.
- **Resolution:** Updated `cond_excess_fragility` in `smellscope/core/sfi.py` to evaluate as `True` if $\Delta\text{SFI} > 0.05$ whenever $\sigma_{\text{null}} < 10^{-9}$, while maintaining $z = \text{null}$ in the output dictionary per contract Section 2.6.
- **Verification:** Experiment E2 achieved 100.0% recovery rate across 20 independent seeds.

### DEF-002: Windows 11 Deprecated WMIC Core Detection Warning
- **Severity:** Low (Warning / Environment)
- **Component:** `joblib` parallel execution across `heuristics.py` and `experiments/`
- **Description:** Windows 11 builds deprecated `wmic.exe`, causing Joblib's internal `_count_physical_cores` to trigger a `UserWarning: Could not find the number of physical cores... [WinError 2]`.
- **Root Cause:** Upstream Joblib issue on Windows 11.
- **Resolution:** Set environment variable `os.environ["LOKY_MAX_CPU_COUNT"] = "4"` in entrypoints and test configurations.
- **Verification:** Warning eliminated in standalone executions.
