"""HTTP-level RSM enforcement: the backend decides, the client cannot bypass it."""

from __future__ import annotations

import time

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from smellscope.server.main import app

client = TestClient(app)


def _dataset(rare_unique: int) -> pd.DataFrame:
    rng = np.random.default_rng(7)

    def rows(n, label, offset):
        return pd.DataFrame({
            "Destination Port": rng.integers(1, 60000, n),
            "Flow Duration": rng.random(n) * 1e5 + offset,
            "Total Fwd Packets": rng.integers(1, 500, n),
            "Flow Bytes/s": rng.random(n) * 1e4,
            "Label": label,
        })

    rare = rows(rare_unique, "Rare", 5e5).iloc[np.arange(100) % rare_unique].reset_index(drop=True)
    return pd.concat([rows(300, "BENIGN", 0), rows(100, "DDoS", 2e5), rare], ignore_index=True)


def _audited(tmp_path_factory, rare_unique: int) -> str:
    path = tmp_path_factory.mktemp(f"rsm{rare_unique}") / f"rsm_{rare_unique}.csv"
    _dataset(rare_unique).to_csv(path, index=False)
    with open(path, "rb") as fh:
        ds_id = client.post("/api/v1/datasets/upload", files={"file": (path.name, fh)}).json()["dataset_id"]
    assert client.post(f"/api/v1/datasets/{ds_id}/validate", json={"label_col": "Label", "benign_label": "BENIGN"}).status_code == 200
    run_id = client.post("/api/v1/audits", json={"dataset_id": ds_id, "seed": 42}).json()["run_id"]
    deadline = time.time() + 240
    while time.time() < deadline:
        st = client.get(f"/api/v1/audits/{run_id}").json()
        if st["status"] in ("COMPLETED", "FAILED"):
            break
        time.sleep(0.5)
    assert st["status"] == "COMPLETED", st
    return run_id


def _dedup_preview(run_id: str) -> dict:
    recs = client.get(f"/api/v1/audits/{run_id}/recommendations").json()["recommendations"]
    dedup = [r for r in recs if r["id"] == "rec_dq_duplicate_rows"]
    assert dedup, "duplicate-heavy dataset must produce a deduplication recommendation"
    res = client.post(f"/api/v1/audits/{run_id}/repair-plan/preview", json={"selected_recs": dedup})
    assert res.status_code == 200, res.text
    return res.json()


def _apply(run_id, preview, ack, include_hash=True):
    body = {"preview_id": preview["preview_id"], "approval": {"approved": True, "warning_ack": ack, "approved_at": "t"}}
    if include_hash:
        body["plan_hash"] = preview["plan_hash"]
    return client.post(f"/api/v1/audits/{run_id}/repair-plan/apply", json=body)


@pytest.fixture(scope="module")
def block_run(tmp_path_factory):
    return _audited(tmp_path_factory, rare_unique=3)


@pytest.fixture(scope="module")
def warn_run(tmp_path_factory):
    return _audited(tmp_path_factory, rare_unique=18)


def test_blocked_plan_is_rejected_by_the_api_even_with_acknowledgement(block_run):
    preview = _dedup_preview(block_run)
    report = preview["rsm_report"]
    assert report["status"] == "BLOCK" and report["requires_acknowledgement"] is False
    assert any(b["class"] == "Rare" for b in report["blocks"])
    assert preview["test_integrity"]["status"] == "VERIFIED" and preview["plan_hash"]

    for ack in (False, True):
        res = _apply(block_run, preview, ack)
        assert res.status_code == 403, res.text
        detail = res.json()["detail"]
        assert detail["code"] == "E_RSM_BLOCK" and "Rare" in detail["message"]
        assert detail["details"]["rsm_report"]["status"] == "BLOCK"

    # Nothing was applied and the rejection is on record.
    assert len(client.get(f"/api/v1/audits/{block_run}/views").json()["views"]) == 1
    events = client.get(f"/api/v1/audits/{block_run}/rsm-records").json()["records"]
    assert [e["event"] for e in events].count("APPLY_REJECTED") == 2
    assert events[0]["event"] == "PREVIEW" and events[0]["decision"] == "BLOCK"
    assert client.get(f"/api/v1/audits/{block_run}/export/dataset").status_code == 404


def test_warn_requires_acknowledgement_then_applies_with_a_full_safety_record(warn_run):
    preview = _dedup_preview(warn_run)
    report = preview["rsm_report"]
    assert report["status"] == "WARN" and report["requires_acknowledgement"] is True
    assert report["summary"].startswith("Your selected improvements may remove")
    assert {c["class"] for c in report["checks"]["classes"]} == {"BENIGN", "DDoS", "Rare"}

    refused = _apply(warn_run, preview, ack=False)
    assert refused.status_code == 400 and refused.json()["detail"]["code"] == "E_RSM_WARN_UNACKED"

    # A client that sends a different plan hash than the one it previewed is refused.
    wrong = client.post(
        f"/api/v1/audits/{warn_run}/repair-plan/apply",
        json={"preview_id": preview["preview_id"], "plan_hash": "0" * 64, "approval": {"approved": True, "warning_ack": True}},
    )
    assert wrong.status_code == 409 and wrong.json()["detail"]["code"] == "E_STALE_PREVIEW"

    ok = _apply(warn_run, preview, ack=True)
    assert ok.status_code == 200, ok.text
    meta = ok.json()["export_metadata"]
    record = meta["rsm_record"]
    assert meta["outcome"] == "APPLIED"
    assert (record["preview_decision"], record["apply_decision"]) == ("WARN", "WARN")
    assert record["acknowledgement_required"] and record["acknowledged"]
    assert record["preview_id"] == preview["preview_id"]
    assert record["transformation_id"] == ok.json()["change_log_entry"]["entry_id"]
    assert record["dataset_version"] == meta["view_id"] == ok.json()["view"]["view_id"]
    assert record["test_integrity"]["status"] == "VERIFIED"
    rare_actual = record["class_retention_actual"]["Rare"]
    rare_expected = next(c for c in record["class_retention_expected"] if c["class"] == "Rare")
    assert rare_actual["after"] == rare_expected["remaining_rows"]

    events = client.get(f"/api/v1/audits/{warn_run}/rsm-records").json()["records"]
    kinds = [e["event"] for e in events]
    assert kinds == ["PREVIEW", "APPLY_REJECTED", "APPLY_REJECTED", "APPLIED"]
    assert events[1]["outcome"] == "E_RSM_WARN_UNACKED" and events[1]["acknowledged"] is False
    assert events[2]["outcome"] == "E_STALE_PREVIEW"
    assert events[3]["acknowledged"] is True and events[3]["transformation_id"] == record["transformation_id"]


def test_preview_is_single_use_and_old_previews_become_stale(warn_run):
    # After the previous test applied a plan, the dataset version moved on: a new preview is needed.
    views = client.get(f"/api/v1/audits/{warn_run}/views").json()["views"]
    assert len(views) >= 2
    resp = client.post(
        f"/api/v1/audits/{warn_run}/repair-plan/apply",
        json={"preview_id": "plan_does_not_exist", "approval": {"approved": True, "warning_ack": True}},
    )
    assert resp.status_code == 400
