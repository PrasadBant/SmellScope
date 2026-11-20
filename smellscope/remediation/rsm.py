"""Remediation Safety Monitor (RSM) conforming to Shared Contract v1.0 Section 2.10.

RSM decides whether a proposed repair plan is safe for the *training* data. It never evaluates or
touches the locked test set (that is protected separately by ``assert_test_untouched`` and the
test-set fingerprint check performed by the remediation manager).

Policy thresholds are loaded from ``config/default.yaml`` (``rsm.policy``); the values in
``DEFAULT_RSM_POLICY`` are only the fallback used when the configuration does not define a key.
"""

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

# Clusters with this many original rows or fewer are not evaluated (existing rule: more than 5 rows).
MIN_CLUSTER_ROWS_EVALUATED = 5


def load_rsm_policy(cfg: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Return the effective RSM policy: defaults overridden by ``rsm.policy`` from configuration."""
    policy = dict(DEFAULT_RSM_POLICY)
    if cfg is None:
        try:
            from smellscope.pipeline.config import load_config

            cfg = load_config()
        except Exception:
            cfg = {}
    configured = ((cfg or {}).get("rsm") or {}).get("policy") or {}
    policy.update({k: v for k, v in configured.items() if k in DEFAULT_RSM_POLICY})
    return policy


def _pct(x: float) -> str:
    """Human-readable percentage: 42% / 12.5% (no trailing .0)."""
    text = f"{x * 100:.1f}"
    return (text[:-2] if text.endswith(".0") else text) + "%"


def check_rsm(
    preview: Dict[str, Any],
    policy: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Inspect proposed remediation preview against safety thresholds.

    Evaluates whether proposed training modifications (feature ablation or flow quarantine)
    preserve model integrity, prevent catastrophic class erasure, and avoid cluster obliteration.

    Returns:
        RSMReport dictionary with status in {"PASS", "WARN", "BLOCK"}. In addition to the original
        ``status``/``warnings``/``blocks``/``impact``/``policy`` keys it contains ``checks`` (every
        evaluated class/cluster/feature check, including checks that passed), ``requires_acknowledgement``
        and a plain-language ``summary``.
    """
    effective_policy = load_rsm_policy()
    if policy:
        effective_policy.update({k: v for k, v in policy.items() if k in DEFAULT_RSM_POLICY})

    warnings: List[Dict[str, Any]] = []
    blocks: List[Dict[str, Any]] = []

    affected = preview.get("affected", {})
    by_class = affected.get("by_class", {})
    by_cluster = affected.get("by_cluster", {})
    feature_changes = preview.get("feature_changes", [])
    expected_train_size = preview.get("expected_train_size", {})
    before_train_rows = expected_train_size.get("before", 0)
    after_train_rows = expected_train_size.get("after", 0)

    class_checks: List[Dict[str, Any]] = []
    cluster_checks: List[Dict[str, Any]] = []

    # 1. Total remaining rows check
    total_status = "PASS"
    if after_train_rows < effective_policy["min_total_train_rows_block"]:
        total_status = "BLOCK"
        blocks.append({
            "code": "RSM_BLOCK_EXTREME_DATA_LOSS",
            "class": None,
            "title": "Too few training rows would remain",
            "message": f"Remaining training rows ({after_train_rows}) below safety floor ({effective_policy['min_total_train_rows_block']}).",
            "explanation": (
                f"Only {after_train_rows} training rows would remain, below the minimum of "
                f"{effective_policy['min_total_train_rows_block']} needed to train a meaningful model."
            ),
            "evidence": {
                "original_rows": before_train_rows,
                "remaining_rows": after_train_rows,
                "threshold_block": effective_policy["min_total_train_rows_block"],
            },
        })

    # 2. Per-class retention checks
    for cls_name, counts in by_class.items():
        retention = counts.get("retention", 1.0)
        before_cnt = counts.get("before", 0)
        after_cnt = counts.get("after", 0)
        removed = max(0, before_cnt - after_cnt)
        status = "PASS"
        evidence = {
            "class": str(cls_name),
            "original_rows": before_cnt,
            "remaining_rows": after_cnt,
            "removed_rows": removed,
            "retention": retention,
            "threshold_warn": effective_policy["min_class_retention_warn"],
            "threshold_block": effective_policy["min_class_retention_block"],
        }

        if before_cnt > 0 and retention < effective_policy["min_class_retention_block"]:
            status = "BLOCK"
            blocks.append({
                "code": "RSM_BLOCK_CLASS_ERASURE",
                "class": str(cls_name),
                "title": f"{cls_name} training-data retention is critically low",
                "message": (
                    f"Class '{cls_name}' retention is {retention:.1%}, below block threshold "
                    f"({effective_policy['min_class_retention_block']:.1%}). Rows reduced from {before_cnt} to {after_cnt}."
                ),
                "explanation": (
                    f"Your repair plan would keep only {_pct(retention)} of the original '{cls_name}' training records "
                    f"({after_cnt} of {before_cnt}). This is below the {_pct(effective_policy['min_class_retention_block'])} "
                    f"block threshold. A model cannot reliably learn a class that has been almost erased."
                ),
                "evidence": evidence,
            })
        elif before_cnt > 0 and retention < effective_policy["min_class_retention_warn"]:
            status = "WARN"
            warnings.append({
                "code": "RSM_WARN_HIGH_CLASS_ATTRITION",
                "class": str(cls_name),
                "title": f"{cls_name} training-data retention warning",
                "message": (
                    f"Class '{cls_name}' retention is {retention:.1%}, below warning threshold "
                    f"({effective_policy['min_class_retention_warn']:.1%})."
                ),
                "explanation": (
                    f"Your repair plan retains only {_pct(retention)} of the original '{cls_name}' training records "
                    f"({after_cnt} of {before_cnt}; {removed} removed or quarantined). This is below the "
                    f"{_pct(effective_policy['min_class_retention_warn'])} warning threshold. Removing too many "
                    f"'{cls_name}' examples could weaken the model's ability to learn this class."
                ),
                "evidence": evidence,
            })

        class_checks.append({
            "class": str(cls_name),
            "original_rows": before_cnt,
            "remaining_rows": after_cnt,
            "removed_rows": removed,
            "retention": retention,
            "status": status,
        })

    # 3. Per-cluster retention checks (PDD clusters); small clusters are listed but not evaluated
    for cls_name, clusters in by_cluster.items():
        for cluster_id, counts in clusters.items():
            retention = counts.get("retention", 1.0)
            before_cnt = counts.get("before", 0)
            after_cnt = counts.get("after", 0)
            evaluated = before_cnt > MIN_CLUSTER_ROWS_EVALUATED
            status = "NOT_EVALUATED"
            evidence = {
                "class": str(cls_name),
                "cluster_id": str(cluster_id),
                "original_rows": before_cnt,
                "remaining_rows": after_cnt,
                "removed_rows": max(0, before_cnt - after_cnt),
                "retention": retention,
                "threshold_warn": effective_policy["min_cluster_retention_warn"],
                "threshold_block": effective_policy["min_cluster_retention_block"],
            }
            if evaluated:
                status = "PASS"
                if retention < effective_policy["min_cluster_retention_block"]:
                    status = "BLOCK"
                    blocks.append({
                        "code": "RSM_BLOCK_CLUSTER_OBLITERATION",
                        "class": str(cls_name),
                        "cluster": str(cluster_id),
                        "title": f"{cls_name} cluster {cluster_id} would be wiped out",
                        "message": f"Cluster {cluster_id} of class '{cls_name}' wiped out (retention: {retention:.1%}).",
                        "explanation": (
                            f"Cluster {cluster_id} of '{cls_name}' (a group of similar {cls_name} records) would keep only "
                            f"{_pct(retention)} of its {before_cnt} training rows, below the "
                            f"{_pct(effective_policy['min_cluster_retention_block'])} block threshold. "
                            f"That would remove an entire pattern of this attack from training."
                        ),
                        "evidence": evidence,
                    })
                elif retention < effective_policy["min_cluster_retention_warn"]:
                    status = "WARN"
                    warnings.append({
                        "code": "RSM_WARN_CLUSTER_DISTORTION",
                        "class": str(cls_name),
                        "cluster": str(cluster_id),
                        "title": f"{cls_name} cluster {cluster_id} heavily reduced",
                        "message": f"Cluster {cluster_id} of class '{cls_name}' heavily reduced (retention: {retention:.1%}).",
                        "explanation": (
                            f"Cluster {cluster_id} of '{cls_name}' would keep only {_pct(retention)} of its "
                            f"{before_cnt} training rows ({after_cnt} remain), below the "
                            f"{_pct(effective_policy['min_cluster_retention_warn'])} warning threshold. "
                            f"The diversity of this attack's patterns may be reduced."
                        ),
                        "evidence": evidence,
                    })
            cluster_checks.append({
                "class": str(cls_name),
                "cluster_id": str(cluster_id),
                "original_rows": before_cnt,
                "remaining_rows": after_cnt,
                "retention": retention,
                "evaluated": evaluated,
                "status": status,
                "reason": None if evaluated else f"Cluster has {before_cnt} original rows (needs more than {MIN_CLUSTER_ROWS_EVALUATED}).",
            })

    # 4. Feature ablation count check (WARN only; the policy defines no BLOCK for feature count)
    feature_counts = preview.get("feature_counts") or {}
    max_features = effective_policy["max_ablation_features_warn"]
    feature_status = "PASS"
    if len(feature_changes) > max_features:
        feature_status = "WARN"
        warnings.append({
            "code": "RSM_WARN_EXCESSIVE_ABLATION",
            "class": None,
            "title": "Many features would be removed",
            "message": (
                f"Proposed ablation removes {len(feature_changes)} features, exceeding warning threshold "
                f"({max_features})."
            ),
            "explanation": (
                f"Your selected plan removes {len(feature_changes)} features, more than the {max_features} allowed "
                f"without review. Check that every excluded feature is actually unsuitable for training: "
                f"{', '.join(str(f) for f in feature_changes)}."
            ),
            "evidence": {"planned_removals": len(feature_changes), "threshold_warn": max_features, "features": list(feature_changes)},
        })

    # Determine status
    if blocks:
        status = "BLOCK"
    elif warnings:
        status = "WARN"
    else:
        status = "PASS"

    summaries = {
        "PASS": "Your selected improvements meet the configured safety thresholds.",
        "WARN": "Your selected improvements may remove a significant amount of training data. Review the affected classes and clusters before continuing.",
        "BLOCK": "One or more critical safety limits have been violated. SmellScope will not apply this repair plan.",
    }

    report: Dict[str, Any] = {
        "status": status,
        "warnings": warnings,
        "blocks": blocks,
        "impact": affected,
        "policy": effective_policy,
        "requires_acknowledgement": status == "WARN",
        "summary": summaries[status],
        "checks": {
            "total_rows": {
                "original_rows": before_train_rows,
                "remaining_rows": after_train_rows,
                "threshold_block": effective_policy["min_total_train_rows_block"],
                "status": total_status,
            },
            "classes": class_checks,
            "clusters": cluster_checks,
            "features": {
                "original_count": feature_counts.get("original"),
                "planned_removals": len(feature_changes),
                "remaining_count": feature_counts.get("remaining"),
                "names": [str(f) for f in feature_changes],
                "threshold_warn": max_features,
                "triggered": feature_status == "WARN",
                "status": feature_status,
            },
        },
    }

    return report
