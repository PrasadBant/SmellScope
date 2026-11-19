"""Core class audit aggregator and cluster assignments conforming to contract Sections 2.6 and 2.7."""
from datetime import datetime, timezone
import sys
from typing import Any, Optional
import numpy as np
import pandas as pd
import sklearn

from smellscope.core.errors import SmellScopeError
from smellscope.core.eval import fit_and_evaluate
from smellscope.core.ggi import compute_ggi
from smellscope.core.heuristics import (
    compute_ugt,
    compute_wl,
    compute_hdf,
    compute_pdd_and_tc,
)
from smellscope.core.perfect_accuracy import investigate_perfect_accuracy
from smellscope.core.preprocess import fit_preprocessor
from smellscope.core.sfi import compute_sfi


def get_cluster_assignments(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    cfg: Optional[dict[str, Any]] = None,
    seed: int = 42,
) -> pd.Series:
    """Return cluster assignment IDs for class flows using the same KMeans clustering as PDD."""
    cfg = cfg or {}
    class_df = df[df[label_col] == cls]
    if len(class_df) == 0:
        return pd.Series(dtype=int)

    feature_cols = [c for c in df.columns if not c.startswith("__") and c != label_col]
    prep = fit_preprocessor(class_df, feature_cols=feature_cols, cfg=cfg)
    transformed = prep.transform(class_df)

    pdd, tc, n_clust, km, reason = compute_pdd_and_tc(
        class_df, label_col=label_col, cls=cls, feature_cols=feature_cols, cfg=cfg, seed=seed
    )

    if km is None or not hasattr(km, "labels_"):
        # Fallback to single cluster
        return pd.Series(0, index=class_df["__row_id"], dtype=int)

    return pd.Series(km.labels_, index=class_df["__row_id"], dtype=int)


