"""Remediation Safety Monitor (RSM) conforming to Shared Contract v1.0 Section 2.10."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


DEFAULT_RSM_POLICY: Dict[str, Any] = {
    "min_class_retention_block": 0.20,
    "min_class_retention_warn": 0.50,
    "min_cluster_retention_block": 0.10,
    "min_cluster_retention_warn": 0.25,
    "max_ablation_features_warn": 10,
    "min_total_train_rows_block": 10,
}


def check_rsm(
    preview: Dict[str, Any],
    policy: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Inspect proposed remediation preview against safety thresholds.

    Evaluates whether proposed training modifications (feature ablation or flow quarantine)
    preserve model integrity, prevent catastrophic class erasure, and avoid cluster obliteration.

    Returns:
        RSMReport dictionary with status in {"PASS", "WARN", "BLOCK"}.
    """
    effective_policy = dict(DEFAULT_RSM_POLICY)
    if policy:
        effective_policy.update(policy)

    warnings: List[Dict[str, Any]] = []
    blocks: List[Dict[str, Any]] = []

    affected = preview.get("affected", {})
    by_class = affected.get("by_class", {})
    by_cluster = affected.get("by_cluster", {})
    feature_changes = preview.get("feature_changes", [])
    expected_train_size = preview.get("expected_train_size", {})
    after_train_rows = expected_train_size.get("after", 0)

    # 1. Total remaining rows check
    if after_train_rows < effective_policy["min_total_train_rows_block"]:
        blocks.append({
            "code": "RSM_BLOCK_EXTREME_DATA_LOSS",
            "class": None,
            "message": f"Remaining training rows ({after_train_rows}) below safety floor ({effective_policy['min_total_train_rows_block']}).",
        })

    # 2. Per-class retention checks
    for cls_name, counts in by_class.items():
        retention = counts.get("retention", 1.0)
        before_cnt = counts.get("before", 0)
        after_cnt = counts.get("after", 0)

        if before_cnt > 0 and retention < effective_policy["min_class_retention_block"]:
            blocks.append({
                "code": "RSM_BLOCK_CLASS_ERASURE",
                "class": str(cls_name),
                "message": (
                    f"Class '{cls_name}' retention is {retention:.1%}, below block threshold "
                    f"({effective_policy['min_class_retention_block']:.1%}). Rows reduced from {before_cnt} to {after_cnt}."
                ),
            })
        elif before_cnt > 0 and retention < effective_policy["min_class_retention_warn"]:
            warnings.append({
                "code": "RSM_WARN_HIGH_CLASS_ATTRITION",
                "class": str(cls_name),
                "message": (
                    f"Class '{cls_name}' retention is {retention:.1%}, below warning threshold "
                    f"({effective_policy['min_class_retention_warn']:.1%})."
                ),
            })

    # 3. Per-cluster retention checks (PDD clusters)
    for cls_name, clusters in by_cluster.items():
        for cluster_id, counts in clusters.items():
            retention = counts.get("retention", 1.0)
            before_cnt = counts.get("before", 0)
            if before_cnt > 5 and retention < effective_policy["min_cluster_retention_block"]:
                blocks.append({
                    "code": "RSM_BLOCK_CLUSTER_OBLITERATION",
                    "class": str(cls_name),
                    "message": (
                        f"Cluster {cluster_id} of class '{cls_name}' wiped out (retention: {retention:.1%})."
                    ),
                })
            elif before_cnt > 5 and retention < effective_policy["min_cluster_retention_warn"]:
                warnings.append({
                    "code": "RSM_WARN_CLUSTER_DISTORTION",
                    "class": str(cls_name),
                    "message": (
                        f"Cluster {cluster_id} of class '{cls_name}' heavily reduced (retention: {retention:.1%})."
                    ),
                })

    # 4. Feature ablation count check
    if len(feature_changes) > effective_policy["max_ablation_features_warn"]:
        warnings.append({
            "code": "RSM_WARN_EXCESSIVE_ABLATION",
            "class": None,
            "message": (
                f"Proposed ablation removes {len(feature_changes)} features, exceeding warning threshold "
                f"({effective_policy['max_ablation_features_warn']})."
            ),
        })

    # Determine status
    if blocks:
        status = "BLOCK"
    elif warnings:
        status = "WARN"
    else:
        status = "PASS"

    report: Dict[str, Any] = {
        "status": status,
        "warnings": warnings,
        "blocks": blocks,
        "impact": affected,
        "policy": effective_policy,
    }

    return report
