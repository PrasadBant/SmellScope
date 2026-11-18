# Non-Functional Requirements Document (NFR) — Core Engine

**Module:** Core Engine (Research & Diagnostics)  
**Author:** Member 1 — Research Core Engineer  
**Status:** Approved for Implementation (Phase 1)

---

## 1. Performance & Computational Efficiency

- **NFR-001 (Single Class Execution Time):** `audit_class` shall execute in $\le 90$ seconds for a single class on a sample of up to 20,000 rows on a standard 4-core, 16 GB RAM CPU.
- **NFR-002 (Algorithmic Caps):**
  - ENN computation shall be capped at 5,000 rows via stratified subsampling to keep $O(N^2)$ within $< 10$ seconds.
  - HDF single-feature evaluation shall be parallelised using `joblib` (`n_jobs=-1`) and cap single-feature RF training to 30 trees with max depth 8.
  - SFI null distribution drawing shall be capped at 50 draws by default, with an automated fallback to 20 draws if execution exceeds 30 seconds.
- **NFR-003 (Memory Footprint):** Memory consumption shall remain $< 2.0\text{ GB}$ throughout audit execution. Transformed datasets and distance matrices must not be duplicated unnecessarily in memory.

---

## 2. Scientific Rigor, Reliability & Fault Isolation

- **NFR-004 (Graceful Metric Degradation):** Failure of an individual diagnostic (e.g. division by zero, singular matrix, or missing column) shall never terminate the entire audit. The faulty metric must resolve to `null`, and a detailed explanatory string must be appended to `na_reasons`.
- **NFR-005 (Unallowed Exceptions):** `audit_class` may only raise `E_SPLIT_INVALID`, `E_CONFIG`, or `E_CLASS_TOO_SMALL`. All internal analytical exceptions must be captured and translated into `na_reasons` or contract-compliant return dictionaries.
- **NFR-006 (Zero Data Leakage):** Scalers, imputers, encoders, and permutation importance calculations must be fit strictly on training partitions (or validation for SFI ranking). Under no circumstances shall test set values influence model fitting or threshold determination.

---

## 3. Reproducibility & Traceability

- **NFR-007 (Deterministic Execution):** All random operations (clustering, RF training, permutation draws, Monte Carlo null sampling) must be governed by an explicit integer seed. Identical seeds must yield identical floating-point results within standard machine precision ($\epsilon \le 10^{-7}$).
- **NFR-008 (Environment Provenance):** Every execution output dictionary must record runtime provenance metadata, including Python version, NumPy version, Pandas version, and Scikit-Learn version.

---

## 4. Code Quality & Test Coverage

- **NFR-009 (Test Coverage):** The core engine (`smellscope/core/`) shall maintain $\ge 80\%$ line coverage verified by `pytest --cov`.
- **NFR-010 (Function Complexity):** Individual functions shall adhere to single-responsibility principles, generally remaining $< 60$ lines of executable code.
- **NFR-011 (Contract Conformance):** All public core interfaces must strictly match the types, parameter names, and return schemas defined in `docs/contracts/SHARED_CONTRACT_v1.0.md`.

---

## 5. Security & Privacy

- **NFR-012 (Local-First Operation):** The core engine shall make zero outbound network calls.
- **NFR-013 (Data Integrity):** Raw input CSV files are strictly read-only. No intermediate cache or temporary file shall modify source data.
- **NFR-014 (No Insecure Serialization):** Standard Python `pickle` shall not be used on untrusted user data. Serialization to disk shall strictly utilize JSON or Parquet.
