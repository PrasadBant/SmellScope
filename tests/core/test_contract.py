"""Contract conformance test suite verifying core interfaces against Shared Contract v1.0."""
import inspect
import pytest

import smellscope.core as core
from smellscope.core.errors import SmellScopeError
from tests.fixtures.core.split_stub import (
    make_locked_split_stub,
    assert_test_untouched,
    make_synthetic_dataset_fixture,
    compute_split_hash,
)

VALID_CONTRACT_ERROR_CODES = {
    "E_SCHEMA",
    "E_LABEL_COLUMN",
    "E_BENIGN_LABEL_MISSING",
    "E_CLASS_TOO_SMALL",
    "E_SPLIT_INVALID",
    "E_TEST_LEAK",
    "E_CONFIG",
    "E_MEASURE_FAILED",
    "E_RULE_UNAVAILABLE",
    "E_RSM_BLOCK",
    "E_RSM_WARN_UNACKED",
    "E_ROLLBACK_MISMATCH",
    "E_FILE",
    "E_INTERNAL",
}


def test_smellscope_error_codes():
    """Verify that SmellScopeError adheres to contract error codes."""
    err = SmellScopeError("E_SCHEMA", "Schema test failure", details={"field": "label"})
    assert err.code in VALID_CONTRACT_ERROR_CODES
    err_dict = err.to_dict()
    assert err_dict["code"] == "E_SCHEMA"
    assert err_dict["message"] == "Schema test failure"
    assert err_dict["details"] == {"field": "label"}


def test_public_core_signatures():
    """Verify all public core function signatures match contract Section 2."""
    # I-3: audit_class(df, label_col: str, cls: str, benign_label: str, cfg: dict, split: SplitManifest)
    sig_audit = inspect.signature(core.audit_class)
    params_audit = list(sig_audit.parameters.keys())
    assert params_audit == ["df", "label_col", "cls", "benign_label", "cfg", "split"]

    # I-4: get_cluster_assignments(df, label_col, cls, benign_label, cfg, seed)
    sig_clust = inspect.signature(core.get_cluster_assignments)
    params_clust = list(sig_clust.parameters.keys())
    assert params_clust == ["df", "label_col", "cls", "benign_label", "cfg", "seed"]

    # I-4: fit_and_evaluate(train_df, test_df, label_col, benign_label, feature_cols, cfg, seed, target_class)
    sig_eval = inspect.signature(core.fit_and_evaluate)
    params_eval = list(sig_eval.parameters.keys())
    assert params_eval == ["train_df", "test_df", "label_col", "benign_label", "feature_cols", "cfg", "seed", "target_class"]

    # I-4: fragility_grid(df, label_col, cls, benign_label, features, cfg, split)
    sig_grid = inspect.signature(core.fragility_grid)
    params_grid = list(sig_grid.parameters.keys())
    assert params_grid == ["df", "label_col", "cls", "benign_label", "features", "cfg", "split"]

    # I-4: classify_features(columns, schema_id, cfg)
    sig_tax = inspect.signature(core.classify_features)
    params_tax = list(sig_tax.parameters.keys())
    assert params_tax == ["columns", "schema_id", "cfg"]

    # I-4: make_planted_dataset(base_df, label_col, benign_label, cls, shortcut_spec, seed)
    sig_planted = inspect.signature(core.make_planted_dataset)
    params_planted = list(sig_planted.parameters.keys())
    assert params_planted == ["base_df", "label_col", "benign_label", "cls", "shortcut_spec", "seed"]


def test_split_stub_conformance():
    """Verify that test stub produces a contract-valid SplitManifest."""
    df, ds_meta = make_synthetic_dataset_fixture(n_benign=100, n_attack=40, seed=42)
    split = make_locked_split_stub(df, label_col="label", seed=42)

    required_keys = {"seed", "fractions", "train_ids", "val_ids", "test_ids", "split_hash", "group_col", "created_at"}
    assert required_keys.issubset(split.keys())
    assert split["fractions"] == {"train": 0.6, "val": 0.2, "test": 0.2}

    total_rows = len(df)
    train_count = len(split["train_ids"])
    val_count = len(split["val_ids"])
    test_count = len(split["test_ids"])
    assert train_count + val_count + test_count == total_rows

    # Verify no overlap between partitions
    assert set(split["train_ids"]).isdisjoint(set(split["val_ids"]))
    assert set(split["train_ids"]).isdisjoint(set(split["test_ids"]))
    assert set(split["val_ids"]).isdisjoint(set(split["test_ids"]))

    # Test leak assertion
    assert_test_untouched(split, split["train_ids"])
    with pytest.raises(SmellScopeError) as exc_info:
        assert_test_untouched(split, [split["test_ids"][0]])
    assert exc_info.value.code == "E_TEST_LEAK"
