"""Preprocessing pipeline: train-only fitting, imputation, encoding, and scaling."""
from typing import Any, Optional
import pandas as pd


class Preprocessor:
    """Fitted preprocessor interface."""

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform features using train-fitted statistics."""
        raise NotImplementedError("Stub for Phase 2")


def fit_preprocessor(
    train_df: pd.DataFrame,
    feature_cols: list[str],
    schema_id: str,
    cfg: Optional[dict[str, Any]] = None,
) -> Preprocessor:
    """Fit imputer, encoder, and min-max scaler on training dataframe only.

    Parameters
    ----------
    train_df : pd.DataFrame
        Training data partition.
    feature_cols : list[str]
        List of feature column names (excluding label and '__'-prefixed columns).
    schema_id : str
        Dataset schema identifier ('cic-ids-2017', 'unsw-nb15', etc.).
    cfg : dict, optional
        Preprocessing configuration dictionary.

    Returns
    -------
    Preprocessor
        Fitted preprocessor with .transform(df) method.
    """
    raise NotImplementedError("Stub for Phase 2")
