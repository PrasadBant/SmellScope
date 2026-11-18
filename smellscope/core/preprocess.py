"""Preprocessing pipeline: train-only fitting, imputation, encoding, and scaling."""
from typing import Any, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import OrdinalEncoder

from smellscope.core.errors import SmellScopeError


class Preprocessor:
    """Fitted preprocessor interface with train-only statistics."""

    def __init__(
        self,
        feature_cols: list[str],
        numeric_cols: list[str],
        categorical_cols: list[str],
        medians: dict[str, float],
        min_vals: dict[str, float],
        max_vals: dict[str, float],
        encoder: Optional[OrdinalEncoder] = None,
    ):
        self.feature_cols = feature_cols
        self.numeric_cols = numeric_cols
        self.categorical_cols = categorical_cols
        self.medians = medians
        self.min_vals = min_vals
        self.max_vals = max_vals
        self.encoder = encoder

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform features using train-fitted statistics without data leakage."""
        out = pd.DataFrame(index=df.index)

        # Handle numeric columns
        for col in self.numeric_cols:
            if col not in df.columns:
                # Fill missing column with train median
                s = pd.Series(self.medians[col], index=df.index, dtype=float)
            else:
                s = pd.to_numeric(df[col], errors="coerce").astype(float)
                # Replace inf/-inf with NaN to impute with median
                s = s.replace([np.inf, -np.inf], np.nan)
                s = s.fillna(self.medians[col])

            # Min-Max scale with constant-feature protection
            c_min = self.min_vals[col]
            c_max = self.max_vals[col]
            rng = c_max - c_min
            if rng == 0.0 or np.isnan(rng):
                out[col] = 0.0
            else:
                out[col] = (s - c_min) / rng

        # Handle categorical columns
        if self.categorical_cols and self.encoder is not None:
            cat_df = df[self.categorical_cols].copy()
            for col in self.categorical_cols:
                cat_df[col] = cat_df[col].astype(str).fillna("missing")
            try:
                encoded = self.encoder.transform(cat_df)
                for idx, col in enumerate(self.categorical_cols):
                    c_min = self.min_vals[col]
                    c_max = self.max_vals[col]
                    rng = c_max - c_min
                    col_vals = encoded[:, idx]
                    if rng == 0.0 or np.isnan(rng):
                        out[col] = 0.0
                    else:
                        out[col] = (col_vals - c_min) / rng
            except Exception:
                # Fallback to zeros for unknown transform error
                for col in self.categorical_cols:
                    out[col] = 0.0

        # Preserve __row_id if present
        if "__row_id" in df.columns:
            out["__row_id"] = df["__row_id"].values

        # Ensure correct column ordering and float type
        cols_to_return = [c for c in self.feature_cols if c in out.columns]
        if "__row_id" in df.columns:
            cols_to_return = ["__row_id"] + cols_to_return
        return out[cols_to_return]


def fit_preprocessor(
    train_df: pd.DataFrame,
    feature_cols: list[str],
    schema_id: str = "unknown",
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
    clean_feature_cols = [c for c in feature_cols if not c.startswith("__")]

    numeric_cols: list[str] = []
    categorical_cols: list[str] = []

    for col in clean_feature_cols:
        if col not in train_df.columns:
            continue
        if pd.api.types.is_numeric_dtype(train_df[col]):
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)

    medians: dict[str, float] = {}
    min_vals: dict[str, float] = {}
    max_vals: dict[str, float] = {}

    for col in numeric_cols:
        s = pd.to_numeric(train_df[col], errors="coerce").astype(float)
        s = s.replace([np.inf, -np.inf], np.nan)
        med = float(s.median()) if not np.isnan(s.median()) else 0.0
        medians[col] = med
        c_min = float(s.min()) if not np.isnan(s.min()) else 0.0
        c_max = float(s.max()) if not np.isnan(s.max()) else 0.0
        min_vals[col] = c_min
        max_vals[col] = c_max

    encoder: Optional[OrdinalEncoder] = None
    if categorical_cols:
        encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        cat_df = train_df[categorical_cols].copy()
        for col in categorical_cols:
            cat_df[col] = cat_df[col].astype(str).fillna("missing")
        encoded = encoder.fit_transform(cat_df)
        for idx, col in enumerate(categorical_cols):
            col_vals = encoded[:, idx]
            medians[col] = 0.0
            min_vals[col] = float(np.min(col_vals)) if len(col_vals) > 0 else 0.0
            max_vals[col] = float(np.max(col_vals)) if len(col_vals) > 0 else 1.0

    return Preprocessor(
        feature_cols=clean_feature_cols,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        medians=medians,
        min_vals=min_vals,
        max_vals=max_vals,
        encoder=encoder,
    )
