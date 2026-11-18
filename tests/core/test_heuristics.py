"""Unit tests for the five reimplemented paper heuristics."""
import numpy as np
import pandas as pd
import pytest

from smellscope.core.heuristics import (
    compute_ugt,
    compute_wl,
    compute_hdf,
    compute_pdd_and_tc,
)


def test_ugt_known_mix():
    """Verify UGT with a known mix of background server ports."""
    # BG ports: [0, 53, 67, 68, 111, 123, 137, 161, 179, 389, 427, 520, 1723, 1900]
    df = pd.DataFrame({
        "label": ["DDoS"] * 10,
        "dst_port": [53, 80, 53, 443, 8080, 123, 1900, 22, 21, 53],  # 53, 53, 123, 1900, 53 -> 5 in BG
    })
    cfg = {"bg_ports": [53, 123, 1900]}
    score, reason = compute_ugt(df, label_col="label", cls="DDoS", dst_port_col="dst_port", cfg=cfg)
    assert reason is None
    assert score == pytest.approx(0.50, abs=1e-5)


def test_ugt_missing_port_column():
    """Verify UGT returns None and reason when port column is missing."""
    df = pd.DataFrame({"label": ["DDoS"] * 5})
    score, reason = compute_ugt(df, label_col="label", cls="DDoS", dst_port_col=None, cfg={})
    assert score is None
    assert "not mapped" in reason


def test_wl_clean_vs_noisy_fixture():
    """Verify WL on separable clean fixture gives 0, and noisy gives > 0."""
    # Clean separable fixture
    df_clean = pd.DataFrame({
        "label": ["BENIGN"] * 20 + ["ATTACK"] * 20,
        "feat1": [-10.0] * 20 + [10.0] * 20,
    })
    wl_clean, wl_no_bias, reason = compute_wl(
        df_clean, label_col="label", cls="ATTACK", benign_label="BENIGN", feature_cols=["feat1"], cfg={}
    )
    assert reason is None
    assert wl_clean == pytest.approx(0.0, abs=1e-5)

    # Injected mislabels: 2 attack points right in benign cluster
    df_noisy = pd.DataFrame({
        "label": ["BENIGN"] * 20 + ["ATTACK"] * 20,
        "feat1": [-10.0] * 20 + [-10.0] * 2 + [10.0] * 18,
    })
    wl_noisy, _, _ = compute_wl(
        df_noisy, label_col="label", cls="ATTACK", benign_label="BENIGN", feature_cols=["feat1"], cfg={}
    )
    assert wl_noisy == pytest.approx(2 / 20, abs=0.02)


def test_hdf_perfect_single_feature():
    """Verify HDF identifies a perfectly separable feature."""
    train_df = pd.DataFrame({
        "label": ["BENIGN"] * 50 + ["ATTACK"] * 50,
        "noise": np.random.RandomState(42).randn(100),
        "shortcut": [0.0] * 50 + [1.0] * 50,
    })
    test_df = pd.DataFrame({
        "label": ["BENIGN"] * 20 + ["ATTACK"] * 20,
        "noise": np.random.RandomState(43).randn(40),
        "shortcut": [0.0] * 20 + [1.0] * 20,
    })
    hdf_score, top_feature, reason = compute_hdf(
        train_df, test_df, label_col="label", cls="ATTACK", benign_label="BENIGN",
        feature_cols=["noise", "shortcut"], cfg={}, seed=42
    )
    assert reason is None
    assert hdf_score == pytest.approx(1.0, abs=1e-4)
    assert top_feature == "shortcut"


def test_pdd_and_tc_identical_vectors():
    """Verify PDD and TC on identical feature vectors yield ~1.0."""
    df = pd.DataFrame({
        "label": ["ATTACK"] * 50,
        "feat1": [5.0] * 50,
        "feat2": [2.0] * 50,
    })
    pdd, tc, n_clust, km, reason = compute_pdd_and_tc(
        df, label_col="label", cls="ATTACK", feature_cols=["feat1", "feat2"], cfg={}, seed=42
    )
    assert reason is None
    assert pdd == pytest.approx(1.0, abs=1e-4)
    assert tc == pytest.approx(1.0, abs=1e-4)
