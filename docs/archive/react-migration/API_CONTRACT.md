# SMELLSCOPE 2.0 — API CONTRACT REFERENCE

**Contract Status:** Shared Contract v1.0 Compliant  
**Base URL:** `http://127.0.0.1:8000/api/v1`  
**Data Format:** JSON (UTF-8)  
**Serialization Rule:** All `NaN` and `+/-inf` values serialize to standard JSON `null`.  

---

## 1. System Health

### `GET /health`
- **Description:** Verifies server readiness, research engine availability, and scientific disclaimer.
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "api_version": "1.0.0",
  "backend_available": true,
  "research_engine_available": true,
  "execution_mode": "local-first",
  "scientific_disclaimer": "SmellScope is a scientific benchmark dataset auditor, NOT an active network intrusion detection system."
}
```

---

## 2. Dataset Ingestion & Validation

### `GET /datasets`
- **Description:** Enumerates all registered sample and uploaded datasets.
- **Response `200 OK`:** List of dataset items with SHA-256 fingerprints and row counts.

### `POST /datasets/upload`
- **Content-Type:** `multipart/form-data`
- **Fields:** `file` (binary), `label_col` (optional str), `benign_label` (optional str).
- **Response `200 OK`:**
```json
{
  "dataset_id": "ds_a1b2c3d4e5",
  "source_basename": "cic2017_sample.parquet",
  "sha256": "4a7f...",
  "size_bytes": 142050,
  "message": "Dataset uploaded successfully."
}
```

### `GET /datasets/{dataset_id}`
- **Response `200 OK`:** Metadata, schema identification (`cic-ids-2017`, `unsw-nb15`, `synthetic-planted`), column roles (`dst_port`, `timestamp`, `group`), and class distribution.

### `GET /datasets/{dataset_id}/preview?limit=50`
- **Response `200 OK`:** Bounded preview records, missing value counts, and infinite value tallies.

### `POST /datasets/{dataset_id}/validate`
- **Request Body:** `{"label_col": "Label", "benign_label": "BENIGN", "max_rows_per_class": 20000, "seed": 42}`
- **Response `200 OK`:** Validation status, unique classes, class counts, and warning messages.

---

## 3. Audit Execution & Diagnostics

### `POST /audits`
- **Description:** Initiates asynchronous multi-class scientific audit.
- **Request Body:** `{"dataset_id": "ds_...", "classes": ["PortScan"], "seed": 42, "max_rows_per_class": 20000}`
- **Response `202 Accepted`:**
```json
{
  "run_id": "run_20261118_194000_a1b2c3",
  "status": "QUEUED",
  "message": "Audit job accepted for asynchronous execution."
}
```

### `GET /audits/{run_id}`
- **Response `200 OK`:** Status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`), current audited class, progress percentage, and elapsed seconds.

### `GET /audits/{run_id}/results`
- **Response `200 OK`:** Complete `RunResult` adhering to Shared Contract v1.0 Section 2.8. Returns HTTP `425 Too Early` while job is still running.

### `GET /audits/{run_id}/classes/{class_id}/diagnostics`
- **Response `200 OK`:** Class-specific `ClassAuditResult` containing SFI curve data, null mean/std, GGI values, and heuristic details.

### `POST /audits/{run_id}/fragility-grid`
- **Request Body:** `{"class": "PortScan", "features": ["Destination Port", "Flow Duration"]}`
- **Response `200 OK`:** 2D grid matrix of recall responses under joint perturbation.

---

## 4. Remediation & RSM

### `POST /audits/{run_id}/remediations/preview`
- **Request Body:** `{"action": "R1", "params": {"features": ["Destination Port"]}}`
- **Response `200 OK`:** What-if impact analysis and independent `RSMReport` (`status`: `PASS` | `WARN` | `BLOCK`).

### `POST /audits/{run_id}/remediations/apply`
- **Request Body:** `{"preview_id": "prev_...", "approval": {"approved": true, "warning_ack": true, "approved_at": "..."}}`
- **Response `200 OK`:** Transition to new `TrainingView` and recorded `ChangeLogEntry`.
- **Response `403 Forbidden`:** If operation triggers RSM `BLOCK`.

### `GET /audits/{run_id}/views`
- **Response `200 OK`:** View history, active view hash, change logs, and last rebenchmark.

### `POST /audits/{run_id}/rollback`
- **Request Body:** `{"target_entry_id": "log_..."}`
- **Response `200 OK`:** Restored parent `TrainingView` after verifying identical `view_hash`.

### `POST /audits/{run_id}/rebenchmark`
- **Request Body:** `{"target_class": "PortScan"}`
- **Response `200 OK`:** Baseline vs Remediated performance evaluation on locked test partition (`same_test_ids: true`).

---

## 5. Offline Reporting

### `POST /audits/{run_id}/reports`
- **Request Body:** `{"include_rebenchmark": true}`
- **Response `200 OK`:** Compiled report metadata, file path, and download URL.

### `GET /audits/{run_id}/reports/{report_id}/download`
- **Response `200 OK`:** Streams offline HTML file (`text/html`).
