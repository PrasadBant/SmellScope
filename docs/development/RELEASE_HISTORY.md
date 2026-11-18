# SmellScope Release History

---

## [v2.1.0] — 2026-11-18 (Project Simplification & Workflow Transformation)

### Summary
SmellScope 2.1 unifies the scientific application into an intuitive, beginner-friendly 5-stage workflow while preserving 100% of the underlying scientific algorithms, heuristics, SFI Monte Carlo null calibration, RSM safety guardrails, and cryptographic lineage tracking.

### Key Features & Improvements
- **Simplified 5-Stage Navigation**: Consolidated 6 separate screens into 5 intuitive destinations (`Home`, `New Audit`, `Findings`, `Remediation (Optional)`, `Reports`).
- **Unified Findings Hub**: Merged Cross-Class Smell Matrix, Null-Calibrated SFI Diagnostics, and Feature Controllability Taxonomy into a single tabbed analysis environment.
- **Decoupled Remediation**: Made remediation explicitly optional. Users can run audits and immediately generate offline reports without touching remediation.
- **Dual View Modes (Basic vs Advanced)**: Added an instant header toggle switching between beginner plain-English explanations and high-density scientific telemetry.
- **Interactive Terminology Dictionary**: Added definitions, mathematical formulas, thresholds, and "Why It Matters" guides for UGT, WL, HDF, PDD, TC, SFI, GGI, and RSM.
- **Streamlined Audit Setup**: Merged dataset selection, drag-and-drop file upload, schema fingerprinting, and audit parameter execution into a single 3-step wizard.
- **Comprehensive Documentation Restructuring**: Organized all project documentation into `getting-started/`, `research/`, `architecture/`, `operations/`, `development/`, and `archive/`.

---

## [v2.0.0] — 2026-11-18 (React + TypeScript + FastAPI Migration)

### Summary
Complete architecture migration from legacy Streamlit UI to a production-grade React 18 + Vite + Tailwind CSS frontend backed by a high-performance FastAPI server and Python scientific research engine.

### Key Features
- Black-themed obsidian design system.
- RESTful API with Pydantic validation schemas.
- Interactive Plotly.js charts for SFI decay curves and 2D fragility heatmaps.
- Offline self-contained HTML report export.
- Reversible remediation views with cryptographic lineage tracking.
