"""Public facade for SmellScope conforming to Shared Contract v1.0 Section 2.9."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import pandas as pd

from smellscope.core.errors import E_FILE, SmellScopeError
from smellscope.core.sfi import fragility_grid
from smellscope.pipeline.config import load_config
from smellscope.pipeline.loader import load_dataset
from smellscope.pipeline.orchestrator import run_audit
from smellscope.pipeline.split import assert_test_untouched, make_locked_split
from smellscope.remediation.manager import (
    apply_remediation as _apply_remediation,
    new_training_view as _new_training_view,
    propose_remediation as _propose_remediation,
    rebenchmark as _rebenchmark,
    rollback as _rollback,
)
from smellscope.remediation.rsm import check_rsm
from smellscope.reporting.generator import generate_offline_html_report
from smellscope.scoring import (
    SCORING_VERSION,
    compute_data_quality_score,
    compute_evaluation_reliability_score,
    compute_nids_suitability_score,
    compute_overall_dataset_assessment,
    compute_shortcut_risk_score,
    get_default_scoring_config,
)


def get_default_config() -> Dict[str, Any]:
    """Retrieve default configuration with deterministic config_hash."""
    return load_config()


def list_sample_datasets() -> List[Dict[str, Any]]:
    """Enumerate registered sample datasets and their availability.

    Conforms to Shared Contract v1.0 Section 2.9.
    """
    sample_dir = Path(os.environ.get("SMELLSCOPE_DATA_DIR", "./data")) / "samples"
    planted_path = sample_dir / "cic2017_sample_planted.parquet"
    planted_exists = planted_path.exists()

    samples = [
        {
            "id": "cic2017_sample_planted",
            "name": "CIC-IDS-2017 Sample (Planted PortScan Shortcut)",
            "schema_id": "cic-ids-2017",
            "label_col": "Label",
            "benign_label": "BENIGN",
            "available": planted_exists,
            "note": "Pre-configured 360-row benchmark with 95% planted port shortcut on PortScan.",
        },
        {
            "id": "smellscope_nids_synthetic_test",
            "name": "SmellScope NIDS Synthetic Test Benchmark (6k Rows, 5 Classes)",
            "schema_id": "cic-ids-2017",
            "label_col": "label",
            "benign_label": "BENIGN",
            "available": (sample_dir / "smellscope_nids_synthetic_test.csv").exists() or (sample_dir / "smellscope_nids_synthetic_test.parquet").exists(),
            "note": "6,000-row 5-class synthetic benchmark with planted shortcut destination-port and data quality flaws.",
        },
        {
            "id": "synthetic_planted_sample",
            "name": "SmellScope Synthetic Planted Shortcut Sample (800 Rows)",
            "schema_id": "synthetic-planted",
            "label_col": "label",
            "benign_label": "benign",
            "available": (sample_dir / "synthetic_planted_sample.parquet").exists() or (sample_dir / "synthetic_planted_sample.csv").exists(),
            "note": "800-row controlled planted-shortcut validation benchmark with destination-port shortcut.",
        },
        {
            "id": "sample_cicids2017",
            "name": "CIC-IDS-2017 Quick Smoke Slice (30 Rows)",
            "schema_id": "cic-ids-2017",
            "label_col": "Label",
            "benign_label": "BENIGN",
            "available": (sample_dir / "sample_cicids2017.csv").exists(),
            "note": "Minimal 30-row CIC-IDS-2017 slice for fast smoke testing.",
        },
        {
            "id": "unsw_nb15_sample",
            "name": "UNSW-NB15 Sample",
            "schema_id": "unsw-nb15",
            "label_col": "attack_cat",
            "benign_label": "Normal",
            "available": (sample_dir / "unsw_sample.parquet").exists(),
            "note": "UNSW-NB15 sample partition with service and protocol features.",
        },
    ]
    return samples


def load_cached_run(path_or_name: str) -> Dict[str, Any]:
    """Load previously saved RunResult from runs/ directory or cached_results/.

    Sets evidence_label to 'cached'.
    """
    runs_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./runs"))
    target = runs_dir / path_or_name / "results.json"
    if not target.exists():
        target = runs_dir / path_or_name
    if not target.exists():
        target = Path("./cached_results") / f"{path_or_name}.json"

    if not target.exists():
        raise SmellScopeError(
            code=E_FILE,
            message=f"Cached run result not found: {path_or_name}",
            details={"path": str(target)},
        )

    with open(target, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["evidence_label"] = "cached"
    return data


def get_fragility_grid(
    ds: Dict[str, Any],
    cls: str,
    features: List[str],
    cfg: Optional[Dict[str, Any]] = None,
    split: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Calculate 2D joint feature perturbation fragility grid."""
    cfg = cfg or load_config()
    if split is None:
        split = make_locked_split(ds, cfg)

    return fragility_grid(
        df=ds["df"],
        label_col=ds["label_col"],
        cls=cls,
        benign_label=ds["benign_label"],
        features=features,
        cfg=cfg,
        split=split,
    )


