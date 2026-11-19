"""Comprehensive test suite for Phase 6: Baseline Evaluation and the 100% Accuracy Problem."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from smellscope.core.audit import audit_class
from smellscope.core.perfect_accuracy import investigate_perfect_accuracy
from smellscope.pipeline.split import make_locked_split


def test_perfect_accuracy_investigation_cases():
    """Verify diagnostic correctly identifies Cases A, B, C, D, E and 14 inspection items."""
    # Synthetic dataset
    np.random.seed(42)
    n = 100
    df = pd.DataFrame({
        "__row_id": np.arange(n),
        "feat1": np.random.randn(n),
        "feat2": np.random.randn(n),
        "Destination Port": [80] * 50 + [443] * 50,
        "Label": ["BENIGN"] * 80 + ["PortScan"] * 20,
    })

    split = {
        "train_ids": list(range(0, 60)),
        "val_ids": list(range(60, 80)),
        "test_ids": list(range(80, 100)),
        "split_hash": "dummy_hash",
    }
    feature_cols = ["feat1", "feat2", "Destination Port"]

    # Test Case A: Train 100%, Test substantially lower (overfitting)
    train_eval_a = {"acc": 1.0, "f1": 1.0}
    val_eval_a = {"acc": 0.70, "f1": 0.65}
    test_eval_a = {"acc": 0.65, "f1": 0.60}

    diag_a = investigate_perfect_accuracy(
        df=df,
        label_col="Label",
        cls="PortScan",
        benign_label="BENIGN",
        split=split,
        feature_cols=feature_cols,
        train_eval=train_eval_a,
        val_eval=val_eval_a,
        test_eval=test_eval_a,
    )

    assert diag_a["is_triggered"] is True
    assert diag_a["case_code"] == "CASE_A"
    assert len(diag_a["inspections"]) == 14
    assert any("overfitting" in f.lower() or "validation divergence" in f.lower() for f in diag_a["findings"])

    # Test Case B: Leakage / Duplicates across splits
    # Artificially duplicate a row across train and test
    df_leak = df.copy()
    df_leak.loc[85, ["feat1", "feat2", "Destination Port"]] = df_leak.loc[10, ["feat1", "feat2", "Destination Port"]].values
    train_eval_b = {"acc": 1.0, "f1": 1.0}
    test_eval_b = {"acc": 1.0, "f1": 1.0}
    val_eval_b = {"acc": 1.0, "f1": 1.0}

    diag_b = investigate_perfect_accuracy(
        df=df_leak,
        label_col="Label",
        cls="PortScan",
        benign_label="BENIGN",
        split=split,
        feature_cols=feature_cols,
        train_eval=train_eval_b,
        val_eval=val_eval_b,
        test_eval=test_eval_b,
    )
    assert diag_b["case_code"] == "CASE_B"
    assert any("leakage" in f.lower() for f in diag_b["findings"])

    # Test Case C: Group Generalisation drop (high GGI)
    train_eval_c = {"acc": 0.99, "f1": 0.99}
    test_eval_c = {"acc": 0.99, "f1": 0.99}
    val_eval_c = {"acc": 0.99, "f1": 0.99}
    ggi_c = {"gap": 0.25, "f1_random": 0.99, "f1_grouped": 0.74, "lor": 0.01}

    diag_c = investigate_perfect_accuracy(
        df=df,
        label_col="Label",
        cls="PortScan",
        benign_label="BENIGN",
        split=split,
        feature_cols=feature_cols,
        train_eval=train_eval_c,
        val_eval=val_eval_c,
        test_eval=test_eval_c,
        ggi_result=ggi_c,
    )
    assert diag_c["case_code"] == "CASE_C"
    assert any("generalisation" in f.lower() for f in diag_c["findings"])

    # Test Case E: Insufficient test support (e.g. small attack sample size in test)
    # in df, total attack is 20, in test split (80-100) only a few are attack
    diag_e = investigate_perfect_accuracy(
        df=df,
        label_col="Label",
        cls="PortScan",
        benign_label="BENIGN",
        split=split,
        feature_cols=feature_cols,
        train_eval=train_eval_c,
        val_eval=val_eval_c,
        test_eval=test_eval_c,
        ggi_result={"gap": 0.02, "f1_random": 0.99, "f1_grouped": 0.97, "lor": 0.0},
    )
    assert diag_e["case_code"] == "CASE_E"
    assert any("statistical power" in f.lower() or "attack samples" in f.lower() for f in diag_e["findings"])


def test_audit_class_integrates_train_val_test_eval_and_perfect_accuracy():
    """Verify audit_class integrates baseline partitions and accuracy investigation."""
    np.random.seed(42)
    n = 120
    df = pd.DataFrame({
        "__row_id": np.arange(n),
        "feat1": np.random.randn(n),
        "feat2": np.random.randn(n),
        "Label": ["BENIGN"] * 90 + ["Bot"] * 30,
    })

    ds = {"df": df, "label_col": "Label"}
    split = make_locked_split(ds, cfg={"seed": 42})

    res = audit_class(
        df=df,
        label_col="Label",
        cls="Bot",
        benign_label="BENIGN",
        cfg={"seed": 42, "heuristics": {"k_neighbors": 3}},
        split=split,
    )

    baseline = res["baseline"]
    assert "train" in baseline
    assert "val" in baseline
    assert "test" in baseline
    assert "perfect_accuracy_investigation" in baseline

    inv = baseline["perfect_accuracy_investigation"]
    assert "case_code" in inv
    assert "inspections" in inv
    assert len(inv["inspections"]) == 14
    assert len(inv["findings"]) >= 1
