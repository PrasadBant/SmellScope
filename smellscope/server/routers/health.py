"""Health router for SmellScope FastAPI boundary."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter
from smellscope.server.schemas.models import HealthResponse

router = APIRouter(prefix="/health", tags=["System Health"])


def _writable_dir(path: Path) -> Dict[str, Any]:
    """Verify a runtime directory exists (creating it if needed) and is writable."""
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".health_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        return {"ok": True, "path": str(path.resolve())}
    except Exception as exc:  # pragma: no cover - environment dependent
        return {"ok": False, "path": str(path), "error": str(exc)}


def run_health_checks() -> Dict[str, Dict[str, Any]]:
    """Run real checks of configuration, storage and ML/runtime dependencies."""
    checks: Dict[str, Dict[str, Any]] = {}

    try:
        from smellscope.pipeline.config import load_config

        cfg = load_config()
        checks["configuration"] = {
            "ok": bool(cfg.get("config_hash")) and "sfi" in cfg and "heuristics" in cfg,
            "config_hash": str(cfg.get("config_hash", ""))[:12],
        }
    except Exception as exc:
        checks["configuration"] = {"ok": False, "error": str(exc)}

    data_dir = Path(os.environ.get("SMELLSCOPE_DATA_DIR", "./data"))
    checks["dataset_storage"] = _writable_dir(data_dir / "uploads")
    checks["run_storage"] = _writable_dir(Path(os.environ.get("SMELLSCOPE_HOME", "./runs")))
    checks["repaired_storage"] = _writable_dir(data_dir / "repaired")
    checks["model_storage"] = _writable_dir(data_dir / "models")

    versions: Dict[str, str] = {}
    ml_ok = True
    for mod in ("numpy", "pandas", "sklearn", "joblib", "yaml", "pyarrow"):
        try:
            imported = __import__(mod)
            versions[mod] = str(getattr(imported, "__version__", "unknown"))
        except Exception as exc:
            ml_ok = False
            versions[mod] = f"MISSING ({exc.__class__.__name__})"
    checks["ml_dependencies"] = {"ok": ml_ok, "versions": versions}

    try:
        from smellscope.pipeline.orchestrator import run_audit  # noqa: F401
        from smellscope.remediation.manager import rebenchmark  # noqa: F401

        checks["research_engine"] = {"ok": True}
    except Exception as exc:
        checks["research_engine"] = {"ok": False, "error": str(exc)}

    return checks


@router.get("", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return backend system status, engine availability, and scientific disclaimer."""
    checks = run_health_checks()
    all_ok = all(c.get("ok") for c in checks.values())
    return HealthResponse(
        status="ok" if all_ok else "degraded",
        backend_available=True,
        research_engine_available=bool(checks["research_engine"].get("ok")),
        checks=checks,
    )
