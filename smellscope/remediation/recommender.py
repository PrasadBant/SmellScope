"""Intelligent Repair Recommendation Engine for SmellScope 2.0.

Inspects actual dataset quality, class balance, heuristic smell scores, and
null-calibrated Shortcut Fragility Index (SFI) to generate concrete, empirical,
dataset-dependent repair recommendations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def generate_repair_recommendations(
    ds: Dict[str, Any],
    audit_result: Optional[Dict[str, Any]] = None,
    split: Optional[Dict[str, Any]] = None,
    view: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Analyze dataset and empirical audit findings to produce prioritized repair recommendations.

    Categorizes recommendations strictly based on observed empirical evidence:
    - DATA_QUALITY: missing values, infinite values, duplicate rows, constant features.
    - DATASET_DESIGN: severe class imbalance, dominant features, partition distribution shift.
    - SHORTCUT_FRAGILITY: UGT, WL, HDF, PDD, TC, and SFI null-calibrated shortcut candidate ablation.

    Guarantees:
    - Never recommends fixes for problems not present in the dataset.
    - Respects existing view exclusions (e.g. already ablated features are never re-recommended).
    - If dataset is clean or problems are resolved, returns empty list [].
    - Single-class datasets receive only applicable data quality cleanups, never attack-specific fixes.

    Returns:
        List of typed recommendation dictionaries with unique IDs.
    """
    df: pd.DataFrame = ds["df"]
    label_col: str = ds["label_col"]
    benign_label: str = ds.get("benign_label", "BENIGN")
    roles = ds.get("column_roles", {})

    # Determine already applied view exclusions
    excluded_features = set()
    if view and "excluded_features" in view:
        excluded_features = set(view["excluded_features"])

    # Use training split if provided, otherwise full df
    if split and "_included_row_ids" in (view or {}):
        train_ids = set(view["_included_row_ids"])
        working_df = df[df["__row_id"].isin(train_ids)].copy() if "__row_id" in df.columns else df.copy()
    elif split and "train_ids" in split:
        train_ids = set(split["train_ids"])
        working_df = df[df["__row_id"].isin(train_ids)].copy() if "__row_id" in df.columns else df.copy()
    else:
        working_df = df.copy()

    non_feature_cols = {label_col, "__row_id"}.union(excluded_features)
    if roles.get("group") and roles["group"] in working_df.columns:
        non_feature_cols.add(roles["group"])
    feature_cols = [c for c in working_df.columns if c not in non_feature_cols]

    # Check class topology
    unique_classes = [str(c) for c in working_df[label_col].unique()]
    is_single_class = ds.get("is_single_class", False) or (len(unique_classes) <= 1)

    recommendations: List[Dict[str, Any]] = []
    seen_ids = set()

    def add_rec(rec: Dict[str, Any]) -> None:
        if rec["id"] not in seen_ids:
            seen_ids.add(rec["id"])
            # Normalize 4-question format & intelligent selection metadata
            rec["what_is_the_problem"] = rec.get("detected", "")
            rec["why_should_i_improve_it"] = rec.get("why_it_matters", "")
            aff_cols = rec.get("affected_columns", [])
            aff_records = rec.get("affected_records", 0)
            rec["what_will_change"] = (
                rec.get("what_will_change")
                or f"Applies {rec.get('action_type', 'transformation')} affecting {aff_records:,} records across column(s): {', '.join(aff_cols) if aff_cols else 'none'}."
            )
            rec["what_could_become_worse"] = (
                rec.get("potential_risk")
                or "Minor shift in model training priors; locked test evaluation remains unadjusted."
            )
            rec["is_safe_under_rsm"] = bool(rec.get("rsm_tier") in ("PASS", "SAFE"))
            rec["is_high_priority"] = bool(rec.get("severity") == "HIGH")
            rec["is_recommended"] = bool(
                rec.get("severity") in ("HIGH", "MEDIUM")
                and rec.get("rsm_tier") in ("PASS", "SAFE", "WARN")
            )
            recommendations.append(rec)

    # =========================================================================
    # CATEGORY A: DATA QUALITY DEFECTS
    # =========================================================================

    # 1. Missing Values (NaN / Null)
    missing_by_col = {
        col: int(working_df[col].isna().sum())
        for col in feature_cols
        if working_df[col].isna().sum() > 0
    }
    if missing_by_col:
        total_missing_cells = sum(missing_by_col.values())
        affected_rows_count = int(working_df[list(missing_by_col.keys())].isna().any(axis=1).sum())
        cols_formatted = ", ".join(list(missing_by_col.keys())[:4])
        if len(missing_by_col) > 4:
            cols_formatted += f" (+{len(missing_by_col) - 4} more)"

        if affected_rows_count > 0:
            add_rec({
                "id": "rec_dq_missing_imputation",
                "category": "DATA_QUALITY",
                "problem_name": "Missing Feature Values Detected",
                "severity": "HIGH" if affected_rows_count > 0.05 * len(working_df) else "MEDIUM",
                "detected": f"{total_missing_cells} missing (NaN) values across {len(missing_by_col)} feature column(s).",
                "why_it_matters": "Missing values cause estimator crashes, silent row dropping, or arbitrary defaults during ML training.",
                "affected_columns": list(missing_by_col.keys()),
                "affected_records": affected_rows_count,
                "evidence": f"Affected columns: {cols_formatted} ({affected_rows_count} rows affected, {(affected_rows_count / len(working_df)):.1%} of data).",
                "suggested_correction": "Apply train-fitted median imputation for numeric features without touching locked test records.",
                "action_type": "IMPUTE_NUMERIC",
                "action_params": {"columns": list(missing_by_col.keys()), "strategy": "median"},
                "expected_benefit": "Restores full dataset sample representation while eliminating missing data crashes.",
                "potential_risk": "Imputation modifies internal feature variance; median imputation is conservative and robust.",
                "is_reversible": True,
                "rsm_tier": "PASS",
            })

    # 2. Infinite Values (Inf / -Inf)
    inf_by_col = {}
    for col in feature_cols:
        if pd.api.types.is_numeric_dtype(working_df[col]):
            inf_count = int(np.isinf(working_df[col]).sum())
            if inf_count > 0:
                inf_by_col[col] = inf_count

    if inf_by_col:
        total_inf_cells = sum(inf_by_col.values())
        inf_cols = list(inf_by_col.keys())
        affected_inf_rows = int(np.isinf(working_df[inf_cols]).any(axis=1).sum())
        if affected_inf_rows > 0:
            add_rec({
                "id": "rec_dq_infinite_handling",
                "category": "DATA_QUALITY",
                "problem_name": "Infinite Numeric Values Detected",
                "severity": "HIGH",
                "detected": f"{total_inf_cells} IEEE infinite (inf/-inf) values detected across {len(inf_by_col)} column(s).",
                "why_it_matters": "Infinite values propagate overflow errors, corrupt standardization scalers, and invalidate gradient computations.",
                "affected_columns": inf_cols,
                "affected_records": affected_inf_rows,
                "evidence": f"Columns with infinite values: {', '.join(inf_cols[:3])} ({total_inf_cells} cells).",
                "suggested_correction": "Cap infinite values to 99.9th percentile or convert to NaN and median-impute using training statistics.",
                "action_type": "CLEAN_INFINITE",
                "action_params": {"columns": inf_cols, "method": "percentile_cap", "percentile": 99.9},
                "expected_benefit": "Guarantees finite mathematical properties required by statistical learning models.",
                "potential_risk": "Upper clipping may attenuate genuine packet burst extremes if not calibrated carefully.",
                "is_reversible": True,
                "rsm_tier": "PASS",
            })

    # 3. Duplicate Records
    if feature_cols:
        dup_mask = working_df[feature_cols].duplicated()
        dup_count = int(dup_mask.sum())
    else:
        dup_count = 0

    if dup_count > 0:
        add_rec({
            "id": "rec_dq_duplicate_rows",
            "category": "DATA_QUALITY",
            "problem_name": "Duplicate Network Flow Records",
            "severity": "MEDIUM",
            "detected": f"{dup_count} exact duplicate feature rows in training set ({(dup_count / len(working_df)):.1%} of data).",
            "why_it_matters": "Identical flow vectors artificially amplify sample density and cause over-optimistic evaluation.",
            "affected_columns": feature_cols[:5],
            "affected_records": dup_count,
            "evidence": f"Found {dup_count} duplicate rows sharing identical telemetry vectors.",
            "suggested_correction": "Remove redundant training instances while preserving class boundaries.",
            "action_type": "DEDUPLICATE_TRAIN",
            "action_params": {"keep": "first"},
            "expected_benefit": "Eliminates artificial repetition bias and provides more realistic evaluation.",
            "potential_risk": "Reduces raw sample count slightly; RSM ensures remaining counts stay above safety floor.",
            "is_reversible": True,
            "rsm_tier": "PASS",
        })

    # 4. Constant Features (Zero Variance)
    constant_cols = []
    for col in feature_cols:
        if pd.api.types.is_numeric_dtype(working_df[col]):
            if working_df[col].nunique() <= 1:
                constant_cols.append(col)

    if constant_cols:
        add_rec({
            "id": "rec_dq_constant_features",
            "category": "DATA_QUALITY",
            "problem_name": "Zero-Variance Constant Features",
            "severity": "LOW",
            "detected": f"{len(constant_cols)} feature(s) contain identical constant values across all rows.",
            "why_it_matters": "Constant features provide zero discriminative information while increasing model dimension overhead.",
            "affected_columns": constant_cols,
            "affected_records": len(working_df),
            "evidence": f"Constant columns with variance=0: {', '.join(constant_cols[:4])}",
            "suggested_correction": "Drop constant non-informative features from the training view.",
            "action_type": "DROP_CONSTANT_FEATURES",
            "action_params": {"features": constant_cols},
            "expected_benefit": "Reduces computational complexity and storage without any loss in predictive capability.",
            "potential_risk": "None; features carry zero entropy.",
            "is_reversible": True,
            "rsm_tier": "PASS",
        })

    # =========================================================================
    # CATEGORY B: DATASET DESIGN PROBLEMS (Multiple classes required)
    # =========================================================================
    if not is_single_class:
        class_counts = working_df[label_col].value_counts().to_dict()
        if len(class_counts) > 1:
            majority_cnt = max(class_counts.values())
            minority_cnt = min(class_counts.values())
            imbalance_ratio = majority_cnt / max(minority_cnt, 1)

            if imbalance_ratio > 8.0:
                minority_classes = [str(k) for k, v in class_counts.items() if v == minority_cnt]
                add_rec({
                    "id": "rec_dd_class_imbalance",
                    "category": "DATASET_DESIGN",
                    "problem_name": "Severe Class Imbalance Detected",
                    "severity": "MEDIUM",
                    "detected": f"Class imbalance ratio is {imbalance_ratio:.1f}:1 between largest and smallest classes.",
                    "why_it_matters": "Extreme imbalance biases decision trees toward majority classes, resulting in poor minority recall.",
                    "affected_columns": [label_col],
                    "affected_records": minority_cnt,
                    "evidence": f"Majority class: {majority_cnt} rows vs Minority class: {minority_cnt} rows ({', '.join(minority_classes)}).",
                    "suggested_correction": "Apply balanced class weighting or stratified training resampling on training records only.",
                    "action_type": "STRATIFIED_RESAMPLE_TRAIN",
                    "action_params": {"target_ratio": min(imbalance_ratio, 5.0)},
                    "expected_benefit": "Significantly improves minority attack detection sensitivity and Macro F1.",
                    "potential_risk": "Resampling changes empirical prior distribution; locked test set retains original benchmark distribution.",
                    "is_reversible": True,
                    "rsm_tier": "PASS",
                })

    # =========================================================================
    # CATEGORY C: SHORTCUT & FRAGILITY PROBLEMS (FROM AUDIT RESULTS)
    # =========================================================================
    if not is_single_class and audit_result and "classes" in audit_result:
        for class_info in audit_result["classes"]:
            cls_name = class_info.get("class", "Unknown")
            # Verify class exists in dataset
            if cls_name not in working_df[label_col].values:
                continue

            heuristics = class_info.get("paper", {})
            sfi_info = class_info.get("sfi", {})
            n_class_records = int((working_df[label_col] == cls_name).sum())

            # 6. SFI Flagged Shortcut Feature (Highest Priority)
            if sfi_info.get("flag") or (sfi_info.get("excess_fragility") and sfi_info["excess_fragility"] > 0.15):
                top_feature = sfi_info.get("top_shortcut_feature") or sfi_info.get("top_feature")
                excess = sfi_info.get("excess_fragility", 0.0)
                z_score = sfi_info.get("z_score", 0.0)

                if top_feature and top_feature in feature_cols:
                    add_rec({
                        "id": f"rec_sc_sfi_ablation_{cls_name}",
                        "category": "SHORTCUT_FRAGILITY",
                        "problem_name": f"Candidate Shortcut Feature in Class '{cls_name}'",
                        "severity": "HIGH",
                        "detected": f"Feature '{top_feature}' exhibits statistically significant shortcut reliance (SFI excess: {excess:.3f}, z={z_score:.2f}).",
                        "why_it_matters": "When this single feature is perturbed, attack recall collapses below the Monte Carlo null reference envelope, indicating non-generalizable shortcut learning.",
                        "affected_columns": [top_feature],
                        "affected_records": n_class_records,
                        "evidence": f"Empirical SFI={sfi_info.get('sfi', 0.0):.3f} vs Null Reference Mean={sfi_info.get('sfi_null_mean', 0.0):.3f} (z-score: {z_score:.2f}).",
                        "suggested_correction": f"Perform R1 Counterfactual Feature Ablation on '{top_feature}' to force classifier learning on semantic payload telemetry.",
                        "action_type": "FEATURE_ABLATION",
                        "action_params": {"features": [top_feature]},
                        "expected_benefit": "Forces the machine-learning model to learn multi-feature behavioral invariants instead of exploiting an artifact.",
                        "potential_risk": "Nominal benchmark accuracy may drop, exposing true reliance on the shortcut.",
                        "is_reversible": True,
                        "rsm_tier": "PASS",
                    })

            # 7. HDF: Highly Dependent Features (Single Feature Dominance)
            hdf_score = heuristics.get("HDF")
            if hdf_score is not None and hdf_score >= 0.60:
                # Dynamically locate empirical dominant feature
                dominant_feature = None
                details = heuristics.get("details", {})
                if details and "hdf_top_feature" in details and details["hdf_top_feature"] in feature_cols:
                    dominant_feature = details["hdf_top_feature"]
                elif "hdf" in class_info and isinstance(class_info["hdf"], dict):
                    dom = class_info["hdf"].get("dominant_feature")
                    if dom in feature_cols:
                        dominant_feature = dom

                if not dominant_feature:
                    # Look up dst_port or first available feature
                    if roles.get("dst_port") and roles["dst_port"] in feature_cols:
                        dominant_feature = roles["dst_port"]
                    elif feature_cols:
                        dominant_feature = feature_cols[0]

                if dominant_feature and dominant_feature in feature_cols:
                    add_rec({
                        "id": f"rec_sc_hdf_dominance_{cls_name}",
                        "category": "SHORTCUT_FRAGILITY",
                        "problem_name": f"Extreme Single-Feature Dominance (HDF) in '{cls_name}'",
                        "severity": "HIGH" if hdf_score >= 0.85 else "MEDIUM",
                        "detected": f"HDF score is {hdf_score:.3f} (threshold: 0.60), showing artificial single-feature correlation on '{dominant_feature}'.",
                        "why_it_matters": "A single telemetry column achieves near-perfect discrimination alone, rendering all other features redundant.",
                        "affected_columns": [dominant_feature],
                        "affected_records": n_class_records,
                        "evidence": f"HDF={hdf_score:.3f} >= 0.60 safety threshold for class '{cls_name}' on feature '{dominant_feature}'.",
                        "suggested_correction": f"Ablate or decorrelate '{dominant_feature}' in training to verify secondary feature robustness.",
                        "action_type": "FEATURE_ABLATION",
                        "action_params": {"features": [dominant_feature]},
                        "expected_benefit": "Evaluates whether model retains predictive capability when deprived of the dominant feature.",
                        "potential_risk": "Model performance will decrease if secondary features lack sufficient discriminative signal.",
                        "is_reversible": True,
                        "rsm_tier": "WARN",
                    })

            # 8. UGT: Unclear Ground Truth (Port Artifacts)
            ugt_score = heuristics.get("UGT")
            if ugt_score is not None and ugt_score >= 0.10:
                port_col = roles.get("dst_port")
                if not port_col or port_col not in working_df.columns:
                    # Search for port column
                    for c in feature_cols:
                        if "port" in c.lower():
                            port_col = c
                            break

                if port_col and port_col in working_df.columns and port_col in feature_cols:
                    ephemeral_count = int(
                        ((working_df[port_col] > 49151) & (working_df[label_col] == cls_name)).sum()
                    )
                    if ephemeral_count > 0:
                        add_rec({
                            "id": f"rec_sc_ugt_quarantine_{cls_name}",
                            "category": "SHORTCUT_FRAGILITY",
                            "problem_name": f"Unclear Ground Truth / Ephemeral Port Mappings in '{cls_name}'",
                            "severity": "MEDIUM",
                            "detected": f"UGT score is {ugt_score:.3f} (threshold: 0.10), indicating {ephemeral_count} attack flows on ephemeral port ranges (>49151).",
                            "why_it_matters": "Cybersecurity datasets frequently bind attacks to dynamic ephemeral ports (>49151) that never occur in real production networks.",
                            "affected_columns": [port_col],
                            "affected_records": ephemeral_count,
                            "evidence": f"UGT={ugt_score:.3f} for class '{cls_name}'. {ephemeral_count} ephemeral port flows detected in attack partition.",
                            "suggested_correction": "Quarantine candidate ephemeral port flows (R2) from training data to avoid memorizing testbed port artifacts.",
                            "action_type": "FLOW_QUARANTINE",
                            "action_params": {"rule": "quarantine_ephemeral_ports", "classes": [cls_name]},
                            "expected_benefit": "Prevents classifier from flagging all high-numbered ports as cyberattacks.",
                            "potential_risk": "Reduces training row count for the targeted attack class; protected by RSM G2 class floor.",
                            "is_reversible": True,
                            "rsm_tier": "PASS",
                        })

            # 9. WL: Repetition Artifacts (Packet Length Sequences)
            wl_score = heuristics.get("WL")
            if wl_score is not None and wl_score >= 0.30:
                pkt_cols = [
                    c for c in feature_cols
                    if any(t in c.lower() for t in ("len", "length", "pkt", "bytes", "size"))
                ]
                if pkt_cols:
                    add_rec({
                        "id": f"rec_sc_wl_repetition_{cls_name}",
                        "category": "SHORTCUT_FRAGILITY",
                        "problem_name": f"Repetition & Packet Length Artifacts (WL) in '{cls_name}'",
                        "severity": "MEDIUM",
                        "detected": f"WL score is {wl_score:.3f} (threshold: 0.30), showing repetitive packet length sequences.",
                        "why_it_matters": "Automated traffic generators often repeat identical packet sequences that do not generalize to evasive adversaries.",
                        "affected_columns": pkt_cols[:3],
                        "affected_records": n_class_records,
                        "evidence": f"WL={wl_score:.3f} exceeds research threshold (0.30) for class '{cls_name}'.",
                        "suggested_correction": "Ablate repetitive packet length features or apply packet size jitter.",
                        "action_type": "FEATURE_ABLATION",
                        "action_params": {"features": pkt_cols[:2]},
                        "expected_benefit": "Reduces susceptibility to deterministic packet size fingerprinting.",
                        "potential_risk": "Slight reduction in precision on static synthetic benchmarks.",
                        "is_reversible": True,
                        "rsm_tier": "PASS",
                    })

    return recommendations
