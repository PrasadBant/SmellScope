# SmellScope 2.1 — System Architecture

SmellScope 2.1 is built as a modular, local-first application comprising a React + TypeScript SPA frontend, a FastAPI REST server, and a high-performance Python scientific research engine.

---

## 1. High-Level Architectural Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                   React 18 + TypeScript SPA Frontend                  │
│  - AppShell & Navigation (5 Stages)                                    │
│  - AuditContext & Invalidation Store                                   │
│  - Interactive Plotly.js Visualizations                                │
│  - Basic / Advanced View Mode Switch                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          FastAPI Backend Core                          │
│  - API Versioning (/api/v1)                                            │
│  - Dataset Ingestion & Cryptographic Fingerprinting (SHA-256)          │
│  - Audit Execution Orchestrator (Multi-class thread management)        │
│  - Remediation Manager & RSM Guardrails                                │
│  - Offline Report Generator (Jinja2 standalone HTML)                   │
│  - Static Asset Serving (Production SPA fallback)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Python In-Process Calls
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SmellScope Scientific Engine                       │
│  - Stratified 60/20/20 Fit-Only Data Splitting                         │
│  - Heuristics: UGT, WL, HDF, PDD, TC                                   │
│  - Null-Calibrated Shortcut Fragility Index (Monte Carlo N>=100)       │
│  - Feature Controllability Taxonomy (Categories A, B, C, D)            │
│  - Generalisation Gap Index (GGI)                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Separation of Concerns

```
badsmellpart1/
├── smellscope/
│   ├── core/               # Scientific research engine (pure Python/NumPy/SciPy/sklearn)
│   ├── pipeline/           # End-to-end multi-class orchestrator
│   ├── remediation/        # Non-destructive views & RSM safety monitor
│   ├── reporting/          # Cryptographic hashing & Jinja2 offline HTML generation
│   └── server/             # FastAPI routers, schemas, and static file mount
├── frontend/
│   ├── src/
│   │   ├── features/       # 5 Core workflow screens: home, audit, findings, remediation, reports
│   │   ├── components/     # Shared UI components (Card, Button, Badge, Modal, Tooltip)
│   │   ├── layouts/        # AppShell and responsive navigation bar
│   │   ├── stores/         # AuditContext for 5-stage state and invalidation logic
│   │   ├── api/            # Strongly-typed Axios / fetch API client
│   │   └── utils/          # Explanations dictionary and formatting helpers
│   ├── e2e/                # Playwright end-to-end test suite
│   └── test/               # Vitest component and shell unit tests
├── tests/                  # Pytest unit and integration test suite
├── docs/                   # Organized documentation structure
├── data/                   # Bundled benchmark datasets and local upload directory
└── reports/                # Generated offline HTML audit certificates
```
