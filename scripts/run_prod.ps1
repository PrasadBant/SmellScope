# SmellScope 2.0 - Production Single-Process Launcher (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SMELLSCOPE 2.0 - PRODUCTION LOCAL WORKSTATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$env:LOKY_MAX_CPU_COUNT = "4"
$env:PYTHONPATH = "."

# Ensure frontend is built
if (-not (Test-Path "frontend/dist/index.html")) {
    Write-Host "Building React production assets..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    Set-Location ..
}

Write-Host "Launching unified workstation on http://127.0.0.1:8000..." -ForegroundColor Green
Write-Host "React Single-Page Application and API routes served simultaneously." -ForegroundColor Green
python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000
