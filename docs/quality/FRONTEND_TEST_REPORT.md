# SmellScope 2.0 — Frontend Test Report

**Execution Date:** November 19, 2026  
**Test Frameworks:** Vitest 2.1.9, Playwright (Chromium)  
**TypeScript Version:** 5.6.3 (Strict Mode)  
**TypeScript Errors:** 0  

---

## 1. Vitest Unit & Component Test Results

- **Command:** `npm --prefix frontend run test -- --run`
- **Result:** 10/10 Passed (100%)
- **Test Files:** 2 passed
- **Duration:** 4.40s

| Test Suite | Tests | Result | Description |
|---|---|---|---|
| `src/test/components.test.tsx` | 6 | PASSED | Button variants, Card rendering, Badge severity styles, MetricCard KPI metrics |
| `src/test/app.test.tsx` | 4 | PASSED | AppShell navigation, Brand header, Scientific disclaimer banner, Route mounting |

---

## 2. Playwright End-to-End Test Results

- **Command:** `npx playwright test`
- **Result:** 3/3 Passed (100%)
- **Duration:** 8.0s
- **Browser:** Chromium Desktop

| Journey | Spec | Duration | Status | Key Verifications |
|---|---|---|---|---|
| **Path A** | `e2e/workstation.spec.ts:4` | 2.4s | **PASSED** | 13-step guided audit without remediation directly to offline HTML certificate report. |
| **Path B** | `e2e/workstation.spec.ts:122` | 2.2s | **PASSED** | Full remediation lifecycle: R1 preview -> RSM evaluation -> apply view -> rebenchmark -> final report. |
| **Journey C** | `e2e/workstation.spec.ts:171` | 2.2s | **PASSED** | Improvement Centre: Findings -> recommendations -> preview -> apply -> Comparison screen with locked test badge -> History screen. |

---

## 3. Production Build Verification

- **Command:** `npm --prefix frontend run build`
- **Result:** Built successfully in 14.71s
- **Transformed Modules:** 1,719
- **Output:**
  - `dist/index.html`: 0.92 kB (gzip: 0.52 kB)
  - `dist/assets/index.css`: 36.51 kB (gzip: 7.09 kB)
  - `dist/assets/index.js`: 5.12 MB (gzip: 1.54 MB)
