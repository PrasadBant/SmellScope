"""Overall Dataset Assessment Synthesizer for SmellScope 2.0.

Synthesizes the four independent scoring dimensions into a transparent,
configurable overall dataset trust assessment.

Formula:
Overall Assessment = w_dq * Data_Quality
                   + w_suit * NIDS_Suitability
                   + w_rel * Evaluation_Reliability
                   + w_safe * (100.0 - Shortcut_Risk)

Notice:
Shortcut Risk is inverted (100.0 - Risk) so that higher consistently means
safer, cleaner, and more trustworthy.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import pandas as pd

from smellscope.scoring.evaluation_reliability_score import compute_evaluation_reliability_score
from smellscope.scoring.nids_suitability_score import compute_nids_suitability_score
from smellscope.scoring.quality_score import compute_data_quality_score
from smellscope.scoring.score_config import (
    DEFAULT_QUALITY_BANDS,
    SCORING_VERSION,
    get_default_scoring_config,
    get_interpretation_category,
)
from smellscope.scoring.score_validation import clamp_score, sanitize_floats
from smellscope.scoring.shortcut_risk_score import compute_shortcut_risk_score


def compute_overall_dataset_assessment(
    df: pd.DataFrame,
    label_col: str,
    benign_label: str = "BENIGN",
    audit_result: Optional[Dict[str, Any]] = None,
    split: Optional[Dict[str, Any]] = None,
    baseline_eval: Optional[Dict[str, Any]] = None,
    roles: Optional[Dict[str, Any]] = None,
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compute all four scoring dimensions and overall synthesized assessment.

    Parameters
    ----------
    df : pd.DataFrame
        Dataset dataframe.
    label_col : str
        Label column name.
    benign_label : str
        Benign class name.
    audit_result : dict, optional
        Full output of run_audit().
    split : dict, optional
        Split manifest dictionary.
    baseline_eval : dict, optional
        Model evaluation results dictionary.
    roles : dict, optional
        Column role mappings.
    cfg : dict, optional
        Scoring configuration dictionary.

    Returns
    -------
    dict
        Authoritative dataset scoring report containing:
        - overall_score: float in [0.0, 100.0]
        - overall_category: Band descriptor
        - dimensions: Dict of all 4 dimension results
        - synthesis_breakdown: Formula and weight contributions
        - evidence_coverage: Proportion of metrics with empirical measurements
        - scoring_version: Version identifier string
        - scientific_notice: Disclaimer on internal assessment convention
    """
    cfg = cfg or get_default_scoring_config()
    weights = cfg.get("overall_synthesis_weights", get_default_scoring_config()["overall_synthesis_weights"])
    bands = cfg.get("bands", {}).get("quality", DEFAULT_QUALITY_BANDS)

    # 1. Dimension A: Data Quality Score
    dq_res = compute_data_quality_score(df, label_col=label_col, roles=roles, cfg=cfg)

    # 2. Dimension B: NIDS Suitability Score
    suit_res = compute_nids_suitability_score(
        df, label_col=label_col, benign_label=benign_label, roles=roles, cfg=cfg
    )

    # 3. Dimension C: Shortcut & Leakage Risk Score (Higher = GREATER RISK)
    risk_res = compute_shortcut_risk_score(
        df=df,
        label_col=label_col,
        benign_label=benign_label,
        audit_result=audit_result,
        split=split,
        roles=roles,
        cfg=cfg,
    )

    # 4. Dimension D: ML Evaluation Reliability Score
    # Extract baseline evaluation from audit_result if not passed explicitly
    if not baseline_eval and audit_result and "classes" in audit_result:
        # Collect baseline eval from first audited class or average
        for c_res in audit_result["classes"]:
            if "baseline" in c_res:
                baseline_eval = c_res["baseline"]
                break

    rel_res = compute_evaluation_reliability_score(
        split=split, baseline_eval=baseline_eval, cfg=cfg
    )

    # Invert Shortcut Risk to represent Shortcut Safety (higher = safer)
    shortcut_safety_score = clamp_score(100.0 - risk_res["score"])

    # Weighted Synthesis
    w_dq = weights.get("data_quality", 0.30)
    w_suit = weights.get("nids_suitability", 0.30)
    w_rel = weights.get("evaluation_reliability", 0.20)
    w_safe = weights.get("shortcut_safety", 0.20)

    overall_score = clamp_score(
        dq_res["score"] * w_dq
        + suit_res["score"] * w_suit
        + rel_res["score"] * w_rel
        + shortcut_safety_score * w_safe
    )

    overall_cat = get_interpretation_category(overall_score, bands)

    # Coverage computation:
    # DQ: always 100% evaluated if df present
    # Suitability: always 100% evaluated if df present
    # Shortcut Risk: 100% if audit_result present, 20% if pre-audit scan
    # Reliability: 100% if split & eval present, 50% if split only
    cov_parts = [
        1.0 if len(df) > 0 else 0.0,
        1.0 if len(df) > 0 else 0.0,
        risk_res.get("evidence_coverage", 0.0),
        1.0 if (split and baseline_eval) else (0.5 if split else 0.2),
    ]
    evidence_coverage = round(float(sum(cov_parts) / len(cov_parts)), 2)

    synthesis_breakdown = [
        {
            "dimension": "Dataset Data Quality",
            "score": dq_res["score"],
            "weight": w_dq,
            "contribution": round(dq_res["score"] * w_dq, 2),
            "explanation": "Evaluates missingness, infinite numbers, duplicates, and column parsing integrity.",
        },
        {
            "dimension": "NIDS Research Suitability",
            "score": suit_res["score"],
            "weight": w_suit,
            "contribution": round(suit_res["score"] * w_suit, 2),
            "explanation": "Evaluates multi-class attack diversity, statistical power, and essential NIDS features.",
        },
        {
            "dimension": "Evaluation Reliability",
            "score": rel_res["score"],
            "weight": w_rel,
            "contribution": round(rel_res["score"] * w_rel, 2),
            "explanation": "Evaluates locked test partition isolation, train-only fitting, and reproducibility.",
        },
        {
            "dimension": "Shortcut Robustness (100 - Risk)",
            "score": round(shortcut_safety_score, 2),
            "weight": w_safe,
            "contribution": round(shortcut_safety_score * w_safe, 2),
            "explanation": f"Inverted shortcut risk ({risk_res['score']:.1f}/100 risk -> {shortcut_safety_score:.1f}/100 safety).",
        },
    ]

    return sanitize_floats({
        "overall_score": round(overall_score, 2),
        "overall_category": overall_cat,
        "evidence_coverage": evidence_coverage,
        "scoring_version": SCORING_VERSION,
        "formula": "Overall = 0.30*Quality + 0.30*Suitability + 0.20*Reliability + 0.20*(100 - Shortcut_Risk)",
        "synthesis_breakdown": synthesis_breakdown,
        "dimensions": {
            "data_quality": dq_res,
            "nids_suitability": suit_res,
            "shortcut_risk": risk_res,
            "evaluation_reliability": rel_res,
        },
        "scientific_notice": (
            "SmellScope scores reflect internal research heuristic evaluations and mathematical "
            "integrity diagnostics, not universal commercial certification standards."
        ),
    })
