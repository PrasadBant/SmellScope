"""Comprehensive Unit and Scientific Verification Tests for SmellScope 2.0 Scoring Subsystem."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from smellscope.scoring import (
    DEFAULT_QUALITY_BANDS,
    DEFAULT_RISK_BANDS,
    SCORING_VERSION,
    clamp_score,
    compute_data_quality_score,
    compute_evaluation_reliability_score,
    compute_nids_suitability_score,
    compute_overall_dataset_assessment,
    compute_shortcut_risk_score,
    format_breakdown_table_html,
    format_breakdown_table_markdown,
    get_default_scoring_config,
    get_interpretation_category,
    safe_ratio,
    sanitize_floats,
    validate_scoring_config,
)


# ============================================================================
# 1. CONFIG & UTILITIES TESTS
# ============================================================================

def test_scoring_config_defaults_and_validation():
    cfg = get_default_scoring_config()
    assert cfg["version"] == SCORING_VERSION
    assert sum(cfg["overall_synthesis_weights"].values()) == pytest.approx(1.0, rel=1e-5)
    assert sum(cfg["data_quality_weights"].values()) == pytest.approx(1.0, rel=1e-5)
    assert sum(cfg["nids_suitability_weights"].values()) == pytest.approx(1.0, rel=1e-5)
    assert sum(cfg["shortcut_risk_weights"].values()) == pytest.approx(1.0, rel=1e-5)
    assert sum(cfg["evaluation_reliability_weights"].values()) == pytest.approx(1.0, rel=1e-5)

    # Valid config raises no exception
    validate_scoring_config(cfg)

    # Test invalid config raises ValueError
    bad_cfg = {
        "overall_synthesis_weights": {"data_quality": 0.5},
        "data_quality_weights": cfg["data_quality_weights"],
        "nids_suitability_weights": cfg["nids_suitability_weights"],
        "shortcut_risk_weights": cfg["shortcut_risk_weights"],
        "evaluation_reliability_weights": cfg["evaluation_reliability_weights"],
    }
    with pytest.raises(ValueError, match="must sum to 1.0"):
        validate_scoring_config(bad_cfg)


def test_score_validation_utilities():
    assert clamp_score(-10.5) == 0.0
    assert clamp_score(150.0) == 100.0
    assert clamp_score(85.5) == 85.5
    assert clamp_score(float("nan")) == 0.0

    assert safe_ratio(10, 20) == 0.5
    assert safe_ratio(10, 0) == 0.0
    assert safe_ratio(0, 10) == 0.0

    nested = {"a": np.float64(42.5), "b": [np.int64(1), float("nan")], "c": "text"}
    clean = sanitize_floats(nested)
    assert isinstance(clean["a"], float)
    assert clean["b"][1] == 0.0


def test_interpretation_categories():
    cat_high = get_interpretation_category(95.0, DEFAULT_QUALITY_BANDS)
    assert cat_high["key"] == "EXCELLENT"
    assert cat_high["label"] == "Excellent"

    cat_low = get_interpretation_category(20.0, DEFAULT_QUALITY_BANDS)
    assert cat_low["key"] == "CRITICAL"
    assert cat_low["label"] == "Critical"

    # Risk bands (inversed meaning)
    cat_risk_high = get_interpretation_category(85.0, DEFAULT_RISK_BANDS)
    assert cat_risk_high["key"] == "CRITICAL"
    assert cat_risk_high["label"] == "Critical Risk"

    cat_risk_low = get_interpretation_category(10.0, DEFAULT_RISK_BANDS)
    assert cat_risk_low["key"] == "LOW"
    assert cat_risk_low["label"] == "Low Risk"


# ============================================================================
# 2. DATA QUALITY SCORE TESTS
# ============================================================================

def test_data_quality_score_clean():
    np.random.seed(42)
    df = pd.DataFrame({
        "feature_1": np.random.randn(100),
        "feature_2": np.random.uniform(10, 100, 100),
        "feature_3": np.random.exponential(1.0, 100),
        "label": ["BENIGN"] * 80 + ["ATTACK"] * 20,
    })

    result = compute_data_quality_score(df, label_col="label")
    assert result["score"] == pytest.approx(100.0, abs=0.5)
    assert result["category"]["key"] == "EXCELLENT"
    assert len(result["breakdown"]) == 6
    assert result["raw_metrics"]["missing_cells"] == 0
    assert result["raw_metrics"]["infinite_cells"] == 0
    assert result["raw_metrics"]["duplicate_rows"] == 0
    assert result["raw_metrics"]["constant_columns_count"] == 0


def test_data_quality_score_penalties():
    # Construct DF with specific defects
    df = pd.DataFrame({
        "feat_clean": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
        "feat_nan": [1.0, np.nan, 3.0, np.nan, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0], # 20% NaN
        "feat_inf": [1.0, 2.0, np.inf, 4.0, 5.0, 6.0, 7.0, -np.inf, 9.0, 10.0], # 20% Inf
        "feat_const": [42.0] * 10, # Constant column
        "label": ["BENIGN"] * 8 + [None, "ATTACK"], # Unlabelled row
    })
    # Add a duplicate row
    df = pd.concat([df, df.iloc[[0]]], ignore_index=True)

    result = compute_data_quality_score(df, label_col="label")
    assert result["score"] < 80.0
    assert result["raw_metrics"]["missing_cells"] > 0
    assert result["raw_metrics"]["infinite_cells"] > 0
    assert result["raw_metrics"]["duplicate_rows"] == 1
    assert result["raw_metrics"]["constant_columns_count"] == 1
    assert result["raw_metrics"]["label_missing_count"] == 1


def test_data_quality_score_edge_cases():
    # Empty DF
    empty_df = pd.DataFrame()
    res_empty = compute_data_quality_score(empty_df, label_col="label")
    assert res_empty["score"] == 0.0
    assert "empty" in res_empty["summary"].lower()

    # DF with no features (only label)
    label_only_df = pd.DataFrame({"label": ["A", "B", "C"]})
    res_no_feat = compute_data_quality_score(label_only_df, label_col="label")
    assert res_no_feat["score"] == 0.0
    assert "no feature" in res_no_feat["summary"].lower()


# ============================================================================
# 3. NIDS SUITABILITY SCORE TESTS
# ============================================================================

def test_nids_suitability_score_typical():
    np.random.seed(42)
    n = 200
    df = pd.DataFrame({
        "Destination Port": np.random.randint(1, 65535, n),
        "Flow Duration": np.random.exponential(1000, n),
        "Total Fwd Packets": np.random.poisson(5, n),
        "Packet Length Mean": np.random.normal(500, 50, n),
        "FIN Flag Count": np.random.binomial(1, 0.1, n),
        "label": ["BENIGN"] * 160 + ["PortScan"] * 40,
    })

    result = compute_nids_suitability_score(df, label_col="label", benign_label="BENIGN")
    assert result["score"] >= 80.0
    assert result["raw_metrics"]["n_attack_classes"] == 1
    assert result["raw_metrics"]["class_counts"]["BENIGN"] == 160


def test_nids_suitability_imbalance_fairness():
    # Realistic NIDS imbalance: 95% Benign, 5% Attack
    n = 1000
    df = pd.DataFrame({
        "Destination Port": np.random.randint(1, 65535, n),
        "Flow Duration": np.random.exponential(1000, n),
        "Total Fwd Packets": np.random.poisson(5, n),
        "Packet Length Mean": np.random.normal(500, 50, n),
        "label": ["BENIGN"] * 950 + ["DDoS"] * 50,
    })

    result = compute_nids_suitability_score(df, label_col="label", benign_label="BENIGN")
    # Imbalance component should recognize realistic NIDS ratio without zeroing out
    imbalance_item = next(b for b in result["breakdown"] if b["metric"] == "Class Imbalance Fairness")
    assert imbalance_item["subscore"] >= 75.0

    # Extreme case: minority class with fewer than 5 samples
    df_severe = pd.DataFrame({
        "Destination Port": [80] * 1002,
        "Flow Duration": [100.0] * 1002,
        "Total Fwd Packets": [1] * 1002,
        "Packet Length Mean": [50.0] * 1002,
        "label": ["BENIGN"] * 1000 + ["Botnet"] * 2,
    })
    result_severe = compute_nids_suitability_score(df_severe, label_col="label", benign_label="BENIGN")
    minority_item = next(b for b in result_severe["breakdown"] if b["metric"] == "Minority Class Representation")
    assert minority_item["subscore"] < 60.0


def test_nids_suitability_missing_telemetry():
    # Dataset with generic non-telemetry columns
    df = pd.DataFrame({
        "feature_x": [1.0, 2.0, 3.0, 4.0],
        "feature_y": [10.0, 20.0, 30.0, 40.0],
        "label": ["BENIGN", "BENIGN", "ATTACK", "ATTACK"],
    })
    result = compute_nids_suitability_score(df, label_col="label", benign_label="BENIGN")
    telemetry_item = next(b for b in result["breakdown"] if b["metric"] == "Essential NIDS Telemetry Features")
    assert telemetry_item["subscore"] < 50.0


# ============================================================================
# 4. SHORTCUT RISK SCORE TESTS (HIGHER = GREATER RISK)
# ============================================================================

def test_shortcut_risk_score_clean():
    # Minimal smells audit result
    audit_clean = {
        "classes": [
            {
                "class": "PortScan",
                "ugt": {"ugt_score": 0.05, "status": "PASS"},
                "wl": {"wl_score": 0.02, "status": "PASS"},
                "hdf": {"auc": 0.52, "dominant_feature": None, "status": "PASS"},
                "sfi": {"fragility_ratio": 1.05, "suspicious_features": []},
            }
        ],
    }

    result = compute_shortcut_risk_score(audit_result=audit_clean)
    assert result["score"] < 25.0
    assert result["category"]["key"] in ("LOW", "MODERATE")
    assert len(result["candidate_shortcuts"]) == 0


def test_shortcut_risk_score_severe_smells():
    audit_toxic = {
        "classes": [
            {
                "class": "PortScan",
                "ugt": {"ugt_score": 0.95, "status": "FAIL", "top_ports": [4444]},
                "wl": {"wl_score": 0.88, "status": "FAIL"},
                "hdf": {"auc": 0.99, "dominant_feature": "Destination Port", "status": "FAIL"},
                "sfi": {
                    "fragility_ratio": 8.5,
                    "z": 4.2,
                    "excess_fragility": 0.85,
                    "suspicious_features": ["Destination Port", "Flow Duration"],
                },
            }
        ],
    }

    result = compute_shortcut_risk_score(audit_result=audit_toxic)
    # Severe shortcut risks should score high
    assert result["score"] > 60.0
    assert result["category"]["key"] in ("HIGH", "CRITICAL")
    assert len(result["candidate_shortcuts"]) > 0
    candidate_names = [sc["feature"] for sc in result["candidate_shortcuts"]]
    assert any("Destination Port" in name for name in candidate_names)


# ============================================================================
# 5. EVALUATION RELIABILITY SCORE TESTS
# ============================================================================

def test_evaluation_reliability_score_clean():
    split_info = {
        "train_ids": list(range(0, 100)),
        "test_ids": list(range(100, 140)),
        "split_hash": "a1b2c3d4e5f67890",
        "seed": 42,
    }
    baseline_eval = {
        "f1": 0.94,
        "weighted_f1": 0.95,
        "per_class": {"PortScan": 0.94},
        "confusion_matrix": [[100, 2], [3, 40]],
    }

    result = compute_evaluation_reliability_score(split=split_info, baseline_eval=baseline_eval)
    assert result["score"] >= 80.0
    assert result["category"]["key"] in ("EXCELLENT", "GOOD")


def test_evaluation_reliability_leakage_penalty():
    # Simulate partition overlap leakage
    split_leaked = {
        "train_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "test_ids": [5, 6, 7, 11, 12, 13], # IDs 5, 6, 7 overlap!
        "split_hash": "test_hash",
        "seed": 42,
    }

    result = compute_evaluation_reliability_score(split=split_leaked)
    isolation_item = next(b for b in result["breakdown"] if b["metric"] == "Locked Test Partition Isolation")
    # Subscore should suffer heavy leakage penalty
    assert isolation_item["subscore"] == 0.0
    assert result["score"] < 80.0


# ============================================================================
# 6. OVERALL DATASET ASSESSMENT SYNTHESIS TESTS
# ============================================================================

def test_overall_dataset_assessment_synthesis():
    np.random.seed(42)
    n = 200
    df = pd.DataFrame({
        "Destination Port": np.random.randint(1, 65535, n),
        "Flow Duration": np.random.exponential(1000, n),
        "Total Fwd Packets": np.random.poisson(5, n),
        "Packet Length Mean": np.random.normal(500, 50, n),
        "label": ["BENIGN"] * 160 + ["PortScan"] * 40,
    })

    split = {
        "train_ids": list(range(0, 150)),
        "test_ids": list(range(150, 200)),
        "split_hash": "c0ffee1234567890",
        "seed": 42,
    }

    audit_result = {
        "classes": [
            {
                "class": "PortScan",
                "ugt": {"ugt_score": 0.1, "status": "PASS"},
                "wl": {"wl_score": 0.05, "status": "PASS"},
                "hdf": {"auc": 0.55, "status": "PASS"},
                "sfi": {"fragility_ratio": 1.1, "suspicious_features": []},
            }
        ],
    }

    baseline_eval = {
        "f1": 0.92,
        "weighted_f1": 0.93,
        "per_class": {"PortScan": 0.92},
        "confusion_matrix": [[160, 0], [2, 38]],
    }

    assessment = compute_overall_dataset_assessment(
        df=df,
        label_col="label",
        benign_label="BENIGN",
        audit_result=audit_result,
        split=split,
        baseline_eval=baseline_eval,
    )

    assert assessment["scoring_version"] == SCORING_VERSION
    assert 0.0 <= assessment["overall_score"] <= 100.0
    assert assessment["evidence_coverage"] == 1.0

    # Verify mathematical synthesis: 0.30*DQ + 0.30*NIDS + 0.20*Rel + 0.20*(100 - Risk)
    dq = assessment["dimensions"]["data_quality"]["score"]
    nids = assessment["dimensions"]["nids_suitability"]["score"]
    risk = assessment["dimensions"]["shortcut_risk"]["score"]
    rel = assessment["dimensions"]["evaluation_reliability"]["score"]
    expected_overall = (0.30 * dq) + (0.30 * nids) + (0.20 * rel) + (0.20 * (100.0 - risk))
    assert assessment["overall_score"] == pytest.approx(round(expected_overall, 2), abs=0.1)


# ============================================================================
# 7. BREAKDOWN FORMATTER TESTS
# ============================================================================

def test_breakdown_formatters():
    breakdown = [
        {
            "metric": "Missing Values (Completeness)",
            "measured_value": "100 cells (1.00%)",
            "subscore": 95.0,
            "weight": 0.25,
            "contribution": 23.75,
            "explanation": "Evaluates absence of NaN/null cells across feature columns.",
        },
        {
            "metric": "Infinite Values (Numeric Sanity)",
            "measured_value": "0 cells (0.00%)",
            "subscore": 100.0,
            "weight": 0.20,
            "contribution": 20.0,
            "explanation": "Evaluates presence of Inf/-Inf numbers.",
        },
    ]

    md = format_breakdown_table_markdown(breakdown)
    assert "| Metric / Component | Measured Value | Subscore | Weight | Contribution | Explanation |" in md
    assert "Missing Values (Completeness)" in md
    assert "+23.75" in md

    html = format_breakdown_table_html(breakdown)
    assert "<table" in html
    assert "<th>Metric / Component</th>" in html
    assert "Missing Values (Completeness)" in html
    assert "+23.75" in html
