"""Tests for Model Persistence, Versioned Registry, and Training Bundle ZIP Generation (Phase 13)."""

from __future__ import annotations

import io
import zipfile
from fastapi.testclient import TestClient
import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import RandomForestClassifier

from smellscope.core.preprocess import fit_preprocessor
from smellscope.models.registry import model_registry
from smellscope.server.main import app

client = TestClient(app)


def test_model_registry_save_load_verify_and_bundle(tmp_path):
    """Verify complete lifecycle: save, list, verify schema, predict, and ZIP export."""
    np.random.seed(42)
    n = 60
    feature_cols = ["f1", "f2", "f3"]
    df = pd.DataFrame({
        "__row_id": np.arange(n),
        "f1": np.random.randn(n),
        "f2": np.random.randn(n),
        "f3": np.random.randn(n),
        "Label": ["BENIGN"] * 40 + ["PortScan"] * 20,
    })

    prep = fit_preprocessor(df, feature_cols=feature_cols)
    X = prep.transform(df)[feature_cols].to_numpy()
    y = df["Label"].to_numpy()

    rf = RandomForestClassifier(n_estimators=10, random_state=42)
    rf.fit(X, y)

    metrics = {
        "train": {"acc": 1.0, "f1": 1.0},
        "val": {"acc": 0.95, "f1": 0.90},
        "test": {"acc": 0.95, "f1": 0.90, "tpr": 0.90, "tnr": 0.95, "fpr": 0.05, "fnr": 0.10},
    }

    # 1. Save model
    meta = model_registry.save_trained_model(
        model=rf,
        preprocessor=prep,
        feature_cols=feature_cols,
        label_col="Label",
        benign_label="BENIGN",
        metrics=metrics,
        dataset_id="test_ds",
        dataset_fingerprint="sha256_dummy_fingerprint",
        run_id="run_test_123",
        view_id="view_0001",
        train_df=df.head(40),
        test_df=df.tail(20),
        split_manifest={"train_ids": list(range(40)), "test_ids": list(range(40, 60))},
    )

    model_id = meta["model_id"]
    assert model_id.startswith("model_")
    assert meta["algorithm"] == "RandomForestClassifier"

    # 2. List models
    models_list = model_registry.list_models()
    assert any(m["model_id"] == model_id for m in models_list)

    # 3. Retrieve metadata
    retrieved = model_registry.get_model_metadata(model_id)
    assert retrieved["model_id"] == model_id
    assert retrieved["provenance"]["dataset_id"] == "test_ds"
    assert retrieved["schema"]["feature_cols"] == feature_cols

    # 4. Verify compatibility
    # Compatible dataframe
    comp_ok = model_registry.verify_compatibility(model_id, df)
    assert comp_ok["compatible"] is True
    assert len(comp_ok["missing_features"]) == 0

    # Incompatible dataframe (missing f3)
    df_incompat = df[["f1", "f2", "Label"]]
    comp_fail = model_registry.verify_compatibility(model_id, df_incompat)
    assert comp_fail["compatible"] is False
    assert "f3" in comp_fail["missing_features"]

    # 5. Predict with model
    preds = model_registry.predict_with_model(model_id, df.head(10))
    assert len(preds["predictions"]) == 10
    assert "PortScan" in preds["classes"]
    assert "BENIGN" in preds["classes"]
    assert preds["probabilities"] is not None

    # Incompatible predict raises error
    with pytest.raises(Exception):
        model_registry.predict_with_model(model_id, df_incompat)

    # 6. Generate and verify complete training bundle ZIP (Phase 13.3)
    zip_bytes = model_registry.generate_training_bundle_zip(model_id)
    assert len(zip_bytes) > 0

    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    file_list = zf.namelist()
    assert "model.joblib" in file_list
    assert "preprocessor.joblib" in file_list
    assert "improved_train_dataset.csv" in file_list
    assert "locked_test_dataset.csv" in file_list
    assert "split_manifest.json" in file_list
    assert "feature_and_label_config.json" in file_list
    assert "model_config.json" in file_list
    assert "reproducibility_manifest.json" in file_list
    assert "README.md" in file_list


def test_models_api_endpoints():
    """Verify HTTP API endpoints for model listing, downloading, and bundle generation."""
    # List models
    resp_list = client.get("/api/v1/models")
    assert resp_list.status_code == 200
    models = resp_list.json()
    assert isinstance(models, list)
    assert len(models) >= 1
    model_id = models[0]["model_id"]

    # Details
    resp_det = client.get(f"/api/v1/models/{model_id}")
    assert resp_det.status_code == 200
    assert resp_det.json()["model_id"] == model_id

    # Artifact download
    resp_dl = client.get(f"/api/v1/models/{model_id}/download")
    assert resp_dl.status_code == 200
    assert resp_dl.headers["content-type"] == "application/octet-stream"

    # Training bundle ZIP download
    resp_bundle = client.get(f"/api/v1/models/{model_id}/bundle")
    assert resp_bundle.status_code == 200
    assert resp_bundle.headers["content-type"] == "application/zip"
    assert "filename=" in resp_bundle.headers["content-disposition"]
