"""Baseline model fitting and evaluation conforming to contract Section 2.7."""
from typing import Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    roc_auc_score,
)
from sklearn.preprocessing import label_binarize

from smellscope.core.preprocess import fit_preprocessor


def fit_and_evaluate(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    label_col: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: Optional[dict[str, Any]] = None,
    seed: int = 42,
    target_class: Optional[str] = None,
) -> dict[str, Any]:
    """Train baseline RandomForest on train_df and evaluate across train, val, and locked test partitions."""
    cfg = cfg or {}
    val_df: Optional[pd.DataFrame] = cfg.get("val_df")
    return_estimator: bool = bool(cfg.get("return_estimator", False))
    baseline_cfg = cfg.get("baseline", {}).get("rf", {})
    n_estimators = baseline_cfg.get("n_estimators", 100)
    max_depth = baseline_cfg.get("max_depth", None)

    # Filter data if target_class is specified (binary: target vs benign)
    if target_class is not None:
        valid_classes = [target_class, benign_label]
        tr = train_df[train_df[label_col].isin(valid_classes)].copy()
        te = test_df[test_df[label_col].isin(valid_classes)].copy()
        va = val_df[val_df[label_col].isin(valid_classes)].copy() if val_df is not None else None
    else:
        tr = train_df.copy()
        te = test_df.copy()
        va = val_df.copy() if val_df is not None else None

    clean_features = [c for c in feature_cols if not c.startswith("__") and c in tr.columns]

    # Preprocessing fitted strictly on train_df (Zero Leakage)
    prep = fit_preprocessor(tr, feature_cols=clean_features, cfg=cfg)
    X_train = prep.transform(tr)[clean_features].to_numpy(dtype=float)
    X_test = prep.transform(te)[clean_features].to_numpy(dtype=float)
    X_val = prep.transform(va)[clean_features].to_numpy(dtype=float) if va is not None else None

    y_train = tr[label_col].to_numpy()
    y_test = te[label_col].to_numpy()
    y_val = va[label_col].to_numpy() if va is not None else None

    n_train = len(X_train)
    n_test = len(X_test)
    n_val = len(X_val) if X_val is not None else 0

    # Train Random Forest
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=seed,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    # Predictions across partitions
    preds_test = rf.predict(X_test)
    preds_train = rf.predict(X_train)
    preds_val = rf.predict(X_val) if X_val is not None else None

    acc = float(accuracy_score(y_test, preds_test)) if n_test > 0 else 0.0
    train_acc = float(accuracy_score(y_train, preds_train)) if n_train > 0 else 0.0
    val_acc = float(accuracy_score(y_val, preds_val)) if n_val > 0 else train_acc

    # Per-class metrics on test split
    unique_labels = sorted(list(set(np.concatenate([y_train, y_test]))))
    p, r, f, s = precision_recall_fscore_support(
        y_test, preds_test, labels=unique_labels, zero_division=0
    )

    per_class: dict[str, dict[str, Any]] = {}
    for idx, lbl in enumerate(unique_labels):
        per_class[str(lbl)] = {
            "recall": float(r[idx]),
            "precision": float(p[idx]),
            "f1": float(f[idx]),
            "n": int(s[idx]),
        }

    # Summary metrics for test
    if target_class is not None:
        f1 = per_class.get(target_class, {}).get("f1", 0.0)
        tpr = per_class.get(target_class, {}).get("recall", 0.0)
        tnr = per_class.get(benign_label, {}).get("recall", 0.0)
        prec = per_class.get(target_class, {}).get("precision", 0.0)
        weighted_f1 = f1
    else:
        f1 = float(f1_score(y_test, preds_test, average="macro", zero_division=0))
        tpr = float(np.mean([m["recall"] for m in per_class.values()])) if per_class else 0.0
        tnr = float(per_class.get(benign_label, {}).get("recall", 0.0))
        prec = float(np.mean([m["precision"] for m in per_class.values()])) if per_class else 0.0
        weighted_f1 = float(f1_score(y_test, preds_test, average="weighted", zero_division=0))

    cm = confusion_matrix(y_test, preds_test, labels=unique_labels).tolist()

    fpr = float(1.0 - tnr)
    fnr = float(1.0 - tpr)

    # Training partition summary metrics
    train_cm = confusion_matrix(y_train, preds_train, labels=unique_labels).tolist()
    if target_class is not None:
        p_tr, r_tr, f_tr, _ = precision_recall_fscore_support(
            y_train, preds_train, labels=[target_class, benign_label], zero_division=0
        )
        train_f1 = float(f_tr[0]) if len(f_tr) > 0 else 0.0
        train_tpr = float(r_tr[0]) if len(r_tr) > 0 else 0.0
        train_tnr = float(r_tr[1]) if len(r_tr) > 1 else 0.0
        train_prec = float(p_tr[0]) if len(p_tr) > 0 else 0.0
        train_weighted_f1 = train_f1
    else:
        train_f1 = float(f1_score(y_train, preds_train, average="macro", zero_division=0))
        train_weighted_f1 = float(f1_score(y_train, preds_train, average="weighted", zero_division=0))
        train_tpr = train_acc
        train_tnr = train_acc
        train_prec = train_acc

    # Validation partition summary metrics
    val_cm = confusion_matrix(y_val, preds_val, labels=unique_labels).tolist() if y_val is not None else []
    if y_val is not None and n_val > 0:
        if target_class is not None:
            p_va, r_va, f_va, _ = precision_recall_fscore_support(
                y_val, preds_val, labels=[target_class, benign_label], zero_division=0
            )
            val_f1 = float(f_va[0]) if len(f_va) > 0 else 0.0
            val_tpr = float(r_va[0]) if len(r_va) > 0 else 0.0
            val_tnr = float(r_va[1]) if len(r_va) > 1 else 0.0
            val_prec = float(p_va[0]) if len(p_va) > 0 else 0.0
            val_weighted_f1 = val_f1
        else:
            val_f1 = float(f1_score(y_val, preds_val, average="macro", zero_division=0))
            val_weighted_f1 = float(f1_score(y_val, preds_val, average="weighted", zero_division=0))
            val_tpr = val_acc
            val_tnr = val_acc
            val_prec = val_acc
    else:
        val_f1 = train_f1
        val_tpr = train_tpr
        val_tnr = train_tnr
        val_prec = train_prec
        val_weighted_f1 = train_weighted_f1

    # ROC-AUC and PR-AUC calculation where mathematically applicable
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None

    try:
        if hasattr(rf, "predict_proba") and n_test > 0:
            probs = rf.predict_proba(X_test)
            rf_classes = list(rf.classes_)
            if target_class is not None:
                # Binary classification
                if target_class in rf_classes and len(set(y_test)) == 2:
                    target_idx = rf_classes.index(target_class)
                    target_probs = probs[:, target_idx]
                    y_bin = (y_test == target_class).astype(int)
                    roc_auc = float(roc_auc_score(y_bin, target_probs))
                    pr_auc = float(average_precision_score(y_bin, target_probs))
            else:
                # Multiclass OvR
                test_classes = set(y_test)
                if len(test_classes) >= 2 and all(c in test_classes for c in rf_classes):
                    y_bin = label_binarize(y_test, classes=rf_classes)
                    roc_auc = float(roc_auc_score(y_bin, probs, average="macro", multi_class="ovr"))
                    pr_auc = float(average_precision_score(y_bin, probs, average="macro"))
    except Exception:
        roc_auc = None
        pr_auc = None

    res_dict: dict[str, Any] = {
        # Test partition top-level metrics for backward compatibility
        "acc": acc,
        "f1": f1,
        "precision": prec,
        "weighted_f1": weighted_f1,
        "tpr": tpr,
        "tnr": tnr,
        "fpr": fpr,
        "fnr": fnr,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "confusion_matrix": cm,
        "labels": [str(l) for l in unique_labels],
        "per_class": per_class,
        "n_train": n_train,
        "n_test": n_test,
        "n_val": n_val,
        "seed": seed,
        "model": {"type": "RandomForest", "n_estimators": n_estimators},
        # Partition-separated metrics (Phase 6 requirement)
        "train": {
            "acc": train_acc,
            "f1": train_f1,
            "precision": train_prec,
            "weighted_f1": train_weighted_f1,
            "tpr": train_tpr,
            "tnr": train_tnr,
            "fpr": float(1.0 - train_tnr),
            "fnr": float(1.0 - train_tpr),
            "confusion_matrix": train_cm,
            "n": n_train,
        },
        "val": {
            "acc": val_acc,
            "f1": val_f1,
            "precision": val_prec,
            "weighted_f1": val_weighted_f1,
            "tpr": val_tpr,
            "tnr": val_tnr,
            "fpr": float(1.0 - val_tnr),
            "fnr": float(1.0 - val_tpr),
            "confusion_matrix": val_cm,
            "n": n_val,
        },
        "test": {
            "acc": acc,
            "f1": f1,
            "precision": prec,
            "weighted_f1": weighted_f1,
            "tpr": tpr,
            "tnr": tnr,
            "fpr": fpr,
            "fnr": fnr,
            "roc_auc": roc_auc,
            "pr_auc": pr_auc,
            "confusion_matrix": cm,
            "n": n_test,
        },
    }

    if return_estimator:
        res_dict["_estimator"] = rf
        res_dict["_preprocessor"] = prep
        res_dict["_clean_features"] = clean_features

    return res_dict
