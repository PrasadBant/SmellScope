# SmellScope 2.1 — User Workflow Test Report

This report evaluates the SmellScope 2.1 simplified user experience across three realistic operational personas and usage scenarios.

---

## 1. Test A: First-Time Beginner User Persona

### Profile
A cybersecurity student or junior analyst with no prior experience in Network Intrusion Detection dataset auditing or machine learning shortcut diagnostics.

### Scenario Walkthrough
1. **Initial Impression**: User opens the application and lands on `/home`.
   - **Result**: PASSED. The screen prominently displays the brand, scientific purpose, and clear disclaimer that SmellScope is NOT an active IDS.
   - **Clarity**: The 3 step cards provide an immediate roadmap: "1. Audit a Dataset", "2. Investigate Findings", "3. Verify & Report".
   - **Checklist**: The dismissible onboarding checklist guides the user through each phase.
2. **Starting an Audit**: User clicks **START YOUR FIRST AUDIT** and arrives at `/audit`.
   - **Result**: PASSED. Default benchmark `cic2017_sample_planted` is pre-selected.
   - **Schema Inspection**: The user sees loaded flows (360), SHA-256 fingerprint, and class distribution without having to configure complex scripts.
   - **Launch**: User clicks **RUN SCIENTIFIC AUDIT**. A live animated progress bar shows the current attack class and elapsed time.
3. **Reviewing Results in Basic Mode**:
   - **Result**: PASSED. The user is transitioned to `/findings`.
   - **Plain English**: With Basic View active, 5 informative cards explain UGT, WL, HDF, PDD, and TC in simple terms.
   - **Color Coding**: Badges clearly indicate safe (green) vs high risk (red) without requiring statistical deciphering.
4. **Skipping Remediation Directly to Reports**:
   - **Result**: PASSED. The user clicks **Generate Report** in the action footer, bypassing remediation completely.
   - **Report Export**: On `/reports`, the user clicks **Generate Offline Report** and receives a self-contained HTML file.

---

## 2. Test B: Advanced Academic Researcher Persona

### Profile
A senior machine-learning researcher preparing a paper on NIDS benchmark generalization vulnerabilities, requiring mathematical rigor, literature comparisons, and exact null calibration statistics.

### Scenario Walkthrough
1. **Advanced Telemetry Activation**:
   - **Result**: PASSED. The researcher toggles the **Advanced View** switch in the top navigation bar.
   - **Display**: Findings screen immediately switches to mathematical notation, exact z-scores, null Monte Carlo distributions, and feature taxonomy classifications.
2. **Literature Reference Comparison**:
   - **Result**: PASSED. The researcher clicks **Compare Published** on the Smell Matrix.
   - **Data Alignment**: Published EuroS&P 2024 reference values are displayed alongside empirical values for instant cross-validation.
3. **Shortcut Diagnostics & Plotly Curves**:
   - **Result**: PASSED. The researcher navigates to **2. Shortcut Diagnostics (SFI & GGI)**.
   - **Interactive Chart**: Plotly renders the empirical feature recall decay curve juxtaposed against the Monte Carlo null envelope.
4. **Remediation & RSM Guardrails**:
   - **Result**: PASSED. The researcher tests **R1 Feature Ablation** on `Init_Win_bytes_backward`.
   - **RSM Enforcement**: Remediation Safety Monitor executes 5 strict checks, authorizing the transformation (`[PASS]`).
   - **Verification**: Locked test set isolation is mathematically verified via SHA-256 split hash invariance.

---

## 3. Test C: Failure & Boundary Handling

### Profile
Testing edge cases, missing columns, invalid uploads, and unexpected inputs.

| Case | Action | Expected Behavior | Actual Observed Outcome | Verdict |
|---|---|---|---|---|
| **C1: Upload with Missing Port Column** | Ingest dataset without `dst_port` | Graceful degradation of UGT heuristic | UGT returned `null` / `N/A`; other 4 heuristics and SFI completed normally | PASSED |
| **C2: Dataset Switch Cache Invalidation** | Change dataset after completing an audit | Immediate invalidation of prior run results | `latestRunResult` and `activeRunId` cleared; prevents displaying mismatched metrics | PASSED |
| **C3: Direct Access to Deep Routes** | Refresh browser on `/findings` or `/reports` | SPA fallback routes cleanly to index.html | FastAPI SPA fallback returns 200 OK and index.html loads application state | PASSED |
| **C4: Path Traversal Attempt in Upload** | Upload file with name `../../etc/passwd` | Filename sanitized and sandboxed | Filename sanitized to `______etc_passwd`; contained within `data/uploads/` | PASSED |
