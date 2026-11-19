"""Authoritative Dataset Profiler and Capability Matrix for SmellScope 2.0.

Inspects dataset structure, data types, class topology, and column semantics to
produce an authoritative 26-dimension DatasetProfile and dynamic CapabilityMatrix.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def compute_dataset_profile(
    ds: Dict[str, Any],
    split: Optional[Dict[str, Any]] = None,
    dataset_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Analyze a registered dataset and compute authoritative profile and capability matrix.

    Args:
        ds: LoadedDataset dictionary containing 'df', 'label_col', 'benign_label', etc.
        split: Optional SplitManifest dictionary.
        dataset_id: Optional dataset identifier string.

    Returns:
        Authoritative DatasetProfile dictionary with all 26 required fields + capability matrix.
    """
    df: pd.DataFrame = ds["df"]
    label_col: str = ds["label_col"]
    benign_label: str = ds.get("benign_label", "BENIGN")
    roles = ds.get("column_roles", {})
    meta = ds.get("meta", {})

    target_id = dataset_id or ds.get("dataset_id") or meta.get("source_basename", "in_memory_dataset")
    fingerprint = meta.get("sha256", "unknown")
    version = ds.get("version", "v1.0")

    row_count = len(df)
    column_count = len(df.columns)

    # 1. Feature columns identification
    non_features = {label_col, "__row_id"}
    if roles.get("group") and roles["group"] in df.columns:
        non_features.add(roles["group"])
    feature_cols = [c for c in df.columns if c not in non_features]

    # 2. Feature types detection
    feature_types: Dict[str, str] = {}
    for col in feature_cols:
        col_series = df[col]
        if pd.api.types.is_numeric_dtype(col_series):
            feature_types[col] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(col_series):
            feature_types[col] = "datetime"
        elif pd.api.types.is_categorical_dtype(col_series) or pd.api.types.is_string_dtype(col_series):
            feature_types[col] = "categorical"
        else:
            feature_types[col] = "unmapped"

    # 3. Class topology
    class_series = df[label_col].astype(str)
    raw_classes = sorted(list(class_series.unique()))
    class_counts: Dict[str, int] = {str(k): int(v) for k, v in class_series.value_counts().items()}
    class_ratios: Dict[str, float] = {
        cls_name: round(count / max(row_count, 1), 4)
        for cls_name, count in class_counts.items()
    }

    is_single_class = len(raw_classes) == 1
    is_binary = len(raw_classes) == 2
    is_multiclass = len(raw_classes) > 2
    has_benign = benign_label in raw_classes
    attack_classes = [c for c in raw_classes if c != benign_label]
    has_attacks = len(attack_classes) > 0

    # 4. Missing values inspection
    missing_by_col = {
        col: int(df[col].isna().sum())
        for col in feature_cols
        if df[col].isna().sum() > 0
    }
    missing_total_cells = sum(missing_by_col.values())
    missing_affected_rows = (
        int(df[list(missing_by_col.keys())].isna().any(axis=1).sum())
        if missing_by_col else 0
    )
    missing_summary = {
        "total_cells": missing_total_cells,
        "affected_columns": list(missing_by_col.keys()),
        "affected_rows": missing_affected_rows,
        "columns_dict": missing_by_col,
    }

    # 5. Infinite values inspection
    inf_by_col: Dict[str, int] = {}
    for col in feature_cols:
        if pd.api.types.is_numeric_dtype(df[col]):
            cnt = int(np.isinf(df[col]).sum())
            if cnt > 0:
                inf_by_col[col] = cnt
    inf_total_cells = sum(inf_by_col.values())
    inf_affected_rows = (
        int(np.isinf(df[list(inf_by_col.keys())]).any(axis=1).sum())
        if inf_by_col else 0
    )
    infinite_summary = {
        "total_cells": inf_total_cells,
        "affected_columns": list(inf_by_col.keys()),
        "affected_rows": inf_affected_rows,
        "columns_dict": inf_by_col,
    }

    # 6. Duplicate rows inspection
    if feature_cols:
        dup_count = int(df[feature_cols].duplicated().sum())
        dup_pct = round((dup_count / max(row_count, 1)) * 100.0, 2)
    else:
        dup_count = 0
        dup_pct = 0.0
    duplicate_summary = {
        "duplicate_count": dup_count,
        "duplicate_percentage": dup_pct,
    }

    # 7. Constant features inspection
    constant_cols = [
        col for col in feature_cols
        if pd.api.types.is_numeric_dtype(df[col]) and df[col].nunique() <= 1
    ]
    constant_summary = {
        "constant_features": constant_cols,
        "count": len(constant_cols),
    }

    # 8. Domain-specific column semantics
    port_cols = [
        col for col in feature_cols
        if any(term in col.lower() for term in ("port", "dport", "sport", "dst_port", "src_port"))
    ]
    if roles.get("dst_port") and roles["dst_port"] in df.columns and roles["dst_port"] not in port_cols:
        port_cols.append(roles["dst_port"])

    packet_cols = [
        col for col in feature_cols
        if any(term in col.lower() for term in ("pkt", "packet", "len", "length", "bytes", "size"))
    ]

    # 9. Dynamic Capability Matrix & Diagnostics Resolution
    supported_diagnostics: List[str] = [
        "data_quality_profiling",
        "missing_values_audit",
        "infinite_values_audit",
        "duplicate_rows_audit",
        "constant_features_audit",
        "feature_distribution_profiling",
    ]
    unsupported_diagnostics: Dict[str, str] = {}
    capability_matrix: Dict[str, Dict[str, Any]] = {
        "data_quality_profiling": {
            "status": "AVAILABLE",
            "category": "DATA_INTEGRITY",
            "reason": "Complete data quality profiling is universally available on all tabular datasets.",
        },
        "missing_values_audit": {
            "status": "AVAILABLE",
            "category": "DATA_INTEGRITY",
            "reason": "Evaluates null, NaN, and missing cell ratios per feature column.",
        },
        "infinite_values_audit": {
            "status": "AVAILABLE",
            "category": "DATA_INTEGRITY",
            "reason": "Detects IEEE 754 infinity (+inf/-inf) values corrupting gradient calculations.",
        },
        "duplicate_rows_audit": {
            "status": "AVAILABLE",
            "category": "DATA_INTEGRITY",
            "reason": "Detects exact duplicated feature vectors across network flows.",
        },
        "constant_features_audit": {
            "status": "AVAILABLE",
            "category": "DATA_INTEGRITY",
            "reason": "Identifies zero-variance constant telemetry columns carrying zero entropy.",
        },
        "feature_distribution_profiling": {
            "status": "AVAILABLE",
            "category": "DATA_INTEGRITY",
            "reason": "Profiles mean, standard deviation, quartiles, and extrema across numerical features.",
        },
    }

    # Class balance
    if len(raw_classes) > 1:
        supported_diagnostics.append("class_balance_audit")
        capability_matrix["class_balance_audit"] = {
            "status": "AVAILABLE",
            "category": "DESIGN_TOPOLOGY",
            "reason": f"Evaluates class ratios across {len(raw_classes)} distinct classes.",
        }
    else:
        unsupported_diagnostics["class_balance_audit"] = (
            "Single-class dataset contains only 1 class; class imbalance analysis is not applicable."
        )
        capability_matrix["class_balance_audit"] = {
            "status": "NOT_APPLICABLE",
            "category": "DESIGN_TOPOLOGY",
            "reason": "Single-class dataset contains only 1 class; class imbalance analysis is not applicable.",
        }

    # Heuristic: UGT (Unclear Ground Truth)
    if has_attacks and port_cols:
        supported_diagnostics.append("ugt_ephemeral_ports")
        capability_matrix["ugt_ephemeral_ports"] = {
            "status": "AVAILABLE",
            "category": "ATTACK_SHORTCUTS",
            "reason": f"Evaluates attack flows against destination port ranges ({', '.join(port_cols[:2])}).",
        }
    elif not has_attacks:
        unsupported_diagnostics["ugt_ephemeral_ports"] = (
            f"Dataset contains only '{raw_classes[0]}'. Evaluating attack port heuristics requires at least one attack class."
        )
        capability_matrix["ugt_ephemeral_ports"] = {
            "status": "NOT_APPLICABLE",
            "category": "ATTACK_SHORTCUTS",
            "reason": f"Dataset contains only '{raw_classes[0]}'. Evaluating attack port heuristics requires at least one attack class.",
        }
    else:
        unsupported_diagnostics["ugt_ephemeral_ports"] = (
            "No port telemetry columns detected in dataset schema."
        )
        capability_matrix["ugt_ephemeral_ports"] = {
            "status": "UNSUPPORTED_SCHEMA",
            "category": "ATTACK_SHORTCUTS",
            "reason": "No port telemetry columns detected in dataset schema.",
        }

    # Heuristic: WL (Wrong Labels / Packet Lengths)
    if has_attacks and packet_cols:
        supported_diagnostics.append("wl_packet_repetition")
        capability_matrix["wl_packet_repetition"] = {
            "status": "AVAILABLE",
            "category": "ATTACK_SHORTCUTS",
            "reason": f"Audits deterministic packet length sequences using {len(packet_cols)} packet size columns.",
        }
    elif not has_attacks:
        unsupported_diagnostics["wl_packet_repetition"] = (
            "Requires at least one attack class to evaluate attack packet repetition vs benign traffic."
        )
        capability_matrix["wl_packet_repetition"] = {
            "status": "NOT_APPLICABLE",
            "category": "ATTACK_SHORTCUTS",
            "reason": "Requires at least one attack class to evaluate attack packet repetition vs benign traffic.",
        }
    else:
        unsupported_diagnostics["wl_packet_repetition"] = (
            "No packet length or size telemetry columns detected in dataset schema."
        )
        capability_matrix["wl_packet_repetition"] = {
            "status": "UNSUPPORTED_SCHEMA",
            "category": "ATTACK_SHORTCUTS",
            "reason": "No packet length or size telemetry columns detected in dataset schema.",
        }

    # Heuristics: HDF, PDD/TC, SFI, GGI, Supervised ML
    attack_dependent_checks = [
        ("hdf_feature_dominance", "HDF Single-Feature Dominance", "Requires at least one attack class to evaluate single-feature decision trees."),
        ("pdd_tc_clustering", "PDD / TC Traffic Collapse", "Requires attack classes to cluster attack distributions vs benign baseline."),
        ("sfi_shortcut_fragility", "Shortcut Fragility Index (SFI)", "SFI measures attack recall collapse under feature perturbation relative to benign traffic."),
        ("ggi_generalization_gap", "Generalization Gap Index (GGI)", "Requires attack and benign classes to evaluate cross-split generalization gaps."),
        ("supervised_ml_benchmark", "Supervised ML Benchmark", "Supervised classification requires >= 2 distinct classes to train decision boundaries."),
        ("perfect_accuracy_investigation", "100% Accuracy Diagnostic", "Investigates test accuracy on attack detection."),
    ]

    for check_key, check_name, na_reason in attack_dependent_checks:
        if has_attacks:
            supported_diagnostics.append(check_key)
            capability_matrix[check_key] = {
                "status": "AVAILABLE",
                "category": "BENCHMARK_EVALUATION",
                "reason": f"Available for evaluation across {len(attack_classes)} target attack class(es).",
            }
        else:
            unsupported_diagnostics[check_key] = na_reason
            capability_matrix[check_key] = {
                "status": "NOT_APPLICABLE",
                "category": "BENCHMARK_EVALUATION",
                "reason": na_reason,
            }

    # Assemble authoritative 26-dimension DatasetProfile
    profile = {
        "dataset_id": target_id,
        "dataset_version": version,
        "dataset_fingerprint": fingerprint,
        "row_count": row_count,
        "column_count": column_count,
        "feature_columns": feature_cols,
        "feature_types": feature_types,
        "label_column": label_col,
        "benign_label": benign_label,
        "available_classes": raw_classes,
        "class_counts": class_counts,
        "class_ratios": class_ratios,
        "is_single_class": is_single_class,
        "is_binary": is_binary,
        "is_multiclass": is_multiclass,
        "has_benign": has_benign,
        "has_attacks": has_attacks,
        "attack_classes": attack_classes,
        "missing_value_summary": missing_summary,
        "infinite_value_summary": infinite_summary,
        "duplicate_summary": duplicate_summary,
        "constant_feature_summary": constant_summary,
        "port_columns_detected": port_cols,
        "packet_size_columns_detected": packet_cols,
        "supported_diagnostics": supported_diagnostics,
        "unsupported_diagnostics": unsupported_diagnostics,
        "capability_matrix": capability_matrix,
    }

    return profile
