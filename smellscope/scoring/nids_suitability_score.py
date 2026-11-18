"""Dataset Suitability Score for NIDS Research for SmellScope 2.0.

Evaluates whether a dataset has the statistical and domain structure necessary
for realistic Network Intrusion Detection System (NIDS) machine learning research.
Scale: 0 to 100 (Higher = more suitable, representative, and statistically sound).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from smellscope.scoring.score_config import (
    DEFAULT_QUALITY_BANDS,
    get_default_scoring_config,
    get_interpretation_category,
)
from smellscope.scoring.score_validation import clamp_score, safe_ratio, sanitize_floats


def compute_nids_suitability_score(
    df: pd.DataFrame,
    label_col: str,
    benign_label: str = "BENIGN",
    feature_cols: Optional[List[str]] = None,
    roles: Optional[Dict[str, Any]] = None,
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compute NIDS Research Suitability Score and itemized breakdown.

    Parameters
    ----------
    df : pd.DataFrame
        Loaded dataset dataframe.
    label_col : str
        Ground truth label column.
    benign_label : str
        Identifier for normal / benign baseline traffic.
    feature_cols : list of str, optional
        Feature column names.
    roles : dict, optional
        Pre-mapped column semantic roles (e.g. dst_port, flow_duration).
    cfg : dict, optional
        Scoring configuration dictionary.

    Returns
    -------
    dict
        Scoring result containing:
        - score: float in [0.0, 100.0]
        - category: Band descriptor
        - breakdown: List of itemized subscore components
        - raw_metrics: Measurement details
        - summary: Plain-language research narrative
    """
    cfg = cfg or get_default_scoring_config()
    weights = cfg.get("nids_suitability_weights", get_default_scoring_config()["nids_suitability_weights"])
    bands = cfg.get("bands", {}).get("quality", DEFAULT_QUALITY_BANDS)

    if df is None or len(df) == 0:
        return {
            "score": 0.0,
            "category": get_interpretation_category(0.0, bands),
            "breakdown": [],
            "raw_metrics": {},
            "summary": "Empty dataset cannot be evaluated for NIDS suitability.",
        }

    n_rows = len(df)
    roles = roles or {}

    # Check label column
    if label_col not in df.columns:
        return {
            "score": 0.0,
            "category": get_interpretation_category(0.0, bands),
            "breakdown": [],
            "raw_metrics": {"error": f"Missing label column '{label_col}'"},
            "summary": f"Label column '{label_col}' not found. Cannot evaluate supervised NIDS suitability.",
        }

    class_counts: Dict[str, int] = {str(k): int(v) for k, v in df[label_col].value_counts().items()}
    has_benign = benign_label in class_counts
    attack_classes = [c for c in class_counts if c != benign_label]
    n_attack_classes = len(attack_classes)

    # 1. Class Coverage (Benign Baseline + Attack Diversity)
    if not has_benign:
        coverage_subscore = 10.0  # Missing normal baseline
    elif n_attack_classes == 0:
        coverage_subscore = 15.0  # Only benign traffic, zero attack classes
    elif n_attack_classes == 1:
        coverage_subscore = 75.0  # Standard binary NIDS benchmark
    elif n_attack_classes == 2:
        coverage_subscore = 85.0
    elif n_attack_classes == 3:
        coverage_subscore = 95.0
    else:
        coverage_subscore = 100.0 # Rich multiclass benchmark

    # 2. Minority Class Representation
    if attack_classes:
        min_attack_count = min(class_counts[c] for c in attack_classes)
        if min_attack_count >= 100:
            minority_subscore = 100.0
        elif min_attack_count >= 50:
            minority_subscore = 85.0
        elif min_attack_count >= 20:
            minority_subscore = 70.0
        elif min_attack_count >= 10:
            minority_subscore = 50.0
        elif min_attack_count >= 5:
            minority_subscore = 30.0
        else:
            minority_subscore = 10.0
    else:
        min_attack_count = 0
        minority_subscore = 0.0

    # 3. Class Imbalance Fairness
    # Scientific note: Real networks have 95-99% benign traffic.
    # We do NOT penalize realistic imbalance; we only penalize extreme starvation where minority < 10.
    if len(class_counts) > 1:
        max_count = max(class_counts.values())
        min_count = max(1, min(class_counts.values()))
        imbalance_ratio = max_count / min_count

        if imbalance_ratio <= 10.0:
            balance_subscore = 100.0
        elif imbalance_ratio <= 100.0:
            balance_subscore = 90.0  # Highly realistic and healthy NIDS split
        elif imbalance_ratio <= 1000.0:
            balance_subscore = 75.0 if min_count >= 20 else 50.0
        elif imbalance_ratio <= 5000.0:
            balance_subscore = 60.0 if min_count >= 20 else 35.0
        else:
            balance_subscore = 40.0 if min_count >= 20 else 20.0
    else:
        imbalance_ratio = 1.0
        balance_subscore = 20.0

    # 4. Essential NIDS Feature Role Availability
    all_cols_lower = [str(c).lower() for c in df.columns]
    feature_points = 0.0

    # Role A: Port identification (destination or source port)
    has_port = (
        bool(roles.get("dst_port"))
        or any("port" in c or "dport" in c or "sport" in c for c in all_cols_lower)
    )
    if has_port:
        feature_points += 25.0

    # Role B: Packet counts (forward/backward packet volume)
    has_pkts = any("pkt" in c or "packet" in c or "count" in c for c in all_cols_lower)
    if has_pkts:
        feature_points += 25.0

    # Role C: Bytes / Payload lengths
    has_bytes = any("byte" in c or "len" in c or "byts" in c or "size" in c for c in all_cols_lower)
    if has_bytes:
        feature_points += 25.0

    # Role D: Flow timing or duration
    has_timing = any("iat" in c or "time" in c or "duration" in c or "rate" in c for c in all_cols_lower)
    if has_timing:
        feature_points += 25.0

    feature_subscore = clamp_score(feature_points)

    # 5. Sample Size Adequacy (Statistical Power)
    if n_rows >= 5000:
        sample_subscore = 100.0
    elif n_rows >= 2000:
        sample_subscore = 90.0
    elif n_rows >= 1000:
        sample_subscore = 80.0
    elif n_rows >= 500:
        sample_subscore = 65.0
    elif n_rows >= 200:
        sample_subscore = 50.0
    else:
        sample_subscore = 25.0

    raw_subscores = {
        "class_coverage": coverage_subscore,
        "minority_representation": minority_subscore,
        "class_balance_fairness": balance_subscore,
        "feature_availability": feature_subscore,
        "sample_size_adequacy": sample_subscore,
    }

    weighted_total = sum(raw_subscores[k] * weights.get(k, 0.0) for k in raw_subscores)
    final_score = clamp_score(weighted_total)

    breakdown = [
        {
            "metric": "Class Coverage & Attack Diversity",
            "measured_value": f"{'Benign + ' if has_benign else 'No benign, '}{n_attack_classes} attack class(es)",
            "subscore": round(coverage_subscore, 1),
            "weight": round(weights.get("class_coverage", 0.0), 2),
            "contribution": round(coverage_subscore * weights.get("class_coverage", 0.0), 2),
            "explanation": "Validates normal baseline presence and attack category diversity.",
            "affected_count": n_attack_classes,
        },
        {
            "metric": "Minority Class Representation",
            "measured_value": f"{min_attack_count:,} sample(s) in smallest attack class",
            "subscore": round(minority_subscore, 1),
            "weight": round(weights.get("minority_representation", 0.0), 2),
            "contribution": round(minority_subscore * weights.get("minority_representation", 0.0), 2),
            "explanation": "Ensures minority attack classes retain statistical sample power (>=20 samples).",
            "affected_count": min_attack_count,
        },
        {
            "metric": "Class Imbalance Fairness",
            "measured_value": f"{imbalance_ratio:.1f}:1 maximum imbalance ratio",
            "subscore": round(balance_subscore, 1),
            "weight": round(weights.get("class_balance_fairness", 0.0), 2),
            "contribution": round(balance_subscore * weights.get("class_balance_fairness", 0.0), 2),
            "explanation": "Evaluates class distribution without artificially penalizing realistic network skew.",
            "affected_count": int(imbalance_ratio),
        },
        {
            "metric": "Essential NIDS Telemetry Features",
            "measured_value": f"{int(feature_subscore / 25)} of 4 core telemetry roles present",
            "subscore": round(feature_subscore, 1),
            "weight": round(weights.get("feature_availability", 0.0), 2),
            "contribution": round(feature_subscore * weights.get("feature_availability", 0.0), 2),
            "explanation": "Checks for ports, packet counters, byte lengths, and flow duration/timing.",
            "affected_count": int(feature_subscore / 25),
        },
        {
            "metric": "Sample Size Adequacy (Statistical Power)",
            "measured_value": f"{n_rows:,} total benchmark records",
            "subscore": round(sample_subscore, 1),
            "weight": round(weights.get("sample_size_adequacy", 0.0), 2),
            "contribution": round(sample_subscore * weights.get("sample_size_adequacy", 0.0), 2),
            "explanation": "Verifies sufficient volume for locked train/val/test evaluation splits.",
            "affected_count": n_rows,
        },
    ]

    category = get_interpretation_category(final_score, bands)

    summary_parts = []
    if has_benign and n_attack_classes >= 1:
        summary_parts.append(f"Multi-class NIDS dataset with {n_attack_classes} attack types and benign baseline.")
    elif not has_benign:
        summary_parts.append("Missing normal benign baseline traffic.")
    if min_attack_count < 20 and attack_classes:
        summary_parts.append(f"Minority attack class has only {min_attack_count} samples; risk of statistical instability.")

    return sanitize_floats({
        "score": round(final_score, 2),
        "category": category,
        "breakdown": breakdown,
        "raw_metrics": {
            "n_rows": n_rows,
            "has_benign": has_benign,
            "n_attack_classes": n_attack_classes,
            "class_counts": class_counts,
            "imbalance_ratio": round(imbalance_ratio, 2),
            "min_attack_count": min_attack_count,
            "telemetry_roles_detected": {
                "port": has_port,
                "packets": has_pkts,
                "bytes": has_bytes,
                "timing": has_timing,
            },
        },
        "summary": " ".join(summary_parts) if summary_parts else "Meets requirements for NIDS empirical benchmark research.",
    })
