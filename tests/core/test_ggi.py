"""Unit tests for Generalisation Gap Index (GGI)."""
import pandas as pd
import pytest

from smellscope.core.ggi import compute_ggi
from tests.fixtures.core.split_stub import make_locked_split_stub


def test_ggi_disjoint_subtypes():
    """Verify GGI detects generalisation gap between random split and grouped split."""
    # Create two disjoint attack subtypes (e.g. port 80 vs port 443 attacks)
    n_benign = 100
    n_attack = 60
    n_total = n_benign + n_attack

    labels = ["BENIGN"] * n_benign + ["ATTACK"] * n_attack
    # Subtype 1 (30 rows): high feat1, low feat2
    # Subtype 2 (30 rows): low feat1, high feat2
    feat1 = [0.0] * n_benign + [10.0] * 30 + [0.0] * 30
    feat2 = [0.0] * n_benign + [0.0] * 30 + [10.0] * 30
    groups = ["g0"] * n_benign + ["g1"] * 30 + ["g2"] * 30

    df = pd.DataFrame({
        "__row_id": list(range(n_total)),
        "label": labels,
        "feat1": feat1,
        "feat2": feat2,
        "group": groups,
    })

    split = make_locked_split_stub(df, "label", seed=42)
    cfg = {"ggi": {"min_groups": 3}}

    ggi_res, na_reasons = compute_ggi(
        df,
        label_col="label",
        cls="ATTACK",
        benign_label="BENIGN",
        feature_cols=["feat1", "feat2"],
        cfg=cfg,
        split=split,
        group_col="group",
    )

    assert not na_reasons
    assert ggi_res["grouping"] == "provenance"
    assert ggi_res["n_groups"] == 3
    assert ggi_res["f1_random"] is not None


def test_ggi_insufficient_groups():
    """Verify GGI gracefully handles fewer than min_groups."""
    df = pd.DataFrame({
        "__row_id": [0, 1, 2, 3],
        "label": ["BENIGN", "BENIGN", "ATTACK", "ATTACK"],
        "feat": [1.0, 2.0, 3.0, 4.0],
        "group": ["g1", "g1", "g2", "g2"],
    })
    split = {"train_ids": [0, 2], "val_ids": [1], "test_ids": [3]}
    cfg = {"ggi": {"min_groups": 3}}

    ggi_res, na_reasons = compute_ggi(
        df, "label", "ATTACK", "BENIGN", ["feat"], cfg=cfg, split=split, group_col="group"
    )
    assert ggi_res["gap"] is None
    assert "ggi.gap" in na_reasons
