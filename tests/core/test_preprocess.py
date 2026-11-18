"""Unit tests for train-only preprocessing pipeline."""
import numpy as np
import pandas as pd
import pytest

from smellscope.core.preprocess import fit_preprocessor


def test_train_only_fitting_no_leakage():
    """Verify that train stats are used and transforming val/test does not mutate them."""
    train_df = pd.DataFrame({
        "__row_id": [1, 2, 3],
        "feat1": [10.0, 20.0, 30.0],
        "feat2": ["a", "b", "a"],
        "const": [5.0, 5.0, 5.0],
    })
    test_df = pd.DataFrame({
        "__row_id": [4, 5],
        "feat1": [100.0, -50.0],
        "feat2": ["c", "b"],  # "c" is unseen
        "const": [5.0, 5.0],
    })

    prep = fit_preprocessor(train_df, feature_cols=["feat1", "feat2", "const", "__row_id"])
    assert "__row_id" not in prep.numeric_cols
    assert "__row_id" not in prep.categorical_cols
    assert prep.min_vals["feat1"] == 10.0
    assert prep.max_vals["feat1"] == 30.0

    transformed_train = prep.transform(train_df)
    assert transformed_train["const"].tolist() == [0.0, 0.0, 0.0]  # Constant feature protection
    assert transformed_train["feat1"].tolist() == [0.0, 0.5, 1.0]

    transformed_test = prep.transform(test_df)
    # Train scaler parameters must remain strictly untouched
    assert prep.min_vals["feat1"] == 10.0
    assert prep.max_vals["feat1"] == 30.0
    assert not transformed_test.isna().any().any()


def test_constant_and_nan_columns():
    """Verify handling of inf, nan, and zero variance columns."""
    train_df = pd.DataFrame({
        "num_inf": [1.0, np.inf, 3.0],
        "num_nan": [np.nan, 2.0, np.nan],
        "zero_var": [0.0, 0.0, 0.0],
    })
    prep = fit_preprocessor(train_df, feature_cols=["num_inf", "num_nan", "zero_var"])
    transformed = prep.transform(train_df)
    assert not transformed.isna().any().any()
    assert not np.isinf(transformed.values).any()
    assert (transformed["zero_var"] == 0.0).all()
