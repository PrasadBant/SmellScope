# SmellScope 2.1 — Troubleshooting Guide

### 1. Port 8000 Already in Use
**Symptom**: `ERROR: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000): only one usage of each socket address is normally permitted`

**Solution**:
Another instance of uvicorn is running. Terminate the existing process:
```powershell
# Windows
Get-Process python | Where-Object { $_.CommandLine -like "*uvicorn*" } | Stop-Process
```
Or start on an alternate port:
```bash
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8080
```

---

### 2. Frontend Shows 404 or Fallback API Greeting
**Symptom**: Navigating to `http://127.0.0.1:8000` returns JSON: `{"status": "API active. Build frontend with 'npm run build'..."}`

**Solution**:
The production frontend bundle in `frontend/dist` has not been generated:
```bash
cd frontend
npm run build
```
Refresh the browser.

---

### 3. Missing Physical Core Warning in Joblib
**Symptom**: `UserWarning: Could not find the number of physical cores... WinError 2`

**Solution**:
This is an advisory warning from `joblib` on Windows when `wmic` is unavailable. It does not affect computation accuracy or test outcomes. To suppress it, set the environment variable:
```powershell
$env:LOKY_MAX_CPU_COUNT = 4
```

---

### 4. Custom Dataset Upload Fails Schema Check
**Symptom**: Upload rejected with message `Invalid column roles or missing label column`.

**Solution**:
Ensure your dataset contains a recognizable ground-truth label column (e.g. `Label`, `label`, `class`, `attack_cat`). If your column has a non-standard name, specify it in the **Advanced Options** drawer on the **New Audit** screen.
