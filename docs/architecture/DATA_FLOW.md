# SmellScope 2.1 — End-to-End Data Flow

## 1. Sequence Diagram: Complete Audit Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as React SPA (Vite)
    participant Context as AuditContext
    participant Backend as FastAPI Server
    participant Engine as Python Research Engine
    participant Disk as Local File System

    User->>Frontend: Select Benchmark Dataset
    Frontend->>Backend: GET /api/v1/datasets/{id}/metadata
    Backend->>Disk: Inspect file & compute SHA-256
    Backend-->>Frontend: Metadata (Hash, Rows, Roles, Classes)
    Frontend->>Context: Store activeDatasetId & Invalidate Stale Runs

    User->>Frontend: Click "RUN SCIENTIFIC AUDIT"
    Frontend->>Backend: POST /api/v1/audits {dataset_id, seed}
    Backend->>Engine: Run Stratified 60/20/20 Partitioning
    Engine->>Engine: Train Baselines & Compute UGT, WL, HDF, PDD, TC
    Engine->>Engine: Compute SFI & Monte Carlo Null Draws (N=100)
    Engine-->>Backend: MultiClassAuditResult
    Backend-->>Frontend: Audit Complete

    Frontend->>Context: Save latestRunResult
    Frontend->>Frontend: Transition to /findings
    User->>Frontend: Explore Matrix & Diagnostics

    alt Optional Remediation
        User->>Frontend: Propose R1 Feature Ablation
        Frontend->>Backend: POST /api/v1/remediation/preview
        Backend->>Engine: Run Remediation Safety Monitor (RSM)
        Backend-->>Frontend: RSM Verdict (PASS/WARN/BLOCK)
    end

    User->>Frontend: Click "Generate Report"
    Frontend->>Backend: POST /api/v1/reports/generate
    Backend->>Engine: Verify Locked Test Isolation (SHA-256)
    Backend->>Disk: Render Standalone HTML Certificate
    Backend-->>Frontend: Report Ready
    User->>Frontend: Download HTML Report
```

---

## 2. Invalidation & State Coherence Rules

To prevent displaying misleading or desynchronized results:
1. **Dataset Invalidation**: Changing the active dataset ID immediately resets `activeRunId`, `latestRunResult`, and `remediationViews`.
2. **Locked Split Isolation**: The 20% locked test partition is never modified during remediation previews or view creation.
3. **Rollback Determinism**: Restoring a parent view restores identical data arrays verified by SHA-256 checksums.
