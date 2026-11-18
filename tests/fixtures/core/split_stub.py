"""Test fixture and stub for Member 2's dataset loader and locked split generator."""
from datetime import datetime, timezone
import hashlib
from typing import Any, Iterable, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from smellscope.core.errors import SmellScopeError


def compute_split_hash(train_ids: list[int], val_ids: list[int], test_ids: list[int]) -> str:
    """Compute sha256 over sorted ids per partition, in order train, val, test."""
    hasher = hashlib.sha256()
    for partition in (train_ids, val_ids, test_ids):
        sorted_ids = sorted(partition)
        for row_id in sorted_ids:
            hasher.update(str(row_id).encode("utf-8"))
            hasher.update(b",")
        hasher.update(b";")
    return hasher.hexdigest()


def make_locked_split_stub(
    df: pd.DataFrame,
    label_col: str,
    seed: int = 42,
    group_col: Optional[str] = None,
) -> dict[str, Any]:
    """Generate a contract-conforming SplitManifest dictionary for testing."""
    if "__row_id" not in df.columns:
        raise SmellScopeError("E_SCHEMA", "Missing required '__row_id' column")

    y = df[label_col].values
    row_ids = df["__row_id"].values

    # Stratified 60% train, 40% temp
    try:
        train_idx, temp_idx = train_test_split(
            np.arange(len(df)),
            test_size=0.4,
            random_state=seed,
            stratify=y,
        )
        # Split temp 50/50 -> 20% val, 20% test
        temp_y = y[temp_idx]
        val_sub_idx, test_sub_idx = train_test_split(
            np.arange(len(temp_idx)),
            test_size=0.5,
            random_state=seed,
            stratify=temp_y,
        )
    except ValueError as e:
        raise SmellScopeError("E_CLASS_TOO_SMALL", f"Cannot split classes: {e}")

    val_idx = temp_idx[val_sub_idx]
    test_idx = temp_idx[test_sub_idx]

    train_ids = [int(row_ids[i]) for i in train_idx]
    val_ids = [int(row_ids[i]) for i in val_idx]
    test_ids = [int(row_ids[i]) for i in test_idx]

    split_hash = compute_split_hash(train_ids, val_ids, test_ids)
    created_at = datetime.now(timezone.utc).isoformat()

    return {
        "seed": seed,
        "fractions": {"train": 0.6, "val": 0.2, "test": 0.2},
        "train_ids": train_ids,
        "val_ids": val_ids,
        "test_ids": test_ids,
        "split_hash": split_hash,
        "group_col": group_col,
        "created_at": created_at,
    }


def assert_test_untouched(manifest: dict[str, Any], row_ids: Iterable[int]) -> None:
    """Raise E_TEST_LEAK if any row_id is present in test_ids."""
    test_set = set(manifest.get("test_ids", []))
    leaked = [rid for rid in row_ids if rid in test_set]
    if leaked:
        raise SmellScopeError(
            "E_TEST_LEAK",
            f"Test partition leaked! Found {len(leaked)} test row IDs in training/processing set.",
            details={"leaked_count": len(leaked), "leaked_sample": leaked[:10]},
        )


def make_synthetic_dataset_fixture(
    n_benign: int = 400,
    n_attack: int = 100,
    seed: int = 42,
    has_port_col: bool = True,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Create a synthetic LoadedDataset-conforming fixture DataFrame and metadata."""
    rng = np.random.default_rng(seed)
    n_total = n_benign + n_attack

    labels = ["BENIGN"] * n_benign + ["DDoS-Attack"] * n_attack
    feat_clean1 = rng.normal(loc=0.0, scale=1.0, size=n_total)
    feat_clean2 = rng.normal(loc=10.0, scale=2.0, size=n_total)
    feat_clean3 = rng.uniform(low=0.0, high=100.0, size=n_total)

    data = {
        "__row_id": np.arange(n_total, dtype=int),
        "label": labels,
        "Flow Duration": feat_clean1,
        "Total Fwd Packets": feat_clean2,
        "Packet Length Mean": feat_clean3,
    }

    if has_port_col:
        # Benign ports mixed; attack ports mostly port 80 (HTTP)
        ports = []
        for lbl in labels:
            if lbl == "BENIGN":
                ports.append(int(rng.choice([80, 443, 53, 8080, 22])))
            else:
                ports.append(80)
        data["Destination Port"] = ports

    df = pd.DataFrame(data)

    dataset_fixture = {
        "df": df,
        "label_col": "label",
        "benign_label": "BENIGN",
        "schema_id": "cic-ids-2017" if has_port_col else "synthetic-planted",
        "column_roles": {
            "dst_port": "Destination Port" if has_port_col else None,
            "timestamp": None,
            "group": None,
        },
        "meta": {
            "source_basename": "synthetic_fixture.csv",
            "sha256": "fake_sha256_fixture",
            "n_rows_raw": n_total,
            "n_rows_loaded": n_total,
            "dropped_inf_nan": 0,
            "class_counts": {"BENIGN": n_benign, "DDoS-Attack": n_attack},
            "subsample": {"max_rows_per_class": 20000, "seed": seed},
        },
    }

    return df, dataset_fixture
