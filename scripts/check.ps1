<#
.SYNOPSIS
  SmellScope health check. Verifies Python/config/storage/ML dependencies; with -Live also probes
  the running backend (http://127.0.0.1:8000) and frontend dev server (http://127.0.0.1:5173).
#>
param([switch]$Live)

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$python = if (Test-Path ".venv\Scripts\python.exe") { Join-Path $Root ".venv\Scripts\python.exe" } else { "python" }
$args_ = @("scripts\check_health.py")
if ($Live) { $args_ += "--live" }
& $python @args_
exit $LASTEXITCODE
