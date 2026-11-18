"""Shortcut Fragility Index (SFI) and fragility grid analysis."""
from typing import Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import recall_score

from smellscope.core.preprocess import fit_preprocessor
from smellscope.core.taxonomy import classify_features


def _perturb_features(
    X_orig: np.ndarray,
    feature_indices: list[int],
    delta: float,
    iqrs: np.ndarray,
    q_lows: np.ndarray,
    q_highs: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    """Apply bounded distribution-aware Gaussian noise scaled by delta * IQR."""
    X_pert = X_orig.copy()
    for feat_idx in feature_indices:
        iqr = iqrs[feat_idx]
        noise_std = delta * iqr if iqr > 1e-6 else delta * 0.1
        noise = rng.normal(loc=0.0, scale=noise_std, size=len(X_orig))
        val_perturbed = X_orig[:, feat_idx] + noise
        # Clip to pre-registered 1st-99th training quantiles
        X_pert[:, feat_idx] = np.clip(val_perturbed, q_lows[feat_idx], q_highs[feat_idx])
    return X_pert


def compute_sfi(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    split: dict[str, Any],
    schema_id: str = "unknown",
    hdf_score: Optional[float] = None,
) -> tuple[dict[str, Any], dict[str, str]]:
    """Compute null-calibrated Shortcut Fragility Index (SFI) and suspicion flags."""
    sfi_cfg = cfg.get("sfi", {})
    k = sfi_cfg.get("k", 3)
    deltas = sfi_cfg.get("deltas", [0.05, 0.10, 0.20, 0.30])
    n_null = sfi_cfg.get("n_null", 50)
    z_threshold = sfi_cfg.get("z_threshold", 2.0)
    hdf_high_threshold = sfi_cfg.get("hdf_high", 0.90)
    min_test_examples = sfi_cfg.get("min_test_examples", 10)
    seed = sfi_cfg.get("random_state", 42)
    rng = np.random.default_rng(seed)

    na_reasons: dict[str, str] = {}

    default_flag_conditions = {
        "hdf_high": False,
        "excess_fragility": False,
        "category_eligible": False,
        "category_c_needs_context": False,
    }

    # Partition dataset using SplitManifest row IDs
    train_ids = set(split.get("train_ids", []))
    val_ids = set(split.get("val_ids", []))
    test_ids = set(split.get("test_ids", []))

    tr = df[df["__row_id"].isin(train_ids)].copy()
    va = df[df["__row_id"].isin(val_ids)].copy()
    te = df[df["__row_id"].isin(test_ids)].copy()

    # Filter binary: cls vs benign
    valid_classes = [cls, benign_label]
    tr_bin = tr[tr[label_col].isin(valid_classes)]
    va_bin = va[va[label_col].isin(valid_classes)]
    te_bin = te[te[label_col].isin(valid_classes)]

    clean_features = [c for c in feature_cols if not c.startswith("__") and c in tr_bin.columns]
    if len(clean_features) == 0:
        na_reasons["sfi"] = "No valid feature columns"
        return _empty_sfi_result(k, deltas, default_flag_conditions), na_reasons

    # Fit preprocessor on train only
    prep = fit_preprocessor(tr_bin, feature_cols=clean_features, cfg=cfg)
    X_train = prep.transform(tr_bin)[clean_features].to_numpy(dtype=float)
    y_train = (tr_bin[label_col] == cls).to_numpy(dtype=int)

    X_val = prep.transform(va_bin)[clean_features].to_numpy(dtype=float)
    y_val = (va_bin[label_col] == cls).to_numpy(dtype=int)

    X_test = prep.transform(te_bin)[clean_features].to_numpy(dtype=float)
    y_test = (te_bin[label_col] == cls).to_numpy(dtype=int)

    # Check test examples count
    n_test_cls = int(np.sum(y_test))
    if n_test_cls < min_test_examples:
        na_reasons["sfi.recall_baseline"] = f"Test samples for class '{cls}' ({n_test_cls}) < min_test_examples ({min_test_examples})"
        return _empty_sfi_result(k, deltas, default_flag_conditions), na_reasons

    # Calculate train feature statistics for bounded perturbations
    q25 = np.percentile(X_train, 25, axis=0)
    q75 = np.percentile(X_train, 75, axis=0)
    iqrs = q75 - q25
    q_lows = np.percentile(X_train, 1, axis=0)
    q_highs = np.percentile(X_train, 99, axis=0)

    # Train baseline Random Forest on train
    baseline_rf_cfg = cfg.get("baseline", {}).get("rf", {})
    rf = RandomForestClassifier(
        n_estimators=baseline_rf_cfg.get("n_estimators", 100),
        random_state=seed,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    # Baseline test recall R(0)
    test_preds_baseline = rf.predict(X_test)
    r0 = float(recall_score(y_test, test_preds_baseline, pos_label=1, zero_division=0))
    if r0 == 0.0:
        na_reasons["sfi.recall_baseline"] = f"Baseline test recall for class '{cls}' is 0.0"
        return _empty_sfi_result(k, deltas, default_flag_conditions, recall_baseline=0.0), na_reasons

    # Step 2: Permutation importance on VALIDATION set to find top-k features
    perm = permutation_importance(
        rf, X_val, y_val, n_repeats=5, random_state=seed, n_jobs=-1, scoring="recall"
    )
    val_importances = perm.importances_mean
    # Sort descending
    sorted_feat_indices = np.argsort(val_importances)[::-1]
    top_k_indices = list(sorted_feat_indices[: min(k, len(clean_features))])
    top_features = [clean_features[i] for i in top_k_indices]

    # Categorize top features via taxonomy
    tax_map = classify_features(top_features, schema_id=schema_id, cfg=cfg)
    categories = [tax_map.get(f, "UNMAPPED") for f in top_features]

    # Step 4 & 5: Perturb top-k features on test class C flows across delta grid
    class_c_test_mask = (y_test == 1)
    X_test_c = X_test[class_c_test_mask]

    recall_top_curve = []
    r_deltas = []
    for delta in deltas:
        # Perturb class C points
        X_test_c_pert = _perturb_features(X_test_c, top_k_indices, delta, iqrs, q_lows, q_highs, rng)
        X_test_full_pert = X_test.copy()
        X_test_full_pert[class_c_test_mask] = X_test_c_pert
        preds = rf.predict(X_test_full_pert)
        r_delta = float(recall_score(y_test, preds, pos_label=1, zero_division=0))
        recall_top_curve.append(r_delta)
        r_deltas.append(r_delta)

    sfi_top = float(1.0 - np.mean([r / r0 for r in r_deltas]))

    # Step 6: Monte Carlo null model over random feature sets (excluding top-k)
    non_top_indices = [i for i in range(len(clean_features)) if i not in top_k_indices]
    if len(non_top_indices) < k:
        non_top_indices = list(range(len(clean_features)))

    sfi_null_draws = []
    null_curve_per_delta: dict[float, list[float]] = {d: [] for d in deltas}

    for draw_idx in range(n_null):
        null_feat_indices = list(rng.choice(non_top_indices, size=min(k, len(non_top_indices)), replace=False))
        r_deltas_null = []
        for delta in deltas:
            X_test_c_null = _perturb_features(X_test_c, null_feat_indices, delta, iqrs, q_lows, q_highs, rng)
            X_test_full_null = X_test.copy()
            X_test_full_null[class_c_test_mask] = X_test_c_null
            preds_null = rf.predict(X_test_full_null)
            r_d_null = float(recall_score(y_test, preds_null, pos_label=1, zero_division=0))
            r_deltas_null.append(r_d_null)
            null_curve_per_delta[delta].append(r_d_null)

        sfi_null_val = float(1.0 - np.mean([r / r0 for r in r_deltas_null]))
        sfi_null_draws.append(sfi_null_val)

    sfi_null_mean = float(np.mean(sfi_null_draws)) if sfi_null_draws else 0.0
    sfi_null_std = float(np.std(sfi_null_draws)) if sfi_null_draws else 0.0

    delta_sfi = float(sfi_top - sfi_null_mean)
    z_score = float(delta_sfi / sfi_null_std) if sfi_null_std > 1e-9 else None
    ci95 = [
        float(sfi_null_mean - 1.96 * sfi_null_std),
        float(sfi_null_mean + 1.96 * sfi_null_std),
    ]

    recall_null_mean_curve = [float(np.mean(null_curve_per_delta[d])) for d in deltas]

    # Step 7: Suspicion Flag Evaluation
    cond_hdf_high = (hdf_score is not None and hdf_score >= hdf_high_threshold)
    # Excess fragility: either z >= z_threshold, or if null distribution has zero variance (std=0) and delta_sfi > 0
    cond_excess_fragility = (
        delta_sfi > 0.0
        and (
            (z_score is not None and z_score >= z_threshold)
            or (sfi_null_std < 1e-9 and delta_sfi > 0.05)
        )
    )

    # Category eligibility
    has_cat_ab = any(c in ["A", "B"] for c in categories)
    has_cat_c_only = (not has_cat_ab and any(c == "C" for c in categories))
    all_cat_d = (len(categories) > 0 and all(c == "D" for c in categories))

    cond_category_eligible = has_cat_ab or (has_cat_c_only and cond_hdf_high and cond_excess_fragility)
    cond_cat_c_context = has_cat_c_only

    if all_cat_d:
        overall_flag = False
    elif has_cat_ab:
        overall_flag = bool(cond_hdf_high and cond_excess_fragility)
    elif has_cat_c_only:
        overall_flag = bool(cond_hdf_high and cond_excess_fragility)
    else:
        overall_flag = bool(cond_hdf_high and cond_excess_fragility and any(c != "D" for c in categories))

    flag_conditions = {
        "hdf_high": bool(cond_hdf_high),
        "excess_fragility": bool(cond_excess_fragility),
        "category_eligible": bool(cond_category_eligible),
        "category_c_needs_context": bool(cond_cat_c_context),
    }

    sfi_res = {
        "top_features": top_features,
        "categories": categories,
        "k": len(top_features),
        "recall_baseline": r0,
        "sfi_top": sfi_top,
        "sfi_null_mean": sfi_null_mean,
        "sfi_null_std": sfi_null_std,
        "n_null_draws": n_null,
        "delta": delta_sfi,
        "z": z_score,
        "ci95": ci95,
        "flag": overall_flag,
        "flag_conditions": flag_conditions,
        "fragility_curve": {
            "delta": [float(d) for d in deltas],
            "recall_top": recall_top_curve,
            "recall_null_mean": recall_null_mean_curve,
        },
    }

    return sfi_res, na_reasons


def _empty_sfi_result(
    k: int,
    deltas: list[float],
    flag_conditions: dict[str, bool],
    recall_baseline: Optional[float] = None,
) -> dict[str, Any]:
    """Helper to return contract-valid empty/null SFI result."""
    return {
        "top_features": [],
        "categories": [],
        "k": k,
        "recall_baseline": recall_baseline,
        "sfi_top": None,
        "sfi_null_mean": None,
        "sfi_null_std": None,
        "n_null_draws": 0,
        "delta": None,
        "z": None,
        "ci95": None,
        "flag": False,
        "flag_conditions": flag_conditions,
        "fragility_curve": {
            "delta": [float(d) for d in deltas],
            "recall_top": [],
            "recall_null_mean": [],
        },
    }


def fragility_grid(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    features: list[str],
    cfg: Optional[dict[str, Any]],
    split: dict[str, Any],
) -> dict[str, Any]:
    """Compute 2D fragility response grid over two selected features."""
    if len(features) != 2:
        raise ValueError("fragility_grid requires exactly 2 features in 'features'")

    cfg = cfg or {}
    sfi_cfg = cfg.get("sfi", {})
    seed = sfi_cfg.get("random_state", 42)
    rng = np.random.default_rng(seed)

    grid_deltas = [0.0, 0.05, 0.10, 0.20, 0.30]

    train_ids = set(split.get("train_ids", []))
    test_ids = set(split.get("test_ids", []))

    tr = df[df["__row_id"].isin(train_ids)].copy()
    te = df[df["__row_id"].isin(test_ids)].copy()

    valid_classes = [cls, benign_label]
    tr_bin = tr[tr[label_col].isin(valid_classes)]
    te_bin = te[te[label_col].isin(valid_classes)]

    clean_features = [c for c in df.columns if not c.startswith("__") and c != label_col]

    prep = fit_preprocessor(tr_bin, feature_cols=clean_features, cfg=cfg)
    X_train = prep.transform(tr_bin)[clean_features].to_numpy(dtype=float)
    y_train = (tr_bin[label_col] == cls).to_numpy(dtype=int)

    X_test = prep.transform(te_bin)[clean_features].to_numpy(dtype=float)
    y_test = (te_bin[label_col] == cls).to_numpy(dtype=int)

    rf = RandomForestClassifier(n_estimators=50, random_state=seed, n_jobs=-1)
    rf.fit(X_train, y_train)

    preds_base = rf.predict(X_test)
    r0 = float(recall_score(y_test, preds_base, pos_label=1, zero_division=0))

    feat1_idx = clean_features.index(features[0])
    feat2_idx = clean_features.index(features[1])

    q25 = np.percentile(X_train, 25, axis=0)
    q75 = np.percentile(X_train, 75, axis=0)
    iqrs = q75 - q25
    q_lows = np.percentile(X_train, 1, axis=0)
    q_highs = np.percentile(X_train, 99, axis=0)

    class_c_mask = (y_test == 1)
    X_test_c = X_test[class_c_mask]

    recall_matrix = []
    delta_matrix = []

    for d1 in grid_deltas:
        row_recall = []
        row_delta = []
        for d2 in grid_deltas:
            row_delta.append([float(d1), float(d2)])
            if d1 == 0.0 and d2 == 0.0:
                row_recall.append(r0)
                continue

            X_test_c_pert = X_test_c.copy()
            for feat_idx, delta_val in [(feat1_idx, d1), (feat2_idx, d2)]:
                if delta_val > 0.0:
                    iqr = iqrs[feat_idx]
                    noise_std = delta_val * iqr if iqr > 1e-6 else delta_val * 0.1
                    noise = rng.normal(loc=0.0, scale=noise_std, size=len(X_test_c))
                    val_pert = X_test_c[:, feat_idx] + noise
                    X_test_c_pert[:, feat_idx] = np.clip(val_pert, q_lows[feat_idx], q_highs[feat_idx])

            X_test_full = X_test.copy()
            X_test_full[class_c_mask] = X_test_c_pert
            preds = rf.predict(X_test_full)
            r_val = float(recall_score(y_test, preds, pos_label=1, zero_division=0))
            row_recall.append(r_val)

        recall_matrix.append(row_recall)
        delta_matrix.append(row_delta)

    return {
        "features": features,
        "grid_delta": delta_matrix,
        "recall": recall_matrix,
        "recall_baseline": r0,
    }
