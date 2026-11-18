"""Dataset Data Quality Score Calculator for SmellScope 2.0.

Evaluates the raw technical integrity, completeness, and cleanliness of a dataset.
Scale: 0 to 100 (Higher = cleaner, more complete, higher integrity).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from smellscope.scoring.score_config import (
    DEFAULT_QUALITY_BANDS,
    get_default_scoring_config,
    get_interpretation_category,
)
from smellscope.scoring.score_validation import clamp_score, safe_ratio, sanitize_floats


def compute_data_quality_score(
    df: pd.DataFrame,
    label_col: str,
    feature_cols: Optional[List[str]] = None,
    roles: Optional[Dict[str, Any]] = None,
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compute comprehensive Dataset Data Quality Score and itemized breakdown.

    Parameters
    ----------
    df : pd.DataFrame
        Loaded dataset dataframe.
    label_col : str
        Name of the ground truth label column.
    feature_cols : list of str, optional
        Explicit feature column names. If None, excludes label and '__' columns.
    roles : dict, optional
        Column role assignments.
    cfg : dict, optional
        Scoring configuration dictionary.

    Returns
    -------
    dict
        Scoring result containing:
        - score: float in [0.0, 100.0]
        - category: Band descriptor (label, color, key)
        - breakdown: List of itemized subscore components
        - raw_metrics: Direct empirical measurements
        - summary: Human-readable narrative
    """
    cfg = cfg or get_default_scoring_config()
    weights = cfg.get("data_quality_weights", get_default_scoring_config()["data_quality_weights"])
    bands = cfg.get("bands", {}).get("quality", DEFAULT_QUALITY_BANDS)

    # Degenerate cases
    if df is None or len(df) == 0:
        return {
            "score": 0.0,
            "category": get_interpretation_category(0.0, bands),
            "breakdown": [],
            "raw_metrics": {"n_rows": 0, "n_cols": 0},
            "summary": "Dataset is empty (0 rows). Technical quality cannot be evaluated.",
        }

    n_rows = len(df)
    non_feature = {label_col, "__row_id"}
    if feature_cols:
        target_features = [c for c in feature_cols if c in df.columns and c not in non_feature]
    else:
        target_features = [c for c in df.columns if c not in non_feature]

    n_features = len(target_features)
    if n_features == 0:
        return {
            "score": 0.0,
            "category": get_interpretation_category(0.0, bands),
            "breakdown": [],
            "raw_metrics": {"n_rows": n_rows, "n_features": 0},
            "summary": "No feature columns found in dataset.",
        }

    total_feature_cells = n_rows * n_features

    # 1. Missing Values (NaN / Null)
    feat_df = df[target_features]
    missing_cells = int(feat_df.isna().sum().sum())
    missing_ratio = safe_ratio(missing_cells, total_feature_cells)
    # 0% missing -> 100; 1% missing -> 95; >=20% missing -> 0
    missing_subscore = clamp_score(100.0 * (1.0 - min(1.0, missing_ratio * 5.0)))

    # 2. Infinite Values (Inf / -Inf)
    numeric_cols = [c for c in target_features if pd.api.types.is_numeric_dtype(df[c])]
    if numeric_cols:
        inf_cells = int(np.isinf(df[numeric_cols]).sum().sum())
        total_num_cells = n_rows * len(numeric_cols)
        inf_ratio = safe_ratio(inf_cells, total_num_cells)
    else:
        inf_cells = 0
        inf_ratio = 0.0
    # 0% inf -> 100; 1% inf -> 90; >=10% inf -> 0
    infinite_subscore = clamp_score(100.0 * (1.0 - min(1.0, inf_ratio * 10.0)))

    # 3. Duplicate Records
    dup_rows = int(feat_df.duplicated().sum())
    dup_ratio = safe_ratio(dup_rows, n_rows)
    # 0% dups -> 100; 5% dups -> 90; >=50% dups -> 0
    duplicate_subscore = clamp_score(100.0 * (1.0 - min(1.0, dup_ratio * 2.0)))

    # 4. Invalid Non-Numeric Values in Numeric Columns
    # Checks object columns that were expected to be numeric or coercion failures
    invalid_cells = 0
    for col in target_features:
        if not pd.api.types.is_numeric_dtype(df[col]):
            # Attempt soft coercion to detect string numbers with corrupt entries
            coerced = pd.to_numeric(df[col], errors="coerce")
            nan_after = coerced.isna().sum()
            nan_before = df[col].isna().sum()
            invalid_cells += int(max(0, nan_after - nan_before))
    invalid_ratio = safe_ratio(invalid_cells, total_feature_cells)
    invalid_subscore = clamp_score(100.0 * (1.0 - min(1.0, invalid_ratio * 10.0)))

    # 5. Constant and Zero-Variance Columns
    constant_cols: List[str] = []
    for col in target_features:
        if feat_df[col].nunique(dropna=False) <= 1:
            constant_cols.append(col)
    const_ratio = safe_ratio(len(constant_cols), n_features)
    # Each constant feature reduces subscore proportionally
    constant_subscore = clamp_score(100.0 * (1.0 - const_ratio))

    # 6. Label Completeness & Integrity
    if label_col in df.columns:
        label_nulls = int(df[label_col].isna().sum())
        label_null_ratio = safe_ratio(label_nulls, n_rows)
        label_subscore = clamp_score(100.0 * (1.0 - label_null_ratio))
    else:
        label_nulls = n_rows
        label_subscore = 0.0

    # Weighted Synthesis
    raw_subscores = {
        "missing_values": missing_subscore,
        "infinite_values": infinite_subscore,
        "duplicate_records": duplicate_subscore,
        "invalid_numeric": invalid_subscore,
        "constant_columns": constant_subscore,
        "label_completeness": label_subscore,
    }

    weighted_total = sum(raw_subscores[k] * weights.get(k, 0.0) for k in raw_subscores)
    final_score = clamp_score(weighted_total)

    # Itemized Breakdown Table
    breakdown = [
        {
            "metric": "Missing Values (Completeness)",
            "measured_value": f"{missing_cells:,} cells ({missing_ratio:.2%})",
            "subscore": round(missing_subscore, 1),
            "weight": round(weights.get("missing_values", 0.0), 2),
            "contribution": round(missing_subscore * weights.get("missing_values", 0.0), 2),
            "explanation": "Evaluates absence of NaN/null cells across feature columns.",
            "affected_count": missing_cells,
        },
        {
            "metric": "Infinite Values (Numeric Sanity)",
            "measured_value": f"{inf_cells:,} cells ({inf_ratio:.2%})",
            "subscore": round(infinite_subscore, 1),
            "weight": round(weights.get("infinite_values", 0.0), 2),
            "contribution": round(infinite_subscore * weights.get("infinite_values", 0.0), 2),
            "explanation": "Evaluates presence of Inf/-Inf numbers that cause estimator overflow.",
            "affected_count": inf_cells,
        },
        {
            "metric": "Duplicate Records (Vector Uniqueness)",
            "measured_value": f"{dup_rows:,} rows ({dup_ratio:.2%})",
            "subscore": round(duplicate_subscore, 1),
            "weight": round(weights.get("duplicate_records", 0.0), 2),
            "contribution": round(duplicate_subscore * weights.get("duplicate_records", 0.0), 2),
            "explanation": "Measures identical feature vectors across telemetry rows.",
            "affected_count": dup_rows,
        },
        {
            "metric": "Invalid Numeric Parsing",
            "measured_value": f"{invalid_cells:,} corrupt cells ({invalid_ratio:.2%})",
            "subscore": round(invalid_subscore, 1),
            "weight": round(weights.get("invalid_numeric", 0.0), 2),
            "contribution": round(invalid_subscore * weights.get("invalid_numeric", 0.0), 2),
            "explanation": "Identifies unparseable strings or corrupt characters in numeric roles.",
            "affected_count": invalid_cells,
        },
        {
            "metric": "Constant Columns (Entropy)",
            "measured_value": f"{len(constant_cols)} zero-variance column(s) ({const_ratio:.2%})",
            "subscore": round(constant_subscore, 1),
            "weight": round(weights.get("constant_columns", 0.0), 2),
            "contribution": round(constant_subscore * weights.get("constant_columns", 0.0), 2),
            "explanation": "Flags features containing only 1 unique value across all records.",
            "affected_count": len(constant_cols),
        },
        {
            "metric": "Label Completeness",
            "measured_value": f"{label_nulls:,} missing label(s)",
            "subscore": round(label_subscore, 1),
            "weight": round(weights.get("label_completeness", 0.0), 2),
            "contribution": round(label_subscore * weights.get("label_completeness", 0.0), 2),
            "explanation": "Validates that ground-truth attack/benign labels exist for all rows.",
            "affected_count": label_nulls,
        },
    ]

    category = get_interpretation_category(final_score, bands)

    summary_parts = []
    if missing_cells == 0 and inf_cells == 0 and dup_rows == 0:
        summary_parts.append("Clean technical structure with zero missing, infinite, or duplicate entries.")
    else:
        if missing_cells > 0:
            summary_parts.append(f"{missing_cells:,} missing cells detected.")
        if inf_cells > 0:
            summary_parts.append(f"{inf_cells:,} infinite cells detected.")
        if dup_rows > 0:
            summary_parts.append(f"{dup_rows:,} duplicate rows identified.")
        if constant_cols:
            summary_parts.append(f"{len(constant_cols)} zero-variance column(s) present.")

    raw_metrics = {
        "n_rows": n_rows,
        "n_features": n_features,
        "missing_cells": missing_cells,
        "missing_ratio": missing_ratio,
        "infinite_cells": inf_cells,
        "infinite_ratio": inf_ratio,
        "duplicate_rows": dup_rows,
        "duplicate_ratio": dup_ratio,
        "invalid_cells": invalid_cells,
        "constant_columns_count": len(constant_cols),
        "constant_columns": constant_cols,
        "label_missing_count": label_nulls,
    }

    return sanitize_floats({
        "score": round(final_score, 2),
        "category": category,
        "breakdown": breakdown,
        "raw_metrics": raw_metrics,
        "summary": " ".join(summary_parts) if summary_parts else "Technical quality meets high integrity standards.",
    })
