"""Dataset loader and validator conforming to Shared Contract v1.0 Section 2.4."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd

from smellscope.core.errors import (
    E_BENIGN_LABEL_MISSING,
    E_FILE,
    E_LABEL_COLUMN,
    E_SCHEMA,
    SmellScopeError,
)


def _infer_schema_id(columns: list[str]) -> str:
    """Infer dataset schema identifier based on recognized column patterns."""
    col_set = {c.strip().lower() for c in columns}
    if "destination port" in col_set and "flow duration" in col_set:
        return "cic-ids-2017"
    if "dsport" in col_set and "dur" in col_set:
        return "unsw-nb15"
    if any("planted" in c for c in col_set):
        return "synthetic-planted"
    return "unknown"


def _infer_column_roles(columns: list[str], schema_id: str) -> Dict[str, Optional[str]]:
    """Infer specialized column roles (dst_port, timestamp, group) for heuristics."""
    roles: Dict[str, Optional[str]] = {"dst_port": None, "timestamp": None, "group": None}
    for col in columns:
        clow = col.strip().lower()
        if roles["dst_port"] is None:
            if schema_id == "cic-ids-2017" and clow == "destination port":
                roles["dst_port"] = col
            elif schema_id == "unsw-nb15" and clow == "dsport":
                roles["dst_port"] = col
            elif clow in ("destination port", "dst_port", "dstport", "port_dst"):
                roles["dst_port"] = col

        if roles["timestamp"] is None:
            if "timestamp" in clow or clow in ("time", "sttl"):
                roles["timestamp"] = col

        if roles["group"] is None:
            if clow in ("group", "provenance", "source", "batch", "day"):
                roles["group"] = col

    return roles


def load_dataset(
    path_or_sample_id: str,
    label_col: str,
    benign_label: str,
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Load, clean, standardize and validate an intrusion detection dataset.

    Conforms to Shared Contract v1.0 Section 2.4.

    Args:
        path_or_sample_id: Path to CSV or Parquet file, or sample ID.
        label_col: Name of the ground truth label column.
        benign_label: String value representing the benign/normal class.
        cfg: Optional configuration dictionary containing subsampling settings.

    Returns:
        LoadedDataset dictionary.

    Raises:
        SmellScopeError: E_FILE, E_LABEL_COLUMN, E_BENIGN_LABEL_MISSING, E_SCHEMA.
    """
    cfg = cfg or {}
    sample_dir = os.environ.get("SMELLSCOPE_DATA_DIR", "./data")

    # Resolve file path
    target_path = Path(path_or_sample_id)
    if not target_path.exists():
        # Check samples directory
        sample_path = Path(sample_dir) / "samples" / path_or_sample_id
        if sample_path.exists():
            target_path = sample_path
        elif not path_or_sample_id.endswith((".csv", ".parquet")):
            for ext in (".parquet", ".csv"):
                cand = Path(sample_dir) / "samples" / f"{path_or_sample_id}{ext}"
                if cand.exists():
                    target_path = cand
                    break

    if not target_path.exists():
        raise SmellScopeError(
            code=E_FILE,
            message=f"Dataset file not found: {path_or_sample_id}",
            details={"path": str(target_path)},
        )

    # Validate file extension
    suffix = target_path.suffix.lower()
    if suffix not in (".csv", ".parquet"):
        raise SmellScopeError(
            code=E_FILE,
            message=f"Unsupported file format '{suffix}'. Only .csv and .parquet are supported.",
            details={"path": str(target_path), "format": suffix},
        )

    # Compute raw sha256
    hasher = hashlib.sha256()
    with open(target_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    file_sha256 = hasher.hexdigest()

    # Read raw dataframe
    try:
        if suffix == ".parquet":
            raw_df = pd.read_parquet(target_path)
        else:
            raw_df = pd.read_csv(target_path, low_memory=False)
    except Exception as exc:
        raise SmellScopeError(
            code=E_FILE,
            message=f"Failed to parse file: {exc}",
            details={"path": str(target_path), "error": str(exc)},
        ) from exc

    n_rows_raw = len(raw_df)

    # Strip column names
    raw_df.columns = [str(c).strip() for c in raw_df.columns]
    label_col = label_col.strip()
    benign_label = str(benign_label).strip()

    # Verify label column exists
    if label_col not in raw_df.columns:
        raise SmellScopeError(
            code=E_LABEL_COLUMN,
            message=f"Label column '{label_col}' not found in dataset columns: {list(raw_df.columns)[:10]}...",
            details={"label_col": label_col, "available_columns": list(raw_df.columns)},
        )

    # Convert label column to string and strip whitespace
    raw_df[label_col] = raw_df[label_col].astype(str).str.strip()

    # Verify benign label exists
    unique_labels = set(raw_df[label_col].unique())
    if benign_label not in unique_labels:
        raise SmellScopeError(
            code=E_BENIGN_LABEL_MISSING,
            message=f"Benign label '{benign_label}' not found among unique labels: {unique_labels}",
            details={"benign_label": benign_label, "unique_labels": list(unique_labels)},
        )

    # Verify >= 2 classes
    if len(unique_labels) < 2:
        raise SmellScopeError(
            code=E_SCHEMA,
            message=f"Dataset must contain at least 2 distinct classes, found {len(unique_labels)}: {unique_labels}",
            details={"unique_classes": list(unique_labels)},
        )

    # Assign stable __row_id before any drops or filtering
    raw_df["__row_id"] = np.arange(len(raw_df), dtype=int)

    # Infer schema and roles
    schema_id = _infer_schema_id(list(raw_df.columns))
    roles = _infer_column_roles(list(raw_df.columns), schema_id)

    # Coerce features to numeric (except label_col, __row_id, group_col)
    reserved_or_non_features = {label_col, "__row_id"}
    if roles.get("group") and roles["group"] in raw_df.columns:
        reserved_or_non_features.add(roles["group"])

    feature_cols = [c for c in raw_df.columns if c not in reserved_or_non_features]

    for col in feature_cols:
        raw_df[col] = pd.to_numeric(raw_df[col], errors="coerce")

    # Drop rows that have inf or nan in feature columns (or replace with nan then drop if all nan)
    # Check dropped inf/nan count
    feature_mat = raw_df[feature_cols].replace([np.inf, -np.inf], np.nan)
    raw_df[feature_cols] = feature_mat

    # Drop rows where all features or label is nan
    valid_rows_mask = ~raw_df[label_col].isna()
    dropped_inf_nan = int((~valid_rows_mask).sum())
    df_clean = raw_df[valid_rows_mask].copy()

    # Optional subsampling per class
    sampling_cfg = cfg.get("sampling", {})
    max_per_class = sampling_cfg.get("max_rows_per_class", 20000)
    seed = cfg.get("seed", 42)

    if max_per_class and max_per_class > 0:
        sampled_dfs = []
        for cls_name, grp in df_clean.groupby(label_col):
            if len(grp) > max_per_class:
                sampled_dfs.append(grp.sample(n=max_per_class, random_state=seed))
            else:
                sampled_dfs.append(grp)
        df_loaded = pd.concat(sampled_dfs, ignore_index=True)
    else:
        df_loaded = df_clean.reset_index(drop=True)

    class_counts = {str(k): int(v) for k, v in df_loaded[label_col].value_counts().items()}

    loaded_dataset: Dict[str, Any] = {
        "df": df_loaded,
        "label_col": label_col,
        "benign_label": benign_label,
        "schema_id": schema_id,
        "column_roles": roles,
        "meta": {
            "source_basename": target_path.name,
            "sha256": file_sha256,
            "n_rows_raw": n_rows_raw,
            "n_rows_loaded": len(df_loaded),
            "dropped_inf_nan": dropped_inf_nan,
            "class_counts": class_counts,
            "subsample": {"max_rows_per_class": max_per_class, "seed": seed},
        },
    }

    return loaded_dataset
