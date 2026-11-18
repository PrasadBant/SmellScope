"""Integration tests for FastAPI HTTP boundary and scientific contracts."""

from __future__ import annotations

import time
from fastapi.testclient import TestClient
import pytest

from smellscope.server.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify system health, API version, and scientific auditor notice."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["api_version"] == "1.0.0"
    assert data["research_engine_available"] is True
    assert "scientific benchmark dataset auditor" in data["scientific_disclaimer"]


def test_datasets_endpoints():
    """Verify dataset listing, metadata, and preview retrieval."""
    resp = client.get("/api/v1/datasets")
    assert resp.status_code == 200
    datasets = resp.json()
    assert len(datasets) >= 1
    ds_id = datasets[0]["dataset_id"]

    # Metadata
    meta_resp = client.get(f"/api/v1/datasets/{ds_id}")
    assert meta_resp.status_code == 200
    meta = meta_resp.json()
    assert meta["dataset_id"] == ds_id
    assert "Label" in meta["label_col"] or "attack_cat" in meta["label_col"]
    assert len(meta["class_counts"]) >= 2

    # Preview
    prev_resp = client.get(f"/api/v1/datasets/{ds_id}/preview?limit=10")
    assert prev_resp.status_code == 200
    preview = prev_resp.json()
    assert len(preview["preview_rows"]) <= 10
    assert preview["total_rows"] > 0
    assert len(preview["columns"]) > 0


def test_audit_execution_and_results_flow():
    """Verify asynchronous audit dispatch, polling, and results retrieval."""
    datasets = client.get("/api/v1/datasets").json()
    assert len(datasets) >= 1
    ds_id = datasets[0]["dataset_id"]

    # Start audit
    start_resp = client.post(
        "/api/v1/audits",
        json={"dataset_id": ds_id, "classes": ["PortScan"], "seed": 42},
    )
    assert start_resp.status_code == 202
    run_id = start_resp.json()["run_id"]
    assert run_id.startswith("run_")

    # Poll status until completed (timeout after 30s)
    max_wait = 30
    start_time = time.time()
    final_status = "QUEUED"
    while time.time() - start_time < max_wait:
        st_resp = client.get(f"/api/v1/audits/{run_id}")
        assert st_resp.status_code == 200
        final_status = st_resp.json()["status"]
        if final_status in ("COMPLETED", "FAILED"):
            break
        time.sleep(0.5)

    assert final_status == "COMPLETED"

    # Fetch results
    res_resp = client.get(f"/api/v1/audits/{run_id}/results")
    assert res_resp.status_code == 200
    result = res_resp.json()
    assert result["schema_version"] == "1.0"
    assert result["run_id"] == run_id
    assert len(result["classes"]) >= 1

    class_res = result["classes"][0]
    assert class_res["class"] == "PortScan"
    assert "UGT" in class_res["paper"]
    assert "sfi_top" in class_res["sfi"]

    # Diagnostic drill-down
    diag_resp = client.get(f"/api/v1/audits/{run_id}/classes/PortScan/diagnostics")
    assert diag_resp.status_code == 200
    assert diag_resp.json()["class"] == "PortScan"


def test_remediation_and_rsm_lifecycle():
    """Verify remediation preview, RSM enforcement, apply, rebenchmark, and rollback."""
    datasets = client.get("/api/v1/datasets").json()
    ds_id = datasets[0]["dataset_id"]

    # Start and wait for audit
    start_resp = client.post(
        "/api/v1/audits",
        json={"dataset_id": ds_id, "classes": ["PortScan"], "seed": 42},
    )
    run_id = start_resp.json()["run_id"]

    for _ in range(60):
        if client.get(f"/api/v1/audits/{run_id}").json()["status"] == "COMPLETED":
            break
        time.sleep(0.5)

    # 1. Preview R1 Feature Ablation
    prev_resp = client.post(
        f"/api/v1/audits/{run_id}/remediations/preview",
        json={"action": "R1", "params": {"features": ["Destination Port"]}},
    )
    assert prev_resp.status_code == 200
    preview = prev_resp.json()
    assert preview["preview_id"].startswith("prev_")
    assert preview["action"] == "R1"
    assert "rsm_report" in preview
    assert preview["rsm_report"]["status"] in ("PASS", "WARN", "BLOCK")

    # 2. Apply Remediation
    apply_resp = client.post(
        f"/api/v1/audits/{run_id}/remediations/apply",
        json={
            "preview_id": preview["preview_id"],
            "approval": {"approved": True, "warning_ack": True, "approved_at": "test"},
        },
    )
    assert apply_resp.status_code == 200
    applied_data = apply_resp.json()
    assert applied_data["view"]["view_id"] == "view_0001"
    entry_id = applied_data["change_log_entry"]["entry_id"]

    # 3. Check Views
    views_resp = client.get(f"/api/v1/audits/{run_id}/views")
    assert views_resp.status_code == 200
    views_data = views_resp.json()
    assert len(views_data["views"]) == 2
    assert views_data["active_view"]["view_id"] == "view_0001"

    # 4. Rebenchmark on locked test set
    rebench_resp = client.post(
        f"/api/v1/audits/{run_id}/rebenchmark",
        json={"target_class": "PortScan"},
    )
    assert rebench_resp.status_code == 200
    rebench_data = rebench_resp.json()
    assert rebench_data["same_test_ids"] is True
    assert "delta" in rebench_data

    # 5. Rollback
    rb_resp = client.post(
        f"/api/v1/audits/{run_id}/rollback",
        json={"target_entry_id": entry_id},
    )
    assert rb_resp.status_code == 200
    rb_data = rb_resp.json()
    assert rb_data["integrity_verified"] is True
    assert rb_data["restored_view"]["view_id"] == "view_0000"


def test_report_generation_and_download():
    """Verify offline HTML report generation and file download."""
    datasets = client.get("/api/v1/datasets").json()
    ds_id = datasets[0]["dataset_id"]

    start_resp = client.post(
        "/api/v1/audits",
        json={"dataset_id": ds_id, "classes": ["PortScan"], "seed": 42},
    )
    run_id = start_resp.json()["run_id"]

    for _ in range(60):
        if client.get(f"/api/v1/audits/{run_id}").json()["status"] == "COMPLETED":
            break
        time.sleep(0.5)

    # Generate report
    rep_resp = client.post(
        f"/api/v1/audits/{run_id}/reports",
        json={"include_rebenchmark": True},
    )
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert rep_data["report_id"].startswith("rep_")

    # Download report
    dl_resp = client.get(rep_data["download_url"])
    assert dl_resp.status_code == 200
    assert "text/html" in dl_resp.headers["content-type"]
    assert "SmellScope 2.0" in dl_resp.text
    assert "SCIENTIFIC INTEGRITY NOTICE" in dl_resp.text


def test_production_frontend_serving():
    """Verify that FastAPI serves the built React single-page application."""
    resp = client.get("/")
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert '<div id="root">' in resp.text
    assert "SmellScope 2.0" in resp.text

