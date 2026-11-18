# SMELLSCOPE 2.0 — RELEASE ACCEPTANCE CHECKLIST

**Migration Milestone:** Complete Transformation from Streamlit to React + TypeScript + FastAPI  
**Release Verification Status:** ALL CRITERIA SATISFIED  

---

## 1. Non-Negotiable Preservation Verification

- [x] Dedicated git branch `feature/react-frontend` created without overwriting history.
- [x] All Member 1 scientific research algorithms intact (`smellscope/core`).
- [x] Baseline test suite preserved (26/26 passing).
- [x] Shared Contract v1.0 preserved and strictly honored (`SHARED_CONTRACT_v1.0.md`).
- [x] Existing experiment scripts preserved (`experiments/e1_reproduction.py`, `e2_planted_shortcut.py`, `e5_generalisation_gap.py`).
- [x] Streamlit fallback application preserved (`app.py`).

---

## 2. Architecture & Implementation Acceptance

- [x] **React 18 + TypeScript + Vite + Tailwind CSS** workstation implemented in `frontend/`.
- [x] **FastAPI + Pydantic v2** backend boundary implemented in `smellscope/server/`.
- [x] Strict loopback binding (`127.0.0.1`) and origin security enforced.
- [x] Asynchronous multi-class audit worker operates with real-time class and step polling.
- [x] Scientific calculations strictly retained in Python; zero duplication in JavaScript.
- [x] NaN and Infinity values recursively sanitized to JSON `null`.
- [x] Remediation Safety Monitor (RSM) independently enforces PASS / WARN / BLOCK rules on the backend.
- [x] Cryptographic state verification (`split_hash`, `view_hash`, dataset SHA-256) functional.
- [x] Standalone offline HTML report generator compiles zero-dependency reports with embedded CSS.

---

## 3. Screen-by-Screen Parity Verification

- [x] **Screen 1 (Overview Command Center):** Hero, real KPIs, key findings list, audit history, empty state.
- [x] **Screen 2 (Dataset Ingestion):** Drag-and-drop upload, benchmark selector, label/benign configuration, split visualization, async audit dispatch.
- [x] **Screen 3 (Cross-Class Smell Matrix):** UGT, WL, HDF, PDD, TC heatmap and table views, color mapping, hover inspectors.
- [x] **Screen 4 (Shortcut Diagnostic Lab):** SFI decay curves, Monte Carlo null baseline, feature controllability taxonomy (A/B/C/D), 2D fragility grid, GGI metrics.
- [x] **Screen 5 (Remediation Lab & RSM):** R1 feature ablation, R2 flow quarantine, what-if preview, RSM badges, warning acknowledgement, cryptographic rollback.
- [x] **Screen 6 (Verification & Reports):** Locked test partition verification, before/after rebenchmark evaluation, scientific limitations panel, offline HTML download.

---

## 4. Test & Build Gate

- [x] Python tests: `pytest tests -v` &rarr; 32/32 passed (100%).
- [x] Frontend typecheck: `npm run typecheck` &rarr; 0 errors.
- [x] Frontend unit tests: `npm run test` &rarr; 4/4 passed (100%).
- [x] Production asset build: `npm run build` &rarr; Successful bundle.
- [x] Static SPA serving: FastAPI serves the compiled React app at `/`.
- [x] Launch scripts provided for PowerShell and Bash (`run_dev`, `run_prod`).
