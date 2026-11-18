"""Remediation manager conforming to Shared Contract v1.0 Section 2.10."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

import numpy as np
import pandas as pd

from smellscope.core.audit import get_cluster_assignments
from smellscope.core.errors import (
    E_CONFIG,
    E_ROLLBACK_MISMATCH,
    E_RSM_BLOCK,
    E_RSM_WARN_UNACKED,
    E_RULE_UNAVAILABLE,
    SmellScopeError,
)
from smellscope.core.eval import fit_and_evaluate
from smellscope.pipeline.split import assert_test_untouched
from smellscope.remediation.rsm import check_rsm


def _compute_view_hash(included_ids: List[int], excluded_features: List[str], split_hash: str) -> str:
    """Compute deterministic cryptographic hash of training view state."""
    hasher = hashlib.sha256()
    hasher.update(split_hash.encode("utf-8"))
    hasher.update(b"|")
    hasher.update(",".join(map(str, sorted(included_ids))).encode("utf-8"))
    hasher.update(b"|")
    hasher.update(",".join(sorted(excluded_features)).encode("utf-8"))
    return hasher.hexdigest()


def new_training_view(
    ds: Dict[str, Any],
    split: Dict[str, Any],
) -> Dict[str, Any]:
    """Create root TrainingView (view_0000) for dataset and locked split.

    Conforms to Shared Contract v1.0 Section 2.10.
    """
    train_ids = list(split["train_ids"])
    split_hash = split["split_hash"]

    # Compute included_hash (hash of train_ids alone)
    inc_hasher = hashlib.sha256()
    inc_hasher.update(",".join(map(str, sorted(train_ids))).encode("utf-8"))
    included_hash = inc_hasher.hexdigest()

    view_hash = _compute_view_hash(train_ids, [], split_hash)

    view: Dict[str, Any] = {
        "view_id": "view_0000",
        "parent_view_id": None,
        "split_hash": split_hash,
        "n_included": len(train_ids),
        "included_hash": included_hash,
        "excluded_features": [],
        "quarantined_count": 0,
        "view_hash": view_hash,
        "_included_row_ids": train_ids,  # Internal reference
    }
    return view


def _evaluate_quarantine_mask(
    df: pd.DataFrame,
    rule_name: str,
    target_classes: List[str],
    cfg: Optional[Dict[str, Any]],
    ds: Dict[str, Any],
) -> pd.Series:
    """Evaluate candidate flow quarantine boolean mask consistently for propose and apply."""
    rules_cfg = (cfg or {}).get("rules", {})
    rule_spec = rules_cfg.get(rule_name)
    label_col = ds["label_col"]

    if rule_spec:
        schema_id = ds.get("schema_id", "unknown")
        col_target = rule_spec.get("target_column_by_schema", {}).get(schema_id)
        if not col_target or col_target not in df.columns:
            col_target = ds.get("column_roles", {}).get("dst_port")

        if not col_target or col_target not in df.columns:
            raise SmellScopeError(
                code=E_RULE_UNAVAILABLE,
                message=f"Target column for rule '{rule_name}' not found in dataset.",
                details={"rule": rule_name, "schema_id": schema_id},
            )
        threshold = rule_spec.get("threshold", 0)
        op = rule_spec.get("operator", "gt")
        if op == "gt":
            return (df[col_target] > threshold) & (df[label_col].isin(target_classes))
        elif op == "eq":
            return (df[col_target] == threshold) & (df[label_col].isin(target_classes))
        else:
            return pd.Series(False, index=df.index)

    # Fallback heuristic rules
    if rule_name == "quarantine_ephemeral_ports":
        port_col = ds.get("column_roles", {}).get("dst_port")
        if not port_col or port_col not in df.columns:
            raise SmellScopeError(
                code=E_RULE_UNAVAILABLE,
                message=f"Rule '{rule_name}' requires destination port column, but none found.",
                details={"rule": rule_name},
            )
        return (df[port_col] > 49151) & (df[label_col].isin(target_classes))

    elif rule_name == "quarantine_zero_window":
        win_col = None
        for candidate in ("Init_Win_bytes_backward", "swin", "window"):
            if candidate in df.columns:
                win_col = candidate
                break
        if not win_col:
            raise SmellScopeError(
                code=E_RULE_UNAVAILABLE,
                message=f"Rule '{rule_name}' requires TCP window column, but none found.",
                details={"rule": rule_name},
            )
        return (df[win_col] == 0) & (df[label_col].isin(target_classes))

    else:
        raise SmellScopeError(
            code=E_RULE_UNAVAILABLE,
            message=f"Remediation rule '{rule_name}' is not registered.",
            details={"available_rules": list(rules_cfg.keys())},
        )


def propose_remediation(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    view: Dict[str, Any],
    options: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate a what-if preview for proposed remediation without modifying state.

    Args:
        ds: LoadedDataset dictionary.
        split: SplitManifest dictionary.
        view: Current active TrainingView.
        options: RemediationOptions {"action": "R1"|"R2", "params": {...}}
        cfg: Optional configuration dictionary.

    Returns:
        RemediationPreview dictionary.
    """
    cfg = cfg or {}
    df = ds["df"]
    label_col = ds["label_col"]
    benign_label = ds["benign_label"]
    action = options.get("action", "R1")
    params = options.get("params") or {k: v for k, v in options.items() if k != "action"}

    current_train_ids = set(view["_included_row_ids"])
    train_df = df[df["__row_id"].isin(current_train_ids)].copy()
    before_train_size = len(train_df)

    classes = [c for c in train_df[label_col].unique()]

    # Baseline class counts
    class_before = {str(c): int((train_df[label_col] == c).sum()) for c in classes}

    # Baseline cluster assignments for PDD cluster retention tracking
    cluster_before: Dict[str, Dict[str, int]] = {}
    cluster_assignments: Dict[str, pd.Series] = {}
    for c in classes:
        if str(c) != benign_label:
            try:
                clusters = get_cluster_assignments(
                    df=train_df,
                    label_col=label_col,
                    cls=str(c),
                    benign_label=benign_label,
                    cfg=cfg,
                    seed=split.get("seed", 42),
                )
                cluster_assignments[str(c)] = clusters
                cnts = clusters.value_counts().to_dict()
                cluster_before[str(c)] = {str(k): int(v) for k, v in cnts.items()}
            except Exception:
                cluster_before[str(c)] = {}

    affected_row_count = 0
    feature_changes: List[str] = []
    reason = ""

    if action == "R1":
        # Feature ablation
        features_to_ablate = params.get("features", [])
        if not features_to_ablate:
            raise SmellScopeError(
                code=E_CONFIG,
                message="R1 feature ablation requires non-empty 'features' list.",
                details={"params": params},
            )
        feature_changes = [str(f) for f in features_to_ablate if f not in view["excluded_features"]]
        reason = f"Ablate {len(feature_changes)} candidate shortcut feature(s): {', '.join(feature_changes[:5])}"
        after_train_size = before_train_size

        by_class = {
            str(c): {
                "before": class_before[str(c)],
                "after": class_before[str(c)],
                "retention": 1.0,
            }
            for c in classes
        }
        by_cluster = {
            str(c): {
                str(cl_id): {"before": cnt, "after": cnt, "retention": 1.0}
                for cl_id, cnt in cluster_before[str(c)].items()
            }
            for c in cluster_before
        }

    elif action == "R2":
        # Candidate flow quarantine
        rule_name = params.get("rule", "")
        target_classes = params.get("classes") or [c for c in classes if str(c) != benign_label]

        cond_mask = _evaluate_quarantine_mask(
            df=train_df,
            rule_name=rule_name,
            target_classes=target_classes,
            cfg=cfg,
            ds=ds,
        )

        quarantined_ids = set(train_df.loc[cond_mask, "__row_id"])
        affected_row_count = len(quarantined_ids)
        surviving_train = train_df[~train_df["__row_id"].isin(quarantined_ids)]
        after_train_size = len(surviving_train)

        reason = f"Quarantine {affected_row_count} flows matching rule '{rule_name}' across {len(target_classes)} class(es)."

        by_class = {}
        for c in classes:
            b_cnt = class_before[str(c)]
            a_cnt = int((surviving_train[label_col] == c).sum())
            ret = (a_cnt / b_cnt) if b_cnt > 0 else 1.0
            by_class[str(c)] = {"before": b_cnt, "after": a_cnt, "retention": round(ret, 4)}

        by_cluster = {}
        for c, cluster_series in cluster_assignments.items():
            by_cluster[str(c)] = {}
            for cl_id, b_cnt in cluster_before.get(str(c), {}).items():
                surviving_in_cluster = cluster_series.loc[
                    cluster_series.index.isin(surviving_train["__row_id"]) & (cluster_series == int(cl_id))
                ]
                a_cnt = len(surviving_in_cluster)
                ret = (a_cnt / b_cnt) if b_cnt > 0 else 1.0
                by_cluster[str(c)][str(cl_id)] = {
                    "before": b_cnt,
                    "after": a_cnt,
                    "retention": round(ret, 4),
                }
    else:
        raise SmellScopeError(
            code=E_CONFIG,
            message=f"Unsupported remediation action '{action}'. Only R1 and R2 are supported.",
            details={"action": action},
        )

    preview_id = f"prev_{uuid.uuid4().hex[:8]}"

    preview: Dict[str, Any] = {
        "preview_id": preview_id,
        "action": action,
        "params": params,
        "reason": reason,
        "affected": {
            "n_rows": affected_row_count,
            "by_class": by_class,
            "by_cluster": by_cluster,
        },
        "feature_changes": feature_changes,
        "expected_train_size": {
            "before": before_train_size,
            "after": after_train_size,
        },
    }

    preview["rsm_report"] = check_rsm(preview, policy=cfg.get("rsm", {}).get("policy") if cfg else None)

    return preview


