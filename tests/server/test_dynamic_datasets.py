"""Dataset-adaptive workflow tests: the pipeline must react to what each dataset actually contains."""

from __future__ import annotations

import time

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from smellscope.server.main import app

client = TestClient(app)
APPROVAL = {"approved": True, "warning_ack": True, "approved_at": "test"}


def _frame(n: int, labels, probs, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame(
        {
            "Destination Port": rng.choice([80, 443, 53, 22, 50000], n),
            "Flow Duration": rng.integers(1, 10**6, n).astype(float),
            "Total Fwd Packets": rng.integers(1, 100, n),
            "Total Backward Packets": rng.integers(0, 100, n),
            "Flow Bytes/s": rng.random(n) * 1e4,
            "Packet Length Mean": rng.random(n) * 500,
            "Label": rng.choice(labels, n, p=probs),
        }
    )


def _run_audit(tmp_path, df: pd.DataFrame, name: str, benign: str):
    path = tmp_path / name
    df.to_csv(path, index=False)
    with open(path, "rb") as fh:
        up = client.post("/api/v1/datasets/upload", files={"file": (name, fh)})
    assert up.status_code == 200, up.text
    ds_id = up.json()["dataset_id"]
    val = client.post(f"/api/v1/datasets/{ds_id}/validate", json={"label_col": "Label", "benign_label": benign})
    assert val.status_code == 200, val.text
    run_id = client.post("/api/v1/audits", json={"dataset_id": ds_id, "seed": 42}).json()["run_id"]
    deadline = time.time() + 240
    while time.time() < deadline:
        st = client.get(f"/api/v1/audits/{run_id}").json()
        if st["status"] in ("COMPLETED", "FAILED"):
            break
        time.sleep(0.5)
    assert st["status"] == "COMPLETED", st
    return ds_id, run_id, val.json()


def test_benign_only_dataset_is_not_applicable_for_supervised_workflow(tmp_path):
    df = _frame(300, ["BENIGN"], [1.0])
    _, run_id, val = _run_audit(tmp_path, df, "benign_only.csv", "BENIGN")

    assert val["is_single_class"] is True
    assert "supervised_ml_benchmark" not in val["supported_diagnostics"]
    assert "sfi_shortcut_fragility" not in val["supported_diagnostics"]

    # No attack-specific findings or fabricated repairs for a single-class dataset.
    recs = client.get(f"/api/v1/audits/{run_id}/recommendations").json()["recommendations"]
    assert all(r["category"] == "DATA_QUALITY" for r in recs)

    # No supervised model can be saved.
    saved = client.post("/api/v1/models/save", json={"run_id": run_id})
    assert saved.status_code == 400
    assert saved.json()["detail"]["code"] == "E_NOT_APPLICABLE"

    # Comparison without any repair reports NO_CHANGE rather than inventing an improvement.
    cmp_ = client.get(f"/api/v1/audits/{run_id}/comparison").json()
    assert cmp_["scientific_verdict"]["verdict_type"] == "NO_CHANGE"
    assert cmp_["reaudit"]["performed"] is False


@pytest.fixture(scope="module")
def dirty_run(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("dirty")
    df = _frame(600, ["BENIGN", "DDoS", "PortScan"], [0.6, 0.2, 0.2])
    df.loc[df.sample(40, random_state=1).index, "Flow Duration"] = np.nan
    df.loc[df.sample(25, random_state=2).index, "Flow Bytes/s"] = np.inf
    df = pd.concat([df, df.sample(80, random_state=3)], ignore_index=True)
    df["Constant Col"] = 7
    ds_id, run_id, _ = _run_audit(tmp, df, "dirty.csv", "BENIGN")
    return {"run_id": run_id, "df": df}


def test_recommendations_are_derived_from_actual_dataset_defects(dirty_run):
    recs = client.get(f"/api/v1/audits/{dirty_run['run_id']}/recommendations").json()["recommendations"]
    ids = {r["id"] for r in recs}
    assert "rec_dq_missing_imputation" in ids
    assert "rec_dq_duplicate_rows" in ids
    assert "rec_dq_constant_features" in ids
    const = next(r for r in recs if r["id"] == "rec_dq_constant_features")
    assert const["action_params"]["features"] == ["Constant Col"]
    missing = next(r for r in recs if r["id"] == "rec_dq_missing_imputation")
    assert set(missing["action_params"]["columns"]) >= {"Flow Duration"}


def test_applied_repairs_change_data_and_scores_stay_consistent(dirty_run):
    run_id = dirty_run["run_id"]
    recs = client.get(f"/api/v1/audits/{run_id}/recommendations").json()["recommendations"]
    prev = client.post(f"/api/v1/audits/{run_id}/repair-plan/preview", json={"selected_recs": recs})
    assert prev.status_code == 200, prev.text
    plan = prev.json()
    assert plan["expected_train_size"]["after"] < plan["expected_train_size"]["before"]

    applied = client.post(
        f"/api/v1/audits/{run_id}/repair-plan/apply",
        json={"preview_id": plan["preview_id"], "approval": APPROVAL},
    )
    assert applied.status_code == 200, applied.text
    assert applied.json()["export_metadata"]["outcome"] == "APPLIED"

    cmp_ = client.get(f"/api/v1/audits/{run_id}/comparison").json()
    dq = cmp_["data_quality"]
    assert dq["after"]["missing_values"] == 0 and dq["before"]["missing_values"] > 0
    assert dq["after"]["duplicate_records"] < dq["before"]["duplicate_records"]
    assert cmp_["test_integrity"]["same_test_ids"] is True
    assert cmp_["reaudit"]["performed"] is True

    # One authoritative score: dashboard endpoint == comparison "after" for the active corrected view.
    now = client.get(f"/api/v1/audits/{run_id}/scores").json()
    assert now["overall_score"] == pytest.approx(cmp_["scores"]["after"]["overall_score"])
    assert now["evidence_coverage"] == pytest.approx(cmp_["scores"]["after"]["evidence_coverage"])
