"""Reimplementation of the five CSV heuristics from Flood et al. EuroS&P 2024."""
from typing import Any, Optional
import pandas as pd


def compute_ugt(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    dst_port_col: Optional[str],
    cfg: dict[str, Any],
) -> tuple[Optional[float], Optional[str]]:
    """Compute Unclear Ground Truth (UGT_C).

    Returns
    -------
    tuple[float | None, str | None]
        (score, na_reason)
    """
    raise NotImplementedError("Stub for Phase 2")


def compute_wl(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    seed: int = 42,
) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Compute Wrong Labels (WL_C) via ENN k=4 with tie bias towards mislabelled.

    Returns
    -------
    tuple[float | None, float | None, str | None]
        (wl_score, wl_no_tie_bias, na_reason)
    """
    raise NotImplementedError("Stub for Phase 2")


def compute_hdf(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    seed: int = 42,
) -> tuple[Optional[float], Optional[str], Optional[str]]:
    """Compute Highly Dependent Features (HDF_C) via parallel single-feature RFs.

    Returns
    -------
    tuple[float | None, str | None, str | None]
        (hdf_score, top_feature_name, na_reason)
    """
    raise NotImplementedError("Stub for Phase 2")


def compute_pdd_and_tc(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    seed: int = 42,
) -> tuple[Optional[float], Optional[float], Optional[int], Any, Optional[str]]:
    """Compute Poor Data Diversity (PDD_C) and Traffic Collapse (TC_C) via KMeans and cosine similarity.

    Returns
    -------
    tuple[float | None, float | None, int | None, Any, str | None]
        (pdd_score, tc_score, n_clusters, fitted_kmeans, na_reason)
    """
    raise NotImplementedError("Stub for Phase 2")
