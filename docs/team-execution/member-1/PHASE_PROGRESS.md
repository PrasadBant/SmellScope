# Member 1 Phase Progress — Research Core Engine

**Member:** Member 1 (Research Core: heuristics, SFI, GGI, evaluation)  
**Branch:** `feature/member-1-core-engine`  
**Total Allocated Budget:** 6.5 person-hours  
**Cumulative Hours Used:** 1.5 h  

---

## Phase Summary Table

| Phase | Description | Budget (h) | Actual (h) | Status | Authorization Date / Note |
|---|---|---|---|---|---|
| **Phase 0** | Context & Repository Audit | 0.3 | 0.3 | **Completed** | Authorized by initial prompt |
| **Phase 1** | Requirements & Specifications | 0.5 | 0.5 | **Completed** | Authorized by user ("next") |
| **Phase 2** | Architecture & Contracts | 0.7 | 0.7 | **Completed** | Authorized by user ("next") |
| **Phase 3** | Core Implementation (Freeze at end) | 2.8 | 0.0 | Pending | Awaiting user authorization |
| **Phase 4** | Testing & Validation (E1, E2, E5) | 1.0 | 0.0 | Pending | Pending Phase 3 sign-off |
| **Phase 5** | Integration Readiness | 0.7 | 0.0 | Pending | Pending Phase 4 sign-off |
| **Phase 6** | Final Delivery & Handover | 0.5 | 0.0 | Pending | Pending Phase 5 sign-off |

---

## Phase 2 Execution Record

- **Status:** Completed
- **Objectives:** Write frozen Shared Contract v1.0 verbatim, create contract-compliant function stubs and signatures for all `smellscope.core` public functions, implement standalone `split_stub.py`, construct contract-conformance test suite, and author technical design document.
- **Deliverables Produced:**
  - `docs/contracts/SHARED_CONTRACT_v1.0.md` (Verbatim frozen shared contract v1.0)
  - `smellscope/__init__.py`, `smellscope/core/__init__.py`, `smellscope/core/errors.py`
  - Function stubs with docstrings and contract signatures:
    - `smellscope/core/preprocess.py`
    - `smellscope/core/heuristics.py`
    - `smellscope/core/eval.py`
    - `smellscope/core/taxonomy.py`
    - `smellscope/core/sfi.py`
    - `smellscope/core/ggi.py`
    - `smellscope/core/audit.py`
    - `smellscope/core/planted.py`
  - `tests/fixtures/core/split_stub.py` (Local contract-conforming locked split stub & synthetic fixture)
  - `tests/core/test_contract.py` (Automated signature, error code, and split stub validation tests)
  - `docs/research/TECHNICAL_DESIGN.md` (Architecture, data flow diagrams, algorithmic specifications, dependency matrix)
- **Verification Details:**
  - Python import: `import smellscope.core` loads without error.
  - Contract test suite: `pytest tests/core/test_contract.py -v` passes 3/3 tests (error codes, signatures, split stub).
  - Parameter introspection confirms all 6 public core interfaces match contract parameter names and ordering exactly.
- **Key Decisions:**
  - D-005: Built `split_stub.py` with strict SHA-256 manifest hashing and test-leak assertion (`assert_test_untouched`) to enable isolated unit testing in Phase 3 without external pipeline dependencies.
  - D-006: Codified exact elbow selection via chord-distance method and IQR-scaled bounded perturbation in `TECHNICAL_DESIGN.md`.
- **Blockers / Issues:** None. Ready for Phase 3.
