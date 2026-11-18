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
    """Train baseline RandomForest on train_df and evaluate on test_df."""
    cfg = cfg or {}
    baseline_cfg = cfg.get("baseline", {}).get("rf", {})
    n_estimators = baseline_cfg.get("n_estimators", 100)
    max_depth = baseline_cfg.get("max_depth", None)

    # Filter data if target_class is specified (binary: target vs benign)
    if target_class is not None:
        valid_classes = [target_class, benign_label]
        tr = train_df[train_df[label_col].isin(valid_classes)].copy()
        te = test_df[test_df[label_col].isin(valid_classes)].copy()
    else:
        tr = train_df.copy()
        te = test_df.copy()

    clean_features = [c for c in feature_cols if not c.startswith("__") and c in tr.columns]

    # Preprocessing fitted strictly on train_df
    prep = fit_preprocessor(tr, feature_cols=clean_features, cfg=cfg)
    X_train = prep.transform(tr)[clean_features].to_numpy(dtype=float)
    X_test = prep.transform(te)[clean_features].to_numpy(dtype=float)

    y_train = tr[label_col].to_numpy()
    y_test = te[label_col].to_numpy()

    n_train = len(X_train)
    n_test = len(X_test)

    # Train Random Forest
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=seed,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    preds = rf.predict(X_test)

    acc = float(accuracy_score(y_test, preds)) if n_test > 0 else 0.0

    # Per-class metrics
    unique_labels = sorted(list(set(np.concatenate([y_train, y_test]))))
    p, r, f, s = precision_recall_fscore_support(
        y_test, preds, labels=unique_labels, zero_division=0
    )

    per_class: dict[str, dict[str, Any]] = {}
    for idx, lbl in enumerate(unique_labels):
        per_class[str(lbl)] = {
            "recall": float(r[idx]),
            "precision": float(p[idx]),
            "f1": float(f[idx]),
            "n": int(s[idx]),
        }

    # Binary vs multiclass summary metrics
    if target_class is not None:
        f1 = per_class.get(target_class, {}).get("f1", 0.0)
        tpr = per_class.get(target_class, {}).get("recall", 0.0)
        tnr = per_class.get(benign_label, {}).get("recall", 0.0)
        prec = per_class.get(target_class, {}).get("precision", 0.0)
        weighted_f1 = f1
    else:
        f1 = float(f1_score(y_test, preds, average="macro", zero_division=0))
        tpr = float(np.mean([m["recall"] for m in per_class.values()])) if per_class else 0.0
        tnr = float(per_class.get(benign_label, {}).get("recall", 0.0))
        prec = float(np.mean([m["precision"] for m in per_class.values()])) if per_class else 0.0
        weighted_f1 = float(f1_score(y_test, preds, average="weighted", zero_division=0))

    cm = confusion_matrix(y_test, preds, labels=unique_labels).tolist()

    fpr = float(1.0 - tnr)
    fnr = float(1.0 - tpr)

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

    return {
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
        "seed": seed,
        "model": {"type": "RandomForest", "n_estimators": n_estimators},
    }
