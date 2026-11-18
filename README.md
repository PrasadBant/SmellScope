# SMELLSCOPE 2.0
### Scientific Dataset Trust Audit Workstation

[![Status](https://img.shields.io/badge/status-React%202.0%20Verified-success)]()
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12%20%7C%203.13-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688)]()
[![React](https://img.shields.io/badge/React-18.3-61DAFB)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8)]()
[![License](https://img.shields.io/badge/contract-Shared%20Contract%20v1.0-6366F1)]()

> **SCIENTIFIC INTEGRITY NOTICE:**  
> **SmellScope is a scientific auditor of Network Intrusion Detection System (NIDS) benchmark datasets.** It investigates dataset design artifacts, shortcut vulnerability, and generalization gaps in machine learning benchmark evaluation. It is **NOT** a live network intrusion detection system and does not monitor live network traffic.

---

## 1. Overview & Capabilities

SmellScope 2.0 has migrated from Streamlit to a modern, decoupled **React + TypeScript + Vite + Tailwind CSS + FastAPI** research workstation.

### Scientific Capabilities
- **Heuristic Artifact Analysis:** Vectorized calculation of Unassigned/Ghost Traffic (UGT), 4-gram Window Length repetition (WL), High Dimension Feature dominance (HDF), Partition Distance Disparity (PDD), and Temporal Concentration (TC).
- **Null-Calibrated Shortcut Fragility Index (SFI):** Permutation-based fragility measurement calibrated against Monte Carlo null distributions ($N=100$) with z-score boundary detection.
- **Generalisation Gap Index (GGI):** Quantitative evaluation of cross-subtype performance collapse comparing random vs provenance-grouped splits via Log Odds Ratio (LOR) tests.
- **Feature Controllability Taxonomy:** Automated classification of features into Category A (High Risk Controllable), Category B (Semantic Meaningful), Category C (Context Dependent), and Category D (Invariant Artifacts).
- **Remediation Safety Monitor (RSM):** Independent backend governance enforcing class retention floors ($\ge 50\%$ warn, $\ge 20\%$ block) and cluster integrity.
- **Reversible Remediation & Cryptographic Rollback:** Immutable `TrainingView` state management with deterministic SHA-256 verification.
- **Locked Test-Set Verification:** Guaranteed test partition isolation with cryptographic `split_hash` and leak prevention.
- **Offline HTML Reporting:** Self-contained, zero-external-dependency HTML audit reports with embedded styles.

---

## 2. Workstation Architecture

```text
SmellScope/
│
├── README.md                      # Project documentation
├── requirements.txt               # Python package dependencies
├── pyproject.toml                 # Package definition
│
├── app.py                         # Streamlit fallback application (preserved)
│
├── frontend/                      # React 2.0 Workstation (Primary Interface)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                # React Router + QueryClient + AuditProvider
│       ├── layouts/AppShell.tsx   # Collapsible sidebar + 5-stage workflow header
│       ├── features/
│       │   ├── overview/          # Screen 1: Command Center
│       │   ├── ingestion/         # Screen 2: Dataset Upload & Locked Split
│       │   ├── heatmap/           # Screen 3: Cross-Class Smell Matrix
│       │   ├── diagnostics/       # Screen 4: Shortcut Diagnostic Lab (SFI curves, 2D grid)
│       │   ├── remediation/       # Screen 5: Remediation Lab & RSM
│       │   └── reports/           # Screen 6: Verification & Offline Reporting
│       ├── api/client.ts          # Typed HTTP boundary (/api/v1/)
│       ├── stores/AuditContext.tsx
│       ├── types/api.ts           # TypeScript interfaces aligned with Shared Contract v1.0
│       └── components/ui/         # Radix-based accessible components
│
├── smellscope/                    # Authoritative Python Research Engine
│   ├── core/                      # Member 1 scientific algorithms (Heuristics, SFI, GGI)
│   ├── pipeline/                  # Ingestion, locked split, multi-class orchestrator
│   ├── remediation/               # Training views, R1/R2 actions, RSM safety checks
│   ├── reporting/                 # Offline standalone HTML report generator
│   ├── api/                       # Public facade conforming to Shared Contract v1.0 Section 2.9
│   └── server/                    # FastAPI HTTP boundary (/api/v1/)
│
├── config/                        # Shared configurations (default.yaml, heuristics.yaml, etc.)
├── data/samples/                  # Pre-calibrated benchmark datasets
├── scripts/                       # Launch scripts (PowerShell & Bash)
└── tests/                         # Automated test suites (31 passed)
    ├── core/                      # Scientific algorithm unit tests
    └── server/                    # FastAPI endpoint & contract tests
```

---

## 3. Quick Start & Launch Instructions

### 3.1 Prerequisites
- Python $\ge$ 3.11 (tested on Python 3.13)
- Node.js $\ge$ 18.0 (tested on Node.js v24.15.0 with npm 11.9.0)

### 3.2 Install Dependencies
```bash
# Python backend dependencies
pip install -r requirements.txt

# React frontend dependencies
cd frontend
npm install
cd ..
```

---

### 3.3 Option A: Single-Command Production Mode (Recommended)
FastAPI serves the compiled React single-page application and all versioned API routes simultaneously from a single local process:

**Windows (PowerShell):**
```powershell
.\scripts\run_prod.ps1
```

**Linux / macOS (Bash):**
```bash
chmod +x scripts/run_prod.sh
./scripts/run_prod.sh
```

Open your browser to: **`http://127.0.0.1:8000`**

---

### 3.4 Option B: Development Mode (Hot Reload)
Runs the FastAPI server and Vite dev server concurrently with active hot module reloading:

**Windows (PowerShell):**
```powershell
.\scripts\run_dev.ps1
```

**Linux / macOS (Bash):**
```bash
chmod +x scripts/run_dev.sh
./scripts/run_dev.sh
```

Open your browser to: **`http://localhost:5173`**  
API Documentation (Swagger UI): **`http://127.0.0.1:8000/docs`**

---

### 3.5 Option C: Legacy Streamlit Fallback
The original Streamlit interface is preserved for verification and fallback operation:

```bash
streamlit run app.py
```

---

## 4. Verification & Testing

SmellScope maintains 100% test pass rates across both Python and React test suites:

### 4.1 Python Scientific & Backend Test Suite
```bash
python -m pytest tests -v
```
*Executes all 26 core scientific tests and 6 FastAPI HTTP boundary integration tests (32/32 passing).*

### 4.2 Frontend TypeScript Typecheck
```bash
cd frontend
npm run typecheck
```
*Executes strict TypeScript check (`tsc --noEmit`) with 0 errors.*

### 4.3 Frontend Unit Tests
```bash
cd frontend
npm run test
```
*Executes Vitest unit tests verifying shell navigation, workflow bar, and metric formatting.*

### 4.4 Production Asset Bundling
```bash
cd frontend
npm run build
```
*Compiles optimized static production assets to `frontend/dist/`.*

---

## 5. Security & Local-First Guarantees
- **Loopback Binding Only:** API server binds strictly to `127.0.0.1`.
- **Zero Telemetry:** No user datasets or evaluation metrics are transmitted to third-party endpoints.
- **Path Traversal Protection:** Uploaded filenames are sanitized and restricted to `data/uploads/`.
- **Offline HTML Delivery:** Reports are compiled with fully embedded CSS and execute without internet connectivity.

---

## 6. Shared Contract Conformance
SmellScope 2.0 strictly maintains compatibility with **Shared Contract v1.0** (`docs/contracts/SHARED_CONTRACT_v1.0.md`). No existing scientific function signatures or metric semantics were altered during the frontend migration.
