"""FastAPI router for Model Registry, Model Persistence, Schema Verification and Training Bundle Export (Phase 13)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import FileResponse

from smellscope.core.errors import SmellScopeError
from smellscope.models.registry import model_registry
from smellscope.remediation.manager import get_active_trained_model
from smellscope.server.dependencies import (
    dataset_registry,
    remediation_session_manager,
)
from smellscope.server.schemas.models import (
    ModelCompatibilityRequest,
    ModelCompatibilityResponse,
    ModelMetadataResponse,
    ModelPredictRequest,
    ModelPredictResponse,
    ModelSaveRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/models", tags=["models"])


@router.get("", response_model=List[Dict[str, Any]])
def list_saved_models():
    """List all persisted ML models in the model registry."""
    return model_registry.list_models()


@router.post("/save", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def save_model(req: ModelSaveRequest):
    """Persist the model trained on the improved dataset view into the versioned model registry."""
    # Check if we have active trained model in memory
    trained_artifacts = get_active_trained_model(req.run_id)

    if not trained_artifacts:
        # If rebenchmark hasn't been called yet, trigger rebenchmark on active view
        try:
            views = remediation_session_manager.get_views(req.run_id)
            active_view = views[-1] if views else None
            remediation_session_manager.rebenchmark(req.run_id)
            trained_artifacts = get_active_trained_model(req.run_id, active_view["view_id"] if active_view else None)
        except Exception as e:
            logger.warning("Could not auto-rebenchmark for model save: %s", e)

    if not trained_artifacts or trained_artifacts.get("model") is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "E_NO_TRAINED_MODEL",
                "message": f"No trained model artifact available for run '{req.run_id}'. Please execute re-benchmark first.",
            },
        )

    # Extract supporting data for complete reproducibility bundle
    run_id = req.run_id
    changelogs = remediation_session_manager.get_change_log(run_id)
    comparison = None
    try:
        ds, split = remediation_session_manager._ensure_initialized(run_id)
        views = remediation_session_manager.get_views(run_id)
        orig_view = views[0]
        rem_view = views[-1]
        from smellscope.remediation.manager import get_dataset_comparison
        comparison = get_dataset_comparison(ds, split, orig_view, rem_view)
    except Exception:
        pass

    try:
        metadata = model_registry.save_trained_model(
            model=trained_artifacts["model"],
            preprocessor=trained_artifacts["preprocessor"],
            feature_cols=trained_artifacts["feature_cols"],
            label_col=trained_artifacts["label_col"],
            benign_label=trained_artifacts["benign_label"],
            metrics=trained_artifacts["metrics"],
            dataset_id=trained_artifacts["dataset_id"],
            dataset_fingerprint=trained_artifacts["dataset_fingerprint"],
            run_id=req.run_id,
            view_id=trained_artifacts["view_id"],
            train_df=trained_artifacts.get("train_df"),
            test_df=trained_artifacts.get("test_df"),
            split_manifest=trained_artifacts.get("split_manifest"),
            transformation_history=changelogs,
            before_after_comparison=comparison,
            model_name=req.model_name,
            notes=req.notes,
        )
        return metadata
    except Exception as e:
        logger.exception("Failed to save model: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "E_SAVE_FAILED", "message": f"Failed to persist model: {e}"},
        )


@router.get("/{model_id}", response_model=Dict[str, Any])
def get_model_details(model_id: str):
    """Retrieve full manifest metadata card for a specific model."""
    try:
        return model_registry.get_model_metadata(model_id)
    except SmellScopeError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": e.code, "message": e.message})


@router.get("/{model_id}/download")
def download_model_artifact(model_id: str):
    """Download the joblib binary artifact for the specified model."""
    try:
        meta = model_registry.get_model_metadata(model_id)
        model_file = model_registry.base_dir / model_id / "model.joblib"
        if not model_file.exists():
            raise HTTPException(status_code=404, detail="Model artifact file missing.")
        return FileResponse(
            path=str(model_file),
            filename=f"{model_id}.joblib",
            media_type="application/octet-stream",
        )
    except SmellScopeError as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.get("/{model_id}/bundle")
def download_reusable_bundle(model_id: str):
    """Download complete self-contained reproducibility ZIP bundle (Phase 13.3).

    Contains:
    - Serialized model and preprocessor artifacts
    - Improved training CSV and sealed locked test CSV
    - Split and transformation manifests
    - Configuration and environment reproducibility metadata
    """
    try:
        zip_bytes = model_registry.generate_training_bundle_zip(model_id)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={model_id}_bundle.zip"},
        )
    except SmellScopeError as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assemble training bundle: {e}")


@router.post("/{model_id}/verify-compatibility", response_model=ModelCompatibilityResponse)
def verify_compatibility(model_id: str, req: ModelCompatibilityRequest):
    """Verify whether a target dataset schema matches this model's required input features."""
    dataset_id = req.dataset_id or "cic2017_sample_planted"
    ds = dataset_registry.get(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    try:
        comp = model_registry.verify_compatibility(
            model_id=model_id,
            df=ds["df"],
            label_col=req.label_col or ds["label_col"],
        )
        return ModelCompatibilityResponse(**comp)
    except SmellScopeError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.post("/{model_id}/predict", response_model=ModelPredictResponse)
def run_prediction(model_id: str, req: ModelPredictRequest):
    """Run model predictions on a target dataset sample."""
    dataset_id = req.dataset_id or "cic2017_sample_planted"
    ds = dataset_registry.get(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    try:
        res = model_registry.predict_with_model(
            model_id=model_id,
            df=ds["df"],
            limit=req.limit or 50,
        )
        return ModelPredictResponse(**res)
    except SmellScopeError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.delete("/{model_id}")
def delete_model(model_id: str):
    """Delete a model from the registry."""
    success = model_registry.delete_model(model_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found.")
    return {"status": "deleted", "model_id": model_id}
