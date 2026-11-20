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
from smellscope.pipeline.profile import compute_dataset_profile
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
    split_override: Optional[Dict[str, Any]] = None,
    persist: bool = True,
) -> Dict[str, Any]:
    """Execute a complete multi-class scientific audit across target dataset classes.

    Conforms to Shared Contract v1.0 Section 2.8.

    Args:
        ds: LoadedDataset dictionary.
        classes: Optional list of attack class names to audit. If None, audits all attack classes.
        cfg: Configuration dictionary (or loads default if None).
        progress_cb: Optional callback func(current: int, total: int, class_name: str).
        run_id: Optional specific audit run identifier.
        split_override: Optional pre-built SplitManifest (used by re-audits of corrected
            training views so the locked val/test partitions are reused unchanged).
        persist: When False the result is not written to the runs directory (re-audits).

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
    split_start = time.time()
    split = split_override if split_override is not None else make_locked_split(ds, cfg)
    split_duration_ms = round((time.time() - split_start) * 1000.0, 2)

    # Compute authoritative profile and dynamic capability matrix
    profile_start = time.time()
    dataset_profile = compute_dataset_profile(ds, split=split, dataset_id=run_id)
    profile_duration_ms = round((time.time() - profile_start) * 1000.0, 2)

    if run_id is None:
        run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    audit_logs: List[Dict[str, Any]] = [
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": "INGESTION",
            "level": "INFO",
            "operation": "Dataset Ingestion & Integrity Scan",
            "duration_ms": 0.0,
            "details": {
                "rows": len(df),
                "columns": len(df.columns),
                "label_col": label_col,
                "benign_label": benign_label,
            },
        },
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": "VALIDATION",
            "level": "INFO",
            "operation": "Schema and Topology Validation",
            "duration_ms": profile_duration_ms,
            "details": {
                "schema_id": schema_id,
                "is_single_class": dataset_profile["is_single_class"],
                "classes_detected": dataset_profile["available_classes"],
                "supported_diagnostics_count": len(dataset_profile["supported_diagnostics"]),
            },
        },
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": "SPLIT",
            "level": "INFO",
            "operation": "Locked 3-Way Partition Generator",
            "duration_ms": split_duration_ms,
            "details": {
                "seed": split["seed"],
                "split_hash": split["split_hash"],
                "train_rows": len(split["train_ids"]),
                "val_rows": len(split["val_ids"]),
                "test_rows": len(split["test_ids"]),
            },
        },
    ]

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

    if dataset_profile["is_single_class"]:
        audit_logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": "CLASS_AUDIT",
            "level": "INFO",
            "operation": "Single-Class Dataset Diagnostics Mode",
            "duration_ms": 1.0,
            "details": {
                "message": (
                    f"Dataset contains only single class '{dataset_profile['available_classes'][0]}'. "
                    "Data Quality ($S_DQ$) profiling is available. Supervised ML benchmark, SFI, GGI, and "
                    "attack-specific heuristics are marked NOT_APPLICABLE because no attack traffic is present."
                ),
            },
        })
    else:
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
                cls_duration_ms = round((time.time() - cls_start) * 1000.0, 2)
                audit_logs.append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "stage": "CLASS_AUDIT",
                    "level": "INFO",
                    "operation": f"Audit of class '{cls_name}' vs '{benign_label}'",
                    "duration_ms": cls_duration_ms,
                    "details": {
                        "class": cls_name,
                        "n_samples": res.get("n", 0),
                        "ugt": res.get("paper", {}).get("UGT"),
                        "wl": res.get("paper", {}).get("WL"),
                        "hdf": res.get("paper", {}).get("HDF"),
                        "sfi_flag": res.get("sfi", {}).get("flag", False),
                    },
                })
            except SmellScopeError as sse:
                errors.append(sse.to_dict())
                degradations.append(f"Audit of class '{cls_name}' failed with {sse.code}: {sse.message}")
                audit_logs.append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "stage": "CLASS_AUDIT",
                    "level": "WARN",
                    "operation": f"Audit of class '{cls_name}' encountered known error",
                    "duration_ms": round((time.time() - cls_start) * 1000.0, 2),
                    "details": {"error_code": sse.code, "message": sse.message},
                })
            except Exception as exc:
                err_dict = {
                    "code": "E_INTERNAL",
                    "message": f"Unexpected error auditing class '{cls_name}': {exc}",
                    "class": cls_name,
                    "details": {"error": str(exc)},
                }
                errors.append(err_dict)
                degradations.append(f"Audit of class '{cls_name}' failed unexpectedly: {exc}")
                audit_logs.append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "stage": "CLASS_AUDIT",
                    "level": "ERROR",
                    "operation": f"Audit of class '{cls_name}' crashed",
                    "duration_ms": round((time.time() - cls_start) * 1000.0, 2),
                    "details": {"error": str(exc)},
                })

            per_class_seconds[cls_name] = round(time.time() - cls_start, 3)

    total_seconds = round(time.time() - start_time, 3)
    audit_logs.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stage": "COMPLETION",
        "level": "INFO",
        "operation": "Audit Pipeline Execution Completed",
        "duration_ms": round(total_seconds * 1000.0, 2),
        "details": {
            "total_classes_audited": len(class_results),
            "errors_count": len(errors),
            "total_runtime_seconds": total_seconds,
        },
    })

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
        "is_single_class": dataset_profile["is_single_class"],
        "profile": dataset_profile,
        "capability_matrix": dataset_profile["capability_matrix"],
        "audit_logs": audit_logs,
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

    if not persist:
        return sanitized_result

    # Persist locally in runs/<run_id>/
    runs_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./runs")) / run_id
    runs_dir.mkdir(parents=True, exist_ok=True)

    with open(runs_dir / "results.json", "w", encoding="utf-8") as f:
        json.dump(sanitized_result, f, indent=2)

    with open(runs_dir / "split_manifest.json", "w", encoding="utf-8") as f:
        json.dump(split, f, indent=2)

    return sanitized_result
