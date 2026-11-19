# Audit Logging, Traceability & Execution Trail Report

## 1. Traceability Standard

SmellScope 2.0 implements end-to-end audit traceability to ensure scientific reproducibility, audit trail provenance, and transparent verification. Every audit execution records structured chronological log entries capturing:
* Ingestion parameters and file fingerprints
* Topology and schema validation
* Locked partition split hash and seed
* Per-class heuristic execution times and scores
* Evaluation metrics and diagnostic investigations
* Synthesis scoring breakdowns

---

## 2. Structured Log Schema

Every entry in the execution log conforms to the following schema:
```json
{
  "timestamp": "2026-11-19T06:45:12.345678Z",
  "stage": "STAGE_IDENTIFIER",
  "level": "INFO | WARN | ERROR | DEBUG",
  "operation": "Human-readable operation description",
  "duration_ms": 125.4,
  "details": {
    "key": "value"
  }
}
```

### Stages Tracked:
1. `INGESTION`: File read, row count, column count, raw SHA-256 computation.
2. `VALIDATION`: Schema detection, topology classification (`is_single_class`, `is_binary`, `is_multiclass`), capability matrix generation.
3. `SPLIT`: Locked train/val/test split execution, random seed verification, split hash generation, partition size enforcement.
4. `CLASS_AUDIT`: Per-class scientific audit execution, heuristic smell evaluations ($UGT$, $WL$, $HDF$, $PDD$, $TC$), baseline model training, Monte Carlo SFI calibration ($N=100$ draws), and 100% accuracy investigation.
5. `SCORING`: Multi-dimensional score synthesis ($S_{\text{DQ}}$, $S_{\text{SUIT}}$, $S_{\text{REL}}$, $S_{\text{SHORT}}$) and overall assessment category assignment.
6. `COMPLETION`: Final audit bundle persistence, duration benchmarking, and memory cleanup.

---

## 3. Log Retrieval Endpoint

* **Endpoint:** `GET /api/v1/audits/{run_id}/logs`
* **Response:** Chronologically ordered list of structured log entries.
* **Live Status Support:** If an audit job is in progress or queued, the endpoint synthesizes current live stage progress and elapsed execution seconds in real time.

---

## 4. UI Timeline Integration

* **Location:** `AuditScreen.tsx` (Step 8 · Audit Logs)
* **Features:**
  - Interactive stage filtering (`ALL`, `INGESTION`, `VALIDATION`, `SPLIT`, `CLASS_AUDIT`, `COMPLETION`)
  - Color-coded level badges (`INFO`: Emerald, `WARN`: Amber, `ERROR`: Rose)
  - Millisecond duration precision
  - Expandable JSON details inspection
  - Direct provenance linkage with the active `run_id` and `split_hash`
