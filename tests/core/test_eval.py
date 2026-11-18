"""Unit tests for baseline evaluation engine."""
import numpy as np
import pandas as pd
import pytest

from smellscope.core.eval import fit_and_evaluate


def test_fit_and_evaluate_binary_and_multiclass():
    """Verify fit_and_evaluate returns contract-compliant dict in binary and multiclass modes."""
    train_df = pd.DataFrame({
        "label": ["BENIGN"] * 40 + ["ATTACK1"] * 30 + ["ATTACK2"] * 30,
        "feat1": np.linspace(0, 10, 100),
        "feat2": np.random.RandomState(42).randn(100),
    })
    test_df = pd.DataFrame({
        "label": ["BENIGN"] * 20 + ["ATTACK1"] * 10 + ["ATTACK2"] * 10,
        "feat1": np.linspace(0, 10, 40),
        "feat2": np.random.RandomState(43).randn(40),
    })

    # Binary evaluation
    res_bin = fit_and_evaluate(
        train_df, test_df, label_col="label", benign_label="BENIGN",
        feature_cols=["feat1", "feat2"], seed=42, target_class="ATTACK1"
    )
    assert "acc" in res_bin and "f1" in res_bin and "tpr" in res_bin and "tnr" in res_bin
    assert "ATTACK1" in res_bin["per_class"]
    assert "BENIGN" in res_bin["per_class"]
    assert res_bin["n_train"] == 70  # 40 benign + 30 attack1
    assert res_bin["n_test"] == 30   # 20 benign + 10 attack1

    # Multiclass evaluation
    res_multi = fit_and_evaluate(
        train_df, test_df, label_col="label", benign_label="BENIGN",
        feature_cols=["feat1", "feat2"], seed=42, target_class=None
    )
    assert res_multi["n_train"] == 100
    assert len(res_multi["per_class"]) == 3


def test_seed_determinism():
    """Verify identical seeds produce identical evaluation metrics."""
    train_df = pd.DataFrame({
        "label": ["BENIGN"] * 30 + ["ATTACK"] * 30,
        "feat": np.random.RandomState(10).randn(60),
    })
    test_df = pd.DataFrame({
        "label": ["BENIGN"] * 15 + ["ATTACK"] * 15,
        "feat": np.random.RandomState(11).randn(30),
    })

    res1 = fit_and_evaluate(train_df, test_df, "label", "BENIGN", ["feat"], seed=42)
    res2 = fit_and_evaluate(train_df, test_df, "label", "BENIGN", ["feat"], seed=42)
    assert res1["acc"] == res2["acc"]
    assert res1["f1"] == res2["f1"]
