"""RSM (Remediation Safety Monitor) validation.

Pure-function tests pin the exact PASS/WARN/BLOCK rules and the configuration-driven policy.
Manager-level tests drive real repair plans on synthetic datasets with controlled class retention to
prove backend enforcement: acknowledgement, BLOCK, stale/modified previews, locked-test integrity and
truthful NO_CHANGE / safety records.
"""

from __future__ import annotations

import copy
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from smellscope.core.errors import SmellScopeError
from smellscope.pipeline.loader import load_dataset
from smellscope.pipeline.split import make_locked_split
from smellscope.remediation.manager import (
    apply_repair_plan,
    compute_plan_hash,
    generate_repair_plan_preview,
    new_training_view,
)
from smellscope.remediation.rsm import DEFAULT_RSM_POLICY, check_rsm, load_rsm_policy

APPROVE = {"approved": True, "warning_ack": False, "approved_at": "t"}
ACK = {"approved": True, "warning_ack": True, "approved_at": "t"}
DEDUP = {"id": "rec_dedup", "action_type": "DEDUPLICATE_TRAIN", "action_params": {"keep": "first"}}


# ----------------------------------------------------------------------------------------------
# Pure RSM rules
# ----------------------------------------------------------------------------------------------
def _preview(by_class=None, by_cluster=None, features=None, before=1000, after=1000):
    return {
        "affected": {"by_class": by_class or {}, "by_cluster": by_cluster or {}},
        "feature_changes": features or [],
        "expected_train_size": {"before": before, "after": after},
    }


def _cls(before, after):
    return {"before": before, "after": after, "retention": after / before}


def test_policy_comes_from_config_with_documented_defaults():
    policy = load_rsm_policy()
    assert policy["min_class_retention_warn"] == 0.50
    assert policy["min_class_retention_block"] == 0.20
    assert policy["min_cluster_retention_warn"] == 0.25
    assert policy["min_cluster_retention_block"] == 0.10
    assert policy["max_ablation_features_warn"] == 10
    # The fallback constants agree with the shipped configuration.
    assert {k: policy[k] for k in DEFAULT_RSM_POLICY} == DEFAULT_RSM_POLICY


def test_policy_changes_in_config_take_effect(tmp_path, monkeypatch):
    cfg_dir = tmp_path / "config"
    shutil.copytree("config", cfg_dir)
    text = (cfg_dir / "default.yaml").read_text(encoding="utf-8")
    assert "min_class_retention_warn: 0.50" in text
    (cfg_dir / "default.yaml").write_text(text.replace("min_class_retention_warn: 0.50", "min_class_retention_warn: 0.80"), encoding="utf-8")
    monkeypatch.setenv("SMELLSCOPE_CONFIG_DIR", str(cfg_dir))

    assert load_rsm_policy()["min_class_retention_warn"] == 0.80
    # 70% retention is PASS under the default policy but WARN under the configured one.
    report = check_rsm(_preview(by_class={"DDoS": _cls(100, 70)}))
    assert report["status"] == "WARN"
    assert report["policy"]["min_class_retention_warn"] == 0.80


@pytest.mark.parametrize(
    "kept,expected",
    [(100, "PASS"), (50, "PASS"), (49, "WARN"), (20, "WARN"), (19, "BLOCK"), (0, "BLOCK")],
)
def test_class_retention_thresholds(kept, expected):
    report = check_rsm(_preview(by_class={"DDoS": _cls(100, kept)}))
    assert report["status"] == expected
    check = report["checks"]["classes"][0]
    assert check["status"] == expected and check["original_rows"] == 100 and check["remaining_rows"] == kept
    assert report["requires_acknowledgement"] is (expected == "WARN")


def test_block_takes_precedence_over_warn_for_same_condition():
    report = check_rsm(_preview(by_class={"DDoS": _cls(100, 10)}))
    assert report["status"] == "BLOCK"
    assert [b["code"] for b in report["blocks"]] == ["RSM_BLOCK_CLASS_ERASURE"]
    assert report["warnings"] == []  # not double-reported as a warning


@pytest.mark.parametrize(
    "before,after,expected",
    [(20, 20, "PASS"), (20, 5, "PASS"), (20, 4, "WARN"), (20, 2, "WARN"), (20, 1, "BLOCK")],
)
def test_cluster_retention_thresholds(before, after, expected):
    report = check_rsm(_preview(by_cluster={"DDoS": {"0": {"before": before, "after": after, "retention": after / before}}}))
    assert report["status"] == expected
    assert report["checks"]["clusters"][0]["evaluated"] is True