def get_split(run_id: str) -> Dict[str, Any]:
    """Retrieve SplitManifest for an existing audit run."""
    runs_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./runs")) / run_id
    manifest_file = runs_dir / "split_manifest.json"
    if not manifest_file.exists():
        raise SmellScopeError(
            code=E_FILE,
            message=f"Split manifest for run '{run_id}' not found.",
            details={"run_id": run_id, "path": str(manifest_file)},
        )
    with open(manifest_file, "r", encoding="utf-8") as f:
        return json.load(f)


def new_training_view(ds: Dict[str, Any], split: Dict[str, Any]) -> Dict[str, Any]:
    """Create root TrainingView (view_0000)."""
    return _new_training_view(ds, split)


def propose_remediation(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    view: Dict[str, Any],
    options: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate preview for proposed remediation without altering state."""
    return _propose_remediation(ds, split, view, options, cfg)


def apply_remediation(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    view: Dict[str, Any],
    preview: Dict[str, Any],
    approval: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
    expected_plan_hash: Optional[str] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Apply remediation authorized by RSM and advance to new TrainingView."""
    return _apply_remediation(ds, split, view, preview, approval, cfg, expected_plan_hash)


def rollback(
    view_history: List[Dict[str, Any]],
    change_log: List[Dict[str, Any]],
    target_entry_id: str,
) -> Dict[str, Any]:
    """Roll back remediation to parent view with cryptographic integrity verification."""
    return _rollback(view_history, change_log, target_entry_id)


def rebenchmark(
    ds: Dict[str, Any],
    split: Dict[str, Any],
    original_view: Dict[str, Any],
    remediated_view: Dict[str, Any],
    cfg: Optional[Dict[str, Any]] = None,
    target_class: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Re-benchmark model performance on locked test set before vs after remediation."""
    return _rebenchmark(ds, split, original_view, remediated_view, cfg, target_class, run_id=run_id)


def get_change_log(run_id: str) -> List[Dict[str, Any]]:
    """Retrieve recorded change log entries for a run."""
    runs_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./runs")) / run_id
    log_file = runs_dir / "change_log.jsonl"
    if not log_file.exists():
        return []

    entries = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


def export_results_json(run_id: str, path: str) -> str:
    """Export RunResult to a destination JSON file."""
    runs_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./runs")) / run_id
    src_file = runs_dir / "results.json"
    if not src_file.exists():
        raise SmellScopeError(
            code=E_FILE,
            message=f"Results for run '{run_id}' not found.",
            details={"run_id": run_id},
        )

    out_p = Path(path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(src_file, "r", encoding="utf-8") as src, open(out_p, "w", encoding="utf-8") as dst:
        dst.write(src.read())

    return str(out_p.resolve())


def score_dataset(
    ds: Dict[str, Any],
    audit_result: Optional[Dict[str, Any]] = None,
    split: Optional[Dict[str, Any]] = None,
    baseline_eval: Optional[Dict[str, Any]] = None,
    cfg: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Calculate the 4-dimension dataset assessment score and synthesis for a loaded dataset."""
    return compute_overall_dataset_assessment(
        df=ds["df"],
        label_col=ds["label_col"],
        benign_label=ds.get("benign_label", "BENIGN"),
        audit_result=audit_result,
        split=split,
        baseline_eval=baseline_eval,
        roles=ds.get("column_roles"),
        cfg=cfg,
    )


__all__ = [
    "load_config",
    "get_default_config",
    "list_sample_datasets",
    "load_dataset",
    "make_locked_split",
    "assert_test_untouched",
    "run_audit",
    "load_cached_run",
    "get_fragility_grid",
    "get_split",
    "new_training_view",
    "propose_remediation",
    "check_rsm",
    "apply_remediation",
    "rollback",
    "rebenchmark",
    "get_change_log",
    "export_results_json",
    "generate_offline_html_report",
    "score_dataset",
    "compute_overall_dataset_assessment",
    "compute_data_quality_score",
    "compute_nids_suitability_score",
    "compute_shortcut_risk_score",
    "compute_evaluation_reliability_score",
    "get_default_scoring_config",
    "SCORING_VERSION",
]
