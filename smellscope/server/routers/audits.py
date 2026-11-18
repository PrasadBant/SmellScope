"""Audit execution, status tracking, and diagnostic inspection router."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status

from smellscope.api import get_fragility_grid
from smellscope.core.errors import SmellScopeError
from smellscope.server.dependencies import audit_job_manager, dataset_registry
from smellscope.server.schemas.models import (
    AuditStartRequest,
    AuditStartResponse,
    AuditStatusResponse,
    FragilityGridRequest,
    FragilityGridResponse,
    RunResultResponse,
)

router = APIRouter(prefix="/audits", tags=["Audit Execution"])


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=AuditStartResponse)
def start_audit(req: AuditStartRequest) -> AuditStartResponse:
    """Initiate an asynchronous multi-class scientific dataset audit.

    Returns HTTP 202 Accepted with a unique audit run ID.
    Execution runs in a background thread without blocking the FastAPI event loop.
    """
    try:
        run_id = audit_job_manager.start_job(
            dataset_id=req.dataset_id,
            classes=req.classes,
            cfg={"sampling": {"max_rows_per_class": req.max_rows_per_class, "seed": req.seed}, "seed": req.seed},
        )
        return AuditStartResponse(
            run_id=run_id,
            status="QUEUED",
            message=f"Audit run '{run_id}' initiated successfully.",
        )
    except SmellScopeError as sse:
        raise HTTPException(
            status_code=400,
            detail={"code": sse.code, "message": sse.message, "details": sse.details},
        )


@router.get("", response_model=List[AuditStatusResponse])
def list_audits() -> List[AuditStatusResponse]:
    """List all registered and completed audit jobs."""
    jobs = audit_job_manager.list_jobs()
    return [
        AuditStatusResponse(
            run_id=j.run_id,
            dataset_id=j.dataset_id,
            status=j.status,
            current_step=j.current_step,
            total_steps=j.total_steps,
            current_class=j.current_class,
            progress_percent=j.progress_percent,
            elapsed_seconds=j.elapsed_seconds,
            warnings=j.warnings,
            error_message=j.error_message,
        )
        for j in jobs
    ]


@router.get("/{run_id}", response_model=AuditStatusResponse)
def get_audit_status(run_id: str) -> AuditStatusResponse:
    """Return real-time execution status, class progress, and elapsed time."""
    job = audit_job_manager.get_job(run_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Audit job '{run_id}' not found.")

    return AuditStatusResponse(
        run_id=job.run_id,
        dataset_id=job.dataset_id,
        status=job.status,
        current_step=job.current_step,
        total_steps=job.total_steps,
        current_class=job.current_class,
        progress_percent=job.progress_percent,
        elapsed_seconds=job.elapsed_seconds,
        warnings=job.warnings,
        error_message=job.error_message,
    )


@router.get("/{run_id}/results", response_model=RunResultResponse)
def get_audit_results(run_id: str) -> Dict[str, Any]:
    """Return the complete RunResult dictionary conforming to Shared Contract v1.0."""
    job = audit_job_manager.get_job(run_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Audit job '{run_id}' not found.")

    if job.status == "RUNNING" or job.status == "QUEUED":
        raise HTTPException(
            status_code=425,
            detail=f"Audit '{run_id}' is still in progress ({job.progress_percent}%).",
        )

    if job.status == "FAILED":
        raise HTTPException(
            status_code=500,
            detail=f"Audit '{run_id}' failed: {job.error_message}",
        )

    return job.result


@router.get("/{run_id}/classes/{class_id}/diagnostics")
def get_class_diagnostics(run_id: str, class_id: str) -> Dict[str, Any]:
    """Return class-specific diagnostic information including SFI, GGI, and heuristic details."""
    job = audit_job_manager.get_job(run_id)
    if not job or not job.result:
        raise HTTPException(status_code=404, detail=f"Audit '{run_id}' not found or not completed.")

    classes = job.result.get("classes", [])
    target = next((c for c in classes if c.get("class") == class_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Class '{class_id}' not found in audit results.")

    return target


@router.post("/{run_id}/fragility-grid", response_model=FragilityGridResponse)
def calculate_fragility_grid(run_id: str, req: FragilityGridRequest) -> FragilityGridResponse:
    """Compute 2D joint feature perturbation fragility grid for two features."""
    job = audit_job_manager.get_job(run_id)
    if not job or not job.result:
        raise HTTPException(status_code=404, detail=f"Audit '{run_id}' not found.")

    ds = dataset_registry.get(job.dataset_id)
    if not ds:
        # Fallback to any loaded dataset
        all_ds = dataset_registry.list_all()
        if all_ds:
            ds = dataset_registry.get(all_ds[0]["dataset_id"])

    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not available for fragility calculation.")

    if len(req.features) != 2:
        raise HTTPException(status_code=400, detail="Fragility grid requires exactly 2 features.")

    try:
        grid = get_fragility_grid(
            ds=ds,
            cls=req.cls_name,
            features=req.features,
            split=job.split,
        )
        return FragilityGridResponse(
            features=grid["features"],
            grid_delta=grid["grid_delta"],
            recall=grid["recall"],
            recall_baseline=grid["recall_baseline"],
        )
    except SmellScopeError as sse:
        raise HTTPException(
            status_code=400,
            detail={"code": sse.code, "message": sse.message, "details": sse.details},
        )
