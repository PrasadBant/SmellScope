# SmellScope 2.1 — Quickstart Guide

Get up and running with the SmellScope 2.1 Scientific Dataset Trust Audit Workstation in under two minutes.

---

## 1. Quick Requirements

- **Python**: 3.10+ (tested through 3.13)
- **Node.js**: 18+ (tested with v22.10+)
- **OS**: Windows, macOS, or Linux
- **RAM**: 4GB+ recommended
- **Network**: None required (100% local-first and air-gapped safe)

---

## 2. Launch the Application

From the project root:

```powershell
# Windows PowerShell
.\launch.bat
```

Or start the backend and frontend separately:

### Backend (Terminal 1)
```bash
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000
```

### Frontend (Terminal 2 — for hot reloading during development)
```bash
cd frontend
npm install
npm run dev
```

Visit the interactive workstation in your browser at:
**[http://127.0.0.1:8000](http://127.0.0.1:8000)** (production build served directly by FastAPI) or **[http://localhost:5173](http://localhost:5173)** (Vite dev server).

---

## 3. Your First 5-Minute Audit (Step-by-Step)

### Step 1: Select or Upload a Dataset
1. Open the application and click **START YOUR FIRST AUDIT** on the Home screen.
2. Under **Step 1 · Dataset Source**, select the built-in benchmark:  
   `CIC-IDS-2017 Sample (Planted PortScan Shortcut)`.
3. Verify that **Step 2 · Schema Inspection** populates with:
   - 360 loaded flows
   - SHA-256 fingerprint
   - Class breakdown: 200 BENIGN, 80 DDoS, 80 PortScan.

### Step 2: Launch the Scientific Audit
1. In **Step 3 · Audit Parameters & Run**, keep default settings (60/20/20 Stratified Split).
2. Click **RUN SCIENTIFIC AUDIT**.
3. Watch the real-time progress bar as Random Forest models train and Monte Carlo draws execute (~10-15 seconds).

### Step 3: Review Findings
1. You are automatically transitioned to **Findings**.
2. **Matrix Tab**: See the 5 heuristic scores (UGT, WL, HDF, PDD, TC) for each attack class.
3. Click **Compare Published** to toggle EuroS&P 2024 literature reference values.
4. Switch to **2. Shortcut Diagnostics (SFI & GGI)**:
   - Examine Baseline Test F1 vs Shortcut Fragility Index (SFI).
   - View the interactive Plotly curve comparing empirical feature degradation to the null distribution.
5. Switch to **3. Feature Controllability Taxonomy** to inspect whether candidate shortcut features fall into Category A (Trivial Evasion) or Category B (Semantic).

### Step 4 (Optional): Experiment with Remediation
*Remediation is completely optional! If you only wish to export an audit report, skip to Step 5.*
1. If you wish to test mitigation, click **Remediation (Optional)**.
2. Select **R1 Feature Ablation** on the candidate shortcut feature (e.g., `Init_Win_bytes_backward`).
3. Click **Generate What-If Preview** to verify that the **Remediation Safety Monitor (RSM)** authorizes the change (`[PASS]`).

### Step 5: Verify & Download Report
1. Click **Reports** (or **Generate Report**).
2. Review the locked test-set verification certificate.
3. Click **Generate Offline Report** to export a self-contained HTML audit certificate with cryptographic lineage hashes.
