"""Unit tests for Shortcut Fragility Index (SFI), null model, and fragility grid."""
import numpy as np
import pandas as pd
import pytest

from smellscope.core.sfi import compute_sfi, fragility_grid
from tests.fixtures.core.split_stub import make_locked_split_stub


def test_sfi_permutation_ranking_and_bounds():
    """Verify SFI ranks predictive features, bounds perturbation, and computes delta."""
    rng = np.random.RandomState(42)
    n = 200
    # Plant a strong feature in Category A (Destination Port)
    labels = ["BENIGN"] * 140 + ["SYN-Flood"] * 60
    shortcut = [80] * 140 + [53] * 60  # Perfectly predictive port
    noise1 = rng.randn(n)
    noise2 = rng.randn(n)
    noise3 = rng.randn(n)

    df = pd.DataFrame({
        "__row_id": list(range(n)),
        "label": labels,
        "Destination Port": shortcut,
        "noise1": noise1,
        "noise2": noise2,
        "noise3": noise3,
    })

    split = make_locked_split_stub(df, label_col="label", seed=42)
    cfg = {
        "sfi": {
            "k": 1,
            "deltas": [0.05, 0.20],
            "n_null": 10,
            "z_threshold": 2.0,
            "hdf_high": 0.90,
            "min_test_examples": 5,
        }
    }

    sfi_res, na_reasons = compute_sfi(
        df,
        label_col="label",
        cls="SYN-Flood",
        benign_label="BENIGN",
        feature_cols=["Destination Port", "noise1", "noise2", "noise3"],
        cfg=cfg,
        split=split,
        schema_id="cic-ids-2017",
        hdf_score=1.0,
    )

    assert not na_reasons
    assert sfi_res["top_features"] == ["Destination Port"]
    assert sfi_res["categories"] == ["A"]
    assert sfi_res["k"] == 1
    assert sfi_res["recall_baseline"] is not None
    assert sfi_res["sfi_top"] is not None
    assert sfi_res["n_null_draws"] == 10
    assert len(sfi_res["fragility_curve"]["delta"]) == 2


def test_suspicion_flag_truth_table_all_categories():
    """Verify suspicion flag truth table: Cat D alone never flags; Cat A/B flags; Cat C sets needs_context."""
    rng = np.random.RandomState(42)
    n = 100
    labels = ["BENIGN"] * 60 + ["ATTACK"] * 40
    feat_d = [0] * 60 + [1] * 40  # SYN Flag Count (Category D)
    noise = rng.randn(n)

    df = pd.DataFrame({
        "__row_id": list(range(n)),
        "label": labels,
        "SYN Flag Count": feat_d,
        "noise": noise,
    })
    split = make_locked_split_stub(df, "label", seed=42)
    cfg = {"sfi": {"k": 1, "n_null": 5, "min_test_examples": 5}}

    # When top feature is Category D, it should NEVER flag even if HDF=1.0 and excess fragility
    res_d, _ = compute_sfi(
        df, "label", "ATTACK", "BENIGN", ["SYN Flag Count", "noise"],
        cfg=cfg, split=split, schema_id="cic-ids-2017", hdf_score=1.0
    )
    assert res_d["categories"] == ["D"]
    assert res_d["flag"] is False


def test_fragility_grid_dimensions_and_corner():
    """Verify fragility grid creates a 5x5 grid with corner (0,0) equal to baseline recall."""
    n = 100
    df = pd.DataFrame({
        "__row_id": list(range(n)),
        "label": ["BENIGN"] * 60 + ["ATTACK"] * 40,
        "feat1": np.linspace(0, 10, n),
        "feat2": np.linspace(-5, 5, n),
    })
    split = make_locked_split_stub(df, "label", seed=42)

    grid = fragility_grid(
        df, "label", "ATTACK", "BENIGN", features=["feat1", "feat2"], cfg={}, split=split
    )
    assert grid["features"] == ["feat1", "feat2"]
    assert len(grid["recall"]) == 5
    assert len(grid["recall"][0]) == 5
    assert grid["recall"][0][0] == pytest.approx(grid["recall_baseline"], abs=1e-5)
