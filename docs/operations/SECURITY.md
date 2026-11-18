# SmellScope 2.1 — Security & Privacy Architecture

SmellScope is engineered for deployment in high-security, privacy-critical research environments.

---

## 1. Local-First Air-Gapped Operation

- **Zero Cloud Dependencies**: The application does not contact remote servers, external APIs, CDN scripts, or cloud databases.
- **No Telemetry**: No tracking beacons, analytics events, or crash telemetry are transmitted outside the machine.
- **Air-Gap Certified**: Can be operated safely on isolated internal research enclaves.

---

## 2. File Ingestion & Path Traversal Mitigations

- **Strict Path Sandboxing**: Custom uploads are written exclusively to `data/uploads/`.
- **Filename Sanitization**: Filenames are sanitized using `re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)` to prevent directory traversal (`../`) attacks.
- **MIME / Extension Restrictions**: Only `.csv` and `.parquet` files are accepted. Executables, scripts, and system binaries are blocked immediately.

---

## 3. Cryptographic Audit Lineage

- Every dataset ingested is fingerprinted using **SHA-256**.
- Every transformation view generates an immutable cryptographic ledger entry linking `parent_hash` to `child_hash`.
- Downloadable HTML reports contain cryptographic verification blocks that allow third-party auditors to verify that benchmark numbers were produced on intact partitions.
