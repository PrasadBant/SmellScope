# SmellScope 2.1 — Testing & Quality Assurance Guide

SmellScope maintains a multi-tiered testing strategy covering unit, integration, and full browser end-to-end verification.

---

## 1. Test Suites Overview

| Tier | Framework | Scope | Command | Count |
|---|---|---|---|---|
| **Core Scientific** | Pytest | Heuristics, SFI, GGI, Preprocessing, Seed determinism | `pytest tests/core -v` | 26 tests |
| **Server & API** | Pytest | FastAPI routes, schemas, upload sandboxing, SPA fallback | `pytest tests/server -v` | 11 tests |
| **Frontend Unit** | Vitest | React components, stores, navigation, formatters | `npm --prefix frontend run test` | 10 tests |
| **Full E2E** | Playwright | Full 5-stage browser workflow & direct-to-report bypass | `cd frontend; npx playwright test` | 2 suites |
| **Integration Demo** | Python | Standalone script running complete audit, remediation & report | `python examples/run_demo.py` | 1 run |

---

## 2. Running All Tests

### Python Backend Tests
```bash
python -m pytest tests -v
```

### Frontend Unit & Component Tests
```bash
npm --prefix frontend run test -- --run
```

### End-to-End Browser Tests (Playwright)
```bash
cd frontend
npx playwright test
```

### Static Typechecking
```bash
npm --prefix frontend run typecheck
```
