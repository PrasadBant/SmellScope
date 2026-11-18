# SMELLSCOPE 2.1
### The Scientific Dataset Trust Audit Workstation

[![Version](https://img.shields.io/badge/version-2.1.0-blue)]()
[![Status](https://img.shields.io/badge/status-Production%20Hardened%20%26%20Simplified-success)]()
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688)]()
[![React](https://img.shields.io/badge/React-18.3-61DAFB)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8)]()
[![Tests](https://img.shields.io/badge/tests-49%20passed%20%7C%200%20failed-success)]()

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
- Python 3.10+ (tested through 3.13)
- Node.js 18+ & npm

### One-Click Launch (Windows)
```powershell
.\launch.bat
```

### Manual Launch

**1. Install Python package:**
```bash
pip install -e .
```

**2. Build React frontend bundle:**
```bash
cd frontend
npm install
npm run build
cd ..
```

**3. Start the unified application:**
```bash
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

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

SmellScope maintains 100% test pass rates across all test suites:

```bash
# 1. Python Scientific & Server Tests (37 tests)
python -m pytest tests -v

# 2. Frontend Component & Shell Tests (10 tests)
npm --prefix frontend run test -- --run

# 3. Playwright End-to-End Browser Tests (2 suites)
cd frontend; npx playwright test

# 4. Standalone Research Demo
python examples/run_demo.py
```

---

## 6. Scientific References

- Flood, M., et al. (2024). *Shortcut Learning and Protocol Leakage in Network Intrusion Detection Benchmarks*. IEEE EuroS&P.
- Sharafaldin, I., et al. (2018). *Toward Generating a New Intrusion Detection Dataset and Intrusion Traffic Characterization*. ICISSP.
- Moustafa, N., & Slay, J. (2015). *UNSW-NB15: A comprehensive data set for network intrusion detection systems*. IEEE MilCIS.
