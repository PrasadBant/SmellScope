<#
.SYNOPSIS
  One-time SmellScope setup: verifies prerequisites, installs backend + frontend dependencies,
  creates .env from .env.example and runs the health check.
.PARAMETER UseVenv
  Create/use a local .venv instead of the global Python environment.
.PARAMETER SkipFrontend
  Skip `npm ci` (backend-only setup).
#>
param(
    [switch]$UseVenv,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }
function Ok($msg)   { Write-Host "[ OK ] $msg" -ForegroundColor Green }

Write-Host "SmellScope setup in $Root" -ForegroundColor Cyan

# --- Prerequisites ---
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { Fail "Python 3.11+ not found on PATH. Install from https://www.python.org/downloads/." }
$pyVer = & python -c "import sys; print('%d.%d' % sys.version_info[:2])"
if ([version]$pyVer -lt [version]"3.11") { Fail "Python $pyVer found; 3.11+ is required." }
Ok "Python $pyVer"

if (-not $SkipFrontend) {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { Fail "Node.js 18+ not found on PATH. Install from https://nodejs.org/ (or pass -SkipFrontend)." }
    $nodeMajor = [int]((& node -v).TrimStart("v").Split(".")[0])
    if ($nodeMajor -lt 18) { Fail "Node $nodeMajor found; 18+ is required." }
    Ok "Node $(& node -v)"
}

# --- Python environment ---
$python = "python"
if ($UseVenv) {
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Write-Host "Creating .venv ..." -ForegroundColor Yellow
        & python -m venv .venv
        if ($LASTEXITCODE -ne 0) { Fail "Could not create virtual environment." }
    }
    $python = Join-Path $Root ".venv\Scripts\python.exe"
    Ok "Using virtual environment .venv"
}

Write-Host "Installing backend dependencies ..." -ForegroundColor Yellow
& $python -m pip install --upgrade pip --quiet
& $python -m pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) { Fail "pip install -r requirements.txt failed." }
& $python -m pip install -e . --quiet
if ($LASTEXITCODE -ne 0) { Fail "pip install -e . failed." }
Ok "Backend dependencies installed"

# --- Frontend ---
if (-not $SkipFrontend) {
    Write-Host "Installing frontend dependencies ..." -ForegroundColor Yellow
    Push-Location frontend
    try {
        if (Test-Path "package-lock.json") { & npm ci --no-audit --no-fund } else { & npm install --no-audit --no-fund }
        if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
    } finally { Pop-Location }
    Ok "Frontend dependencies installed"
}

# --- Environment file and runtime folders ---
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Ok "Created .env from .env.example"
} else {
    Ok ".env already exists (left unchanged)"
}
foreach ($d in "runs", "data\uploads", "data\repaired", "data\models", "reports") {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

# --- Health check ---
Write-Host "Running health check ..." -ForegroundColor Yellow
& $python scripts\check_health.py
if ($LASTEXITCODE -ne 0) { Fail "Health check failed; see messages above." }

Write-Host "`nSetup complete. Start the app with:  .\scripts\start.ps1" -ForegroundColor Cyan
