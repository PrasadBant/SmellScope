"""Regression tests for the Improvement Centre / comparison workflow integrity fixes.

Each test documents a concrete bug that was found by driving the real API end to end:

* recommendations lost ``action_params`` in the response schema, so every parameterised repair
  (ablation, imputation, ...) silently became a no-op;
* the repair preview trusted client-supplied recommendation payloads;
* a no-op repair still fabricated a new dataset version and export;
* model save called a non-existent ``rebenchmark`` method;
* the comparison response dropped row/feature diffs and the verdict, hardcoded
  ``same_test_ids`` and compared scores computed through different paths;
* the health endpoint always reported ``ok``.
"""

from __future__ import annotations

import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from smellscope.server.main import app

SAMPLE = Path("data/samples/cic2017_sample_planted.csv")
APPROVAL = {"approved": True, "warning_ack": True, "approved_at": "test"}

client = TestClient(app)


def _wait(run_id: str, timeout: float = 180.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = client.get(f"/api/v1/audits/{run_id}").json()
        if status["status"] in ("COMPLETED", "FAILED"):
            return status
        time.sleep(0.5)
    raise AssertionError("audit did not finish in time")


@pytest.fixture(scope="module")
def audited_run() -> dict:
    with open(SAMPLE, "rb") as fh:
        up = client.post("/api/v1/datasets/upload", files={"file": (SAMPLE.name, fh)})
    assert up.status_code == 200, up.text
    ds_id = up.json()["dataset_id"]
    val = client.post(f"/api/v1/datasets/{ds_id}/validate", json={"label_col": "Label", "benign_label": "BENIGN"})
    assert val.status_code == 200 and val.json()["valid"] is True

    start = client.post("/api/v1/audits", json={"dataset_id": ds_id, "seed": 42})
    assert start.status_code == 202, start.text
    run_id = start.json()["run_id"]
    assert _wait(run_id)["status"] == "COMPLETED"

    recs = client.get(f"/api/v1/audits/{run_id}/recommendations").json()["recommendations"]
    scores_before = client.get(f"/api/v1/audits/{run_id}/scores").json()
    return {"run_id": run_id, "dataset_id": ds_id, "recs": recs, "scores_before": scores_before}


def test_recommendations_expose_action_params_and_selection_flags(audited_run):
    recs = audited_run["recs"]
    assert recs, "planted-shortcut sample must yield at least one recommendation"
    for rec in recs:
        assert "action_params" in rec
        for flag in ("is_safe_under_rsm", "is_recommended", "is_high_priority"):
            assert isinstance(rec[flag], bool)
    ablations = [r for r in recs if r["action_type"] == "FEATURE_ABLATION"]
    assert ablations and all(r["action_params"].get("features") for r in ablations)


def test_preview_ignores_client_supplied_params_and_rejects_unknown_ids(audited_run):
    run_id = audited_run["run_id"]
    rec = next(r for r in audited_run["recs"] if r["action_type"] == "FEATURE_ABLATION")
    spoofed = {"id": rec["id"], "action_type": "FEATURE_ABLATION", "action_params": {"features": []}}
    prev = client.post(f"/api/v1/audits/{run_id}/repair-plan/preview", json={"selected_recs": [spoofed]})
    assert prev.status_code == 200, prev.text
    # Server-side recommendation wins over the (empty) client payload.
    assert prev.json()["feature_changes"] == rec["action_params"]["features"]

    bad = client.post(f"/api/v1/audits/{run_id}/repair-plan/preview", json={"selected_recs": [{"id": "rec_does_not_exist"}]})
    assert bad.status_code == 400


def test_apply_creates_real_new_version_and_preview_is_single_use(audited_run):
    run_id = audited_run["run_id"]
    rec = next(r for r in audited_run["recs"] if r["action_type"] == "FEATURE_ABLATION")
    prev = client.post(f"/api/v1/audits/{run_id}/repair-plan/preview", json={"selected_recs": [rec]}).json()
    dropped = prev["feature_changes"]
    assert dropped

    applied = client.post(
        f"/api/v1/audits/{run_id}/repair-plan/apply",
        json={"preview_id": prev["preview_id"], "approval": APPROVAL},
    )
    assert applied.status_code == 200, applied.text
    meta = applied.json()["export_metadata"]
    assert meta["outcome"] == "APPLIED"
    assert meta["total_columns"] > 0 and Path(meta["file_path"]).exists()
    header = Path(meta["file_path"]).read_text(encoding="utf-8").splitlines()[0]
    for feat in dropped:
        assert feat not in header.split(","), "dropped feature must be absent from the exported dataset"
    views_after_first = client.get(f"/api/v1/audits/{run_id}/views").json()

    # A preview authorises exactly one application: re-submitting it is rejected, never silently re-applied
    # and never turned into a fabricated "success". (NO_CHANGE is covered in tests/test_rsm.py.)
    again = client.post(
        f"/api/v1/audits/{run_id}/repair-plan/apply",
        json={"preview_id": prev["preview_id"], "approval": APPROVAL},
    )
    assert again.status_code in (400, 409), again.text
    assert client.get(f"/api/v1/audits/{run_id}/views").json() == views_after_first


def test_comparison_is_complete_verified_and_honest(audited_run):
    run_id = audited_run["run_id"]
    # Depends on the repair applied in the previous test (module-scoped run).
    cmp_ = client.get(f"/api/v1/audits/{run_id}/comparison")
    assert cmp_.status_code == 200, cmp_.text
    data = cmp_.json()

    # Fields that used to be stripped by the response schema.
    for key in ("row_diff", "feature_diff", "applied_transformations", "confusion_matrix_comparison", "scientific_verdict", "reaudit"):
        assert data.get(key) is not None, key

    integ = data["test_integrity"]
    assert integ["same_test_ids"] is True and integ["status"] == "LOCKED_TEST_VERIFIED"
    assert len(integ["test_fingerprint"]) == 64

    assert data["reaudit"]["performed"] is True and data["reaudit"]["classes_audited"] >= 1
    assert data["feature_diff"]["improved_count"] < data["feature_diff"]["original_count"]

    verdict = data["scientific_verdict"]
    assert verdict["verdict_type"] in {"IMPROVED", "MIXED", "WORSENED", "NO_MEASURABLE_CHANGE"}
    text = (verdict["summary"] + verdict["what_this_proves"]).lower()
    for banned in ("confirmatory success", "zero loss of threat detection", "proves model evaluation"):
        assert banned not in text

    # "before" is scored through the same path as the authoritative /scores endpoint on the original run.
    before = data["scores"]["before"]
    original = audited_run["scores_before"]
    assert before["overall_score"] == pytest.approx(original["overall_score"])
    assert before["evidence_coverage"] == pytest.approx(original["evidence_coverage"])

    # The dashboard score now describes the corrected view (re-audited), consistently with the comparison.
    after_now = client.get(f"/api/v1/audits/{run_id}/scores").json()
    assert after_now["overall_score"] == pytest.approx(data["scores"]["after"]["overall_score"])


def test_model_save_trains_on_demand(audited_run):
    saved = client.post("/api/v1/models/save", json={"run_id": audited_run["run_id"], "model_name": "regression"})
    assert saved.status_code == 201, saved.text
    model_id = saved.json()["model_id"]
    meta = client.get(f"/api/v1/models/{model_id}")
    assert meta.status_code == 200 and meta.json()["model_id"] == model_id
    assert client.delete(f"/api/v1/models/{model_id}").status_code in (200, 204)
    assert client.get(f"/api/v1/models/{model_id}").status_code == 404


def test_health_reports_real_checks():
    data = client.get("/api/v1/health").json()
    assert data["status"] in {"ok", "degraded"}
    for name in ("configuration", "dataset_storage", "run_storage", "ml_dependencies", "research_engine"):
        assert name in data["checks"] and "ok" in data["checks"][name]
    assert data["status"] == ("ok" if all(c["ok"] for c in data["checks"].values()) else "degraded")


def test_single_canonical_config_directory_has_merged_settings():
    from smellscope.pipeline.config import load_config

    assert not Path("configs").exists(), "duplicate config directory must not return"
    cfg = load_config()
    assert cfg["runtime"]["degradation_enabled"] is True
    assert "E_RSM_BLOCK" in cfg["error_mappings"]
    assert cfg["rsm"]["policy"]["min_class_retention_warn"] == 0.50
    assert cfg["rsm"]["policy"]["max_ablation_features_warn"] == 10
    assert cfg["config_hash"]
