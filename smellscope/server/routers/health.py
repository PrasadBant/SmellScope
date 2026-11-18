"""Health router for SmellScope FastAPI boundary."""

from __future__ import annotations

from fastapi import APIRouter
from smellscope.server.schemas.models import HealthResponse

router = APIRouter(prefix="/health", tags=["System Health"])


@router.get("", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return backend system status, engine availability, and scientific disclaimer."""
    return HealthResponse()
