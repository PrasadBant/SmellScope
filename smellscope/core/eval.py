"""Baseline model fitting and evaluation conforming to contract Section 2.7."""
from typing import Any, Optional
import pandas as pd


def fit_and_evaluate(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    label_col: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: Optional[dict[str, Any]] = None,
    seed: int = 42,
    target_class: Optional[str] = None,
) -> dict[str, Any]:
    """Train baseline RandomForest on train_df and evaluate on test_df.

    Parameters
    ----------
    train_df : pd.DataFrame
        Training data partition. Preprocessing fitted strictly on this partition.
    test_df : pd.DataFrame
        Locked test data partition.
    label_col : str
        Name of label column.
    benign_label : str
        Label indicating benign / background traffic.
    feature_cols : list[str]
        List of feature column names.
    cfg : dict, optional
        Configuration dictionary containing baseline RF settings.
    seed : int
        Random seed for reproducibility.
    target_class : str, optional
        If specified, performs binary classification (target_class vs benign_label).
        If None, performs multiclass classification across all labels.

    Returns
    -------
    dict[str, Any]
        EvalResult dictionary conforming to contract Section 2.7:
        {
            "acc": float,
            "f1": float,
            "tpr": float,
            "tnr": float,
            "per_class": {cls: {"recall": float, "precision": float, "f1": float, "n": int}},
            "n_train": int,
            "n_test": int,
            "seed": int,
            "model": {"type": "RandomForest", "n_estimators": int}
        }
    """
    raise NotImplementedError("Stub for Phase 2")
