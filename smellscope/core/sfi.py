"""Shortcut Fragility Index (SFI) and fragility grid analysis."""
from typing import Any, Optional
import pandas as pd


def compute_sfi(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    split: dict[str, Any],
    schema_id: str = "unknown",
) -> tuple[dict[str, Any], dict[str, str]]:
    """Compute null-calibrated Shortcut Fragility Index (SFI) and suspicion flags.

    Returns
    -------
    tuple[dict[str, Any], dict[str, str]]
        (sfi_result_dict, na_reasons) conforming to contract Section 2.6.
    """
    raise NotImplementedError("Stub for Phase 2")


def fragility_grid(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    features: list[str],
    cfg: Optional[dict[str, Any]],
    split: dict[str, Any],
) -> dict[str, Any]:
    """Compute 2D fragility response grid over two selected features.

    Parameters
    ----------
    df : pd.DataFrame
        Complete dataset.
    label_col : str
        Label column name.
    cls : str
        Target attack class name.
    benign_label : str
        Benign traffic label.
    features : list[str]
        Two feature column names (len == 2).
    cfg : dict, optional
        Configuration dictionary.
    split : SplitManifest
        Locked split manifest dictionary.

    Returns
    -------
    dict[str, Any]
        Conforming to contract Section 2.7:
        {
            "features": [str, str],
            "grid_delta": [[float]],
            "recall": [[float]],
            "recall_baseline": float
        }
    """
    raise NotImplementedError("Stub for Phase 2")
