"""Dataset Improvement Centre API Router for SmellScope 2.0."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from smellscope.server.dependencies import (
    audit_job_manager,
    remediation_session_manager,
)
from smellscope.server.schemas.models import (
    DatasetComparisonResponse,
    RecommendationsResponse,
    RepairPlanApplyRequest,
    RepairPlanApplyResponse,
    RepairPlanPreviewRequest,
    RepairPlanPreviewResponse,
)
from smellscope.core.errors import SmellScopeError

router = APIRouter(tags=["improvement"])

# Ensure repaired dataset export directory exists
Path("data/repaired").mkdir(parents=True, exist_ok=True)


def _assert_completed(run_id: str):
    """Validate that a run exists and is COMPLETED."""
    job = audit_job_manager.get_job(run_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id!r} not found.")
    if job.status != "COMPLETED":
        raise HTTPException(
            status_code=409,
            detail=f"Run {run_id!r} is not yet completed (status={job.status!r}).",
        )
    return job


@router.get(
    "/audits/{run_id}/recommendations",
    response_model=RecommendationsResponse,
    summary="Get intelligent repair recommendations for a completed audit run",
)
async def get_recommendations(run_id: str):
    """Generate evidence-based repair recommendations from dataset quality and audit findings."""
    _assert_completed(run_id)
    try:
        recs = remediation_session_manager.get_recommendations(run_id)
    except SmellScopeError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    # Normalise evidence field: recommender may return str or dict
    for r in recs:
        if not isinstance(r.get("evidence"), dict):
            r["evidence"] = {"description": str(r.get("evidence", ""))}
    return RecommendationsResponse(
        run_id=run_id,
        recommendations=recs,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post(
    "/audits/{run_id}/repair-plan/preview",
    response_model=RepairPlanPreviewResponse,
    summary="Preview a composite repair plan from selected recommendations",
)
async def create_repair_plan_preview(run_id: str, body: RepairPlanPreviewRequest):
    """Generate a preview of the selected repairs including data quality delta and RSM assessment."""
    _assert_completed(run_id)
    if not body.selected_recs:
        raise HTTPException(status_code=422, detail="At least one recommendation must be selected.")
    try:
        preview = remediation_session_manager.create_repair_plan_preview(
            run_id=run_id,
            selected_recs=body.selected_recs,
        )
        if "affected" in preview and "by_class" in preview["affected"]:
            preview["affected_rows_by_class"] = preview["affected"]["by_class"]
    except SmellScopeError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    return RepairPlanPreviewResponse(**preview)


@router.post(
    "/audits/{run_id}/repair-plan/apply",
    response_model=RepairPlanApplyResponse,
    summary="Apply an approved repair plan to produce a corrected dataset",
)
async def apply_repair_plan_endpoint(run_id: str, body: RepairPlanApplyRequest):
    """Execute the approved repair plan. Creates a corrected dataset CSV at data/repaired/."""
    _assert_completed(run_id)
    try:
        new_view, log_entry, export_meta = remediation_session_manager.apply_repair_plan_action(
            preview_id=body.preview_id,
            approval=body.approval,
        )
    except SmellScopeError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    return RepairPlanApplyResponse(
        view=new_view,
        change_log_entry=log_entry,
        export_metadata=export_meta,
    )


@router.get(
    "/audits/{run_id}/comparison",
    response_model=DatasetComparisonResponse,
    summary="Get original vs corrected dataset comparison",
)
async def get_comparison(
    run_id: str,
    target_class: Optional[str] = Query(default=None),
):
    """Compare data quality and ML performance between original and corrected dataset views."""
    _assert_completed(run_id)
    try:
        comparison = remediation_session_manager.get_dataset_comparison(
            run_id=run_id,
            target_class=target_class,
        )
    except SmellScopeError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    return DatasetComparisonResponse(**comparison)


@router.get(
    "/audits/{run_id}/export/dataset",
    summary="Download the corrected dataset CSV",
)
async def download_corrected_dataset(run_id: str):
    """Stream the corrected dataset CSV file for download."""
    _assert_completed(run_id)
    export_meta = remediation_session_manager.get_export_metadata(run_id)
    if not export_meta:
        raise HTTPException(
            status_code=404,
            detail="No corrected dataset export found. Apply a repair plan first.",
        )
    file_path = Path(export_meta.get("file_path", ""))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Export file not found on disk.")
    return FileResponse(
        path=str(file_path),
        filename=export_meta.get("filename", "corrected_dataset.csv"),
        media_type="text/csv",
        headers={
            "X-SHA256": export_meta.get("sha256", ""),
            "X-View-ID": export_meta.get("view_id", ""),
        },
    )
