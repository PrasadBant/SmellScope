"""Reproducibility test verifying identical seed yields identical results."""
import pytest
from smellscope.core.audit import audit_class
from tests.fixtures.core.split_stub import (
    make_locked_split_stub,
    make_synthetic_dataset_fixture,
)


def test_identical_seed_identical_output():
    """Verify two independent audit_class runs with identical seeds yield bit-identical numerical results."""
    df, _ = make_synthetic_dataset_fixture(n_benign=80, n_attack=40, seed=42)
    split = make_locked_split_stub(df, label_col="label", seed=42)

    cfg = {
        "seed": 42,
        "heuristics": {"clustering": {"elbow_max_k": 3, "n_pairs_per_cluster": 20}},
        "sfi": {"k": 2, "deltas": [0.05, 0.10], "n_null": 5, "min_test_examples": 5},
    }

    res1 = audit_class(df, "label", "DDoS-Attack", "BENIGN", cfg, split)
    res2 = audit_class(df, "label", "DDoS-Attack", "BENIGN", cfg, split)

    # Heuristic metrics
    assert res1["paper"]["UGT"] == res2["paper"]["UGT"]
    assert res1["paper"]["WL"] == res2["paper"]["WL"]
    assert res1["paper"]["HDF"] == res2["paper"]["HDF"]
    assert res1["paper"]["PDD"] == res2["paper"]["PDD"]
    assert res1["paper"]["TC"] == res2["paper"]["TC"]

    # Baseline metrics
    assert res1["baseline"]["acc"] == res2["baseline"]["acc"]
    assert res1["baseline"]["f1"] == res2["baseline"]["f1"]

    # SFI metrics
    assert res1["sfi"]["sfi_top"] == res2["sfi"]["sfi_top"]
    assert res1["sfi"]["sfi_null_mean"] == res2["sfi"]["sfi_null_mean"]
    assert res1["sfi"]["flag"] == res2["sfi"]["flag"]
