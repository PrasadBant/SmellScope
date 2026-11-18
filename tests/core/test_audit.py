"""Unit and contract tests for audit_class and get_cluster_assignments."""
import pytest
from smellscope.core.audit import audit_class, get_cluster_assignments
from smellscope.core.errors import SmellScopeError
from tests.fixtures.core.split_stub import (
    make_locked_split_stub,
    make_synthetic_dataset_fixture,
)


def test_audit_class_contract_conformance():
    """Verify that audit_class returns every key and nested structure conforming to Section 2.6."""
    df, ds_fixture = make_synthetic_dataset_fixture(n_benign=120, n_attack=60, seed=42)
    split = make_locked_split_stub(df, label_col="label", seed=42)

    cfg = {
        "seed": 42,
        "schema_id": "cic-ids-2017",
        "column_roles": {"dst_port": "Destination Port"},
        "heuristics": {
            "bg_ports": [0, 53, 67, 68, 111, 123, 137, 161, 179, 389, 427, 520, 1723, 1900],
            "enn": {"k": 4, "subsample_cap": 200},
            "hdf": {"n_estimators": 10, "max_depth": 5},
            "clustering": {"elbow_max_k": 5, "n_pairs_per_cluster": 20},
        },
        "baseline": {"rf": {"n_estimators": 20}},
        "sfi": {"k": 2, "deltas": [0.05, 0.20], "n_null": 5, "min_test_examples": 5},
        "ggi": {"min_groups": 2},
    }

    res = audit_class(
        df,
        label_col="label",
        cls="DDoS-Attack",
        benign_label="BENIGN",
        cfg=cfg,
        split=split,
    )

    # Validate top-level keys
    required_keys = {"class", "n", "n_benign", "paper", "baseline", "sfi", "ggi", "na_reasons", "meta"}
    assert required_keys.issubset(res.keys())

    # Paper heuristics keys
    paper_keys = {"UGT", "WL", "HDF", "PDD", "TC", "details"}
    assert paper_keys.issubset(res["paper"].keys())
    assert {"pdd_n_clusters", "hdf_top_feature", "wl_no_tie_bias"}.issubset(res["paper"]["details"].keys())

    # Baseline keys
    assert {"acc", "f1", "tpr", "tnr", "n_test"}.issubset(res["baseline"].keys())

    # SFI keys
    sfi_keys = {
        "top_features", "categories", "k", "recall_baseline", "sfi_top",
        "sfi_null_mean", "sfi_null_std", "n_null_draws", "delta", "z", "ci95",
        "flag", "flag_conditions", "fragility_curve",
    }
    assert sfi_keys.issubset(res["sfi"].keys())

    # GGI keys
    ggi_keys = {"f1_random", "f1_grouped", "gap", "lor", "grouping", "n_groups", "group_sizes", "lor_threshold"}
    assert ggi_keys.issubset(res["ggi"].keys())

    # Meta keys
    assert {"seed", "timestamp", "versions"}.issubset(res["meta"].keys())
    assert {"python", "numpy", "pandas", "sklearn"}.issubset(res["meta"]["versions"].keys())


def test_audit_class_fault_isolation():
    """Verify that measure failure does not abort the audit and records na_reasons."""
    df, ds_fixture = make_synthetic_dataset_fixture(n_benign=80, n_attack=40, seed=42)
    # Drop destination port column to test UGT graceful degradation
    df_no_port = df.drop(columns=["Destination Port"])
    split = make_locked_split_stub(df_no_port, label_col="label", seed=42)

    cfg = {
        "seed": 42,
        "heuristics": {"clustering": {"elbow_max_k": 3}},
        "sfi": {"k": 1, "n_null": 3, "min_test_examples": 5},
    }

    res = audit_class(
        df_no_port,
        label_col="label",
        cls="DDoS-Attack",
        benign_label="BENIGN",
        cfg=cfg,
        split=split,
    )

    assert res["paper"]["UGT"] is None
    assert "paper.UGT" in res["na_reasons"]
    # Other metrics must still be computed!
    assert res["baseline"]["acc"] is not None


def test_audit_class_allowed_exceptions():
    """Verify audit_class raises only the contract-specified exceptions on invalid input."""
    df, _ = make_synthetic_dataset_fixture(n_benign=50, n_attack=20, seed=42)
    split = make_locked_split_stub(df, label_col="label", seed=42)

    # Invalid label column
    with pytest.raises(SmellScopeError) as exc_info:
        audit_class(df, "nonexistent_label", "DDoS-Attack", "BENIGN", {}, split)
    assert exc_info.value.code == "E_LABEL_COLUMN"

    # Missing benign label
    with pytest.raises(SmellScopeError) as exc_info:
        audit_class(df, "label", "DDoS-Attack", "NONEXISTENT_BENIGN", {}, split)
    assert exc_info.value.code == "E_BENIGN_LABEL_MISSING"

    # Invalid split missing test_ids
    broken_split = {"train_ids": [1], "val_ids": [2]}
    with pytest.raises(SmellScopeError) as exc_info:
        audit_class(df, "label", "DDoS-Attack", "BENIGN", {}, broken_split)
    assert exc_info.value.code == "E_SPLIT_INVALID"


def test_get_cluster_assignments_contract_and_determinism():
    """Verify get_cluster_assignments returns a pd.Series indexed by __row_id."""
    df, _ = make_synthetic_dataset_fixture(n_benign=60, n_attack=30, seed=42)
    clusters = get_cluster_assignments(df, label_col="label", cls="DDoS-Attack", benign_label="BENIGN", seed=42)

    assert isinstance(clusters, pytest.importorskip("pandas").Series)
    assert len(clusters) == 30
    assert clusters.index.tolist() == df[df["label"] == "DDoS-Attack"]["__row_id"].tolist()
