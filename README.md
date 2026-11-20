# SmellScope 2.1: Scientific Dataset Trust Audit Workstation

**An empirical audit engine and diagnostic workstation for detecting shortcut learning, synthetic artifacts, and protocol leakage in Network Intrusion Detection System (NIDS) benchmark datasets.**

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)]()
[![Status](https://img.shields.io/badge/status-Production%20Hardened-success.svg)]()
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)]()
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8.svg)]()
[![Tests](https://img.shields.io/badge/tests-backend%20%2B%20frontend%20passing-brightgreen.svg)]()
[![Air-Gapped](https://img.shields.io/badge/security-100%25%20local--first-informational.svg)]()

---

> [!IMPORTANT]
> **SCIENTIFIC INTEGRITY NOTICE**  
> SmellScope is an offline scientific validation platform for evaluating the integrity and generalization viability of machine learning datasets used in network intrusion detection research. It identifies laboratory shortcuts, protocol leakage, and experimental design flaws. **It is NOT an in-line Network Intrusion Detection System (NIDS) and does NOT monitor live traffic or block operational network attacks.**

---

## 1. Executive Summary & Problem Space

Machine learning models for Network Intrusion Detection frequently report near-perfect detection rates (>99% accuracy) on academic benchmark datasets. However, when deployed onto live enterprise networks, their detection capabilities often collapse catastrophically.

This failure stems from **shortcut learning**: models exploit accidental statistical artifacts present in benchmark data rather than learning intrinsic malicious behaviors. Common causes include:
- **Synthetic Traffic Artifacts**: Differences in packet generators, TCP window sizes, or default TTLs between attack scripts and benign traffic.
- **Protocol & Metadata Leakage**: IP addresses, non-ephemeral port bindings, or flow identifiers that correlate 100% with the attack class within a specific testbed capture.
- **Temporal & Partition Skew**: Capturing normal traffic on one day and attack traffic on another, allowing classifiers to act as "time-of-day detectors."

SmellScope provides cybersecurity researchers, dataset creators, and peer reviewers with an objective, mathematically rigorous instrument to audit datasets *before* training models. It quantifies vulnerability to shortcuts, verifies evaluation reliability, and offers evidence-backed, non-destructive remediation pathways.

---

## 2. Core Architectural Principles

1. **Strict 60/20/20 Stratified Locked Split**:  
   Ingested datasets are partitioned into Train (60%), Validation (20%), and Locked Test (20%) sets. All diagnostic heuristics and model fits are calculated exclusively on the training partition. The locked test set is cryptographic-hashed and never exposed to training or automated transformation.
2. **Cryptographic Provenance (SHA-256)**:  
   Every dataset version, partition, model checkpoint, and audit result is tagged with deterministic SHA-256 digests, providing tamper-evident traceability.
3. **Non-Destructive What-If Simulation**:  
   Remediations do not overwrite raw datasets. Transformations operate as virtual views, allowing auditors to inspect changes and run comparative evaluations against identical test partitions.
4. **Remediation Safety Monitor (RSM)**:  
   A conservative safety supervisor enforces strict constraints on automated data modifications, preventing class destruction, extreme row loss, or artificial bias injection.
5. **100% Local-First & Air-Gapped**:  
   SmellScope executes entirely on local infrastructure. Zero telemetry, zero external CDN scripts, and zero cloud API dependencies.

---

## 3. The 5-Stage Scientific Audit Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   01. DATASET   │ ──> │    02. AUDIT    │ ──> │  03. FINDINGS   │
│  Select/Upload  │     │  Cryptographic  │     │  Unified Smell  │
│  Benchmark Data │     │  60/20/20 Split │     │  Matrix & SFI   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐                             ┌─────────────────┐
│ 05. VERIFY &    │ <────────────────────────── │ 04. REMEDIATION │
│     REPORT      │   (Optional Comparison &    │  What-If Views  │
│ Offline Export  │    Locked Test Validation)  │  RSM Guardrails │
└─────────────────┘                             └─────────────────┘
```

- **Stage 1: Dataset Selection & Ingestion**  
  Select built-in standard benchmarks (e.g., CIC-IDS-2017, synthetic planted artifacts) or upload custom `.csv` / `.parquet` files. The engine performs automatic schema profiling, missing value detection, and class balance analysis.
- **Stage 2: Scientific Diagnostic Audit**  
  Executes the automated diagnostic suite across all detected attack classes, computing heuristic indicators, baseline random forest fits, and null calibrations.
- **Stage 3: Findings & Evidence Review**  
  Auditors review findings through two complementary lenses:
  - **Executive / Basic View**: Clear traffic-light risk scorecards, plain-English symptom descriptions, and high-level summaries.
  - **Scientific / Advanced View**: Per-class heuristic matrices, exact statistical values, feature controllability tags, and Monte Carlo null envelopes.
- **Stage 4: Dataset Improvement Centre (Optional)**  
  Provides intelligent, evidence-backed recommendations to mitigate detected flaws. Auditors can use three one-click selection strategies (`SELECT ALL SAFE`, `SELECT RECOMMENDED`, `SELECT HIGH PRIORITY`) to preview and stage transformations.
- **Stage 5: Verification & Standalone Reporting**  
  Compares original vs. improved dataset metrics side-by-side, evaluates baseline models on the unchanged locked test partition, and generates self-contained offline HTML reports.

---

## 4. Scientific Heuristics & Diagnostics Reference

SmellScope evaluates datasets against established empirical indicators:

| Diagnostic Metric | Code | Target Flaw | Scientific Principle & Detection Logic | Risk Threshold |
|---|:---:|---|---|:---:|
| **Unrealistic Generalization** | `UGT` | Shortcut Over-Reliance | Detects perfect or near-perfect classification performance achieved via abnormally low feature entropy or single-feature separation. | Severity > 0.70 |
| **Weak Labeling Artifacts** | `WL` | Generator Signatures | Identifies features whose distribution correlates strongly with packet generation tools rather than malicious behavior (e.g., rigid packet lengths, constant flow intervals). | Correlation > 0.85 |
| **High Dominant Feature** | `HDF` | Decision Tree Shortcuts | Measures whether a single feature accounts for over 80% of model feature importance, creating an easily bypassed single point of failure. | Importance > 0.60 |
| **Packet Distribution Distortion** | `PDD` | Unnatural Traffic Skew | Flags extreme packet inter-arrival or payload distributions that deviate severely from normal network operational baselines. | Deviation > 3.0 $\sigma$ |
| **Temporal Correlation** | `TC` | Time-of-Day Leakage | Flags non-ephemeral timestamps or time-ordered flow sequences that separate benign and malicious traffic by capture hour rather than packet semantics. | Separability > 0.90 |
| **Shortcut Fragility Index** | `SFI` | Brittle Decision Boundaries | Evaluates model performance decay under controlled feature perturbation, calibrated against a 100-run Monte Carlo empirical null distribution. | Decay z-score > 2.5 ($p < 0.01$) |
| **Generalization Gap Index** | `GGI` | Distributional Fragility | Compares in-distribution cross-validation accuracy against out-of-distribution stress partitions to quantify real-world risk. | Gap > 0.25 |

### Feature Controllability Taxonomy
To provide actionable cybersecurity context, features are categorized into:
1. **Attacker-Controllable**: Features that can be easily manipulated by an adversary (e.g., inter-arrival times, payload sizes, packet rates).
2. **Environment-Dependent**: Artifacts created by the capture environment or network topology (e.g., VLAN tags, IP subnetting, non-standard port allocations).
3. **Protocol-Constrained**: Fundamental RFC-bound parameters that cannot be modified without breaking TCP/IP communication (e.g., TCP header flags, checksum validity).

---

## 5. Remediation Safety Monitor (RSM) Guardrails

Data cleaning in cybersecurity ML must be conducted with extreme caution. Naive automated cleaning can accidentally remove true attack signals or inject artificial balance.

The **Remediation Safety Monitor (RSM)** acts as an automated safety barrier:
- **Class Integrity Guarantee**: Transformations that eliminate minority attack classes or drop representation below statistical validity thresholds are strictly blocked.
- **Row Loss Bounds**: Operations exceeding configurable sample reduction limits (e.g., >15% dataset reduction) trigger hard safety warnings.
- **Immutable Test Partition**: The 20% locked test partition remains bit-for-bit identical across all comparisons.
- **Audit-Gated Activation**: Remediations can only be proposed if supported by documented heuristic evidence from the current audit run.

### Intelligent Selection Controls
In the Dataset Improvement Centre, auditors can utilize three deterministic selection filters:
- `SELECT ALL SAFE`: Selects all applicable recommendations authorized under the active RSM policy without risk of structural damage.
- `SELECT RECOMMENDED`: Selects high-confidence transformations that address primary shortcut risks with minimal distributional disruption.
- `SELECT HIGH PRIORITY`: Targets critical-severity vulnerabilities (e.g., explicit identifier leakage, extreme single-feature dominance).

---

## 6. Technology Stack

- **Backend Core**: Python 3.11+, NumPy, Pandas, Scikit-learn, SciPy, Joblib, PyArrow, PyYAML.
- **Web API**: FastAPI, Uvicorn, Pydantic v2 (REST API boundary at `/api/v1`).
- **Frontend Workstation**: React 18, TypeScript 5.6, Vite 5.4, Tailwind CSS 3.4, Lucide Icons, Plotly.js (asynchronously code-split).
- **Quality Assurance**: Pytest (65+ automated test cases), Vitest, Playwright browser end-to-end automation.
- **Report Generation**: Standalone Jinja2 offline HTML rendering engine with embedded CSS/SVG visual cards.

---

## 7. Quick Start Guide

### Prerequisites
- **Python**: Version 3.11 or higher (verified on Python 3.11, 3.12, and 3.13).
- **Node.js**: Version 18.0 or higher with npm.
- **Operating System**: Windows (PowerShell scripts provided), Linux, or macOS.

### Automated Setup (Recommended)
On Windows PowerShell:
```powershell
# 1. Clone repository
git clone https://github.com/PrasadBant/SmellScope.git
cd SmellScope

# 2. Run automated environment setup
.\scripts\setup.ps1

# 3. Start development servers (FastAPI on :8000, Vite on :5173)
.\scripts\start.ps1
```

Access the interactive workstation at: **`http://localhost:5173`**

### Running in Single-Port Production Mode
To build the frontend and serve both the user interface and REST API from a single unified server:
```powershell
.\scripts\start.ps1 -Prod
```
Open **`http://127.0.0.1:8000`** in any web browser.

### Cross-Platform Manual Installation
For Linux and macOS environments:
```bash
# Backend setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .

# Frontend setup
cd frontend
npm ci
npm run build
cd ..

# Launch server
python3 -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000
```

---

## 8. System Verification & Health Checks

Run the automated health and dependency diagnostics script:
```powershell
.\scripts\check.ps1 -Live
```
Or query the running backend directly:
```bash
curl http://127.0.0.1:8000/api/v1/health
```

### Comprehensive Test Suite
```bash
# Execute Python scientific and API test suites
python -m pytest tests -v

# Run frontend type checking and component tests
cd frontend
npm run typecheck
npm test

# Run browser end-to-end integration tests (requires server running)
npx playwright test
```

---

## 9. Repository Structure

```text
SmellScope/
├── config/                        # Audit thresholds, UI configurations, and defaults
│   ├── default.yaml               # Core heuristic weights and split ratios
│   └── ui.yaml                    # Terminology, explanations, and visual mappings
│
├── data/                          # Dataset storage (local-first)
│   ├── samples/                   # Pre-bundled benchmarks (CIC-IDS-2017 subset, synthetic)
│   ├── uploads/                   # User-uploaded datasets
│   ├── repaired/                  # Staged non-destructive remediation views
│   └── models/                    # Serialized baseline models and test fingerprints
│
├── docs/                          # In-depth architectural & scientific documentation
│   ├── architecture/              # System architecture, API contracts, and data flows
│   ├── getting-started/           # User guides, quickstart tutorials, and FAQs
│   ├── operations/                # Installation, security, and air-gap deployment
│   ├── research/                  # Scientific heuristics, methodology, SFI, and GGI
│   └── testing/                   # Quality assurance and validation reports
│
├── frontend/                      # React + TypeScript + Vite workstation
│   ├── src/
│   │   ├── features/              # Feature screens (Home, Audit, Findings, Improvement, Reports)
│   │   ├── components/            # Reusable UI widgets and RSM Safety components
│   │   ├── layouts/               # Application shell and workflow progress bar
│   │   └── stores/                # Centralized state management
│   └── test/                      # Vitest test specs
│
├── scripts/                       # Operational management scripts
│   ├── check.ps1                  # System dependency and storage validator
│   ├── setup.ps1                  # Automated dependency installer
│   └── start.ps1                  # Development / production process supervisor
│
├── smellscope/                    # Python Scientific Audit Engine
│   ├── core/                      # Mathematical algorithms (UGT, WL, HDF, PDD, TC, SFI, GGI)
│   ├── pipeline/                  # Ingestion, schema validation, and stratified 60/20/20 splits
│   ├── remediation/               # Virtual views, transformation functions, and RSM checks
│   ├── reporting/                 # Standalone offline HTML report compiler
│   └── server/                    # FastAPI REST routing and static file delivery
│
└── tests/                         # Pytest automated test suites
```

---

## 10. REST API Specification

SmellScope exposes a clean, strongly typed REST API documented via OpenAPI:

- **System Diagnostics**:
  - `GET /api/v1/health`: Storage status, ML dependency checks, and configuration validation.
- **Dataset Operations**:
  - `GET /api/v1/datasets`: List available benchmark datasets and uploaded samples.
  - `POST /api/v1/datasets/upload`: Upload and ingest new `.csv` / `.parquet` files.
- **Audit Execution**:
  - `POST /api/v1/audit/run`: Trigger a full cryptographic audit on a specified dataset.
  - `GET /api/v1/audit/{run_id}`: Retrieve audit results, smell matrix, and diagnostic scores.
- **Remediation & Improvement**:
  - `GET /api/v1/remediation/{run_id}/recommendations`: Fetch evidence-backed improvement options.
  - `POST /api/v1/remediation/{run_id}/apply`: Apply selected transformations to a virtual view.
- **Comparison & Verification**:
  - `GET /api/v1/comparison/{run_id}`: Compute before-and-after scorecards and feature shifts.
  - `POST /api/v1/models/train`: Train and evaluate baseline classifiers on locked splits.
  - `GET /api/v1/reports/{run_id}/html`: Export self-contained offline HTML audit report.

Interactive Swagger API documentation is available at `http://127.0.0.1:8000/docs` when running the backend.

---

## 11. Security & Air-Gap Compliance

SmellScope is engineered for high-security, sensitive cybersecurity research facilities:
- **No Inbound/Outbound Telemetry**: Operates seamlessly without internet access.
- **No Third-Party Analytics**: Does not load remote fonts, tracking pixels, or third-party CDNs.
- **Input Sanitization**: Strict validation of uploaded file headers, MIME types, and path parameters to prevent directory traversal or script injection.
- **Cryptographic Sealing**: Audit outputs include SHA-256 hashes of input files, configuration parameters, and random seeds to guarantee scientific reproducibility.

---

## 12. License & Citation

SmellScope is distributed under the Apache License 2.0.

If you utilize SmellScope in academic research or dataset validation publications, please cite the framework as:

```bibtex
@software{smellscope2026,
  author = {SmellScope Research Team},
  title = {SmellScope 2.1: Scientific Dataset Trust Audit Workstation for Network Intrusion Detection Machine Learning},
  year = {2026},
  url = {https://github.com/PrasadBant/SmellScope}
}
```
