"""Shortcut and Leakage Risk Score Calculator for SmellScope 2.0.

Evaluates dataset vulnerability to non-generalizable shortcuts, target leakage,
and testbed design artifacts using empirical SFI, HDF, UGT, WL, and TC evidence.

CRITICAL CONVENTION:
Scale: 0 to 100 (HIGHER = GREATER SHORTCUT RISK / VULNERABILITY).
0 = Clean, robust, no shortcut signals.
100 = Critical shortcut dominance; models memorize testbed artifacts.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from smellscope.scoring.score_config import (
    DEFAULT_RISK_BANDS,
    get_default_scoring_config,
    get_interpretation_category,
)
from smellscope.scoring.score_validation import clamp_score, safe_ratio, sanitize_floats


def compute_shortcut_risk_score(
    df: Optional[pd.DataFrame] = None,
    label_col: Optional[str] = None,
    benign_label: str = "BENIGN",
    audit_result: Optional[Dict[str, Any]] = None,
    split: Optional[Dict[str, Any]] = None,
    roles: Optional[Dict[str, Any]] = None,
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compute Shortcut & Leakage Risk Score and itemized breakdown.

    Parameters
    ----------
    df : pd.DataFrame, optional
        Dataset dataframe.
    label_col : str, optional
        Label column name.
    benign_label : str
        Benign traffic label.
    audit_result : dict, optional
        Output of run_audit(), containing per-class heuristics and SFI.
    split : dict, optional
        Split manifest dictionary.
    roles : dict, optional
        Column role mappings.
    cfg : dict, optional
        Scoring configuration dictionary.

    Returns
    -------
    dict
        Scoring result containing:
        - score: float in [0.0, 100.0] (Higher = GREATER RISK)
        - category: Risk band descriptor (Low, Moderate, High, Critical)
        - breakdown: Itemized risk component table
        - candidate_shortcuts: Identified suspicious columns
        - evidence_coverage: Proportion of heuristics available
        - summary: Plain-language diagnostic summary
    """
    cfg = cfg or get_default_scoring_config()
    weights = cfg.get("shortcut_risk_weights", get_default_scoring_config()["shortcut_risk_weights"])
    bands = cfg.get("bands", {}).get("risk", DEFAULT_RISK_BANDS)

    raw_classes = audit_result.get("classes", []) if audit_result else []
    if isinstance(raw_classes, dict):
        classes_data = list(raw_classes.values())
    elif isinstance(raw_classes, list):
        classes_data = raw_classes
    else:
        classes_data = []

    candidate_shortcuts: List[Dict[str, Any]] = []

    # 1. SFI Excess Fragility (Monte Carlo Null-Calibrated)
    sfi_risks: List[float] = []
    top_sfi_features: List[str] = []
    for cls_res in classes_data:
        if not isinstance(cls_res, dict):
            continue
        sfi_info = cls_res.get("sfi", {})
        if sfi_info and isinstance(sfi_info, dict):
            excess = float(sfi_info.get("excess_fragility", 0.0) or 0.0)
            z_score = float(sfi_info.get("z", 0.0) or sfi_info.get("z_score", 0.0) or 0.0)
            flagged = bool(sfi_info.get("flag", False))
            sus_feats = sfi_info.get("suspicious_features", [])

            if sus_feats and z_score == 0.0:
                z_score = 3.5

            # Risk calculation: z >= 2.0 indicates statistical significance
            if flagged or z_score >= 2.0 or len(sus_feats) > 0:
                c_risk = min(100.0, 50.0 + (z_score - 2.0) * 15.0 + excess * 100.0)
                top_feat = sfi_info.get("top_shortcut_feature") or sfi_info.get("top_feature")
                if not top_feat and sus_feats:
                    top_feat = sus_feats[0]
                if top_feat:
                    top_sfi_features.append(str(top_feat))
                    candidate_shortcuts.append({
                        "feature": str(top_feat),
                        "class": cls_res.get("class", "Unknown"),
                        "reason": f"SFI excess fragility={excess:.3f} (z={z_score:.2f})",
                        "severity": "CRITICAL" if z_score >= 3.0 else "HIGH",
                    })
            else:
                c_risk = min(40.0, max(0.0, z_score * 15.0))
            sfi_risks.append(c_risk)

    sfi_risk_subscore = max(sfi_risks) if sfi_risks else 0.0

    # 2. HDF (Highly Dependent Features / Single Feature Dominance)
    hdf_risks: List[float] = []
    top_hdf_features: List[str] = []
    for cls_res in classes_data:
        if not isinstance(cls_res, dict):
            continue
        paper = cls_res.get("paper", {})
        hdf_val = paper.get("HDF") if isinstance(paper, dict) else None
        top_feat = None
        if isinstance(paper, dict) and "details" in paper:
            top_feat = paper.get("details", {}).get("hdf_top_feature")

        # Fallback to direct hdf dict
        if hdf_val is None and "hdf" in cls_res and isinstance(cls_res["hdf"], dict):
            hdf_val = cls_res["hdf"].get("auc")
            top_feat = top_feat or cls_res["hdf"].get("dominant_feature")

        if hdf_val is not None:
            hdf_val = float(hdf_val)
            if hdf_val >= 0.85:
                # Extreme dominance: 1 feature alone achieves F1 >= 0.85
                c_risk = min(100.0, 70.0 + (hdf_val - 0.85) * 200.0)
                if top_feat:
                    top_hdf_features.append(str(top_feat))
                    candidate_shortcuts.append({
                        "feature": str(top_feat),
                        "class": cls_res.get("class", "Unknown"),
                        "reason": f"HDF single-feature F1={hdf_val:.3f} >= 0.85",
                        "severity": "CRITICAL" if hdf_val >= 0.95 else "HIGH",
                    })
            elif hdf_val >= 0.60:
                c_risk = 40.0 + (hdf_val - 0.60) * 120.0
            else:
                c_risk = (hdf_val / 0.60) * 30.0
            hdf_risks.append(c_risk)

    hdf_risk_subscore = max(hdf_risks) if hdf_risks else 0.0

    # 3. UGT (Unclear Ground Truth / Ephemeral Port Binding)
    ugt_risks: List[float] = []
    for cls_res in classes_data:
        if not isinstance(cls_res, dict):
            continue
        paper = cls_res.get("paper", {})
        ugt_val = paper.get("UGT") if isinstance(paper, dict) else None
        if ugt_val is None and "ugt" in cls_res and isinstance(cls_res["ugt"], dict):
            ugt_val = cls_res["ugt"].get("ugt_score")

        if ugt_val is not None:
            ugt_val = float(ugt_val)
            if ugt_val >= 0.10:
                c_risk = min(100.0, 40.0 + ugt_val * 150.0)
            else:
                c_risk = ugt_val * 300.0
            ugt_risks.append(c_risk)

    ugt_risk_subscore = max(ugt_risks) if ugt_risks else 0.0

    # 4. WL (Wrong Labels / Packet Length Sequence Fingerprints)
    wl_risks: List[float] = []
    for cls_res in classes_data:
        if not isinstance(cls_res, dict):
            continue
        paper = cls_res.get("paper", {})
        wl_val = paper.get("WL") if isinstance(paper, dict) else None
        if wl_val is None and "wl" in cls_res and isinstance(cls_res["wl"], dict):
            wl_val = cls_res["wl"].get("wl_score")

        if wl_val is not None:
            wl_val = float(wl_val)
            if wl_val >= 0.30:
                c_risk = min(100.0, 40.0 + wl_val * 150.0)
            else:
                c_risk = wl_val * 100.0
            wl_risks.append(c_risk)

    wl_risk_subscore = max(wl_risks) if wl_risks else 0.0

    # 5. TC (Traffic Collapse / Clustering Disparity)
    tc_risks: List[float] = []
    for cls_res in classes_data:
        if not isinstance(cls_res, dict):
            continue
        paper = cls_res.get("paper", {})
        tc_val = paper.get("TC") if isinstance(paper, dict) else None
        if tc_val is None and "tc" in cls_res and isinstance(cls_res["tc"], dict):
            tc_val = cls_res["tc"].get("tc_score")

        if tc_val is not None:
            tc_val = float(tc_val)
            tc_risks.append(min(100.0, tc_val * 100.0))

    tc_risk_subscore = max(tc_risks) if tc_risks else 0.0

    # Fallback pre-audit scan if audit_result is missing but df is provided
    preliminary_scan = False
    if not classes_data and df is not None and label_col and label_col in df.columns:
        preliminary_scan = True
        # Check destination port role for shortcut memorization
        port_col = (roles or {}).get("dst_port")
        if not port_col:
            for c in df.columns:
                if "port" in str(c).lower() and c != label_col:
                    port_col = c
                    break
        if port_col and port_col in df.columns:
            # Check if port has single unique value per class
            port_grouped = df.groupby(label_col)[port_col].nunique()
            if (port_grouped == 1).any():
                hdf_risk_subscore = 65.0
                candidate_shortcuts.append({
                    "feature": port_col,
                    "class": "Multiple",
                    "reason": "Preliminary scan: Port is deterministic constant per attack class.",
                    "severity": "HIGH",
                })

    raw_subscores = {
        "sfi_excess_fragility": sfi_risk_subscore,
        "hdf_dominance": hdf_risk_subscore,
        "ugt_port_artifacts": ugt_risk_subscore,
        "wl_repetition": wl_risk_subscore,
        "tc_traffic_collapse": tc_risk_subscore,
    }

    weighted_total = sum(raw_subscores[k] * weights.get(k, 0.0) for k in raw_subscores)
    final_score = clamp_score(weighted_total)

    breakdown = [
        {
            "metric": "SFI Null-Calibrated Excess Fragility",
            "measured_value": f"Max SFI risk subscore: {sfi_risk_subscore:.1f}/100",
            "subscore": round(sfi_risk_subscore, 1),
            "weight": round(weights.get("sfi_excess_fragility", 0.0), 2),
            "contribution": round(sfi_risk_subscore * weights.get("sfi_excess_fragility", 0.0), 2),
            "explanation": "Evaluates collapse in recall under targeted Monte Carlo feature perturbation.",
            "affected_count": len(top_sfi_features),
        },
        {
            "metric": "HDF Single-Feature Dominance",
            "measured_value": f"Max HDF risk subscore: {hdf_risk_subscore:.1f}/100",
            "subscore": round(hdf_risk_subscore, 1),
            "weight": round(weights.get("hdf_dominance", 0.0), 2),
            "contribution": round(hdf_risk_subscore * weights.get("hdf_dominance", 0.0), 2),
            "explanation": "Flags features that achieve near-perfect classification alone without secondary support.",
            "affected_count": len(top_hdf_features),
        },
        {
            "metric": "UGT Dynamic / Ephemeral Port Reliance",
            "measured_value": f"Max UGT risk subscore: {ugt_risk_subscore:.1f}/100",
            "subscore": round(ugt_risk_subscore, 1),
            "weight": round(weights.get("ugt_port_artifacts", 0.0), 2),
            "contribution": round(ugt_risk_subscore * weights.get("ugt_port_artifacts", 0.0), 2),
            "explanation": "Detects attack flows bound to ephemeral ports (>49151) that fail in production.",
            "affected_count": int(ugt_risk_subscore > 25.0),
        },
        {
            "metric": "WL Repetitive Packet Sequence Fingerprints",
            "measured_value": f"Max WL risk subscore: {wl_risk_subscore:.1f}/100",
            "subscore": round(wl_risk_subscore, 1),
            "weight": round(weights.get("wl_repetition", 0.0), 2),
            "contribution": round(wl_risk_subscore * weights.get("wl_repetition", 0.0), 2),
            "explanation": "Identifies artificial repetition in packet length sequences from automated testbed scripts.",
            "affected_count": int(wl_risk_subscore > 25.0),
        },
        {
            "metric": "TC Traffic Collapse & Lack of Diversity",
            "measured_value": f"Max TC risk subscore: {tc_risk_subscore:.1f}/100",
            "subscore": round(tc_risk_subscore, 1),
            "weight": round(weights.get("tc_traffic_collapse", 0.0), 2),
            "contribution": round(tc_risk_subscore * weights.get("tc_traffic_collapse", 0.0), 2),
            "explanation": "Measures intra-class cosine concentration indicating lack of traffic variance.",
            "affected_count": int(tc_risk_subscore > 25.0),
        },
    ]

    category = get_interpretation_category(final_score, bands)

    evidence_coverage = 1.0 if classes_data else (0.2 if preliminary_scan else 0.0)

    summary_parts = []
    if final_score >= 75.0:
        summary_parts.append("CRITICAL SHORTCUT VULNERABILITY: Benchmark is heavily dominated by testbed artifacts.")
    elif final_score >= 50.0:
        summary_parts.append("HIGH SHORTCUT RISK: Classifiers likely memorize dominant telemetry features.")
    elif final_score >= 25.0:
        summary_parts.append("MODERATE SHORTCUT RISK: Potential shortcut features detected; verify with feature ablation.")
    else:
        summary_parts.append("LOW SHORTCUT RISK: No statistically significant shortcut artifacts detected.")

    if candidate_shortcuts:
        feats = list({c["feature"] for c in candidate_shortcuts})
        summary_parts.append(f"Suspicious candidate feature(s): {', '.join(feats[:3])}.")

    return sanitize_floats({
        "score": round(final_score, 2),
        "category": category,
        "breakdown": breakdown,
        "candidate_shortcuts": candidate_shortcuts,
        "evidence_coverage": evidence_coverage,
        "summary": " ".join(summary_parts),
    })
