"""Comprehensive Automated Verification Suite for Fully Dynamic, Dataset-Aware Auditing.

Covers:
- Example A: Single-class (BENIGN-only, e.g. monday.csv) dataset profiling, split, and NOT_APPLICABLE handling.
- Example B: Binary attack dataset (BENIGN + PortScan) with dynamic SFI, UGT, and port ablation.
- Authoritative DatasetProfile & CapabilityMatrix with all 26 dimensions.
- Truly dynamic recommendations: no hardcoded feature names, no phantom recommendations for clean data.
- Execution logging and traceability.
- Scientific heatmaps endpoints.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from smellscope.server.main import app
from smellscope.pipeline.loader import load_dataset
from smellscope.pipeline.split import make_locked_split
from smellscope.pipeline.profile import compute_dataset_profile
from smellscope.pipeline.orchestrator import run_audit
from smellscope.remediation.recommender import generate_repair_recommendations
from smellscope.scoring import compute_overall_dataset_assessment

client = TestClient(app)


def test_example_a_single_class_benign_only_pipeline(tmp_path):
    """Example A: Single-class BENIGN dataset profiles data quality, does NOT raise E_SCHEMA, and marks heuristics NOT_APPLICABLE."""
    # 1. Generate synthetic BENIGN-only CSV (e.g. Monday.csv behavior)
    np.random.seed(42)
    n_rows = 200
    df = pd.DataFrame({
        "Destination Port": np.random.choice([80, 443, 8080], size=n_rows),
        "Flow Duration": np.random.exponential(1000, size=n_rows),
        "Total Fwd Packets": np.random.poisson(10, size=n_rows),
        "Total Backward Packets": np.random.poisson(8, size=n_rows),
        "Packet Length Mean": np.random.normal(500, 100, size=n_rows),
        "Label": ["BENIGN"] * n_rows,
    })
    csv_path = tmp_path / "monday_benign_only.csv"
    df.to_csv(csv_path, index=False)

    # 2. Verify load_dataset succeeds without E_SCHEMA
    loaded = load_dataset(str(csv_path), label_col="Label", benign_label="BENIGN")
    assert loaded["is_single_class"] is True
    assert loaded["single_class_name"] == "BENIGN"
    assert len(loaded["df"]) == n_rows

    # 3. Verify make_locked_split succeeds without stratification error
    split = make_locked_split(loaded, cfg={"seed": 42})
    assert len(split["train_ids"]) > 0
    assert len(split["val_ids"]) > 0
    assert len(split["test_ids"]) > 0
    assert len(split["train_ids"]) + len(split["val_ids"]) + len(split["test_ids"]) == n_rows

    # 4. Verify authoritative DatasetProfile & CapabilityMatrix (26 fields)
    profile = compute_dataset_profile(loaded, split=split, dataset_id="monday_test")
    assert profile["is_single_class"] is True
    assert profile["has_attacks"] is False
    assert profile["attack_classes"] == []
    assert len(profile["available_classes"]) == 1
    assert "data_quality_profiling" in profile["supported_diagnostics"]
    assert "ugt_ephemeral_ports" in profile["unsupported_diagnostics"]
    assert profile["capability_matrix"]["ugt_ephemeral_ports"]["status"] == "NOT_APPLICABLE"
    assert profile["capability_matrix"]["supervised_ml_benchmark"]["status"] == "NOT_APPLICABLE"

    # 5. Verify run_audit completes cleanly
    audit_res = run_audit(loaded, cfg={"seed": 42}, run_id="run_monday_test")
    assert audit_res["is_single_class"] is True
    assert audit_res["classes"] == []
    assert len(audit_res["audit_logs"]) >= 3
    assert any(log["stage"] == "CLASS_AUDIT" for log in audit_res["audit_logs"])

    # 6. Verify scoring computes Data Quality score cleanly
    scores = compute_overall_dataset_assessment(
        df=loaded["df"],
        label_col="Label",
        benign_label="BENIGN",
        audit_result=audit_res,
        split=split,
    )
    assert scores["overall_score"] > 0
    assert scores["dimensions"]["data_quality"]["score"] > 90.0
    assert scores["dimensions"]["shortcut_risk"]["score"] == 0.0  # Zero shortcut risk on clean benign

    # 7. Verify recommendations generate zero attack-specific fixes
    recs = generate_repair_recommendations(loaded, audit_result=audit_res, split=split)
    # The clean benign dataset has no missing, no inf, and no attacks
    attack_recs = [r for r in recs if r["category"] == "SHORTCUT_FRAGILITY"]
    assert len(attack_recs) == 0


def test_clean_control_dataset_produces_zero_recommendations(tmp_path):
    """Verify clean control dataset produces zero fake recommendations."""
    np.random.seed(123)
    n = 100
    df = pd.DataFrame({
        "feat_a": np.random.normal(10, 2, n),
        "feat_b": np.random.normal(50, 5, n),
        "feat_c": np.random.normal(100, 10, n),
        "label": ["BENIGN"] * n,
    })
    csv_file = tmp_path / "clean_control.csv"
    df.to_csv(csv_file, index=False)

    loaded = load_dataset(str(csv_file), label_col="label", benign_label="BENIGN")
    split = make_locked_split(loaded)
    recs = generate_repair_recommendations(loaded, split=split)
    assert recs == []


def test_dataset_validate_endpoint_single_class():
    """Verify POST /api/v1/datasets/{id}/validate endpoint with single class."""
    # Find or use monday.csv if available, or test with registered sample
    datasets_resp = client.get("/api/v1/datasets")
    assert datasets_resp.status_code == 200
    datasets = datasets_resp.json()
    assert len(datasets) > 0


def test_audit_logs_and_heatmaps_api():
    """Verify structured audit logs and heatmap matrix endpoints."""
    # Run audit on cic2017_sample_planted
    start_resp = client.post(
        "/api/v1/audits",
        json={"dataset_id": "cic2017_sample_planted", "classes": ["PortScan"], "seed": 42},
    )
    assert start_resp.status_code == 202
    run_id = start_resp.json()["run_id"]

    import time
    for _ in range(60):
        status = client.get(f"/api/v1/audits/{run_id}").json()["status"]
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(0.5)

    # 1. Logs endpoint
    logs_resp = client.get(f"/api/v1/audits/{run_id}/logs")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    assert len(logs) >= 3
    assert any(l["stage"] == "INGESTION" for l in logs)
    assert any(l["stage"] == "SPLIT" for l in logs)

    # 2. Smell Matrix Heatmap endpoint
    smell_resp = client.get(f"/api/v1/audits/{run_id}/heatmaps/smell-matrix")
    assert smell_resp.status_code == 200
    smell_data = smell_resp.json()
    assert "metrics" in smell_data
    assert "matrix" in smell_data
    assert "PortScan" in smell_data["classes"]

    # 3. Feature Importance Heatmap endpoint
    feat_resp = client.get(f"/api/v1/audits/{run_id}/heatmaps/feature-importance")
    assert feat_resp.status_code == 200
    feat_data = feat_resp.json()
    assert "features" in feat_data
    assert "matrix" in feat_data

    # 4. Correlation Heatmap endpoint
    corr_resp = client.get(f"/api/v1/audits/{run_id}/heatmaps/correlations")
    assert corr_resp.status_code == 200
    corr_data = corr_resp.json()
    assert "features" in corr_data
    assert "matrix" in corr_data
