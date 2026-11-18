# SMELLSCOPE 2.0 — PHASE 4 SECURITY & RSM HARDENING REPORT

## 1. Executive Summary
Phase 4 verified the local-first security architecture, Remediation Safety Monitor (RSM) gatekeeping, path traversal protections, and state rollback mechanisms of SmellScope 2.0.

The application adheres to the zero-telemetry, local-first scientific software design paradigm. User dataset uploads, training views, audit logs, and reports remain strictly inside the local environment.

---

## 2. Security Architecture Controls

| Security Control | Implementation | Verification Status | Details |
| :--- | :--- | :---: | :--- |
| **Local-First Network Binding** | Loopback binding (`127.0.0.1:8000`) with CORS restricted to local origins (`localhost:5173`, `127.0.0.1:8000`, etc.). | **VERIFIED** | Prevents remote cross-origin access and unauthorized network discovery. |
| **Path Traversal Prevention** | Regex filename sanitization `re.sub(r"[^\w\.-]", "_", clean)` on upload; `is_relative_to(reports_dir)` check on report downloads. | **VERIFIED** | Attempted traversal (`../../../../test_traversal.csv`, `../../etc/passwd`) stripped or rejected (404/403). Tested in `test_security_path_traversal_prevention`. |
| **No Dynamic Code Execution** | No `eval()`, `exec()`, or untrusted `pickle.loads()` on user-supplied data or CSVs. | **VERIFIED** | Datasets ingested strictly via pandas/pyarrow with typed schema validation. |
| **Static File Isolation** | Static file serving restricted strictly to `frontend/dist`. HTML5 catch-all excludes API and doc prefixes (`/api/*`, `/docs`, `/openapi.json`). | **VERIFIED** | API routes cannot be masked by client-side fallback routes. |
| **Scientific Honesty Assurance** | No fabricated progress bars; long-running computations run asynchronously on real threads; clear disclaimer embedded on every screen, API response, and HTML report. | **VERIFIED** | Disclaimer explicitly communicates SmellScope is a dataset trust auditor, NOT a live intrusion detection system. |

---

## 3. Remediation Safety Monitor (RSM) Enforcement

The Remediation Safety Monitor (RSM) acts as an independent pre-flight gatekeeper before any training view modification:

```
Proposed Remediation (R1 / R2)
             │
             ▼
    ┌─────────────────┐
    │  RSM Check      │
    │  (Class/Cluster │
    │   Retention,    │
    │   Ablation Cap) │
    └────────┬────────┘
             │
     ┌───────┴────────┬───────────────┐
     ▼                ▼               ▼
  [ PASS ]         [ WARN ]        [ BLOCK ]
     │                │               │
     │          Requires User         │
     │          Acknowledgment        │
     ▼                ▼               ▼
Applied to       Applied only    Refused (403)
Training View    with auth       E_RSM_BLOCK
```

- **Extreme Data Loss Prevention**: Prohibits remediations reducing training rows below floor (`BLOCK`).
- **Cluster Obliteration Prevention**: Alerts (`WARN`) when PDD cluster retention drops below 25%; blocks (`BLOCK`) when below 10%.
- **Class Erasure Defense**: Blocks (`BLOCK`) when class retention falls below 20%.
- **Unacknowledged Warning Defense**: Rejects apply requests with HTTP 400 (`E_RSM_WARN_UNACKED`) if `warning_ack` is false.
- **Bit-Exact Reversible Rollback**: Rolling back to a prior view re-computes and verifies the SHA-256 view hash (`split_hash` + sorted row IDs + excluded features) matching the recorded state with 100% cryptographic precision.
