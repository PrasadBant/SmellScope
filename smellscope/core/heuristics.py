"""Reimplementation of the five CSV heuristics from Flood et al. EuroS&P 2024."""
from typing import Any, Optional
import warnings
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.exceptions import ConvergenceWarning
from sklearn.metrics import f1_score
from sklearn.neighbors import NearestNeighbors
from joblib import Parallel, delayed

from smellscope.core.preprocess import Preprocessor


def compute_ugt(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    dst_port_col: Optional[str],
    cfg: dict[str, Any],
) -> tuple[Optional[float], Optional[str]]:
    """Compute Unclear Ground Truth (UGT_C)."""
    if not dst_port_col or dst_port_col not in df.columns:
        return None, "Destination port column not mapped"

    class_mask = df[label_col] == cls
    class_df = df[class_mask]
    n_class = len(class_df)
    if n_class == 0:
        return None, f"Class '{cls}' has zero samples"

    bg_ports = set(cfg.get("bg_ports", [0, 53, 67, 68, 111, 123, 137, 161, 179, 389, 427, 520, 1723, 1900]))
    ports = pd.to_numeric(class_df[dst_port_col], errors="coerce")
    in_bg = ports.isin(bg_ports).sum()
    return float(in_bg / n_class), None


def compute_wl(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    seed: int = 42,
) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Compute Wrong Labels (WL_C) via ENN k=4 with tie bias towards mislabelled."""
    relevant_mask = df[label_col].isin([cls, benign_label])
    sub_df = df[relevant_mask]
    n_class = (sub_df[label_col] == cls).sum()
    n_benign = (sub_df[label_col] == benign_label).sum()

    if n_class == 0:
        return None, None, f"Class '{cls}' has zero samples"
    if n_benign == 0:
        return None, None, f"Benign class '{benign_label}' has zero samples"
    if len(sub_df) < 5:
        return None, None, "Insufficient samples for ENN (need >= 5)"

    enn_cfg = cfg.get("enn", {})
    cap = enn_cfg.get("subsample_cap", 5000)
    if len(sub_df) > cap:
        # Stratified subsampling
        rng = np.random.default_rng(seed)
        c_idx = sub_df[sub_df[label_col] == cls].index
        b_idx = sub_df[sub_df[label_col] == benign_label].index
        c_sample_size = min(len(c_idx), cap // 2)
        b_sample_size = min(len(b_idx), cap - c_sample_size)
        sampled_c = rng.choice(c_idx, size=c_sample_size, replace=False)
        sampled_b = rng.choice(b_idx, size=b_sample_size, replace=False)
        sub_df = sub_df.loc[np.concatenate([sampled_c, sampled_b])]

    clean_features = [c for c in feature_cols if not c.startswith("__") and c in sub_df.columns]
    X = sub_df[clean_features].to_numpy(dtype=float)
    y = (sub_df[label_col] == cls).to_numpy(dtype=bool)

    # 5 neighbours so that dropping the query point itself yields 4 neighbours
    k_query = min(5, len(X))
    if k_query < 5:
        return None, None, "Dataset too small for 4-NN calculation"

    nn = NearestNeighbors(n_neighbors=k_query, metric="euclidean", n_jobs=-1)
    nn.fit(X)
    indices = nn.kneighbors(X, return_distance=False)

    class_indices = np.where(y)[0]
    if len(class_indices) == 0:
        return None, None, f"Class '{cls}' has no samples in subsample"

    mislabelled_biased = 0
    mislabelled_no_bias = 0

    for idx in class_indices:
        # Drop self (at position 0)
        neighbour_indices = indices[idx, 1:5]
        # Count neighbours belonging to class C
        c_count = np.sum(y[neighbour_indices])
        # Total neighbours = 4
        # If c_count < 2, clearly mislabelled (majority benign)
        # If c_count == 2 (tie: 2 class C, 2 benign):
        # Flood et al: "ties broken in favour of the mislabelled class" -> mislabelled
        if c_count < 2:
            mislabelled_biased += 1
            mislabelled_no_bias += 1
        elif c_count == 2:
            mislabelled_biased += 1  # Biased considers tie mislabelled
            # No-bias keeps as correctly labelled

    total_c = len(class_indices)
    wl_score = float(mislabelled_biased / total_c)
    wl_no_bias = float(mislabelled_no_bias / total_c)
    return wl_score, wl_no_bias, None


def _evaluate_single_feature(
    feature: str,
    train_x: np.ndarray,
    train_y: np.ndarray,
    test_x: np.ndarray,
    test_y: np.ndarray,
    seed: int,
) -> float:
    """Helper to train and score single-feature RF."""
    if np.all(train_x == train_x[0]):
        return 0.0
    rf = RandomForestClassifier(
        n_estimators=30,
        max_depth=8,
        random_state=seed,
        n_jobs=1,
    )
    rf.fit(train_x.reshape(-1, 1), train_y)
    preds = rf.predict(test_x.reshape(-1, 1))
    return float(f1_score(test_y, preds, pos_label=1, zero_division=0))


def compute_hdf(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    seed: int = 42,
) -> tuple[Optional[float], Optional[str], Optional[str]]:
    """Compute Highly Dependent Features (HDF_C) via parallel single-feature RFs."""
    # Filter binary (cls vs benign)
    train_mask = train_df[label_col].isin([cls, benign_label])
    test_mask = test_df[label_col].isin([cls, benign_label])

    sub_train = train_df[train_mask]
    sub_test = test_df[test_mask]

    n_train_cls = (sub_train[label_col] == cls).sum()
    n_test_cls = (sub_test[label_col] == cls).sum()

    if n_train_cls == 0 or n_test_cls == 0:
        return None, None, f"Insufficient samples of class '{cls}' in train or test"

    clean_features = [c for c in feature_cols if not c.startswith("__") and c in sub_train.columns]
    if not clean_features:
        return None, None, "No valid feature columns provided"

    train_y = (sub_train[label_col] == cls).to_numpy(dtype=int)
    test_y = (sub_test[label_col] == cls).to_numpy(dtype=int)

    hdf_cfg = cfg.get("hdf", {})
    max_features_sample = hdf_cfg.get("max_features_sample", 100)
    eval_features = clean_features
    if len(clean_features) > max_features_sample:
        rng = np.random.default_rng(seed)
        eval_features = list(rng.choice(clean_features, size=max_features_sample, replace=False))

    results = Parallel(n_jobs=-1)(
        delayed(_evaluate_single_feature)(
            feat,
            sub_train[feat].to_numpy(dtype=float),
            train_y,
            sub_test[feat].to_numpy(dtype=float),
            test_y,
            seed,
        )
        for feat in eval_features
    )

    if not results:
        return 0.0, None, None

    max_idx = int(np.argmax(results))
    max_f1 = float(results[max_idx])
    top_feature = eval_features[max_idx]
    return max_f1, top_feature, None


def _find_elbow_k(inertias: list[float], k_values: list[int]) -> int:
    """Find elbow K via maximum orthogonal distance to the chord connecting first and last points."""
    if len(inertias) <= 2:
        return k_values[0]

    p1 = np.array([k_values[0], inertias[0]])
    p2 = np.array([k_values[-1], inertias[-1]])
    line_vec = p2 - p1
    line_len = np.linalg.norm(line_vec)
    if line_len == 0:
        return k_values[0]

    distances = []
    for k_val, inert in zip(k_values, inertias):
        p = np.array([k_val, inert])
        # Perpendicular distance from point p to line (p1, p2) in 2D
        diff = p1 - p
        cross_2d = line_vec[0] * diff[1] - line_vec[1] * diff[0]
        dist = np.abs(cross_2d) / line_len
        distances.append(dist)

    best_idx = int(np.argmax(distances))
    return k_values[best_idx]


def compute_pdd_and_tc(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    feature_cols: list[str],
    cfg: dict[str, Any],
    seed: int = 42,
) -> tuple[Optional[float], Optional[float], Optional[int], Any, Optional[str]]:
    """Compute Poor Data Diversity (PDD_C) and Traffic Collapse (TC_C) via KMeans and cosine similarity."""
    class_df = df[df[label_col] == cls]
    n_class = len(class_df)

    if n_class < 4:
        return None, None, None, None, f"Insufficient samples ({n_class}) of class '{cls}' for clustering"

    clean_features = [c for c in feature_cols if not c.startswith("__") and c in class_df.columns]
    X = class_df[clean_features].to_numpy(dtype=float)

    clust_cfg = cfg.get("clustering", {})
    max_k_limit = min(clust_cfg.get("elbow_max_k", 10), n_class - 1)
    if max_k_limit < 2:
        max_k_limit = 2

    k_values = list(range(2, max_k_limit + 1))
    inertias = []
    models = {}

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", ConvergenceWarning)
        for k in k_values:
            km = KMeans(n_clusters=k, random_state=seed, n_init=5)
            km.fit(X)
            inertias.append(km.inertia_)
            models[k] = km

    optimal_k = _find_elbow_k(inertias, k_values)
    fitted_kmeans = models[optimal_k]
    labels = fitted_kmeans.labels_

    n_pairs = clust_cfg.get("n_pairs_per_cluster", 100)
    tc_threshold = clust_cfg.get("tc_cosine_threshold", 0.95)
    rng = np.random.default_rng(seed)

    cluster_mean_similarities = []
    cluster_tc_fractions = []
    cluster_weights = []

    for k in range(optimal_k):
        c_points = X[labels == k]
        c_size = len(c_points)
        if c_size == 0:
            continue
        cluster_weights.append(c_size)

        if c_size == 1:
            cluster_mean_similarities.append(1.0)
            cluster_tc_fractions.append(1.0)
            continue

        # Sample up to n_pairs
        sample_size = min(n_pairs, c_size * (c_size - 1) // 2)
        idx1 = rng.choice(c_size, size=sample_size * 2)
        idx2 = rng.choice(c_size, size=sample_size * 2)
        valid = idx1 != idx2
        idx1 = idx1[valid][:sample_size]
        idx2 = idx2[valid][:sample_size]

        if len(idx1) == 0:
            cluster_mean_similarities.append(1.0)
            cluster_tc_fractions.append(1.0)
            continue

        p1 = c_points[idx1]
        p2 = c_points[idx2]

        norm1 = np.linalg.norm(p1, axis=1)
        norm2 = np.linalg.norm(p2, axis=1)
        denom = norm1 * norm2
        # Zero norm fallback
        sims = np.zeros(len(p1), dtype=float)
        nonzero = denom > 1e-12
        sims[nonzero] = np.sum(p1[nonzero] * p2[nonzero], axis=1) / denom[nonzero]
        sims = np.clip(sims, -1.0, 1.0)

        cluster_mean_similarities.append(float(np.mean(sims)))
        cluster_tc_fractions.append(float(np.mean(sims > tc_threshold)))

    total_weight = sum(cluster_weights)
    if total_weight == 0:
        return None, None, optimal_k, fitted_kmeans, "Zero weight in clusters"

    pdd_score = float(sum(w * s for w, s in zip(cluster_weights, cluster_mean_similarities)) / total_weight)
    tc_score = float(max(cluster_tc_fractions)) if cluster_tc_fractions else 0.0

    return pdd_score, tc_score, optimal_k, fitted_kmeans, None
