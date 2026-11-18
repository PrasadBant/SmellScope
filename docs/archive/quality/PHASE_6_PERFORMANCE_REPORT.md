# SMELLSCOPE 2.0 — PHASE 6 PERFORMANCE & RELIABILITY REPORT

## 1. Executive Summary
Phase 6 evaluated the responsiveness, computational efficiency, concurrency model, and memory stability of SmellScope 2.0 under scientific audit workloads.

The FastAPI asynchronous gateway cleanly decouples CPU-bound scientific tasks (such as Random Forest training and Monte Carlo permutation draws) from the HTTP event loop, preserving low-latency UI responsiveness during heavy background computations.

---

## 2. API Latency Benchmarks

Measurements conducted with FastAPI TestClient over multiple iterations:

| Endpoint | Operation | Average Latency | p95 Latency | SLA Target | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/health` | Gateway health & disclaimer check | **5.37 ms** | 11.48 ms | < 50 ms | **PASS** |
| `GET /api/v1/datasets` | In-memory dataset registry enumeration | **3.48 ms** | 4.41 ms | < 50 ms | **PASS** |
| `GET /api/v1/datasets/{id}/preview` | Bounded data table & null/inf inspection | **7.36 ms** | 8.41 ms | < 100 ms | **PASS** |
| `GET /api/v1/benchmarks/published-values`| EuroS&P 2024 literature reference lookup | **5.47 ms** | 6.28 ms | < 50 ms | **PASS** |
| `GET /overview` | Single-Page Application HTML5 fallback | **10.62 ms** | 37.17 ms | < 100 ms | **PASS** |

---

## 3. Scientific Pipeline Compute Benchmarks

Measurements on the reference benchmark dataset (`cic2017_sample_planted`, 360 rows, 78 numeric features):

| Task | Computations Performed | Duration | Throughput / Efficiency |
| :--- | :--- | :---: | :--- |
| **Scientific Audit Execution** | Stratified split, 5 paper heuristics (UGT, WL, HDF, PDD, TC), Random Forest baseline fit, 100 Monte Carlo null permutation draws for SFI, GGI grouped-KFold evaluation. | **9.97 s** | ~36 flows/sec across full 100-draw permutation matrix. |
| **R1 What-If Preview & RSM** | Impact estimation across classes and PDD clusters, feature set diff, safety threshold check. | **0.08 s** | Real-time interactive response. |
| **Rebenchmark on Locked Test** | Multi-class model training on remediated view, evaluation on identical locked test IDs, delta computation. | **1.24 s** | Fast counterfactual feedback. |
| **Offline HTML Report Generation** | Standalone Jinja2 template rendering with embedded CSS styling, metric cards, and cryptographic audit lineage. | **0.12 s** | 11,964 bytes self-contained file. |

---

## 4. Reliability & Resource Stability
- **Non-Blocking Architecture**: Background tasks execute in worker threads managed by `AuditJobManager`. Health checks and status polling queries respond in $< 10$ ms even while Random Forest permutation fits are active.
- **Memory Footprint**: Peak memory usage remains $< 250$ MB for sample datasets. Large files are streamed in 64 KB chunks during upload.
- **Persistence & Crash Recovery**: Job metadata, split manifests, and training view lineage are written atomically to disk (`runs/<run_id>/`). When the server restarts, historical jobs and views are reloaded seamlessly.
- **Temporary File Hygiene**: Uploaded files and generated reports are strictly segregated into designated data directories (`./data/uploads`, `./reports`) with deterministic naming and path sanitization.
