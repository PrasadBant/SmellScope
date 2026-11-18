"""Integration readiness test suite validating core interfaces against realistic edge cases and Contract v1.0."""
import numpy as np
import pandas as pd
import pytest

import smellscope.core as core
from tests.fixtures.core.split_stub import (
    make_locked_split_stub,
    assert_test_untouched,
)


def test_integration_realistic_cic_raw_columns():
    """Verify core engine handles raw CIC-like DataFrames with leading whitespaces and non-contiguous __row_id."""
    rng = np.random.default_rng(42)
    n_benign = 100
    n_attack = 50
    n_total = n_benign + n_attack

    # Non-contiguous row IDs (e.g. after subsampling or filtering)
    row_ids = np.sort(rng.choice(np.arange(10000, 20000), size=n_total, replace=False))

    # Raw column names with typical CIC leading whitespaces
    df = pd.DataFrame({
        "__row_id": row_ids,
        " Label": ["BENIGN"] * n_benign + ["DoS Hulk"] * n_attack,
        " Destination Port": [80] * n_benign + [80] * n_attack,
        " Flow Duration": rng.uniform(10, 1000, size=n_total),
        " Total Fwd Packets": rng.normal(50, 10, size=n_total),
        " Fwd Packet Length Mean": rng.normal(200, 40, size=n_total),
    })

    split = make_locked_split_stub(df, label_col=" Label", seed=42)
    assert_test_untouched(split, split["train_ids"])

    cfg = {
        "seed": 42,
        "schema_id": "cic-ids-2017",
        "column_roles": {"dst_port": " Destination Port"},
        "heuristics": {
            "bg_ports": [0, 53, 67, 68, 111, 123, 137, 161, 179, 389, 427, 520, 1723, 1900],
            "enn": {"k": 4, "subsample_cap": 200},
            "hdf": {"n_estimators": 10, "max_depth": 5},
            "clustering": {"elbow_max_k": 4, "n_pairs_per_cluster": 20},
        },
        "baseline": {"rf": {"n_estimators": 20}},
        "sfi": {"k": 1, "deltas": [0.05, 0.20], "n_null": 5, "min_test_examples": 5},
        "ggi": {"min_groups": 2},
    }

    res = core.audit_class(
        df,
        label_col=" Label",
        cls="DoS Hulk",
        benign_label="BENIGN",
        cfg=cfg,
        split=split,
    )

    assert res["class"] == "DoS Hulk"
    assert res["n"] == 50
    assert res["n_benign"] == 100
    assert res["paper"]["UGT"] is not None
    assert res["baseline"]["acc"] is not None
    assert res["sfi"]["k"] == 1
    assert len(res["sfi"]["top_features"]) == 1
    assert res["sfi"]["top_features"][0] in [
        " Fwd Packet Length Mean",
        " Total Fwd Packets",
        " Flow Duration",
        " Destination Port",
    ]


def test_integration_all_public_functions_contract():
    """Verify every public function in smellscope.core executes with contract types."""
    rng = np.random.default_rng(123)
    n = 60
    df = pd.DataFrame({
        "__row_id": np.arange(n),
        "label": ["BENIGN"] * 40 + ["Probe"] * 20,
        "dsport": [80] * 40 + [53] * 20,
        "sttl": [64] * 40 + [254] * 20,
        "sbytes": rng.uniform(10, 500, size=n),
    })

    feature_cols = ["dsport", "sttl", "sbytes"]
    split = make_locked_split_stub(df, label_col="label", seed=123)
    cfg = {"sfi": {"k": 1, "n_null": 5, "min_test_examples": 5}, "ggi": {"min_groups": 2}}

    # 1. fit_preprocessor
    train_df = df[df["__row_id"].isin(split["train_ids"])]
    prep = core.fit_preprocessor(train_df, feature_cols, schema_id="unsw-nb15", cfg=cfg)
    transformed = prep.transform(df)
    assert not transformed.isna().any().any()

    # 2. classify_features
    tax = core.classify_features(feature_cols, schema_id="unsw-nb15", cfg=cfg)
    assert tax["dsport"] == "A"
    assert tax["sttl"] == "B"
    assert tax["sbytes"] == "C"

    # 3. fit_and_evaluate
    test_df = df[df["__row_id"].isin(split["test_ids"])]
    eval_res = core.fit_and_evaluate(train_df, test_df, "label", "BENIGN", feature_cols, cfg=cfg, target_class="Probe")
    assert isinstance(eval_res["f1"], float)
    assert "Probe" in eval_res["per_class"]

    # 4. get_cluster_assignments
    clusters = core.get_cluster_assignments(df, "label", "Probe", "BENIGN", cfg=cfg, seed=123)
    assert len(clusters) == 20
    assert clusters.index.tolist() == df[df["label"] == "Probe"]["__row_id"].tolist()

    # 5. fragility_grid
    grid = core.fragility_grid(df, "label", "Probe", "BENIGN", ["dsport", "sttl"], cfg=cfg, split=split)
    assert len(grid["recall"]) == 5
    assert len(grid["recall"][0]) == 5

    # 6. make_planted_dataset
    planted_df, truth = core.make_planted_dataset(
        df, "label", "BENIGN", "Probe",
        shortcut_spec={"feature_name": "planted_port", "category": "A", "strength": 0.95},
        seed=123,
    )
    assert "planted_port" in planted_df.columns
    assert truth["evidence_label"] == "synthetic"
