"""Audit execution, status tracking, and diagnostic inspection router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
import numpy as np
import pandas as pd

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


@router.get("/{run_id}/logs")
def get_audit_logs(run_id: str) -> List[Dict[str, Any]]:
    """Return chronological execution logs for an audit job."""
    job = audit_job_manager.get_job(run_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Audit job '{run_id}' not found.")

    if job.result and "audit_logs" in job.result:
        return job.result["audit_logs"]

    # If job is running or queued, synthesize current live logs
    logs = [
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": "INITIATION",
            "level": "INFO",
            "operation": f"Audit job '{run_id}' initialized",
            "duration_ms": 0.0,
            "details": {"dataset_id": job.dataset_id, "status": job.status},
        }
    ]
    if job.status == "RUNNING":
        logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": "EXECUTION",
            "level": "INFO",
            "operation": f"Auditing step {job.current_step}/{job.total_steps} (Class: {job.current_class or 'N/A'})",
            "duration_ms": round(job.elapsed_seconds * 1000.0, 2),
            "details": {"progress_percent": job.progress_percent},
        })
    return logs


@router.get("/{run_id}/heatmaps/smell-matrix")
def get_smell_matrix_heatmap(run_id: str) -> Dict[str, Any]:
    """Return Per-Class Smell Matrix heatmap data across all audited attack classes."""
    job = audit_job_manager.get_job(run_id)
    if not job or not job.result:
        raise HTTPException(status_code=404, detail=f"Audit '{run_id}' not found or not completed.")

    classes_data = job.result.get("classes", [])
    metrics = ["UGT", "WL", "HDF", "PDD", "TC", "SFI", "GGI"]
    metric_thresholds = {
        "UGT": 0.10,
        "WL": 0.30,
        "HDF": 0.60,
        "PDD": 0.25,
        "TC": 0.85,
        "SFI": 0.15,
        "GGI": 0.10,
    }

    class_names = [c.get("class", "Unknown") for c in classes_data]
    matrix: List[List[Optional[float]]] = []

    for c in classes_data:
        paper = c.get("paper", {})
        sfi_info = c.get("sfi", {})
        ggi_info = c.get("ggi", {})

        row: List[Optional[float]] = [
            paper.get("UGT"),
            paper.get("WL"),
            paper.get("HDF"),
            paper.get("PDD"),
            paper.get("TC"),
            sfi_info.get("excess_fragility") or (sfi_info.get("sfi_top") if sfi_info.get("sfi_top") is not None else None),
            ggi_info.get("generalization_gap") or ggi_info.get("ggi"),
        ]
        # Round non-null values
        row = [round(float(v), 3) if (v is not None and not np.isnan(v)) else None for v in row]
        matrix.append(row)

    return {
        "run_id": run_id,
        "classes": class_names,
        "metrics": metrics,
        "thresholds": metric_thresholds,
        "matrix": matrix,
        "is_single_class": len(classes_data) == 0,
        "message": (
            "Heatmap matrix calculated successfully."
            if classes_data
            else "Single-class dataset has no attack classes to populate smell matrix."
        ),
    }


@router.get("/{run_id}/heatmaps/feature-importance")
def get_feature_importance_heatmap(run_id: str) -> Dict[str, Any]:
    """Return Features x Classes relative importance matrix."""
    job = audit_job_manager.get_job(run_id)
    if not job or not job.result:
        raise HTTPException(status_code=404, detail=f"Audit '{run_id}' not found or not completed.")

    classes_data = job.result.get("classes", [])
    if not classes_data:
        return {
            "run_id": run_id,
            "classes": [],
            "features": [],
            "matrix": [],
            "message": "Single-class dataset has no attack classes for feature importance matrix.",
        }

    # Collect all top features across classes
    features_set = set()
    for c in classes_data:
        paper_top = c.get("paper", {}).get("details", {}).get("hdf_top_feature")
        if paper_top:
            features_set.add(paper_top)
        sfi_top = c.get("sfi", {}).get("top_shortcut_feature") or c.get("sfi", {}).get("top_feature")
        if sfi_top:
            features_set.add(sfi_top)
        for sus in c.get("sfi", {}).get("suspicious_features", []):
            features_set.add(sus)

    # Augment with dataset numeric features if few
    ds = dataset_registry.get(job.dataset_id)
    if ds and len(features_set) < 5:
        feature_cols = [col for col in ds["df"].columns if col not in ("__row_id", ds["label_col"])]
        for fc in feature_cols[:8]:
            features_set.add(fc)

    features = sorted(list(features_set))
    class_names = [c.get("class", "Unknown") for c in classes_data]

    matrix: List[List[float]] = []
    for f in features:
        row = []
        for c in classes_data:
            score = 0.0
            if c.get("paper", {}).get("details", {}).get("hdf_top_feature") == f:
                score += 0.8
            if c.get("sfi", {}).get("top_shortcut_feature") == f or c.get("sfi", {}).get("top_feature") == f:
                score += 0.9
            elif f in c.get("sfi", {}).get("suspicious_features", []):
                score += 0.5
            row.append(round(min(1.0, score), 3))
        matrix.append(row)

    return {
        "run_id": run_id,
        "classes": class_names,
        "features": features,
        "matrix": matrix,
    }


@router.get("/{run_id}/heatmaps/correlations")
def get_correlation_matrix_heatmap(run_id: str, max_features: int = 12) -> Dict[str, Any]:
    """Return pairwise numerical correlation matrix for dataset telemetry."""
    job = audit_job_manager.get_job(run_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Audit '{run_id}' not found.")

    ds = dataset_registry.get(job.dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found in memory.")

    df = ds["df"]
    num_cols = [
        c for c in df.columns
        if c not in ("__row_id", ds["label_col"]) and pd.api.types.is_numeric_dtype(df[c])
    ]

    # Select top features by variance
    variances = {c: float(df[c].var()) for c in num_cols if not np.isnan(df[c].var())}
    sorted_cols = sorted(variances.keys(), key=lambda c: variances[c], reverse=True)[:max_features]

    if not sorted_cols:
        return {"run_id": run_id, "features": [], "matrix": []}

    corr_df = df[sorted_cols].corr().fillna(0.0)
    matrix = [[round(float(val), 3) for val in row] for row in corr_df.to_numpy()]

    return {
        "run_id": run_id,
        "features": sorted_cols,
        "matrix": matrix,
    }