def test_small_clusters_are_listed_but_not_evaluated():
    clusters = {"DDoS": {"0": {"before": 5, "after": 0, "retention": 0.0}, "1": {"before": 6, "after": 6, "retention": 1.0}}}
    report = check_rsm(_preview(by_cluster=clusters))
    assert report["status"] == "PASS"
    by_id = {c["cluster_id"]: c for c in report["checks"]["clusters"]}
    assert by_id["0"]["evaluated"] is False and by_id["0"]["status"] == "NOT_EVALUATED" and "needs more than 5" in by_id["0"]["reason"]
    assert by_id["1"]["evaluated"] is True and by_id["1"]["status"] == "PASS"


@pytest.mark.parametrize("n,expected", [(0, "PASS"), (10, "PASS"), (11, "WARN"), (200, "WARN")])
def test_feature_removal_warns_above_ten_and_never_blocks(n, expected):
    report = check_rsm(_preview(features=[f"f{i}" for i in range(n)]))
    assert report["status"] == expected
    assert report["blocks"] == []  # no feature-count BLOCK threshold exists in the policy
    assert report["checks"]["features"]["names"] == [f"f{i}" for i in range(n)]
    assert report["checks"]["features"]["triggered"] is (expected == "WARN")


def test_combined_plan_reports_every_issue_and_blocks():
    report = check_rsm(
        _preview(
            by_class={"DDoS": _cls(100, 30), "PortScan": _cls(80, 8)},
            by_cluster={"DDoS": {"0": {"before": 40, "after": 8, "retention": 0.2}}},
            features=[f"f{i}" for i in range(12)],
        )
    )
    assert report["status"] == "BLOCK"
    assert {w["code"] for w in report["warnings"]} == {"RSM_WARN_HIGH_CLASS_ATTRITION", "RSM_WARN_CLUSTER_DISTORTION", "RSM_WARN_EXCESSIVE_ABLATION"}
    assert [b["code"] for b in report["blocks"]] == ["RSM_BLOCK_CLASS_ERASURE"]


def test_explanations_use_actual_evidence():
    report = check_rsm(_preview(by_class={"DDoS": _cls(100, 42)}))
    warning = report["warnings"][0]
    assert "42%" in warning["explanation"] or "42.0%" in warning["explanation"]
    assert "50%" in warning["explanation"] and "DDoS" in warning["title"]
    ev = warning["evidence"]
    assert (ev["original_rows"], ev["remaining_rows"], ev["removed_rows"]) == (100, 42, 58)
    assert (ev["threshold_warn"], ev["threshold_block"]) == (0.5, 0.2)


# ----------------------------------------------------------------------------------------------
# Manager-level enforcement on real datasets
# ----------------------------------------------------------------------------------------------
def _build_dataset(tmp_path, rare_unique: int, const_cols: int = 0, name: str = "rsm.csv"):
    """BENIGN/DDoS fully unique; 'Rare' has 100 rows built from only ``rare_unique`` distinct rows."""
    rng = np.random.default_rng(7)

    def rows(n, label, offset):
        return pd.DataFrame({
            "Destination Port": rng.integers(1, 60000, n),
            "Flow Duration": rng.random(n) * 1e5 + offset,
            "Total Fwd Packets": rng.integers(1, 500, n),
            "Flow Bytes/s": rng.random(n) * 1e4,
            "Label": label,
        })

    rare_base = rows(rare_unique, "Rare", 5e5)
    rare = rare_base.iloc[np.arange(100) % rare_unique].reset_index(drop=True)
    df = pd.concat([rows(300, "BENIGN", 0), rows(100, "DDoS", 2e5), rare], ignore_index=True)
    for i in range(const_cols):
        df[f"const_{i}"] = 1
    path = tmp_path / name
    df.to_csv(path, index=False)
    ds = load_dataset(str(path), label_col="Label", benign_label="BENIGN")
    split = make_locked_split(ds)
    return ds, split, new_training_view(ds, split)


def _plan(ds, split, view, recs=None):
    return generate_repair_plan_preview(ds=ds, split=split, view=view, selected_recs=recs or [DEDUP])


