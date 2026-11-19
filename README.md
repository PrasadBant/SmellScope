# SMELLSCOPE 2.1
### The Scientific Dataset Trust Audit Workstation

[![Version](https://img.shields.io/badge/version-2.1.0-blue)]()
[![Status](https://img.shields.io/badge/status-Production%20Hardened%20%26%20Simplified-success)]()
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688)]()
[![React](https://img.shields.io/badge/React-18.3-61DAFB)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8)]()
[![Tests](https://img.shields.io/badge/tests-backend%20%2B%20frontend-success)]()

> [!IMPORTANT]
> **SCIENTIFIC INTEGRITY NOTICE:**  
> **SmellScope is a scientific auditor of Network Intrusion Detection System (NIDS) benchmark datasets.** It investigates experimental design artifacts, protocol leakage, and shortcut vulnerability in machine learning evaluations. It is **NOT** a live network intrusion detection system and does **NOT** monitor active network traffic or detect cyberattacks in operations.

---

## 1. Welcome to SmellScope 2.1

SmellScope 2.1 transforms the dataset auditing experience into an intuitive, beginner-friendly 5-stage workflow while preserving 100% of the underlying scientific algorithms, heuristics, Monte Carlo null calibrations, and cryptographic lineage tracking.

### Key Highlights
- **Intuitive 5-Stage Scientific Workflow**:
  - `01 DATASET` — Select standard benchmarks (`CIC-IDS-2017`) or upload custom `.csv` / `.parquet` files.
  - `02 AUDIT` — Automatic cryptographic fingerprinting (SHA-256), schema verification, and 60/20/20 stratified fit-only audit execution.
  - `03 FINDINGS` — Unified smell matrix (UGT, WL, HDF, PDD, TC), null-calibrated SFI decay curves, and feature controllability taxonomy.
  - `04 REMEDIATION (OPTIONAL)` — Non-destructive What-If simulation with Remediation Safety Monitor (RSM) authorization.
  - `05 VERIFY & REPORT` — Locked test partition integrity verification and standalone offline HTML report export.
- **Remediation is Explicitly Optional**: Audit benchmark datasets and immediately download cryptographic audit reports without ever modifying the dataset.
- **Dual View Modes (Basic vs Advanced)**:
  - **Basic View**: Plain-English terminology, traffic-light risk badges, and beginner explanatory cards.
  - **Advanced View**: High-density scientific notation, exact z-scores, p-values, Monte Carlo null envelopes, and controllability categories.
- **100% Local-First & Air-Gapped**: Zero cloud calls, zero external CDN scripts, and zero telemetry.

---

## 2. Quick Start

### Prerequisites
- Python 3.11+ (tested on 3.13) and Node.js 18+ with npm
- Windows PowerShell (primary), or any shell for the manual commands below

### First-time setup (Windows PowerShell)
```powershell
.\scripts\setup.ps1            # checks prerequisites, installs backend + frontend deps, creates .env, runs health check
.\scripts\setup.ps1 -UseVenv   # same, but inside a local .venv
```

### Start the application
```powershell
.\scripts\start.ps1            # development: FastAPI (8000, auto-reload) + Vite (5173) -> open http://localhost:5173
.\scripts\start.ps1 -Prod      # single process: builds the frontend if needed and serves everything on http://127.0.0.1:8000
.\scripts\start.ps1 -Check     # dry run: verifies dependencies and that the ports are free, starts nothing
```
`start.ps1` loads `.env`, refuses to start if a port is busy, waits for `/api/v1/health`, and stops both servers on Ctrl+C.
Shell equivalents: `scripts/run_dev.sh` and `scripts/run_prod.sh`.

### Health check
```powershell
.\scripts\check.ps1            # config, storage, ML dependencies, research engine
.\scripts\check.ps1 -Live      # additionally probes the running backend and frontend
```
The same checks are exposed at `GET /api/v1/health` (status is `ok` or `degraded`, with per-check detail).

### Manual commands
```bash
pip install -r requirements.txt && pip install -e .
cd frontend && npm ci && npm run build && cd ..
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000
```

### Configuration (`.env`)
Copy `.env.example` to `.env` (done by `setup.ps1`). Variables: `SMELLSCOPE_HOME` (audit runs), `SMELLSCOPE_DATA_DIR`
(samples/uploads/repaired/models), `SMELLSCOPE_CONFIG_DIR` (YAML, canonical `./config`), `SMELLSCOPE_HOST`,
`SMELLSCOPE_PORT`, `SMELLSCOPE_FRONTEND_PORT`, `LOKY_MAX_CPU_COUNT`. No API keys or external services are used.

---

## 3. Workstation Architecture & Directory Organization

```text
badsmellpart1/
├── smellscope/                    # Authoritative Python Research Engine
│   ├── core/                      # Pure scientific algorithms (UGT, WL, HDF, PDD, TC, SFI, GGI)
│   ├── pipeline/                  # Ingestion, locked split, multi-class orchestrator
│   ├── remediation/               # Non-destructive views, R1/R2 actions, RSM safety guardrails
│   ├── reporting/                 # Offline standalone HTML report generator (Jinja2)
│   └── server/                    # FastAPI REST API boundary (/api/v1/) and SPA static host
│
├── frontend/                      # React 18 + TypeScript + Vite + Tailwind CSS Workstation
│   ├── src/
│   │   ├── features/
│   │   │   ├── home/              # Step 0: Welcome Hub & First-Time Auditor Checklist
│   │   │   ├── audit/             # Step 1-2: Dataset Ingestion & Scientific Audit Wizard
│   │   │   ├── findings/          # Step 3: Unified Smell Matrix, SFI Diagnostics & Taxonomy
│   │   │   ├── remediation/       # Step 4 (OPTIONAL): Remediation Lab & RSM Guardrails
│   │   │   └── reports/           # Step 5: Locked Partition Verification & Offline Reports
│   │   ├── layouts/AppShell.tsx   # Simplified 5-stage navigation & Basic/Advanced switch
│   │   ├── stores/AuditContext.tsx# Centralized state & invalidation logic
│   │   └── utils/explanations.ts  # Plain-English terms, math formulas & threshold dictionary
│   ├── e2e/                       # Playwright browser end-to-end test suite
│   └── test/                      # Vitest component and shell unit tests
│
├── docs/                          # Streamlined Project Documentation
│   ├── getting-started/           # User Guide, Quickstart, FAQ
│   ├── research/                  # Methodology, Heuristics, SFI, GGI, Limitations
│   ├── architecture/              # System Architecture, API Contract, Data Flow
│   ├── operations/                # Installation, Troubleshooting, Security
│   ├── development/               # Testing Guide, Contributing, Release History
│   ├── product-cleanup/           # Project Audit, Specifications, Verification Reports
│   └── archive/                   # Historical sprint notes, 2.0 migration logs, member backups
│
├── data/samples/                  # Pre-calibrated benchmark datasets
├── examples/run_demo.py           # Standalone scientific verification demo
└── tests/                         # Pytest test suite (Core scientific & Server API)
```

---

## 4. Documentation Quick Links

- [Quickstart Guide](file:///c:/Users/vishu/badsmellpart1/docs/getting-started/QUICKSTART.md) — 5-minute audit walkthrough
- [End-User Guide](file:///c:/Users/vishu/badsmellpart1/docs/getting-started/USER_GUIDE.md) — Detailed guide to the 5 stages
- [Frequently Asked Questions (FAQ)](file:///c:/Users/vishu/badsmellpart1/docs/getting-started/FAQ.md)
- [Scientific Methodology](file:///c:/Users/vishu/badsmellpart1/docs/research/METHODOLOGY.md) — 60/20/20 locked split and leakage prevention
- [Heuristics Guide](file:///c:/Users/vishu/badsmellpart1/docs/research/HEURISTICS.md) — Math and thresholds for UGT, WL, HDF, PDD, TC
- [Shortcut Fragility Index (SFI)](file:///c:/Users/vishu/badsmellpart1/docs/research/SFI.md) — Monte Carlo null distribution and z-scores
- [Generalisation Gap Index (GGI)](file:///c:/Users/vishu/badsmellpart1/docs/research/GGI.md)
- [System Architecture](file:///c:/Users/vishu/badsmellpart1/docs/architecture/SYSTEM_ARCHITECTURE.md)
- [REST API Contract](file:///c:/Users/vishu/badsmellpart1/docs/architecture/API_CONTRACT.md)
- [Security & Air-Gap Architecture](file:///c:/Users/vishu/badsmellpart1/docs/operations/SECURITY.md)
- [Testing & Quality Assurance Guide](file:///c:/Users/vishu/badsmellpart1/docs/development/TESTING.md)

---

## 5. Verification & Quality Assurance

```bash
python -m pytest tests -q                  # backend: scientific core, scoring, API boundary, workflow integrity, dynamic datasets
cd frontend && npm run typecheck           # TypeScript
cd frontend && npm test                    # Vitest component/shell tests
cd frontend && npm run build               # production bundle (code-split; Plotly loads on demand)
cd frontend && npx playwright test         # browser end-to-end (requires the app to be running)
python examples/run_demo.py                # standalone research demo
```

Key workflow guarantees covered by `tests/server/test_workflow_integrity.py` and `tests/server/test_dynamic_datasets.py`:
selected recommendations carry their parameters; the server (not the client) decides what a repair does; a no-op repair
reports `NO_CHANGE` and creates no new version; the corrected view is genuinely re-audited on the same locked split; the
dashboard score equals the comparison "after" score; the locked test fingerprint is verified, not assumed; single-class
datasets are `NOT_APPLICABLE` for supervised analysis.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `start.ps1` says a port is in use | Stop the other process or change `SMELLSCOPE_PORT` / `SMELLSCOPE_FRONTEND_PORT` in `.env` |
| UI shows "Unable to connect to the SmellScope backend" | Start the backend (`.\scripts\start.ps1`), then use the retry button; verify with `.\scripts\check.ps1 -Live` |
| Health status `degraded` | `python scripts/check_health.py` prints which check failed (storage permissions, missing ML package, config) |
| joblib/loky "physical cores" warning on Windows 11 | Harmless; `LOKY_MAX_CPU_COUNT` in `.env` silences it |
| First comparison after a repair takes ~10-20 s | A real re-audit of the corrected view runs once and is cached by view hash |
| Frontend changes not visible in `-Prod` mode | `.\scripts\start.ps1 -Prod -Rebuild` |

## 7. Current Limitations

- State for repair previews, views and comparisons is held in server memory; restarting the backend resets the Improvement
  Centre session (audit results in `runs/` and saved models in `data/models/` persist).
- Unknown schemas are audited with generic diagnostics; there is no interactive column-mapping step yet, and unmapped features are not given semantics.
- Results come from one seeded split; comparisons are measurements on that split, not proof of general improvement.
- Corrected-dataset exports are a single CSV (train view + untouched validation/test rows), not separate partition files.
- Audit duration is dominated by SFI null calibration (about 10-20 s for a few hundred rows per class).

---

## 8. Scientific References

- Flood, M., et al. (2024). *Shortcut Learning and Protocol Leakage in Network Intrusion Detection Benchmarks*. IEEE EuroS&P.
- Sharafaldin, I., et al. (2018). *Toward Generating a New Intrusion Detection Dataset and Intrusion Traffic Characterization*. ICISSP.
- Moustafa, N., & Slay, J. (2015). *UNSW-NB15: A comprehensive data set for network intrusion detection systems*. IEEE MilCIS.
