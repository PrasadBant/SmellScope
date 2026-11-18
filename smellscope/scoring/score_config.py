"""Scoring Configuration & Threshold Registry for SmellScope 2.0.

Provides versioned, transparent, and configurable weights, thresholds,
and qualitative interpretation categories for all dataset scoring dimensions.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict

SCORING_VERSION = "1.0.0"

# Qualitative interpretation bands for quality and reliability (higher = better)
DEFAULT_QUALITY_BANDS = {
    "EXCELLENT": {"min": 90.0, "max": 100.0, "label": "Excellent", "color": "#16A34A"},
    "GOOD": {"min": 75.0, "max": 89.99, "label": "Good", "color": "#2563EB"},
    "MODERATE": {"min": 60.0, "max": 74.99, "label": "Moderate", "color": "#D97706"},
    "POOR": {"min": 40.0, "max": 59.99, "label": "Poor", "color": "#EA580C"},
    "CRITICAL": {"min": 0.0, "max": 39.99, "label": "Critical", "color": "#DC2626"},
}

# Qualitative interpretation bands for shortcut and leakage risk (higher = GREATER RISK)
DEFAULT_RISK_BANDS = {
    "LOW": {"min": 0.0, "max": 24.99, "label": "Low Risk", "color": "#16A34A"},
    "MODERATE": {"min": 25.0, "max": 49.99, "label": "Moderate Risk", "color": "#D97706"},
    "HIGH": {"min": 50.0, "max": 74.99, "label": "High Risk", "color": "#EA580C"},
    "CRITICAL": {"min": 75.0, "max": 100.0, "label": "Critical Risk", "color": "#DC2626"},
}


def get_default_scoring_config() -> Dict[str, Any]:
    """Return the authoritative, versioned default scoring configuration."""
    return {
        "version": SCORING_VERSION,
        "bands": {
            "quality": DEFAULT_QUALITY_BANDS,
            "risk": DEFAULT_RISK_BANDS,
        },
        # 1. Dataset Data Quality Score Weights (must sum to 1.0)
        # Reflects raw hygiene, data-type validity, and parsing integrity
        "data_quality_weights": {
            "missing_values": 0.25,      # NaN / null cell proportion
            "infinite_values": 0.20,     # Inf / -Inf numeric proportion
            "duplicate_records": 0.15,   # Exact telemetry vector duplicates
            "invalid_numeric": 0.10,     # Non-numeric or corrupt values in numeric columns
            "constant_columns": 0.15,    # Zero-variance columns
            "label_completeness": 0.15,  # Valid label presence without nulls
        },
        # 2. NIDS Suitability Score Weights (must sum to 1.0)
        # Reflects statistical design suitability for ML intrusion detection
        "nids_suitability_weights": {
            "class_coverage": 0.25,           # Multi-class attack diversity + benign presence
            "minority_representation": 0.20,  # Adequate samples in smallest attack class
            "class_balance_fairness": 0.15,   # Penalizes 1-sample anomalies while allowing realistic network skew
            "feature_availability": 0.25,     # Essential NIDS feature roles (port, pkts, bytes, duration)
            "sample_size_adequacy": 0.15,     # Statistical power (minimum benchmark row count)
        },
        # 3. Shortcut & Leakage Risk Score Weights (must sum to 1.0)
        # HIGHER = GREATER RISK of model memorizing artifacts rather than attack patterns
        "shortcut_risk_weights": {
            "sfi_excess_fragility": 0.35,  # Monte Carlo null-calibrated shortcut reliance
            "hdf_dominance": 0.25,         # Single feature alone achieves F1 >= 0.85
            "ugt_port_artifacts": 0.15,    # Ephemeral or unassigned port binding
            "wl_repetition": 0.15,         # Deterministic packet length repetition
            "tc_traffic_collapse": 0.10,   # Intra-class collapse / lack of cluster diversity
        },
        # 4. ML Evaluation Reliability Score Weights (must sum to 1.0)
        # Reflects whether experimental methodology is trustworthy and leak-free
        "evaluation_reliability_weights": {
            "locked_test_isolation": 0.30,   # Test set untouched, split hash verified, zero leakage
            "train_only_fitting": 0.25,      # Preprocessing stats (medians/scalers) strictly fit on train
            "reproducibility": 0.20,         # Deterministic seed and full configuration manifest
            "multiclass_metric_rigor": 0.15, # Macro F1, weighted F1, and confusion matrix evaluated
            "metric_safety": 0.10,           # Safe zero-division and unseen class handling
        },
        # 5. Overall Dataset Assessment Synthesis Weights (must sum to 1.0)
        # Overall = w_dq * DQ + w_suit * NIDS + w_rel * Eval + w_safe * (100 - Shortcut_Risk)
        "overall_synthesis_weights": {
            "data_quality": 0.30,
            "nids_suitability": 0.30,
            "evaluation_reliability": 0.20,
            "shortcut_safety": 0.20,  # (100.0 - shortcut_risk)
        },
        # Operational Thresholds
        "thresholds": {
            "min_benchmark_rows": 1000,
            "min_minority_samples": 20,
            "max_acceptable_imbalance_ratio": 500.0,
            "hdf_danger_threshold": 0.60,
            "sfi_z_threshold": 2.0,
            "ugt_danger_threshold": 0.10,
            "wl_danger_threshold": 0.30,
        },
    }


def validate_scoring_config(cfg: Dict[str, Any]) -> None:
    """Validate that weights sum to 1.0 within floating point precision."""
    weight_groups = [
        "data_quality_weights",
        "nids_suitability_weights",
        "shortcut_risk_weights",
        "evaluation_reliability_weights",
        "overall_synthesis_weights",
    ]
    for grp in weight_groups:
        weights = cfg.get(grp, {})
        total = sum(weights.values())
        if abs(total - 1.0) > 1e-4:
            raise ValueError(f"Weights in '{grp}' must sum to 1.0 (found {total:.4f}).")


def get_interpretation_category(score: float, bands: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Resolve qualitative band descriptor for a given numeric score."""
    clamped = max(0.0, min(100.0, float(score)))
    for key, band in bands.items():
        if band["min"] <= clamped <= band["max"]:
            return {
                "key": key,
                "label": band["label"],
                "color": band["color"],
                "score": round(clamped, 2),
            }
    # Fallback to critical if edge rounding
    return {
        "key": "CRITICAL",
        "label": bands.get("CRITICAL", {}).get("label", "Critical"),
        "color": bands.get("CRITICAL", {}).get("color", "#DC2626"),
        "score": round(clamped, 2),
    }
