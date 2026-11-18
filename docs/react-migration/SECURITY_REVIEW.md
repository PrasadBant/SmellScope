# SMELLSCOPE 2.0 — LOCAL-FIRST SECURITY REVIEW

**Audit Level:** Local-First Privacy & Operational Security  
**Review Status:** Approved  

---

## 1. Security Architecture & Threat Model

SmellScope operates under a **local-first research security model**. It evaluates sensitive NIDS datasets on researcher hardware without cloud egress, external telemetry, or unvetted dependencies.

---

## 2. Security Boundaries & Mitigations

| Threat Vector | Mitigation Strategy | Implementation |
|---|---|---|
| **Network Exposure** | Loopback binding by default | Server binds strictly to `127.0.0.1:8000`. Public binding (`0.0.0.0`) is prohibited. |
| **CORS Egress** | Origin restriction | CORS middleware explicitly restricts origins to local dev/prod hosts (`http://localhost:5173`, `http://127.0.0.1:8000`). |
| **Arbitrary Path Traversal** | Filename sanitization | Uploaded filenames are stripped using `os.path.basename` and regex-cleansed to alphanumeric tokens. Files are saved strictly in `data/uploads/`. |
| **Arbitrary Code Execution** | No eval / pickle deserialization | File parsing strictly limited to standard pandas/pyarrow engines (`pd.read_csv`, `pd.read_parquet`). Unsafe deserialization is prohibited. |
| **Data Exfiltration** | Zero external telemetry | Zero analytic pings, external trackers, or telemetry calls exist in either frontend or backend codebases. |
| **Offline Report Autonomy** | Embedded CSS delivery | Offline HTML reports embed all CSS rules locally without pulling styles or scripts from external CDNs. |
| **Secret Management** | No frontend secrets | No API keys, credentials, or private keys are bundled or exposed through Vite environment variables. |

---

## 3. Cryptographic Lineage Guarantees

- **Dataset Provenance:** Every loaded dataset is fingerprinted with streaming SHA-256 upon arrival.
- **Split Invariance:** The 60/20/20 locked split generates an immutable `split_hash` over sorted partition indices. Any row leakage from the test partition immediately raises `E_TEST_LEAK`.
- **View Lineage:** Remediation transitions generate deterministic `view_hash` signatures over sorted included row IDs and ablated feature names. Rollbacks are rejected with `E_ROLLBACK_MISMATCH` if state restoration does not match the recorded hash.

---

## 4. Residual Risks & Guidance

- **Researcher Access:** Anyone with local console access on `127.0.0.1:8000` has full access to the audit engine. Do not forward port 8000 over untrusted public proxies or tunnels without adding an authentication proxy.
