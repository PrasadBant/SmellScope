# Contributing to SmellScope

Thank you for contributing to the SmellScope scientific dataset auditing platform.

---

## 1. Guiding Principles

1. **Scientific Integrity First**: Never mock or fabricate calculation results. If a dataset lacks the required metadata for a heuristic, gracefully indicate `N/A`.
2. **Local-First & Privacy First**: Do not introduce remote network calls, tracking telemetry, or third-party cloud dependencies.
3. **Strict Preservations**: Never compromise the locked 20% test partition. All data scalers and models must be fit strictly on the 60% training split.
4. **Beginner Clarity**: Maintain plain-English explanations alongside advanced scientific metrics.

---

## 2. Development Workflow

1. Fork or create a dedicated feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your modifications.
3. Run test suites:
   ```bash
   python -m pytest tests -v
   npm --prefix frontend run test
   npm --prefix frontend run typecheck
   ```
4. Verify end-to-end browser workflows:
   ```bash
   cd frontend; npx playwright test
   ```
5. Submit a pull request with comprehensive test logs.
