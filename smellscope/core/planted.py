"""Planted shortcut dataset generator for ground-truth validation."""
from typing import Any, Optional
import pandas as pd


def make_planted_dataset(
    base_df: pd.DataFrame,
    label_col: str,
    benign_label: str,
    cls: str,
    shortcut_spec: dict[str, Any],
    seed: int = 42,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Inject a controllable synthetic shortcut feature correlated with the target label.

    Parameters
    ----------
    base_df : pd.DataFrame
        Base dataset to inject shortcut feature into.
    label_col : str
        Name of label column.
    benign_label : str
        Label indicating benign traffic.
    cls : str
        Target attack class name.
    shortcut_spec : dict
        Specification dictionary containing feature_name, strength, category, etc.
    seed : int
        Random seed for reproducibility.

    Returns
    -------
    tuple[pd.DataFrame, dict[str, Any]]
        (df_with_shortcut, truth_dict)
    """
    raise NotImplementedError("Stub for Phase 2")
