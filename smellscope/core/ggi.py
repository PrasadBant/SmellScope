"""Generalisation Gap Index (GGI) and Local Overfitting Ratio (LOR)."""
from typing import Any, Optional
import pandas as pd


def compute_ggi(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    split: dict[str, Any],
    cluster_labels: Optional[pd.Series] = None,
    group_col: Optional[str] = None,
) -> tuple[dict[str, Any], dict[str, str]]:
    """Compute Generalisation Gap Index (GGI) comparing random-split F1 to group-held-out F1.

    Returns
    -------
    tuple[dict[str, Any], dict[str, str]]
        (ggi_result_dict, na_reasons) conforming to contract Section 2.6.
    """
    raise NotImplementedError("Stub for Phase 2")
