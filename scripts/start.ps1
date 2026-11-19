<#
.SYNOPSIS
  Start SmellScope. Default: development mode (FastAPI backend + Vite frontend).
.PARAMETER Prod
  Build the frontend (if needed) and serve everything from the backend on one port.
.PARAMETER Rebuild
  With -Prod, force a fresh frontend build.
.PARAMETER Check
  Dry run: verify prerequisites, ports and health, then exit without starting servers.
.PARAMETER Open
  Open the app in the default browser once it is ready.
#>
param(
    [switch]$Prod,
    [switch]$Rebuild,
    [switch]$Check,
    [switch]$Open
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }
function Ok($msg)   { Write-Host "[ OK ] $msg" -ForegroundColor Green }

# --- Load .env (simple KEY=VALUE lines) ---
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$' -and -not $_.TrimStart().StartsWith("#")) {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
        }
    }
}
$BackendHost  = if ($env:SMELLSCOPE_HOST) { $env:SMELLSCOPE_HOST } else { "127.0.0.1" }
$BackendPort  = if ($env:SMELLSCOPE_PORT) { [int]$env:SMELLSCOPE_PORT } else { 8000 }
$FrontendPort = if ($env:SMELLSCOPE_FRONTEND_PORT) { [int]$env:SMELLSCOPE_FRONTEND_PORT } else { 5173 }
if (-not $env:LOKY_MAX_CPU_COUNT) { $env:LOKY_MAX_CPU_COUNT = "4" }
$env:PYTHONPATH = $Root

# --- Interpreter (prefer local venv) ---
$python = if (Test-Path ".venv\Scripts\python.exe") { Join-Path $Root ".venv\Scripts\python.exe" } else { "python" }
if (-not (Get-Command $python -ErrorAction SilentlyContinue)) { Fail "Python not found. Run .\scripts\setup.ps1 first." }

& $python -c "import fastapi, uvicorn, sklearn, pandas" 2>$null
if ($LASTEXITCODE -ne 0) { Fail "Backend dependencies are missing. Run .\scripts\setup.ps1 first." }
Ok "Backend dependencies present"

function Test-PortFree([int]$port) {
    $busy = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    return -not $busy
}
if (-not (Test-PortFree $BackendPort)) {
    Fail "Port $BackendPort is already in use. Stop the other process or set SMELLSCOPE_PORT in .env."
}
Ok "Port $BackendPort is free"

if (-not $Prod) {
    if (-not (Test-Path "frontend\node_modules")) { Fail "Frontend dependencies are missing. Run .\scripts\setup.ps1 first." }
    if (-not (Test-PortFree $FrontendPort)) {
        Fail "Port $FrontendPort is already in use. Stop the other process or set SMELLSCOPE_FRONTEND_PORT in .env."
    }
    Ok "Port $FrontendPort is free"
}

if ($Check) { Ok "Dry run complete - everything needed to start is in place."; exit 0 }

# --- Production: ensure a frontend build exists ---
if ($Prod -and ($Rebuild -or -not (Test-Path "frontend\dist\index.html"))) {
    Write-Host "Building frontend ..." -ForegroundColor Yellow
    Push-Location frontend
    try { & npm run build; if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed." } } finally { Pop-Location }
}

$procs = @()
function Stop-All {
    foreach ($p in $script:procs) {
        if ($p -and -not $p.HasExited) {
            & taskkill /PID $p.Id /T /F 2>$null | Out-Null
        }
    }
}

try {
    $uvArgs = "-m uvicorn smellscope.server.main:app --host $BackendHost --port $BackendPort"
    if (-not $Prod) { $uvArgs += " --reload" }
    Write-Host "Starting backend on http://${BackendHost}:${BackendPort} ..." -ForegroundColor Green
    $backend = Start-Process -FilePath $python -ArgumentList $uvArgs -WorkingDirectory $Root -PassThru -NoNewWindow
    $procs += $backend

    # Wait for the backend health endpoint (up to ~60 s)
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        if ($backend.HasExited) { Fail "Backend exited during startup (exit code $($backend.ExitCode)). See messages above." }
        try {
            $h = Invoke-RestMethod -Uri "http://${BackendHost}:${BackendPort}/api/v1/health" -TimeoutSec 2
            $ready = $true; break
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { Fail "Backend did not become healthy within 60 s." }
    Ok "Backend healthy (status=$($h.status))"
    if ($h.status -ne "ok") { Write-Host "[WARN] Health is '$($h.status)'. Run: python scripts\check_health.py" -ForegroundColor Yellow }

    if ($Prod) {
        $url = "http://${BackendHost}:${BackendPort}"
    } else {
        Write-Host "Starting frontend on http://localhost:$FrontendPort ..." -ForegroundColor Green
        $npm = (Get-Command npm.cmd).Source
        $frontend = Start-Process -FilePath $npm -ArgumentList "run dev -- --port $FrontendPort --strictPort" `
            -WorkingDirectory (Join-Path $Root "frontend") -PassThru -NoNewWindow
        $procs += $frontend
        $url = "http://localhost:$FrontendPort"
    }

    Write-Host "`nSmellScope is running at $url   (Ctrl+C to stop)" -ForegroundColor Cyan
    if ($Open) { Start-Process $url }

    while ($true) {
        Start-Sleep -Seconds 1
        foreach ($p in $procs) {
            if ($p.HasExited) { Fail "A server process exited unexpectedly (exit code $($p.ExitCode))." }
        }
    }
} finally {
    Write-Host "`nShutting down ..." -ForegroundColor Yellow
    Stop-All
}
