# SmellScope 2.0 - Local Development Launcher (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SMELLSCOPE 2.0 - SCIENTIFIC DATASET AUDITOR" -ForegroundColor Cyan
Write-Host "   Starting Local Development Environment..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Set Loky environment variable to prevent Windows 11 CPU core warnings
$env:LOKY_MAX_CPU_COUNT = "4"
$env:PYTHONPATH = "."

# Start FastAPI Backend in background job or process
Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$backendProc = Start-Process python -ArgumentList "-m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000 --reload" -PassThru

# Wait briefly for backend to bind
Start-Sleep -Seconds 2

# Start Vite React Frontend
Write-Host "[2/2] Starting React Frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location frontend
npm run dev

# Cleanup when frontend exits
Stop-Process -Id $backendProc.Id -ErrorAction SilentlyContinue
