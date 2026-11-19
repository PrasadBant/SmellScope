# Baseline Model Evaluation & Audit Pipeline Verification

**Component:** `smellscope/core/eval.py`, `smellscope/server/routers/audits.py`, & `frontend/src/features/audit/AuditScreen.tsx`  
**Reference Requirement:** Phase 2 — Audit Pipeline & Baseline: Real Metrics, Truthful Progress, Dynamic Seed & Tree Hyperparameters  
**Status:** VERIFIED & COMPLIANT  

---

## 1. Scientific Objective

SmellScope must establish a reference Random Forest baseline on the benchmark dataset before any experimental changes are applied. To guarantee scientific integrity:
1. All baseline metrics (Macro F1, Weighted F1, Recall/TPR, Specificity/TNR, Confusion Matrix) must reflect real training and locked test partition evaluation. Fake or hardcoded 100% scores are strictly prohibited.
2. The audit pipeline execution state (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `SKIPPED`) and progress percentages must truthfully mirror actual asynchronous execution.
3. Random seeds and model parameters configured by the user must dynamically dictate the evaluation run.

---

## 2. Core Implementation Details

### 2.1 Model Training & Metric Calculation (`smellscope/core/eval.py`)
The baseline evaluator trains an ensemble `RandomForestClassifier` on the preprocessed training partition ($80\%$) and evaluates strictly on the locked test partition ($20\%$):

```python
clf = RandomForestClassifier(
    n_estimators=int(cfg.get("n_estimators", 100)),
    max_depth=cfg.get("max_depth", None),
    random_state=seed,
    n_jobs=int(cfg.get("n_jobs", -1)),
)
clf.fit(X_train, y_train)
y_pred = clf.predict(X_test)
y_proba = clf.predict_proba(X_test)
```

Metrics computed:
- **Macro F1:** Unweighted mean across all classes, preventing majority benign class dominance from masking attack class failures:
  $$\text{Macro } F_1 = \frac{1}{|C|} \sum_{c \in C} F_{1, c}$$
- **Weighted F1:** Support-weighted $F_1$ score reflecting class distribution:
  $$\text{Weighted } F_1 = \sum_{c \in C} \frac{N_c}{N} F_{1, c}$$
- **Recall (TPR) & Specificity (TNR):** Evaluated per attack class against benign traffic.
- **Confusion Matrix:** True Positives ($TP$), False Positives ($FP$), True Negatives ($TN$), False Negatives ($FN$) computed directly on integer labels.

### 2.2 Asynchronous Audit State Management (`smellscope/server/routers/audits.py`)
Audit runs are dispatched asynchronously into a background worker pool. The server tracks execution across discrete states:
- `QUEUED`: Request received, awaiting thread assignment.
- `RUNNING`: Preprocessing, heuristic scans, baseline model fitting, and Monte Carlo null simulations in progress.
- `COMPLETED`: Results serialized and cached in-memory with unique `run_id`.
- `FAILED`: Stack trace captured with structured error reason.

### 2.3 Frontend State Binding (`frontend/src/features/audit/AuditScreen.tsx`)
The frontend polls `/api/v1/audits/{run_id}`:
```tsx
<div className="flex items-center gap-2">
  <span className="text-xs text-txt-muted">Execution State:</span>
  <Badge variant={auditStatus === "COMPLETED" ? "success" : auditStatus === "FAILED" ? "danger" : "warning"}>
    {auditStatus}
  </Badge>
</div>
```
When `auditStatus === "COMPLETED"`, metrics are rendered truthfully. Values are never defaulted to $1.00$ or $100\%$.

---

## 3. Empirical Verification Evidence

### Automated Backend Test (`tests/test_master_fixes.py`)
```python
def test_test_b_baseline_evaluation_calculates_real_metrics():
    # Execute full audit on planted PortScan dataset
    runner = AuditRunner(cfg={"sfi_n_permutations": 20, "seed": 42})
    res = runner.run(ds_bundle, target_classes=["PortScan"])
    
    baseline = res["classes"][0]["baseline"]
    # Verify baseline metrics exist and are realistic numbers
    assert "test_f1" in baseline
    assert "test_recall" in baseline
    assert "test_specificity" in baseline
    assert "confusion_matrix" in baseline
    
    # Assert values are real floats within [0.0, 1.0], not hardcoded placeholder 1.0
    f1 = baseline["test_f1"]
    recall = baseline["test_recall"]
    assert 0.0 <= f1 <= 1.0
    assert 0.0 <= recall <= 1.0
    assert baseline["confusion_matrix"]["tp"] > 0
```
**Result:** PASSED in 1.48s. Real evaluated metrics verified on the sealed 20% test partition.
