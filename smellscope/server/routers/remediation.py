"""Remediation and RSM governance router."""

from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from smellscope.core.errors import SmellScopeError
from smellscope.server.dependencies import remediation_session_manager
from smellscope.server.schemas.models import (
    RebenchmarkRequest,
    RebenchmarkResponse,
    RemediationApplyRequest,
    RemediationApplyResponse,
    RemediationPreviewRequest,
    RemediationPreviewResponse,
    RollbackRequest,
    RollbackResponse,
)

router = APIRouter(prefix="/audits/{run_id}", tags=["Remediation & RSM"])


@router.post("/remediations/preview", response_model=RemediationPreviewResponse)
def preview_remediation(run_id: str, req: RemediationPreviewRequest) -> RemediationPreviewResponse:
    """Generate an actual what-if preview and evaluate Remediation Safety Monitor (RSM) rules."""
    try:
        preview = remediation_session_manager.create_preview(
            run_id=run_id,
            action=req.action,
            params=req.params,
        )
        return RemediationPreviewResponse(
            preview_id=preview["preview_id"],
            action=preview["action"],
            params=preview["params"],
            reason=preview["reason"],
            affected=preview["affected"],
            feature_changes=preview["feature_changes"],
            expected_train_size=preview["expected_train_size"],
            rsm_report=preview["rsm_report"],
        )
    except SmellScopeError as sse:
        raise HTTPException(
            status_code=400,
            detail={"code": sse.code, "message": sse.message, "details": sse.details},
        )


@router.post("/remediations/apply", response_model=RemediationApplyResponse)
def apply_remediation_action(run_id: str, req: RemediationApplyRequest) -> RemediationApplyResponse:
    """Apply approved remediation only after independent backend RSM verification."""
    try:
        new_view, log_entry = remediation_session_manager.apply(
            preview_id=req.preview_id,
            approval=req.approval.model_dump(),
        )
        return RemediationApplyResponse(
            view=new_view,
            change_log_entry=log_entry,
        )
    except SmellScopeError as sse:
        status_code = 403 if "RSM" in sse.code else 400
        raise HTTPException(
            status_code=status_code,
            detail={"code": sse.code, "message": sse.message, "details": sse.details},
        )


@router.get("/views")
def get_remediation_views(run_id: str) -> Dict[str, Any]:
    """Retrieve lineage of TrainingViews and recorded change log entries."""
    try:
        views = remediation_session_manager.get_views(run_id)
        active_view = remediation_session_manager.get_active_view(run_id)
        change_log = remediation_session_manager.get_change_log(run_id)
        rebenchmark_res = remediation_session_manager.get_last_rebenchmark(run_id)

        # Sanitize internal IDs from views for response
        clean_views = [
            {k: v for k, v in view.items() if not k.startswith("_")}
            for view in views
        ]

        return {
            "run_id": run_id,
            "active_view": {k: v for k, v in active_view.items() if not k.startswith("_")},
            "views": clean_views,
            "change_log": change_log,
            "last_rebenchmark": rebenchmark_res,
        }
    except SmellScopeError as sse:
        raise HTTPException(
            status_code=400,
            detail={"code": sse.code, "message": sse.message, "details": sse.details},
        )


@router.post("/rollback", response_model=RollbackResponse)
def rollback_remediation(run_id: str, req: RollbackRequest) -> RollbackResponse:
    """Execute cryptographic rollback restoring previous view state with hash verification."""
    try:
        restored = remediation_session_manager.rollback_to(
            run_id=run_id,
            target_entry_id=req.target_entry_id,
        )
        clean_restored = {k: v for k, v in restored.items() if not k.startswith("_")}
        return RollbackResponse(
            restored_view=clean_restored,
            message=f"Successfully rolled back to view '{restored['view_id']}'. Integrity verified.",
            integrity_verified=True,
        )
    except SmellScopeError as sse:
        raise HTTPException(
            status_code=400,
            detail={"code": sse.code, "message": sse.message, "details": sse.details},
        )


@router.post("/rebenchmark", response_model=RebenchmarkResponse)
def run_rebenchmark(run_id: str, req: RebenchmarkRequest) -> RebenchmarkResponse:
    """Re-benchmark original vs remediated model on the locked test set."""
    try:
        res = remediation_session_manager.execute_rebenchmark(
            run_id=run_id,
            target_class=req.target_class,
        )
        return RebenchmarkResponse(
            before=res["before"],
            after=res["after"],
            delta=res["delta"],
            same_test_ids=res["same_test_ids"],
            split_hash=res["split_hash"],
            train_sizes=res["train_sizes"],
            ci95=res["ci95"],
            n_repeats=res["n_repeats"],
            seed=res["seed"],
        )
    except SmellScopeError as sse:
        raise HTTPException(
            status_code=400,
            detail={"code": sse.code, "message": sse.message, "details": sse.details},
        )