def test_pass_plan_applies_and_records_actual_retention(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=100)  # nothing duplicated
    preview = _plan(ds, split, view)
    assert preview["rsm_report"]["status"] == "PASS"
    assert preview["test_integrity"]["status"] == "VERIFIED"

    # Nothing to remove -> truthful NO_CHANGE, no new version, no file.
    new_view, log, meta = apply_repair_plan(ds, split, view, preview, APPROVE, run_id="rsm_pass")
    assert meta["outcome"] == "NO_CHANGE" and meta["file_path"] is None
    assert new_view["view_id"] == view["view_id"]
    rec = meta["rsm_record"]
    assert rec["outcome"] == "NO_CHANGE" and rec["apply_decision"] == "PASS" and rec["transformation_id"] is None
    assert "no actual dataset changes" in rec["message"]


def test_warn_requires_acknowledgement_and_is_recorded(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=18)
    preview = _plan(ds, split, view)
    report = preview["rsm_report"]
    assert report["status"] == "WARN", report["checks"]["classes"]
    assert any(w["class"] == "Rare" and w["code"] == "RSM_WARN_HIGH_CLASS_ATTRITION" for w in report["warnings"])

    with pytest.raises(SmellScopeError) as exc:
        apply_repair_plan(ds, split, view, preview, APPROVE, run_id="rsm_warn")
    assert exc.value.code == "E_RSM_WARN_UNACKED"

    new_view, log, meta = apply_repair_plan(ds, split, view, preview, ACK, run_id="rsm_warn")
    assert meta["outcome"] == "APPLIED" and Path(meta["file_path"]).exists()
    rec = meta["rsm_record"]
    assert (rec["preview_decision"], rec["apply_decision"]) == ("WARN", "WARN")
    assert rec["acknowledgement_required"] is True and rec["acknowledged"] is True
    assert "reviewing and acknowledging the safety warning" in rec["message"]
    assert rec["transformation_id"] == log["entry_id"] and rec["dataset_version"] == new_view["view_id"]
    assert rec["test_integrity"]["status"] == "VERIFIED"

    # Recorded retention equals what the corrected dataset really contains.
    actual = rec["class_retention_actual"]["Rare"]
    expected = next(c for c in rec["class_retention_expected"] if c["class"] == "Rare")
    assert actual["after"] == expected["remaining_rows"] and actual["before"] == expected["original_rows"]
    train_rows = ds["df"][ds["df"]["__row_id"].isin(new_view["_included_row_ids"])]
    assert int((train_rows["Label"] == "Rare").sum()) == actual["after"]


def test_block_cannot_be_bypassed_by_acknowledgement(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=3)
    preview = _plan(ds, split, view)
    assert preview["rsm_report"]["status"] == "BLOCK"
    assert any(b["class"] == "Rare" for b in preview["rsm_report"]["blocks"])
    for approval in (APPROVE, ACK):
        with pytest.raises(SmellScopeError) as exc:
            apply_repair_plan(ds, split, view, preview, approval, run_id="rsm_block")
        assert exc.value.code == "E_RSM_BLOCK"
    assert not list(Path("data/repaired").glob("corrected_rsm_block_*"))


def test_feature_removal_warning_on_real_plan(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=100, const_cols=12)
    rec = {"id": "rec_const", "action_type": "DROP_CONSTANT_FEATURES", "action_params": {"features": [f"const_{i}" for i in range(12)]}}
    preview = _plan(ds, split, view, [rec])
    feats = preview["rsm_report"]["checks"]["features"]
    assert preview["rsm_report"]["status"] == "WARN" and feats["triggered"] is True
    assert feats["planned_removals"] == 12 and feats["names"][0] == "const_0"
    assert feats["remaining_count"] == feats["original_count"] - 12


def test_composite_plan_now_evaluates_real_clusters(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=100)
    preview = _plan(ds, split, view)
    clusters = preview["rsm_report"]["checks"]["clusters"]
    assert clusters, "cluster retention must be evaluated for composite plans"
    assert {c["class"] for c in clusters} <= {"DDoS", "Rare"}
    assert all(c["retention"] == 1.0 for c in clusters)  # nothing removed in this plan


