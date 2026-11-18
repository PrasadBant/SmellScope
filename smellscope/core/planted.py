"""Planted shortcut dataset generator for ground-truth validation."""
from typing import Any, Optional
import numpy as np
import pandas as pd


def make_planted_dataset(
    base_df: Optional[pd.DataFrame],
    label_col: str,
    benign_label: str,
    cls: str,
    shortcut_spec: dict[str, Any],
    seed: int = 42,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Inject a controllable synthetic shortcut feature correlated with the target label.

    Parameters
    ----------
    base_df : pd.DataFrame, optional
        Base dataset to inject shortcut feature into. If None, synthesizes a base dataset.
    label_col : str
        Name of label column.
    benign_label : str
        Label indicating benign traffic.
    cls : str
        Target attack class name.
    shortcut_spec : dict
        Specification dictionary containing:
        - 'feature_name': str (default: 'planted_shortcut')
        - 'strength': float (default: 1.0)
        - 'category': str (default: 'A')
        - 'noise_std': float (default: 0.05)
    seed : int
        Random seed for reproducibility.

    Returns
    -------
    tuple[pd.DataFrame, dict[str, Any]]
        (df_with_shortcut, truth_dict)
    """
    rng = np.random.default_rng(seed)

    feat_name = shortcut_spec.get("feature_name", "Destination Port")
    strength = float(shortcut_spec.get("strength", 1.0))
    category = shortcut_spec.get("category", "A")
    noise_std = float(shortcut_spec.get("noise_std", 0.05))

    if base_df is None:
        n_benign = 600
        n_attack = 200
        n_total = n_benign + n_attack
        labels = [benign_label] * n_benign + [cls] * n_attack
        base_df = pd.DataFrame({
            "__row_id": np.arange(n_total, dtype=int),
            label_col: labels,
            "Flow Duration": rng.uniform(10.0, 1000.0, size=n_total),
            "Total Fwd Packets": rng.normal(50.0, 10.0, size=n_total),
            "Packet Length Mean": rng.normal(200.0, 40.0, size=n_total),
        })
    else:
        base_df = base_df.copy()
        if "__row_id" not in base_df.columns:
            base_df["__row_id"] = np.arange(len(base_df), dtype=int)

    n_rows = len(base_df)
    is_class_c = (base_df[label_col] == cls).to_numpy()

    # Generate shortcut feature based on strength
    # When strength = 1.0, perfectly distinct values between class C and benign
    planted_vals = np.zeros(n_rows, dtype=float)

    # Benign baseline value = 80.0, attack value = 53.0 (Category A style)
    # Or continuous 0.0 vs 10.0
    for i in range(n_rows):
        if is_class_c[i]:
            if rng.random() < strength:
                val = 53.0
            else:
                val = 80.0
        else:
            if rng.random() < strength:
                val = 80.0
            else:
                val = 53.0
        planted_vals[i] = val + rng.normal(0.0, noise_std)

    base_df[feat_name] = planted_vals

    truth = {
        "evidence_label": "synthetic",
        "planted_feature": feat_name,
        "target_class": cls,
        "benign_label": benign_label,
        "category": category,
        "strength": strength,
        "noise_std": noise_std,
        "seed": seed,
        "n_rows": n_rows,
        "is_shortcut_planted": True,
    }

    return base_df, truth
