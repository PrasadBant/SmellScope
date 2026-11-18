"""Baseline model fitting and evaluation conforming to contract Section 2.7."""
from typing import Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_recall_fscore_support,
    confusion_matrix,
)

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

    return {
        "acc": acc,
        "f1": f1,
        "precision": prec,
        "weighted_f1": weighted_f1,
        "tpr": tpr,
        "tnr": tnr,
        "confusion_matrix": cm,
        "labels": [str(l) for l in unique_labels],
        "per_class": per_class,
        "n_train": n_train,
        "n_test": n_test,
        "seed": seed,
        "model": {"type": "RandomForest", "n_estimators": n_estimators},
    }