def test_stale_preview_is_rejected_after_dataset_version_changes(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=18)
    first = _plan(ds, split, view)
    second = _plan(ds, split, view)
    new_view, _, meta = apply_repair_plan(ds, split, view, first, ACK, run_id="rsm_stale")
    assert meta["outcome"] == "APPLIED"
    with pytest.raises(SmellScopeError) as exc:
        apply_repair_plan(ds, split, new_view, second, ACK, run_id="rsm_stale")  # preview made for the old version
    assert exc.value.code == "E_STALE_PREVIEW"


def test_modified_plan_after_preview_is_rejected(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=18)
    preview = _plan(ds, split, view)

    tampered = copy.deepcopy(preview)
    tampered["_quarantined_row_ids"] = tampered["_quarantined_row_ids"][:-3]
    with pytest.raises(SmellScopeError) as exc:
        apply_repair_plan(ds, split, view, tampered, ACK, run_id="rsm_tamper")
    assert exc.value.code == "E_STALE_PREVIEW"

    with pytest.raises(SmellScopeError) as exc:  # the client approved a different plan than the one stored
        apply_repair_plan(ds, split, view, preview, ACK, run_id="rsm_tamper", expected_plan_hash="0" * 64)
    assert exc.value.code == "E_STALE_PREVIEW"

    ok = apply_repair_plan(ds, split, view, preview, ACK, run_id="rsm_tamper", expected_plan_hash=preview["plan_hash"])
    assert ok[2]["outcome"] == "APPLIED"


def test_locked_test_set_change_blocks_application_even_when_rsm_passes(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=100, const_cols=1)
    rec = {"id": "rec_const", "action_type": "DROP_CONSTANT_FEATURES", "action_params": {"features": ["const_0"]}}
    preview = _plan(ds, split, view, [rec])
    assert preview["rsm_report"]["status"] == "PASS"

    # Tamper with a locked test row after the preview (fingerprint must catch it).
    test_id = split["test_ids"][0]
    mask = ds["df"]["__row_id"] == test_id
    ds["df"].loc[mask, "Flow Duration"] = ds["df"].loc[mask, "Flow Duration"] + 1.0
    with pytest.raises(SmellScopeError) as exc:
        apply_repair_plan(ds, split, view, preview, APPROVE, run_id="rsm_test_fp")
    assert exc.value.code == "E_TEST_INTEGRITY"
    assert "fingerprint mismatch" in exc.value.message


def test_training_view_containing_test_rows_is_rejected(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=100, const_cols=1)
    rec = {"id": "rec_const", "action_type": "DROP_CONSTANT_FEATURES", "action_params": {"features": ["const_0"]}}
    leaky = copy.deepcopy(view)
    leaky["_included_row_ids"] = list(view["_included_row_ids"]) + [split["test_ids"][0]]
    preview = _plan(ds, split, leaky, [rec])
    with pytest.raises(SmellScopeError) as exc:
        apply_repair_plan(ds, split, leaky, preview, APPROVE, run_id="rsm_leak")
    assert exc.value.code in ("E_TEST_LEAK", "E_TEST_INTEGRITY")


def test_no_change_when_features_already_excluded(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=100, const_cols=1)
    rec = {"id": "rec_const", "action_type": "DROP_CONSTANT_FEATURES", "action_params": {"features": ["const_0"]}}
    first = _plan(ds, split, view, [rec])
    new_view, _, meta = apply_repair_plan(ds, split, view, first, APPROVE, run_id="rsm_nc")
    assert meta["outcome"] == "APPLIED"

    again = _plan(ds, split, new_view, [rec])  # fresh preview on the new version: nothing left to do
    same_view, log, meta2 = apply_repair_plan(ds, split, new_view, again, APPROVE, run_id="rsm_nc")
    assert meta2["outcome"] == "NO_CHANGE" and meta2["file_path"] is None
    assert same_view["view_id"] == new_view["view_id"]
    assert meta2["rsm_record"]["dataset_version"] is None


def test_plan_hash_is_deterministic_and_bound_to_dataset_version(tmp_path):
    ds, split, view = _build_dataset(tmp_path, rare_unique=18)
    a, b = _plan(ds, split, view), _plan(ds, split, view)
    assert a["plan_hash"] == b["plan_hash"] == compute_plan_hash(a)
    other = copy.deepcopy(a)
    other["base_view_hash"] = "different"
    assert compute_plan_hash(other) != a["plan_hash"]
