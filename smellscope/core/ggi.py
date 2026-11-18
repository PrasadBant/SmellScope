"""Generalisation Gap Index (GGI) and Local Overfitting Ratio (LOR)."""
from typing import Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score
from sklearn.model_selection import GroupKFold, StratifiedKFold

from smellscope.core.preprocess import fit_preprocessor


def compute_ggi(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    split: dict[str, Any],
    cluster_labels: Optional[pd.Series] = None,
    group_col: Optional[str] = None,
) -> tuple[dict[str, Any], dict[str, str]]:
    """Compute Generalisation Gap Index (GGI) comparing random-split F1 to group-held-out F1."""
    ggi_cfg = cfg.get("ggi", {})
    min_groups = ggi_cfg.get("min_groups", 3)
    lor_threshold = ggi_cfg.get("lor_threshold", 0.95)
    seed = ggi_cfg.get("random_state", 42)

    na_reasons: dict[str, str] = {}

    # Filter binary: cls vs benign
    valid_classes = [cls, benign_label]
    sub_df = df[df[label_col].isin(valid_classes)].copy()
    n_class = (sub_df[label_col] == cls).sum()
    n_benign = (sub_df[label_col] == benign_label).sum()

    if n_class < 5 or n_benign < 5:
        na_reasons["ggi.gap"] = f"Insufficient class samples (class: {n_class}, benign: {n_benign}) for GGI"
        return {
            "f1_random": None,
            "f1_grouped": None,
            "gap": None,
            "lor": None,
            "grouping": "cluster_proxy",
            "n_groups": None,
            "group_sizes": [],
            "lor_threshold": lor_threshold,
        }, na_reasons

    clean_features = [c for c in feature_cols if not c.startswith("__") and c in sub_df.columns]

    # Preprocess features
    prep = fit_preprocessor(sub_df, feature_cols=clean_features, cfg=cfg)
    X = prep.transform(sub_df)[clean_features].to_numpy(dtype=float)
    y = (sub_df[label_col] == cls).to_numpy(dtype=int)

    # Determine grouping
    grouping_type = "cluster_proxy"
    if group_col and group_col in sub_df.columns and sub_df[group_col].nunique() >= min_groups:
        groups = sub_df[group_col].to_numpy()
        grouping_type = "provenance"
    elif cluster_labels is not None:
        # Align cluster labels via __row_id
        # Benign gets a pseudo-group based on modulo or single group, attack gets cluster_labels
        attack_clusters = cluster_labels.to_dict()
        row_ids = sub_df["__row_id"].values
        groups = np.zeros(len(sub_df), dtype=int)
        for idx, rid in enumerate(row_ids):
            if y[idx] == 1:
                groups[idx] = attack_clusters.get(rid, 0)
            else:
                # Assign benign points across groups evenly
                groups[idx] = idx % max(1, len(set(attack_clusters.values())))
        grouping_type = "cluster_proxy"
    else:
        na_reasons["ggi.gap"] = "No grouping column or cluster labels available"
        return {
            "f1_random": None,
            "f1_grouped": None,
            "gap": None,
            "lor": None,
            "grouping": "cluster_proxy",
            "n_groups": None,
            "group_sizes": [],
            "lor_threshold": lor_threshold,
        }, na_reasons

    unique_groups, group_counts = np.unique(groups, return_counts=True)
    n_groups = len(unique_groups)

    if n_groups < min_groups:
        na_reasons["ggi.gap"] = f"Total distinct groups ({n_groups}) < min_groups ({min_groups})"
        return {
            "f1_random": None,
            "f1_grouped": None,
            "gap": None,
            "lor": None,
            "grouping": grouping_type,
            "n_groups": n_groups,
            "group_sizes": [int(c) for c in group_counts],
            "lor_threshold": lor_threshold,
        }, na_reasons

    # 1. Random split cross-validation (StratifiedKFold)
    skf = StratifiedKFold(n_splits=n_groups, shuffle=True, random_state=seed)
    random_f1s = []
    for tr_idx, te_idx in skf.split(X, y):
        rf = RandomForestClassifier(n_estimators=50, random_state=seed, n_jobs=-1)
        rf.fit(X[tr_idx], y[tr_idx])
        preds = rf.predict(X[te_idx])
        random_f1s.append(float(f1_score(y[te_idx], preds, pos_label=1, zero_division=0)))

    f1_random = float(np.mean(random_f1s))

    # 2. Group-held-out cross-validation (GroupKFold)
    gkf = GroupKFold(n_splits=n_groups)
    grouped_f1s = []
    for tr_idx, te_idx in gkf.split(X, y, groups=groups):
        # Verify both classes present in train
        if len(np.unique(y[tr_idx])) < 2:
            continue
        rf = RandomForestClassifier(n_estimators=50, random_state=seed, n_jobs=-1)
        rf.fit(X[tr_idx], y[tr_idx])
        preds = rf.predict(X[te_idx])
        grouped_f1s.append(float(f1_score(y[te_idx], preds, pos_label=1, zero_division=0)))

    if not grouped_f1s:
        na_reasons["ggi.f1_grouped"] = "Group-held-out folds lacked class representation in training folds"
        f1_grouped = None
        gap = None
    else:
        f1_grouped = float(np.mean(grouped_f1s))
        gap = float(f1_random - f1_grouped)

    return {
        "f1_random": f1_random,
        "f1_grouped": f1_grouped,
        "gap": gap,
        "lor": None,  # LOR is on cut-list (P2)
        "grouping": grouping_type,
        "n_groups": n_groups,
        "group_sizes": [int(c) for c in group_counts],
        "lor_threshold": lor_threshold,
    }, na_reasons