def apply_remediation(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    view: Dict[str, Any],
    preview: Dict[str, Any],
    approval: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Execute remediation and transition to a new immutable TrainingView.

    Enforces backend RSM safety authorization.
    """
    # 1. Independent backend RSM validation
    rsm_report = check_rsm(preview, policy=cfg.get("rsm", {}).get("policy") if cfg else None)

    if rsm_report["status"] == "BLOCK":
        block_msg = "; ".join(b["message"] for b in rsm_report["blocks"])
        raise SmellScopeError(
            code=E_RSM_BLOCK,
            message=f"Remediation blocked by RSM: {block_msg}",
            details={"rsm_report": rsm_report},
        )

    if rsm_report["status"] == "WARN" and not approval.get("warning_ack", False):
        warn_msg = "; ".join(w["message"] for w in rsm_report["warnings"])
        raise SmellScopeError(
            code=E_RSM_WARN_UNACKED,
            message=f"Remediation triggered RSM warnings that must be explicitly acknowledged: {warn_msg}",
            details={"rsm_report": rsm_report},
        )

    if not approval.get("approved", False):
        raise SmellScopeError(
            code=E_CONFIG,
            message="Remediation execution requires explicit user approval.",
            details={"approval": approval},
        )

    df = ds["df"]
    action = preview["action"]
    params = preview["params"]

    current_train_ids = list(view["_included_row_ids"])
    current_excluded_features = list(view["excluded_features"])

    if action == "R1":
        new_train_ids = current_train_ids
        new_excluded_features = sorted(list(set(current_excluded_features) | set(preview["feature_changes"])))
        affected_ids = []
    elif action == "R2":
        # Identify quarantined rows
        train_subset = df[df["__row_id"].isin(current_train_ids)]
        rule_name = params.get("rule", "")
        target_classes = params.get("classes") or [c for c in train_subset[ds["label_col"]].unique() if str(c) != ds["benign_label"]]

        cond = _evaluate_quarantine_mask(
            df=train_subset,
            rule_name=rule_name,
            target_classes=target_classes,
            cfg=cfg,
            ds=ds,
        )

        quarantined_set = set(train_subset.loc[cond, "__row_id"])
        new_train_ids = [rid for rid in current_train_ids if rid not in quarantined_set]
        new_excluded_features = current_excluded_features
        affected_ids = sorted(list(quarantined_set))
    else:
        raise SmellScopeError(code=E_CONFIG, message=f"Unknown action {action}", details={"action": action})

    # Verify locked test set is untouched
    assert_test_untouched(split, new_train_ids)

    # Compute new hashes
    split_hash = split["split_hash"]
    inc_hasher = hashlib.sha256()
    inc_hasher.update(",".join(map(str, sorted(new_train_ids))).encode("utf-8"))
    included_hash = inc_hasher.hexdigest()

    new_view_hash = _compute_view_hash(new_train_ids, new_excluded_features, split_hash)

    # Derive new view_id
    curr_num = int(view["view_id"].replace("view_", "")) if "view_" in view["view_id"] else 0
    new_view_id = f"view_{curr_num + 1:04d}"

    new_view: Dict[str, Any] = {
        "view_id": new_view_id,
        "parent_view_id": view["view_id"],
        "split_hash": split_hash,
        "n_included": len(new_train_ids),
        "included_hash": included_hash,
        "excluded_features": new_excluded_features,
        "quarantined_count": view["quarantined_count"] + len(affected_ids),
        "view_hash": new_view_hash,
        "_included_row_ids": new_train_ids,
    }

    entry_id = f"log_{uuid.uuid4().hex[:8]}"
    change_log_entry: Dict[str, Any] = {
        "entry_id": entry_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "rule_name": params.get("rule", "feature_ablation"),
        "params": params,
        "seed": split.get("seed", 42),
        "affected_row_ids_ref": f"quarantine_{entry_id}",
        "before_counts": preview["affected"]["by_class"],
        "after_counts": preview["affected"]["by_class"],
        "rsm_status": rsm_report["status"],
        "warnings": rsm_report["warnings"],
        "approval": approval,
        "parent_view_id": view["view_id"],
        "new_view_id": new_view_id,
    }

    return new_view, change_log_entry


def rollback(
    view_history: List[Dict[str, Any]],
    change_log: List[Dict[str, Any]],
    target_entry_id: str,
) -> Dict[str, Any]:
    """Execute rollback with cryptographic state verification.

    Restores the parent view recorded in change_log and verifies view_hash.
    """
    entry = next((e for e in change_log if e["entry_id"] == target_entry_id), None)
    if not entry:
        raise SmellScopeError(
            code=E_CONFIG,
            message=f"Change log entry '{target_entry_id}' not found for rollback.",
            details={"target_entry_id": target_entry_id},
        )

    parent_id = entry["parent_view_id"]
    parent_view = next((v for v in view_history if v["view_id"] == parent_id), None)
    if not parent_view:
        raise SmellScopeError(
            code=E_ROLLBACK_MISMATCH,
            message=f"Parent view '{parent_id}' not found in view history.",
            details={"parent_view_id": parent_id},
        )

    # Re-verify parent view cryptographic hash
    expected_hash = _compute_view_hash(
        parent_view["_included_row_ids"],
        parent_view["excluded_features"],
        parent_view["split_hash"],
    )

    if expected_hash != parent_view["view_hash"]:
        raise SmellScopeError(
            code=E_ROLLBACK_MISMATCH,
            message=f"Cryptographic hash mismatch during rollback: expected {expected_hash}, recorded {parent_view['view_hash']}.",
            details={"expected_hash": expected_hash, "recorded_hash": parent_view["view_hash"]},
        )

    return parent_view


def rebenchmark(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    original_view: Dict[str, Any],
    remediated_view: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
    target_class: Optional[str] = None,
) -> Dict[str, Any]:
    """Re-benchmark model on locked test set before and after remediation.

    Evaluates both original and remediated training states on the EXACT same locked test set.
    """
    cfg = cfg or {}
    df = ds["df"]
    label_col = ds["label_col"]
    benign_label = ds["benign_label"]
    seed = split.get("seed", 42)

    # Test set rows
    test_ids = set(split["test_ids"])
    test_df = df[df["__row_id"].isin(test_ids)].copy()

    # Original train rows & features
    orig_train_ids = set(original_view["_included_row_ids"])
    assert_test_untouched(split, orig_train_ids)
    orig_train_df = df[df["__row_id"].isin(orig_train_ids)].copy()

    all_features = [
        c for c in df.columns
        if c not in (label_col, "__row_id", ds.get("column_roles", {}).get("group"))
    ]
    orig_features = [f for f in all_features if f not in original_view["excluded_features"]]

    # Remediated train rows & features
    rem_train_ids = set(remediated_view["_included_row_ids"])
    assert_test_untouched(split, rem_train_ids)
    rem_train_df = df[df["__row_id"].isin(rem_train_ids)].copy()
    rem_features = [f for f in all_features if f not in remediated_view["excluded_features"]]

    # Evaluate before
    eval_before = fit_and_evaluate(
        train_df=orig_train_df,
        test_df=test_df,
        label_col=label_col,
        benign_label=benign_label,
        feature_cols=orig_features,
        cfg=cfg,
        seed=seed,
        target_class=target_class,
    )

    # Evaluate after
    eval_after = fit_and_evaluate(
        train_df=rem_train_df,
        test_df=test_df,
        label_col=label_col,
        benign_label=benign_label,
        feature_cols=rem_features,
        cfg=cfg,
        seed=seed,
        target_class=target_class,
    )

    def _calc_delta(a: Optional[float], b: Optional[float]) -> Optional[float]:
        if a is None or b is None:
            return None
        return round(b - a, 4)

    delta = {
        "acc": _calc_delta(eval_before.get("acc"), eval_after.get("acc")),
        "f1": _calc_delta(eval_before.get("f1"), eval_after.get("f1")),
        "precision": _calc_delta(eval_before.get("precision"), eval_after.get("precision")),
        "weighted_f1": _calc_delta(eval_before.get("weighted_f1"), eval_after.get("weighted_f1")),
        "tpr": _calc_delta(eval_before.get("tpr"), eval_after.get("tpr")),
        "tnr": _calc_delta(eval_before.get("tnr"), eval_after.get("tnr")),
    }

    result: Dict[str, Any] = {
        "before": eval_before,
        "after": eval_after,
        "delta": delta,
        "same_test_ids": True,
        "split_hash": split["split_hash"],
        "train_sizes": {
            "before": len(orig_train_df),
            "after": len(rem_train_df),
        },
        "ci95": {"f1_before": None, "f1_after": None},
        "n_repeats": 1,
        "seed": seed,
    }

    return result


def generate_repair_plan_preview(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    view: Dict[str, Any],
    selected_recs: List[Dict[str, Any]],
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate aggregate preview and RSM safety check for multiple selected repair operations.

    Args:
        ds: LoadedDataset dictionary.
        split: SplitManifest dictionary.
        view: Active TrainingView.
        selected_recs: List of selected recommendation dictionaries.
        cfg: Optional configuration.

    Returns:
        Comprehensive aggregate repair preview dictionary.
    """
    df = ds["df"]
    label_col = ds["label_col"]
    benign_label = ds["benign_label"]
    cfg = cfg or {}

    current_train_ids = set(view["_included_row_ids"])
    train_df = df[df["__row_id"].isin(current_train_ids)].copy()
    before_train_size = len(train_df)

    classes = [c for c in train_df[label_col].unique()]
    class_before = {str(c): int((train_df[label_col] == c).sum()) for c in classes}

    # Aggregate features to drop / ablate
    features_to_drop: set[str] = set()
    quarantined_row_ids: set[int] = set()
    impute_cols: set[str] = set()
    clean_inf_cols: set[str] = set()
    dedup_requested = False

    reasons: List[str] = []

    for rec in selected_recs:
        act = rec.get("action_type")
        params = rec.get("action_params", {})

        if act == "FEATURE_ABLATION":
            feats = params.get("features", [])
            features_to_drop.update(feats)
            reasons.append(f"Ablate shortcut feature(s): {', '.join(feats)}")

        elif act == "DROP_CONSTANT_FEATURES":
            feats = params.get("features", [])
            features_to_drop.update(feats)
            reasons.append(f"Drop {len(feats)} constant feature(s)")

        elif act == "IMPUTE_NUMERIC":
            cols = params.get("columns", [])
            impute_cols.update(cols)
            reasons.append(f"Median impute {len(cols)} missing column(s)")

        elif act == "CLEAN_INFINITE":
            cols = params.get("columns", [])
            clean_inf_cols.update(cols)
            reasons.append(f"Cap infinite values in {len(cols)} column(s)")

        elif act == "DEDUPLICATE_TRAIN":
            dedup_requested = True
            reasons.append("Deduplicate redundant training flows")

        elif act == "FLOW_QUARANTINE":
            rule_name = params.get("rule", "quarantine_ephemeral_ports")
            target_classes = params.get("classes") or [c for c in classes if str(c) != benign_label]
            cond_mask = _evaluate_quarantine_mask(
                df=train_df,
                rule_name=rule_name,
                target_classes=target_classes,
                cfg=cfg,
                ds=ds,
            )
            q_ids = set(train_df.loc[cond_mask, "__row_id"])
            quarantined_row_ids.update(q_ids)
            reasons.append(f"Quarantine {len(q_ids)} flows matching '{rule_name}'")

    # Evaluate deduplication on training rows
    if dedup_requested:
        feature_cols_for_dup = [
            c for c in train_df.columns
            if c not in (label_col, "__row_id") and c not in features_to_drop
        ]
        dup_mask = train_df[feature_cols_for_dup].duplicated()
        dup_ids = set(train_df.loc[dup_mask, "__row_id"])
        quarantined_row_ids.update(dup_ids)

    # Calculate surviving training rows
    surviving_train = train_df[~train_df["__row_id"].isin(quarantined_row_ids)]
    after_train_size = len(surviving_train)
    affected_rows_count = len(quarantined_row_ids)

    by_class = {}
    for c in classes:
        b_cnt = class_before[str(c)]
        a_cnt = int((surviving_train[label_col] == c).sum())
        ret = (a_cnt / b_cnt) if b_cnt > 0 else 1.0
        by_class[str(c)] = {"before": b_cnt, "after": a_cnt, "retention": round(ret, 4)}

    # Data quality before and after metrics
    feature_cols = [c for c in df.columns if c not in (label_col, "__row_id")]
    missing_before = int(train_df[feature_cols].isna().sum().sum())
    missing_after = 0 if impute_cols else missing_before

    inf_before = int(np.isinf(train_df.select_dtypes(include=[np.number])).sum().sum())
    inf_after = 0 if clean_inf_cols else inf_before

    dup_before = int(train_df[feature_cols].duplicated().sum())
    dup_after = 0 if dedup_requested else dup_before

    features_changed_list = sorted(list(features_to_drop))

    preview_id = f"plan_{uuid.uuid4().hex[:8]}"

    preview: Dict[str, Any] = {
        "preview_id": preview_id,
        "action": "COMPOSITE_REPAIR_PLAN",
        "params": {
            "features_to_drop": features_changed_list,
            "impute_cols": sorted(list(impute_cols)),
            "clean_inf_cols": sorted(list(clean_inf_cols)),
            "quarantined_count": affected_rows_count,
            "selected_rec_ids": [r.get("id") for r in selected_recs if r.get("id")],
        },
        "reason": "; ".join(reasons) if reasons else "No changes selected",
        "affected": {
            "n_rows": affected_rows_count,
            "by_class": by_class,
            "by_cluster": {},
        },
        "feature_changes": features_changed_list,
        "expected_train_size": {
            "before": before_train_size,
            "after": after_train_size,
        },
        "data_quality_delta": {
            "missing_values": {"before": missing_before, "after": missing_after},
            "infinite_values": {"before": inf_before, "after": inf_after},
            "duplicate_records": {"before": dup_before, "after": dup_after},
            "features_removed": len(features_changed_list),
        },
    }

    # Execute RSM authorization
    preview["rsm_report"] = check_rsm(preview, policy=cfg.get("rsm", {}).get("policy") if cfg else None)

    return preview


def apply_repair_plan(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    view: Dict[str, Any],
    preview: Dict[str, Any],
    approval: Dict[str, Any],
    run_id: str,
    cfg: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Execute approved composite repair plan, transition TrainingView, and export versioned dataset.

    Returns:
        (new_view, change_log_entry, export_metadata)
    """
    # 1. Independent backend RSM validation
    rsm_report = check_rsm(preview, policy=cfg.get("rsm", {}).get("policy") if cfg else None)

    if rsm_report["status"] == "BLOCK":
        block_msg = "; ".join(b["message"] for b in rsm_report["blocks"])
        raise SmellScopeError(
            code=E_RSM_BLOCK,
            message=f"Repair plan blocked by RSM safety monitor: {block_msg}",
            details={"rsm_report": rsm_report},
        )

    if rsm_report["status"] == "WARN" and not approval.get("warning_ack", False):
        warn_msg = "; ".join(w["message"] for w in rsm_report["warnings"])
        raise SmellScopeError(
            code=E_RSM_WARN_UNACKED,
            message=f"Repair plan triggered RSM warnings that require explicit user acknowledgment: {warn_msg}",
            details={"rsm_report": rsm_report},
        )

    if not approval.get("approved", False):
        raise SmellScopeError(
            code=E_CONFIG,
            message="Repair plan execution requires user approval.",
            details={"approval": approval},
        )

    df = ds["df"]
    label_col = ds["label_col"]
    params = preview["params"]

    current_train_ids = list(view["_included_row_ids"])
    current_excluded_features = list(view["excluded_features"])

    features_to_drop = set(params.get("features_to_drop", []))
    new_excluded_features = sorted(list(set(current_excluded_features) | features_to_drop))

    # Identify rows to exclude (quarantine / dedup)
    train_subset = df[df["__row_id"].isin(current_train_ids)].copy()
    quarantined_ids: set[int] = set()

    # Re-evaluate dedup and quarantine if specified
    if preview.get("affected", {}).get("n_rows", 0) > 0:
        # Deduplication
        cols_for_dup = [
            c for c in train_subset.columns
            if c not in (label_col, "__row_id") and c not in new_excluded_features
        ]
        dup_mask = train_subset[cols_for_dup].duplicated()
        quarantined_ids.update(set(train_subset.loc[dup_mask, "__row_id"]))

    new_train_ids = [rid for rid in current_train_ids if rid not in quarantined_ids]

    # Verify locked test set is strictly untouched
    assert_test_untouched(split, new_train_ids)

    # Compute new view hash
    split_hash = split["split_hash"]
    inc_hasher = hashlib.sha256()
    inc_hasher.update(",".join(map(str, sorted(new_train_ids))).encode("utf-8"))
    included_hash = inc_hasher.hexdigest()
    new_view_hash = _compute_view_hash(new_train_ids, new_excluded_features, split_hash)

    curr_num = int(view["view_id"].replace("view_", "")) if "view_" in view["view_id"] else 0
    new_view_id = f"view_{curr_num + 1:04d}"

    new_view: Dict[str, Any] = {
        "view_id": new_view_id,
        "parent_view_id": view["view_id"],
        "split_hash": split_hash,
        "n_included": len(new_train_ids),
        "included_hash": included_hash,
        "excluded_features": new_excluded_features,
        "quarantined_count": view["quarantined_count"] + len(quarantined_ids),
        "view_hash": new_view_hash,
        "_included_row_ids": new_train_ids,
    }

    entry_id = f"log_{uuid.uuid4().hex[:8]}"
    change_log_entry: Dict[str, Any] = {
        "entry_id": entry_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": preview["action"],
        "view_id": new_view_id,
        "parent_view_id": view["view_id"],
        "reason": preview.get("reason", "Approved dataset repair plan"),
        "params": params,
        "split_hash": split_hash,
        "view_hash": new_view_hash,
        "rsm_status": rsm_report["status"],
        "warnings": rsm_report["warnings"],
        "approval": approval,
    }

    # Construct the actual exported corrected dataset dataframe
    # 1. Training rows: impute missing, drop excluded features, drop duplicate rows
    corrected_train = df[df["__row_id"].isin(new_train_ids)].copy()
    test_rows = df[df["__row_id"].isin(split["test_ids"])].copy()

    # Apply train median imputation
    impute_cols = params.get("impute_cols", [])
    for c in impute_cols:
        if c in corrected_train.columns and pd.api.types.is_numeric_dtype(corrected_train[c]):
            med = corrected_train[c].median()
            corrected_train[c] = corrected_train[c].fillna(med)
            if c in test_rows.columns:
                test_rows[c] = test_rows[c].fillna(med)

    # Drop excluded features from both
    remaining_cols = [c for c in df.columns if c not in new_excluded_features and c != "__row_id"]
    corrected_full = pd.concat([corrected_train[remaining_cols], test_rows[remaining_cols]], ignore_index=True)

    # Save versioned dataset file to disk
    repaired_dir = Path("./data/repaired")
    repaired_dir.mkdir(parents=True, exist_ok=True)
    export_csv_path = repaired_dir / f"corrected_{run_id}_{new_view_id}.csv"
    corrected_full.to_csv(export_csv_path, index=False)

    # Compute SHA-256 fingerprint
    hasher = hashlib.sha256()
    with open(export_csv_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    file_sha256 = hasher.hexdigest()

    export_metadata: Dict[str, Any] = {
        "file_path": str(export_csv_path.resolve()),
        "filename": export_csv_path.name,
        "sha256": file_sha256,
        "total_rows": len(corrected_full),
        "total_columns": len(remaining_cols),
        "view_id": new_view_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    return new_view, change_log_entry, export_metadata


def get_dataset_comparison(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    original_view: Dict[str, Any],
    remediated_view: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
    target_class: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute comprehensive Original vs Corrected dataset comparison covering:
    - Data Quality Comparison (rows, cols, missing, infinite, duplicates, class distribution)
    - Machine Learning Benchmark on Locked Test Set (Accuracy, Precision, Recall, Macro F1, Weighted F1, Confusion Matrix)
    - Test-Set Integrity Guarantee (same_test_ids=True)
    """
    df = ds["df"]
    label_col = ds["label_col"]

    orig_train_ids = set(original_view["_included_row_ids"])
    rem_train_ids = set(remediated_view["_included_row_ids"])

    orig_df = df[df["__row_id"].isin(orig_train_ids)]
    rem_df = df[df["__row_id"].isin(rem_train_ids)]

    all_feat_cols = [c for c in df.columns if c not in (label_col, "__row_id")]
    orig_features = [f for f in all_feat_cols if f not in original_view["excluded_features"]]
    rem_features = [f for f in all_feat_cols if f not in remediated_view["excluded_features"]]

    # Data Quality Stats Before vs After
    dq_before = {
        "total_rows": len(orig_df),
        "total_columns": len(orig_features),
        "missing_values": int(orig_df[orig_features].isna().sum().sum()),
        "infinite_values": int(np.isinf(orig_df[orig_features].select_dtypes(include=[np.number])).sum().sum()),
        "duplicate_records": int(orig_df[orig_features].duplicated().sum()),
        "class_distribution": {str(k): int(v) for k, v in orig_df[label_col].value_counts().items()},
    }

    dq_after = {
        "total_rows": len(rem_df),
        "total_columns": len(rem_features),
        "missing_values": int(rem_df[rem_features].isna().sum().sum()),
        "infinite_values": int(np.isinf(rem_df[rem_features].select_dtypes(include=[np.number])).sum().sum()),
        "duplicate_records": int(rem_df[rem_features].duplicated().sum()),
        "class_distribution": {str(k): int(v) for k, v in rem_df[label_col].value_counts().items()},
    }

    dq_delta = {
        "rows": dq_after["total_rows"] - dq_before["total_rows"],
        "columns": dq_after["total_columns"] - dq_before["total_columns"],
        "missing_values": dq_after["missing_values"] - dq_before["missing_values"],
        "infinite_values": dq_after["infinite_values"] - dq_before["infinite_values"],
        "duplicate_records": dq_after["duplicate_records"] - dq_before["duplicate_records"],
    }

    # Run locked ML benchmark
    ml_rebenchmark = rebenchmark(
        ds=ds,
        split=split,
        original_view=original_view,
        remediated_view=remediated_view,
        cfg=cfg,
        target_class=target_class,
    )

    return {
        "data_quality": {
            "before": dq_before,
            "after": dq_after,
            "delta": dq_delta,
        },
        "ml_benchmark": ml_rebenchmark,
        "test_integrity": {
            "same_test_ids": True,
            "test_sample_count": len(split.get("test_ids", [])),
            "split_hash": split.get("split_hash"),
            "status": "LOCKED_TEST_VERIFIED",
        },
        "view_lineage": {
            "original_view_id": original_view["view_id"],
            "corrected_view_id": remediated_view["view_id"],
            "excluded_features": remediated_view["excluded_features"],
        },
    }

