# SmellScope 2.1 — REST API Contract

The FastAPI backend exposes versioned endpoints under `/api/v1`. All requests and responses adhere to standard Pydantic schemas.

---

## 1. Health & Status
- **`GET /api/v1/health`**
  - Returns backend health, version, execution mode (`local-first`), and scientific disclaimer.

---

## 2. Dataset Management
- **`GET /api/v1/datasets`**
  - Lists available benchmark datasets (bundled samples and uploaded files).
- **`POST /api/v1/datasets/upload`**
  - Uploads a custom `.csv` or `.parquet` file. Enforces filename sanitization and local disk isolation.
- **`GET /api/v1/datasets/{dataset_id}/metadata`**
  - Returns cryptographic SHA-256 fingerprint, row count, column roles, and class distribution counts.
- **`GET /api/v1/datasets/{dataset_id}/preview`**
  - Returns head rows for tabular inspection.

---

## 3. Audit Execution
- **`POST /api/v1/audits`**
  - Starts asynchronous multi-class audit with parameters: `dataset_id`, `seed`, `max_rows_per_class`. Returns `run_id`.
- **`GET /api/v1/audits/{run_id}/status`**
  - Returns execution status: `PENDING`, `RUNNING`, `COMPLETED`, or `FAILED`, with progress percentage and current attack class.
- **`GET /api/v1/audits/{run_id}/results`**
  - Returns comprehensive audit payload: baseline F1/recall, 5 heuristic scores, SFI fragility curves, z-scores, null statistics, taxonomy mappings, and split hash.

---

## 4. Remediation & RSM
- **`POST /api/v1/remediation/preview`**
  - Generates non-destructive what-if simulation for R1 feature ablation or R2 flow quarantine. Returns RSM safety checks (PASS/WARN/BLOCK) and projected performance impact.
- **`POST /api/v1/remediation/apply`**
  - Creates a new immutable state view (`view_0001`) with cryptographic parent linkage.
- **`POST /api/v1/remediation/rollback`**
  - Reverts to parent view with bit-exact reproducibility.

---

## 5. Reports & Benchmarks
- **`POST /api/v1/reports/generate`**
  - Generates self-contained offline HTML audit certificate. Returns `report_id` and file size.
- **`GET /api/v1/reports/{report_id}/download`**
  - Downloads the standalone HTML report file with `Content-Disposition: attachment`.
- **`GET /api/v1/benchmarks/published`**
  - Returns EuroS&P 2024 literature reference values for comparison.
