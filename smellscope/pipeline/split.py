"""Locked split generator and test leak detector conforming to Shared Contract v1.0 Section 2.5."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, Iterable, Optional

import numpy as np
from sklearn.model_selection import train_test_split

from smellscope.core.errors import E_CLASS_TOO_SMALL, E_SPLIT_INVALID, E_TEST_LEAK, SmellScopeError


def make_locked_split(
    ds: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate a reproducible, stratified locked train/val/test split.

    Conforms to Shared Contract v1.0 Section 2.5.

    Args:
        ds: LoadedDataset dictionary containing 'df', 'label_col', etc.
        cfg: Optional configuration dictionary.

    Returns:
        SplitManifest dictionary.

    Raises:
        SmellScopeError: E_CLASS_TOO_SMALL, E_SPLIT_INVALID.
    """
    cfg = cfg or {}
    df = ds["df"]
    label_col = ds["label_col"]
    seed = cfg.get("seed", 42)
    split_cfg = cfg.get("split", {})
    train_frac = split_cfg.get("train", 0.6)
    val_frac = split_cfg.get("val", 0.2)
    test_frac = split_cfg.get("test", 0.2)

    total_frac = train_frac + val_frac + test_frac
    if abs(total_frac - 1.0) > 1e-5:
        raise SmellScopeError(
            code=E_SPLIT_INVALID,
            message=f"Split fractions must sum to 1.0, got {total_frac}",
            details={"train": train_frac, "val": val_frac, "test": test_frac},
        )

    # Check minimum class sizes
    class_counts = df[label_col].value_counts()
    for cls_name, count in class_counts.items():
        if count < 3:
            raise SmellScopeError(
                code=E_CLASS_TOO_SMALL,
                message=f"Class '{cls_name}' has only {count} examples; minimum 3 required for 3-way split.",
                details={"class": str(cls_name), "count": int(count)},
            )

    row_ids = df["__row_id"].to_numpy()
    labels = df[label_col].to_numpy()

    # Step 1: Split train vs temp (val + test)
    temp_frac = val_frac + test_frac
    train_ids_arr, temp_ids_arr, _, temp_labels = train_test_split(
        row_ids,
        labels,
        test_size=temp_frac,
        random_state=seed,
        stratify=labels,
    )

    # Step 2: Split temp into val and test
    relative_test_frac = test_frac / temp_frac
    val_ids_arr, test_ids_arr = train_test_split(
        temp_ids_arr,
        test_size=relative_test_frac,
        random_state=seed + 1,
        stratify=temp_labels,
    )

    train_ids = [int(x) for x in sorted(train_ids_arr)]
    val_ids = [int(x) for x in sorted(val_ids_arr)]
    test_ids = [int(x) for x in sorted(test_ids_arr)]

    # Cryptographic split_hash over sorted ids in order: train, val, test
    hasher = hashlib.sha256()
    hasher.update(",".join(map(str, train_ids)).encode("utf-8"))
    hasher.update(b"|")
    hasher.update(",".join(map(str, val_ids)).encode("utf-8"))
    hasher.update(b"|")
    hasher.update(",".join(map(str, test_ids)).encode("utf-8"))
    split_hash = hasher.hexdigest()

    group_col = ds.get("column_roles", {}).get("group")

    manifest: Dict[str, Any] = {
        "seed": seed,
        "fractions": {"train": train_frac, "val": val_frac, "test": test_frac},
        "train_ids": train_ids,
        "val_ids": val_ids,
        "test_ids": test_ids,
        "split_hash": split_hash,
        "group_col": group_col,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    return manifest


def assert_test_untouched(manifest: Dict[str, Any], row_ids: Iterable[int]) -> None:
    """Raise E_TEST_LEAK if any row_id is in test_ids.

    Enforces non-negotiable test isolation.
    """
    test_set = set(manifest["test_ids"])
    leaked = [int(rid) for rid in row_ids if rid in test_set]
    if leaked:
        raise SmellScopeError(
            code=E_TEST_LEAK,
            message=f"Test leak detected! {len(leaked)} test rows were accessed in training context.",
            details={"leaked_count": len(leaked), "leaked_sample": leaked[:10]},
        )
