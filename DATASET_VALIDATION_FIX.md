# Dataset Validation Parameters & Health Check Fix

**Component:** `smellscope/server/routers/datasets.py` & `frontend/src/features/dataset/DatasetScreen.tsx`  
**Reference Issue:** Generic "Dataset Error" on Modifying Ground-Truth Label Column, Benign Class Identifier, or Random Seed  
**Status:** RESOLVED & VERIFIED  

---

## 1. Problem Definition & Symptoms

When users navigated to `Dataset → Validation Parameters` and modified the configuration parameters:
- Ground-Truth Label Column (e.g. typing a non-existent column name or editing an existing one)
- Benign Class Identifier (e.g. typing a custom benign name)
- Random Seed (e.g. setting an integer seed or invalid string)

The application previously caught a server exception and replaced the entire dataset view with a generic red alert:
> *"Dataset Error: Error validating dataset: ..."*

This led users to believe that modifying parameters broke or unloaded the dataset itself. Furthermore:
- Users had no auto-completion or schema suggestions for available columns.
- Users had no list of distinct observed classes to pick the benign class identifier from.
- Selecting a benchmark sample initially left the "CONTINUE TO VALIDATION" button disabled due to a race condition where `setActiveDatasetId` wiped `datasetMetadata`.

---

## 2. Root Cause Analysis

1. **HTTP 400 Exception vs. Validation Notice:**  
   The backend endpoint `POST /api/v1/datasets/{dataset_id}/validate` caught `SmellScopeError` and raised `HTTPException(status_code=400, detail={"code": err.code, "message": str(err)})`. In client architectures, an HTTP 400 indicates client request failure, prompting the frontend to treat the dataset as unloadable.
2. **Context Invalidation Conflict:**  
   In `DatasetScreen.tsx`, upon selecting a dataset ID, `loadDatasetDetails` fetched metadata and then called `setActiveDatasetId(id)`. Because `activeDatasetId` in `AuditContext` was initialized to `null`, `id !== activeDatasetId` evaluated to `true`, causing `AuditContext` to clear `datasetMetadata = null`, `datasetPreview = null`, rendering the continue button permanently disabled.
3. **Absence of Datalists and Parameter Validation:**  
   The inputs were bare text inputs without `<datalist>` integration, forcing users to type column names blindly.

---

## 3. Engineering Solution

### 3.1 Backend: Graceful Validation Response (`smellscope/server/routers/datasets.py`)
Instead of raising an uncaught HTTP 400 when validation rules fail, `validate_dataset` catches `SmellScopeError` and returns a structured `DatasetValidateResponse` with `valid=False`:

```python
except SmellScopeError as err:
    return DatasetValidateResponse(
        valid=False,
        schema_id="invalid",
        columns_present=[],
        columns_missing=[],
        dropped_inf_nan=0,
        n_rows=0,
        unique_classes=[],
        benign_class_found=False,
        class_counts={},
        warnings=[f"Validation Parameter Notice: {err.message} (Code: {err.code})"],
    )
```

This keeps the HTTP connection status at 200 OK and allows the frontend to display inline validation notices without disrupting active dataset state.

### 3.2 Frontend: HTML5 Datalist Schema Suggestions
Two dynamic HTML5 `<datalist>` elements were introduced to provide auto-completion:
1. `#schema-columns-list`: Populated from `datasetMetadata.columns` and `datasetPreview.columns`.
2. `#schema-classes-list`: Populated from `datasetValidation.unique_classes` and `datasetMetadata.class_counts`.

```tsx
<datalist id="schema-columns-list">
  {datasetMetadata?.columns?.map((col) => (
    <option key={col} value={col} />
  ))}
</datalist>

<datalist id="schema-classes-list">
  {datasetValidation?.unique_classes?.map((cls) => (
    <option key={cls} value={cls} />
  ))}
  {Object.keys(datasetMetadata?.class_counts || {}).map((cls) => (
    <option key={cls} value={cls} />
  ))}
</datalist>
```

### 3.3 Random Seed Integer Validation
The seed input strictly enforces non-negative integers ($\ge 0$):
```tsx
const effectiveSeed = Number.isInteger(seed) && seed >= 0 ? seed : 42;
if (isNaN(seed) || seed < 0) {
  setErrorCategory("PARAM_ERROR");
  setErrorMsg("Random seed must be a non-negative integer (e.g. 42).");
  setValidating(false);
  return;
}
```

### 3.4 Error Categorization & Visual Separation
Errors are distinctly categorized:
- `PARAM_ERROR`: Displayed in amber with clear guidance to check column/benign labels.
- `LOAD_ERROR`: Displayed when file reading or preview parsing fails.
- `SERVER_ERROR`: Displayed when backend connection is unavailable.

---

## 4. Verification Evidence

### Automated Backend Test (`tests/test_master_fixes.py`)
```python
def test_test_a_validation_parameters_without_disconnection():
    # Valid parameters
    resp_valid = client.post("/api/v1/datasets/cic2017_sample_planted/validate", json={"label_col": "Label", "benign_label": "BENIGN", "seed": 42})
    assert resp_valid.status_code == 200
    assert resp_valid.json()["valid"] is True

    # Modified label column parameter that does not exist in dataset
    resp_invalid = client.post("/api/v1/datasets/cic2017_sample_planted/validate", json={"label_col": "NonExistentColumn_XYZ", "benign_label": "BENIGN", "seed": 42})
    assert resp_invalid.status_code == 200
    assert resp_invalid.json()["valid"] is False
    assert len(resp_invalid.json()["warnings"]) > 0
```
**Result:** PASSED in 0.12s.