def audit_class(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    cfg: dict[str, Any],
    split: dict[str, Any],
) -> dict[str, Any]:
    """Execute complete audit diagnostics for a single attack class vs benign."""
    # Validate required parameters
    if df is None or not isinstance(df, pd.DataFrame):
        raise SmellScopeError("E_SCHEMA", "Input df must be a pandas DataFrame")

    if label_col not in df.columns:
        raise SmellScopeError("E_LABEL_COLUMN", f"Label column '{label_col}' not found in DataFrame")

    if benign_label not in df[label_col].values:
        raise SmellScopeError("E_BENIGN_LABEL_MISSING", f"Benign label '{benign_label}' not found in DataFrame")

    if cls not in df[label_col].values:
        raise SmellScopeError("E_CLASS_TOO_SMALL", f"Target class '{cls}' not present in dataset")

    for partition_key in ["train_ids", "val_ids", "test_ids"]:
        if partition_key not in split:
            raise SmellScopeError("E_SPLIT_INVALID", f"SplitManifest missing '{partition_key}'")

    n_cls = int((df[label_col] == cls).sum())
    n_benign = int((df[label_col] == benign_label).sum())

    if n_cls < 2:
        raise SmellScopeError("E_CLASS_TOO_SMALL", f"Class '{cls}' has only {n_cls} rows (need >= 2)")

    # Ensure __row_id exists safely
    if "__row_id" not in df.columns:
        df = df.copy()
        df["__row_id"] = np.arange(len(df), dtype=int)

    na_reasons: dict[str, str] = {}
    seed = int(cfg.get("seed", 42))

    # Identify candidate features (excluding __row_id and label_col)
    feature_cols = [c for c in df.columns if not c.startswith("__") and c != label_col]

    # Preprocess train/test views for heuristics
    train_ids = set(split["train_ids"])
    val_ids = set(split.get("val_ids", []))
    test_ids = set(split["test_ids"])
    train_df = df[df["__row_id"].isin(train_ids)].copy()
    val_df = df[df["__row_id"].isin(val_ids)].copy() if len(val_ids) > 0 else None
    test_df = df[df["__row_id"].isin(test_ids)].copy()

    prep = fit_preprocessor(train_df, feature_cols=feature_cols, cfg=cfg)
    transformed_df = prep.transform(df)
    transformed_df[label_col] = df[label_col].values
    if "__row_id" in df.columns:
        transformed_df["__row_id"] = df["__row_id"].values

    transformed_train = prep.transform(train_df)
    transformed_train[label_col] = train_df[label_col].values
    transformed_test = prep.transform(test_df)
    transformed_test[label_col] = test_df[label_col].values

    # 1. Unclear Ground Truth (UGT)
    ugt_score: Optional[float] = None
    dst_port_col = cfg.get("column_roles", {}).get("dst_port", None)
    if not dst_port_col:
        for candidate in ["Destination Port", "dst_port", "dsport"]:
            if candidate in df.columns:
                dst_port_col = candidate
                break

    try:
        ugt_score, ugt_reason = compute_ugt(df, label_col, cls, dst_port_col, cfg.get("heuristics", {}))
        if ugt_reason:
            na_reasons["paper.UGT"] = ugt_reason
    except Exception as e:
        na_reasons["paper.UGT"] = f"Failed to compute UGT: {e}"

    # 2. Wrong Labels (WL)
    wl_score: Optional[float] = None
    wl_no_bias: Optional[float] = None
    try:
        wl_score, wl_no_bias, wl_reason = compute_wl(
            transformed_df, label_col, cls, benign_label, feature_cols, cfg.get("heuristics", {}), seed=seed
        )
        if wl_reason:
            na_reasons["paper.WL"] = wl_reason
    except Exception as e:
        na_reasons["paper.WL"] = f"Failed to compute WL: {e}"

    # 3. Highly Dependent Features (HDF)
    hdf_score: Optional[float] = None
    hdf_top_feature: Optional[str] = None
    try:
        hdf_score, hdf_top_feature, hdf_reason = compute_hdf(
            transformed_train, transformed_test, label_col, cls, benign_label,
            feature_cols, cfg.get("heuristics", {}), seed=seed
        )
        if hdf_reason:
            na_reasons["paper.HDF"] = hdf_reason
    except Exception as e:
        na_reasons["paper.HDF"] = f"Failed to compute HDF: {e}"

    # 4. Poor Data Diversity (PDD) & Traffic Collapse (TC)
    pdd_score: Optional[float] = None
    tc_score: Optional[float] = None
    pdd_n_clusters: Optional[int] = None
    cluster_labels_series: Optional[pd.Series] = None
    try:
        pdd_score, tc_score, pdd_n_clusters, km_model, pdd_reason = compute_pdd_and_tc(
            transformed_df, label_col, cls, feature_cols, cfg.get("heuristics", {}), seed=seed
        )
        if pdd_reason:
            na_reasons["paper.PDD"] = pdd_reason
            na_reasons["paper.TC"] = pdd_reason
        if km_model is not None and hasattr(km_model, "labels_"):
            cls_mask = transformed_df[label_col] == cls
            cls_rids = transformed_df.loc[cls_mask, "__row_id"]
            cluster_labels_series = pd.Series(km_model.labels_, index=cls_rids)
    except Exception as e:
        na_reasons["paper.PDD"] = f"Failed to compute PDD/TC: {e}"
        na_reasons["paper.TC"] = f"Failed to compute PDD/TC: {e}"

    # 5. Baseline Evaluation across train, val, and locked test partitions
    baseline_res: dict[str, Any] = {
        "acc": None,
        "f1": None,
        "tpr": None,
        "tnr": None,
        "fpr": None,
        "fnr": None,
        "precision": None,
        "weighted_f1": None,
        "roc_auc": None,
        "pr_auc": None,
        "confusion_matrix": None,
        "per_class": {},
        "train": {},
        "val": {},
        "test": {},
        "perfect_accuracy_investigation": None,
        "n_test": len(test_df[test_df[label_col].isin([cls, benign_label])]),
    }
    try:
        eval_cfg = dict(cfg) if cfg else {}
        if val_df is not None:
            eval_cfg["val_df"] = val_df
        raw_eval = fit_and_evaluate(
            train_df, test_df, label_col, benign_label, feature_cols, eval_cfg, seed=seed,
            target_class=cls
        )
        baseline_res["acc"] = raw_eval.get("acc")
        baseline_res["f1"] = raw_eval.get("f1")
        baseline_res["tpr"] = raw_eval.get("tpr")
        baseline_res["tnr"] = raw_eval.get("tnr")
        baseline_res["fpr"] = raw_eval.get("fpr")
        baseline_res["fnr"] = raw_eval.get("fnr")
        baseline_res["precision"] = raw_eval.get("precision")
        baseline_res["weighted_f1"] = raw_eval.get("weighted_f1")
        baseline_res["roc_auc"] = raw_eval.get("roc_auc")
        baseline_res["pr_auc"] = raw_eval.get("pr_auc")
        baseline_res["confusion_matrix"] = raw_eval.get("confusion_matrix")
        baseline_res["per_class"] = raw_eval.get("per_class", {})
        baseline_res["train"] = raw_eval.get("train", {})
        baseline_res["val"] = raw_eval.get("val", {})
        baseline_res["test"] = raw_eval.get("test", {})
    except Exception as e:
        na_reasons["baseline"] = f"Failed to compute baseline evaluation: {e}"

    # 6. Shortcut Fragility Index (SFI)
    schema_id = cfg.get("schema_id", "unknown")
    sfi_res: dict[str, Any] = {}
    try:
        sfi_res, sfi_na = compute_sfi(
            df, label_col, cls, benign_label, feature_cols, cfg, split,
            schema_id=schema_id, hdf_score=hdf_score
        )
        na_reasons.update(sfi_na)
    except Exception as e:
        na_reasons["sfi"] = f"Failed to compute SFI: {e}"
        sfi_res = {
            "top_features": [],
            "categories": [],
            "k": 3,
            "recall_baseline": None,
            "sfi_top": None,
            "sfi_null_mean": None,
            "sfi_null_std": None,
            "n_null_draws": 0,
            "delta": None,
            "z": None,
            "ci95": None,
            "flag": False,
            "flag_conditions": {
                "hdf_high": False,
                "excess_fragility": False,
                "category_eligible": False,
                "category_c_needs_context": False,
            },
            "fragility_curve": {"delta": [], "recall_top": [], "recall_null_mean": []},
        }

    # 7. Generalisation Gap Index (GGI)
    ggi_res: dict[str, Any] = {}
    try:
        group_col = split.get("group_col", None)
        ggi_res, ggi_na = compute_ggi(
            df, label_col, cls, benign_label, feature_cols, cfg, split,
            cluster_labels=cluster_labels_series, group_col=group_col
        )
        na_reasons.update(ggi_na)
    except Exception as e:
        na_reasons["ggi"] = f"Failed to compute GGI: {e}"
        ggi_res = {
            "f1_random": None,
            "f1_grouped": None,
            "gap": None,
            "lor": None,
            "grouping": "cluster_proxy",
            "n_groups": None,
            "group_sizes": [],
            "lor_threshold": 0.95,
        }

    # 8. 100% Accuracy & Baseline Verification Investigation (Phase 6)
    try:
        perf_acc_investigation = investigate_perfect_accuracy(
            df=df,
            label_col=label_col,
            cls=cls,
            benign_label=benign_label,
            split=split,
            feature_cols=feature_cols,
            train_eval=baseline_res.get("train", {}),
            val_eval=baseline_res.get("val", {}),
            test_eval=baseline_res.get("test", baseline_res),
            sfi_result=sfi_res,
            ggi_result=ggi_res,
            ugt_score=ugt_score,
            cfg=cfg,
            seed=seed,
        )
        baseline_res["perfect_accuracy_investigation"] = perf_acc_investigation
    except Exception as e:
        na_reasons["perfect_accuracy_investigation"] = f"Failed to investigate accuracy: {e}"

    result: dict[str, Any] = {
        "class": cls,
        "n": n_cls,
        "n_benign": n_benign,
        "paper": {
            "UGT": ugt_score,
            "WL": wl_score,
            "HDF": hdf_score,
            "PDD": pdd_score,
            "TC": tc_score,
            "details": {
                "pdd_n_clusters": pdd_n_clusters,
                "hdf_top_feature": hdf_top_feature,
                "wl_no_tie_bias": wl_no_bias,
            },
        },
        "baseline": baseline_res,
        "sfi": sfi_res,
        "ggi": ggi_res,
        "na_reasons": na_reasons,
        "meta": {
            "seed": seed,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "versions": {
                "python": sys.version.split()[0],
                "numpy": np.__version__,
                "pandas": pd.__version__,
                "sklearn": sklearn.__version__,
            },
        },
    }

    return result
