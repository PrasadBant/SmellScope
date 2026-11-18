"""Report generation and offline download router."""

from __future__ import annotations

import os
from pathlib import Path
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from smellscope.core.errors import SmellScopeError
from smellscope.reporting.generator import generate_offline_html_report
from smellscope.server.dependencies import audit_job_manager, remediation_session_manager
from smellscope.server.schemas.models import (
    ReportGenerateRequest,
    ReportGenerateResponse,
)

router = APIRouter(prefix="/audits/{run_id}/reports", tags=["Offline Reports"])


@router.post("", response_model=ReportGenerateResponse)
def generate_report(run_id: str, req: ReportGenerateRequest) -> ReportGenerateResponse:
    """Generate a self-contained offline HTML report with embedded styles and cryptographic fingerprints."""
    job = audit_job_manager.get_job(run_id)
    if not job or not job.result:
        raise HTTPException(status_code=404, detail=f"Audit run '{run_id}' not found or incomplete.")

    rebenchmark_res = None
    change_log = None
    if req.include_rebenchmark:
        rebenchmark_res = remediation_session_manager.get_last_rebenchmark(run_id)
        change_log = remediation_session_manager.get_change_log(run_id)

    dataset_scores = None
    recommendations = None
    try:
        dataset_scores = remediation_session_manager.get_dataset_scores(run_id)
        recommendations = remediation_session_manager.get_recommendations(run_id)
    except Exception:
        pass

    report_id = f"rep_{uuid.uuid4().hex[:8]}"
    reports_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./reports"))
    reports_dir.mkdir(parents=True, exist_ok=True)
    out_file = reports_dir / f"{report_id}_{run_id}.html"

    try:
        report_path = generate_offline_html_report(
            run_result=job.result,
            rebenchmark_result=rebenchmark_res,
            change_log=change_log,
            output_path=str(out_file),
            dataset_scores=dataset_scores,
            recommendations=recommendations,
        )
        return ReportGenerateResponse(
            report_id=report_id,
            run_id=run_id,
            created_at=job.result.get("created_at", ""),
            download_url=f"/api/v1/audits/{run_id}/reports/{report_id}/download",
            file_path=report_path,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")


@router.get("/{report_id}/download")
def download_report(run_id: str, report_id: str) -> FileResponse:
    """Download the generated offline HTML report with strict path traversal prevention."""
    import re
    clean_id = re.sub(r"[^\w\-]", "", os.path.basename(report_id))
    if not clean_id:
        raise HTTPException(status_code=400, detail="Invalid report identifier.")

    reports_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./reports")).resolve()
    matches = list(reports_dir.glob(f"{clean_id}_*"))
    if not matches or not matches[0].exists():
        raise HTTPException(status_code=404, detail=f"Report '{clean_id}' not found.")

    target = matches[0].resolve()
    if not target.is_relative_to(reports_dir):
        raise HTTPException(status_code=403, detail="Access denied: path traversal detected.")

    return FileResponse(
        path=target,
        media_type="text/html",
        filename=target.name,
    )
