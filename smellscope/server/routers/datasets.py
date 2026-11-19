"""Dataset ingestion and inspection router for SmellScope."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import numpy as np
import pandas as pd

from smellscope.core.errors import E_FILE, E_LABEL_COLUMN, E_SCHEMA, SmellScopeError
from smellscope.pipeline.loader import load_dataset
from smellscope.server.dependencies import dataset_registry
from smellscope.server.schemas.models import (
    DatasetMetadataResponse,
    DatasetPreviewResponse,
    DatasetUploadResponse,
    DatasetValidateRequest,
    DatasetValidateResponse,
)

router = APIRouter(prefix="/datasets", tags=["Dataset Ingestion"])


def _sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent path traversal and shell injection."""
    clean = os.path.basename(name)
    clean = re.sub(r"[^\w\.-]", "_", clean)
    return clean or "uploaded_dataset.csv"


@router.get("", response_model=List[Dict[str, Any]])
def list_datasets() -> List[Dict[str, Any]]:
    """List all available loaded and registered datasets."""
    return dataset_registry.list_all()


@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    label_col: Optional[str] = Form(None),
    benign_label: Optional[str] = Form(None),
) -> DatasetUploadResponse:
    """Handle secure local dataset upload (.csv or .parquet)."""
    raw_filename = file.filename or "dataset.csv"
    safe_filename = _sanitize_filename(raw_filename)
    suffix = Path(safe_filename).suffix.lower()

    if suffix not in (".csv", ".parquet"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{suffix}'. Only .csv and .parquet are supported.",
        )

    upload_dir = Path(os.environ.get("SMELLSCOPE_DATA_DIR", "./data")) / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    dataset_id = f"ds_{uuid.uuid4().hex[:10]}"
    dest_path = upload_dir / f"{dataset_id}_{safe_filename}"

    hasher = hashlib.sha256()
    size_bytes = 0

    with open(dest_path, "wb") as f_out:
        while chunk := await file.read(65536):
            size_bytes += len(chunk)
            hasher.update(chunk)
            f_out.write(chunk)

    file_sha = hasher.hexdigest()

    # If label_col and benign_label are provided, attempt immediate load
    loaded_successfully = False
    if label_col and benign_label:
        try:
            loaded = load_dataset(
                path_or_sample_id=str(dest_path),
                label_col=label_col,
                benign_label=benign_label,
            )
            dataset_registry.register(dataset_id, loaded, name=safe_filename)
            loaded_successfully = True
        except Exception:
            pass  # User can still validate later

    if not loaded_successfully:
        # Extract columns and row count estimate from the uploaded file for preview
        try:
            if suffix == ".parquet":
                sample_df = pd.read_parquet(dest_path)
                columns = [str(c) for c in sample_df.columns]
                n_rows = len(sample_df)
            else:
                sample_df = pd.read_csv(dest_path, nrows=50)
                columns = [str(c) for c in sample_df.columns]
                with open(dest_path, "r", encoding="utf-8", errors="ignore") as f:
                    n_rows = max(0, sum(1 for _ in f) - 1)
        except Exception:
            columns = []
            n_rows = 0

        dataset_registry.register_raw(
            dataset_id=dataset_id,
            path=str(dest_path),
            name=safe_filename,
            sha256=file_sha,
            size_bytes=size_bytes,
            columns=columns,
            n_rows=n_rows,
        )

    return DatasetUploadResponse(
        dataset_id=dataset_id,
        source_basename=safe_filename,
        sha256=file_sha,
        size_bytes=size_bytes,
        message="Dataset uploaded successfully. Ready for inspection and validation.",
    )


@router.get("/{dataset_id}", response_model=DatasetMetadataResponse)
def get_dataset_metadata(dataset_id: str) -> DatasetMetadataResponse:
    """Retrieve metadata, schema, and class distribution for a registered dataset."""
    ds = dataset_registry.get(dataset_id)
    if ds:
        meta = ds["meta"]
        df = ds["df"]
        feature_cols = [c for c in df.columns if c not in ("__row_id", ds["label_col"])]

        return DatasetMetadataResponse(
            dataset_id=dataset_id,
            source_basename=meta.get("source_basename", dataset_id),
            sha256=meta.get("sha256", "unknown"),
            n_rows_raw=meta.get("n_rows_raw", len(df)),
            n_rows_loaded=len(df),
            dropped_inf_nan=meta.get("dropped_inf_nan", 0),
            label_col=ds["label_col"],
            benign_label=ds["benign_label"],
            schema_id=ds.get("schema_id", "unknown"),
            column_roles=ds.get("column_roles", {}),
            class_counts=meta.get("class_counts", {}),
            columns=feature_cols,
            status="validated",
        )

    raw = dataset_registry.get_raw(dataset_id)
    if raw:
        return DatasetMetadataResponse(
            dataset_id=dataset_id,
            source_basename=raw.get("name", dataset_id),
            sha256=raw.get("sha256", "unknown"),
            n_rows_raw=raw.get("n_rows_raw", 0),
            n_rows_loaded=raw.get("n_rows_loaded", 0),
            dropped_inf_nan=0,
            label_col="",
            benign_label="",
            schema_id="pending",
            column_roles={},
            class_counts={},
            columns=raw.get("columns", []),
            status="pending_validation",
        )

    raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")


