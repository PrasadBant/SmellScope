"""Multi-class audit orchestrator conforming to Shared Contract v1.0 Section 2.8."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import time
from typing import Any, Callable, Dict, List, Optional
import uuid

import numpy as np
import pandas as pd
import sklearn

from smellscope.core.audit import audit_class
from smellscope.core.errors import SmellScopeError
from smellscope.pipeline.config import load_config
from smellscope.pipeline.split import make_locked_split


def _sanitize_floats(obj: Any) -> Any:
    """Recursively convert NaN and Infinity to None (JSON null)."""
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: _sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize_floats(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        val = float(obj)
        return None if (np.isnan(val) or np.isinf(val)) else val
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return _sanitize_floats(obj.tolist())
    return obj


def run_audit(
    ds: Dict[str, Any],
    classes: Optional[List[str]] = None,
    cfg: Optional[Dict[str, Any]] = None,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute a complete multi-class scientific audit across target dataset classes.

    Conforms to Shared Contract v1.0 Section 2.8.

    Args:
        ds: LoadedDataset dictionary.
        classes: Optional list of attack class names to audit. If None, audits all attack classes.
        cfg: Configuration dictionary (or loads default if None).
        progress_cb: Optional callback func(current: int, total: int, class_name: str).
        run_id: Optional specific audit run identifier.

    Returns:
        RunResult dictionary conforming to Shared Contract v1.0 Section 2.8.
    """
    start_time = time.time()
    cfg = cfg or load_config()

    df = ds["df"]
    label_col = ds["label_col"]
    benign_label = ds["benign_label"]
    schema_id = ds.get("schema_id", "unknown")

    evidence_label = "synthetic" if schema_id == "synthetic-planted" else "measured"

    # Make locked split
    split = make_locked_split(ds, cfg)

    # Determine classes to audit
    all_classes = sorted([str(c) for c in df[label_col].unique() if str(c) != benign_label])
    if classes is not None and len(classes) > 0:
        target_classes = [c for c in classes if c in all_classes]
    else:
        target_classes = all_classes

    total_classes = len(target_classes)
    class_results: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    degradations: List[str] = []
    per_class_seconds: Dict[str, float] = {}

    if run_id is None:
        run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    for idx, cls_name in enumerate(target_classes):
        if progress_cb:
            progress_cb(idx + 1, total_classes, cls_name)

        cls_start = time.time()
        try:
            res = audit_class(
                df=df,
                label_col=label_col,
                cls=cls_name,
                benign_label=benign_label,
                cfg=cfg,
                split=split,
            )
            class_results.append(res)
        except SmellScopeError as sse:
            errors.append(sse.to_dict())
            degradations.append(f"Audit of class '{cls_name}' failed with {sse.code}: {sse.message}")
        except Exception as exc:
            err_dict = {
                "code": "E_INTERNAL",
                "message": f"Unexpected error auditing class '{cls_name}': {exc}",
                "class": cls_name,
                "details": {"error": str(exc)},
            }
            errors.append(err_dict)
            degradations.append(f"Audit of class '{cls_name}' failed unexpectedly: {exc}")

        per_class_seconds[cls_name] = round(time.time() - cls_start, 3)

    total_seconds = round(time.time() - start_time, 3)

    meta_meta = ds.get("meta", {})

    run_result: Dict[str, Any] = {
        "schema_version": "1.0",
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "evidence_label": evidence_label,
        "dataset": {
            "name": meta_meta.get("source_basename", "in_memory_dataset"),
            "schema_id": schema_id,
            "source_basename": meta_meta.get("source_basename", "in_memory_dataset"),
            "sha256": meta_meta.get("sha256", "unknown"),
            "n_rows_loaded": len(df),
            "label_col": label_col,
            "benign_label": benign_label,
            "class_counts": meta_meta.get("class_counts", {}),
            "subsample": meta_meta.get("subsample", {"max_rows_per_class": 20000, "seed": 42}),
        },
        "split": {
            "seed": split["seed"],
            "split_hash": split["split_hash"],
            "n_train": len(split["train_ids"]),
            "n_val": len(split["val_ids"]),
            "n_test": len(split["test_ids"]),
        },
        "classes": class_results,
        "errors": errors,
        "degradations": degradations,
        "runtime": {
            "total_seconds": total_seconds,
            "per_class_seconds": per_class_seconds,
        },
        "env": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "sklearn": sklearn.__version__,
        },
        "config_hash": cfg.get("config_hash", "unknown"),
    }

    # Sanitize NaN/inf floats to JSON null
    sanitized_result = _sanitize_floats(run_result)

    # Persist locally in runs/<run_id>/
    runs_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./runs")) / run_id
    runs_dir.mkdir(parents=True, exist_ok=True)

    with open(runs_dir / "results.json", "w", encoding="utf-8") as f:
        json.dump(sanitized_result, f, indent=2)

    with open(runs_dir / "split_manifest.json", "w", encoding="utf-8") as f:
        json.dump(split, f, indent=2)

    return sanitized_result