@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def get_dataset_preview(dataset_id: str, limit: int = 50) -> DatasetPreviewResponse:
    """Return a bounded data preview and data-quality inspection summary."""
    ds = dataset_registry.get(dataset_id)
    if ds:
        df = ds["df"]
        label_col = ds["label_col"]
        preview_df = df.head(min(limit, 100))
        columns = [str(c) for c in df.columns]
        class_counts = {str(k): int(v) for k, v in df[label_col].value_counts().items()}
        missing_counts = {str(c): int(df[c].isna().sum()) for c in df.columns if df[c].isna().sum() > 0}
        inf_counts = {}
        for c in df.columns:
            if pd.api.types.is_numeric_dtype(df[c]):
                cnt = int(np.isinf(df[c]).sum())
                if cnt > 0:
                    inf_counts[str(c)] = cnt
        total_rows = len(df)
    else:
        raw = dataset_registry.get_raw(dataset_id)
        if not raw:
            raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
        file_path = Path(raw["path"])
        if file_path.suffix.lower() == ".parquet":
            preview_df = pd.read_parquet(file_path).head(min(limit, 100))
        else:
            preview_df = pd.read_csv(file_path, nrows=min(limit, 100))
        columns = [str(c) for c in preview_df.columns]
        class_counts = {}
        missing_counts = {str(c): int(preview_df[c].isna().sum()) for c in preview_df.columns if preview_df[c].isna().sum() > 0}
        inf_counts = {}
        for c in preview_df.columns:
            if pd.api.types.is_numeric_dtype(preview_df[c]):
                cnt = int(np.isinf(preview_df[c]).sum())
                if cnt > 0:
                    inf_counts[str(c)] = cnt
        total_rows = raw.get("n_rows_raw", len(preview_df))

    # Convert preview to records with null sanitization
    records = []
    for _, row in preview_df.iterrows():
        rec = {}
        for col in columns:
            val = row[col]
            if pd.isna(val) or val is np.inf or val is -np.inf:
                rec[col] = None
            elif isinstance(val, (np.integer, int)):
                rec[col] = int(val)
            elif isinstance(val, (np.floating, float)):
                rec[col] = round(float(val), 4)
            else:
                rec[col] = str(val)
        records.append(rec)

    return DatasetPreviewResponse(
        dataset_id=dataset_id,
        total_rows=total_rows,
        total_columns=len(columns),
        columns=columns,
        preview_rows=records,
        class_counts=class_counts,
        missing_value_counts=missing_counts,
        infinite_value_counts=inf_counts,
    )


@router.post("/{dataset_id}/validate", response_model=DatasetValidateResponse)
def validate_dataset(dataset_id: str, req: DatasetValidateRequest) -> DatasetValidateResponse:
    """Run real schema and dataset validation with configured label and benign targets."""
    # Find dataset file if not yet loaded
    raw = dataset_registry.get_raw(dataset_id)
    target_path = None
    if raw and Path(raw["path"]).exists():
        target_path = Path(raw["path"])

    if not target_path:
        upload_dir = Path(os.environ.get("SMELLSCOPE_DATA_DIR", "./data")) / "uploads"
        for f in upload_dir.glob(f"{dataset_id}_*"):
            target_path = f
            break

    if not target_path:
        # Check samples
        sample_dir = Path(os.environ.get("SMELLSCOPE_DATA_DIR", "./data")) / "samples"
        for f in sample_dir.glob(f"{dataset_id}*"):
            target_path = f
            break

    if not target_path:
        # Check registry
        if dataset_registry.get(dataset_id):
            ds = dataset_registry.get(dataset_id)
            target_path = Path(ds["meta"]["source_basename"])

    if not target_path or not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file for '{dataset_id}' not found.")

    try:
        loaded = load_dataset(
            path_or_sample_id=str(target_path),
            label_col=req.label_col,
            benign_label=req.benign_label,
            cfg={"sampling": {"max_rows_per_class": req.max_rows_per_class, "seed": req.seed}},
        )
        dataset_registry.register(dataset_id, loaded, name=raw.get("name") if raw else None)

        df = loaded["df"]
        classes = sorted([str(c) for c in df[loaded["label_col"]].unique()])
        class_counts = {str(k): int(v) for k, v in df[loaded["label_col"]].value_counts().items()}

        warnings = []
        for c, cnt in class_counts.items():
            if cnt < 10:
                warnings.append(f"Class '{c}' has only {cnt} examples. Statistical heuristics may have low power.")

        return DatasetValidateResponse(
            valid=True,
            schema_id=loaded.get("schema_id", "unknown"),
            unique_classes=classes,
            class_counts=class_counts,
            column_roles=loaded.get("column_roles", {}),
            warnings=warnings,
        )
    except SmellScopeError as sse:
        return DatasetValidateResponse(
            valid=False,
            schema_id="invalid",
            unique_classes=[],
            class_counts={},
            column_roles={},
            warnings=[f"{sse.code}: {sse.message}"],
        )
    except Exception as exc:
        return DatasetValidateResponse(
            valid=False,
            schema_id="invalid",
            unique_classes=[],
            class_counts={},
            column_roles={},
            warnings=[f"E_VALIDATION_ERROR: {str(exc)}"],
        )
