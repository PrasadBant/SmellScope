"""Dependency injection and state management for SmellScope FastAPI server."""

from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Optional, Tuple, Tuple
import uuid

from smellscope.api import (
    apply_remediation,
    check_rsm,
    generate_offline_html_report,
    get_default_config,
    list_sample_datasets,
    load_cached_run,
    load_dataset,
    make_locked_split,
    new_training_view,
    propose_remediation,
    rebenchmark,
    rollback,
    run_audit,
)
from smellscope.remediation.recommender import generate_repair_recommendations
from smellscope.remediation.manager import (
    generate_repair_plan_preview,
    apply_repair_plan,
    get_dataset_comparison,
    reaudit_view,
    train_view_dataframe,
    roles_for_frame,
    compute_test_fingerprint,
    verify_test_integrity,
)
from smellscope.core.errors import E_CONFIG, E_FILE, SmellScopeError


class DatasetRegistry:
    """Thread-safe in-memory cache for uploaded and sample datasets."""

    def __init__(self):
        self._lock = threading.Lock()
        self._datasets: Dict[str, Dict[str, Any]] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}
        self._raw_files: Dict[str, Dict[str, Any]] = {}
        self._auto_load_samples()

    def _auto_load_samples(self):
        """Auto-register available sample datasets."""
        samples = list_sample_datasets()
        sample_dir = Path(os.environ.get("SMELLSCOPE_DATA_DIR", "./data")) / "samples"
        for s in samples:
            p_file = sample_dir / f"{s['id']}.parquet"
            c_file = sample_dir / f"{s['id']}.csv"
            target = p_file if p_file.exists() else (c_file if c_file.exists() else None)
            if target:
                try:
                    loaded = load_dataset(
                        path_or_sample_id=str(target),
                        label_col=s["label_col"],
                        benign_label=s["benign_label"],
                    )
                    self._datasets[s["id"]] = loaded
                    self._metadata[s["id"]] = {
                        "dataset_id": s["id"],
                        "name": s["name"],
                        "schema_id": loaded["schema_id"],
                        "label_col": loaded["label_col"],
                        "benign_label": loaded["benign_label"],
                        "n_rows_loaded": len(loaded["df"]),
                        "sha256": loaded["meta"]["sha256"],
                        "source_basename": loaded["meta"]["source_basename"],
                    }
                except Exception:
                    pass

    def register(self, dataset_id: str, loaded_ds: Dict[str, Any], name: Optional[str] = None) -> None:
        with self._lock:
            self._datasets[dataset_id] = loaded_ds
            self._metadata[dataset_id] = {
                "dataset_id": dataset_id,
                "name": name or loaded_ds["meta"].get("source_basename", dataset_id),
                "schema_id": loaded_ds["schema_id"],
                "label_col": loaded_ds["label_col"],
                "benign_label": loaded_ds["benign_label"],
                "n_rows_loaded": len(loaded_ds["df"]),
                "sha256": loaded_ds["meta"]["sha256"],
                "source_basename": loaded_ds["meta"]["source_basename"],
                "status": "validated",
            }

    def register_raw(
        self,
        dataset_id: str,
        path: str,
        name: str,
        sha256: str,
        size_bytes: int,
        columns: List[str],
        n_rows: int,
    ) -> None:
        with self._lock:
            self._raw_files[dataset_id] = {
                "dataset_id": dataset_id,
                "path": path,
                "name": name,
                "source_basename": name,
                "sha256": sha256,
                "size_bytes": size_bytes,
                "columns": columns,
                "n_rows_raw": n_rows,
                "n_rows_loaded": n_rows,
                "label_col": "",
                "benign_label": "",
                "schema_id": "pending",
                "status": "pending_validation",
            }
            if dataset_id not in self._metadata:
                self._metadata[dataset_id] = self._raw_files[dataset_id]

    def get_raw(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._raw_files.get(dataset_id)

    def get(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._datasets.get(dataset_id)

    def get_metadata(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._metadata.get(dataset_id)

    def list_all(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._metadata.values())


class AuditJob:
    """Represents an active or completed background audit job."""

    def __init__(self, run_id: str, dataset_id: str):
        self.run_id = run_id
        self.dataset_id = dataset_id
        self.status = "QUEUED"  # QUEUED, RUNNING, COMPLETED, FAILED
        self.current_step = 0
        self.total_steps = 0
        self.current_class: Optional[str] = None
        self.progress_percent: float = 0.0
        self.start_time: float = time.time()
        self.elapsed_seconds: float = 0.0
        self.warnings: List[str] = []
        self.error_message: Optional[str] = None
        self.result: Optional[Dict[str, Any]] = None
        self.split: Optional[Dict[str, Any]] = None


class AuditJobManager:
    """Manages asynchronous audit execution without blocking FastAPI worker loop."""

    def __init__(self, dataset_reg: DatasetRegistry):
        self._lock = threading.Lock()
        self._jobs: Dict[str, AuditJob] = {}
        self._dataset_reg = dataset_reg

    def start_job(
        self,
        dataset_id: str,
        classes: Optional[List[str]] = None,
        cfg: Optional[Dict[str, Any]] = None,
    ) -> str:
        ds = self._dataset_reg.get(dataset_id)
        if not ds:
            raise SmellScopeError(
                code=E_FILE,
                message=f"Dataset '{dataset_id}' not found in registry.",
                details={"dataset_id": dataset_id},
            )

        run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        job = AuditJob(run_id=run_id, dataset_id=dataset_id)

        with self._lock:
            self._jobs[run_id] = job

        # Spawn background execution thread
        t = threading.Thread(
            target=self._run_audit_worker,
            args=(job, ds, classes, cfg),
            daemon=True,
        )
        t.start()

        return run_id

    def _run_audit_worker(
        self,
        job: AuditJob,
        ds: Dict[str, Any],
        classes: Optional[List[str]],
        cfg: Optional[Dict[str, Any]],
    ) -> None:
        job.status = "RUNNING"
        cfg = cfg or get_default_config()

        def progress_cb(current: int, total: int, cls_name: str) -> None:
            job.current_step = current
            job.total_steps = total
            job.current_class = cls_name
            job.progress_percent = round((current / total) * 100.0, 1) if total > 0 else 0.0
            job.elapsed_seconds = round(time.time() - job.start_time, 2)

        try:
            split = make_locked_split(ds, cfg)
            job.split = split
            result = run_audit(ds=ds, classes=classes, cfg=cfg, progress_cb=progress_cb, run_id=job.run_id)
            job.result = result
            job.status = "COMPLETED"
            job.progress_percent = 100.0
            job.elapsed_seconds = round(time.time() - job.start_time, 2)
        except SmellScopeError as sse:
            job.status = "FAILED"
            job.error_message = f"{sse.code}: {sse.message}"
            job.elapsed_seconds = round(time.time() - job.start_time, 2)
        except Exception as exc:
            job.status = "FAILED"
            job.error_message = f"E_INTERNAL: {str(exc)}"
            job.elapsed_seconds = round(time.time() - job.start_time, 2)

    def get_job(self, run_id: str) -> Optional[AuditJob]:
        with self._lock:
            if run_id in self._jobs:
                return self._jobs[run_id]

        # Check if saved on disk
        runs_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./runs")) / run_id
        if (runs_dir / "results.json").exists():
            try:
                cached_data = load_cached_run(run_id)
                dataset_name = cached_data.get("dataset", {}).get("name", "disk_cached")
                job = AuditJob(run_id=run_id, dataset_id=dataset_name)
                job.status = "COMPLETED"
                job.progress_percent = 100.0
                job.result = cached_data
                job.elapsed_seconds = cached_data.get("runtime", {}).get("total_seconds", 0.0)

                # Restore split manifest from disk
                split_file = runs_dir / "split_manifest.json"
                if split_file.exists():
                    import json
                    with open(split_file, "r", encoding="utf-8") as sf:
                        job.split = json.load(sf)

                with self._lock:
                    self._jobs[run_id] = job
                return job
            except Exception:
                pass
        return None

    def list_jobs(self) -> List[AuditJob]:
        with self._lock:
            return list(self._jobs.values())


class RemediationSessionManager:
    """Manages active training views, remediation history, and changelogs per audit run."""

    def __init__(self, job_manager: AuditJobManager, dataset_reg: DatasetRegistry):
        self._lock = threading.Lock()
        self._job_manager = job_manager
        self._dataset_reg = dataset_reg
        self._views: Dict[str, List[Dict[str, Any]]] = {}  # run_id -> list of views
        self._changelogs: Dict[str, List[Dict[str, Any]]] = {}  # run_id -> list of logs
        self._previews: Dict[str, Dict[str, Any]] = {}  # preview_id -> preview
        self._rebenchmarks: Dict[str, Dict[str, Any]] = {}  # run_id -> last rebenchmark
        self._exports: Dict[str, Dict[str, Any]] = {}  # run_id -> export metadata
        # Hash-keyed caches (view_hash changes whenever rows/features/transforms change)
        self._reaudits: Dict[tuple, Dict[str, Any]] = {}
        self._test_fp: Dict[str, str] = {}  # run_id -> fingerprint of the locked test set at run initialisation
        self._rsm_records: Dict[str, List[Dict[str, Any]]] = {}  # run_id -> chronological RSM safety events
        self._comparisons: Dict[tuple, Dict[str, Any]] = {}

    def _ensure_initialized(self, run_id: str) -> tuple[Dict[str, Any], Dict[str, Any]]:
        job = self._job_manager.get_job(run_id)
        if not job or not job.result:
            raise SmellScopeError(
                code=E_FILE,
                message=f"Audit run '{run_id}' not found or incomplete.",
                details={"run_id": run_id},
            )
        ds = self._dataset_reg.get(job.dataset_id)
        if not ds:
            # Try to find a sample dataset or fallback
            all_ds = self._dataset_reg.list_all()
            if all_ds:
                ds = self._dataset_reg.get(all_ds[0]["dataset_id"])

        if not ds:
            raise SmellScopeError(
                code=E_FILE,
                message=f"Dataset for run '{run_id}' not available.",
                details={"run_id": run_id},
            )

        split = job.split or make_locked_split(ds)
        if run_id not in self._views:
            root_view = new_training_view(ds, split)
            self._views[run_id] = [root_view]
            self._changelogs[run_id] = []
            self._test_fp[run_id] = compute_test_fingerprint(ds, split)
            self._rsm_records[run_id] = []

        return ds, split

    def _log_rsm(self, run_id: str, event: Dict[str, Any]) -> None:
        event.setdefault("recorded_at", datetime.now(timezone.utc).isoformat())
        self._rsm_records.setdefault(run_id, []).append(event)

    def get_rsm_records(self, run_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            self._ensure_initialized(run_id)
            return list(self._rsm_records.get(run_id, []))

    def get_views(self, run_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            self._ensure_initialized(run_id)
            return self._views[run_id]

    def get_active_view(self, run_id: str) -> Dict[str, Any]:
        with self._lock:
            self._ensure_initialized(run_id)
            return self._views[run_id][-1]

    def get_change_log(self, run_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            self._ensure_initialized(run_id)
            return self._changelogs[run_id]

    def create_preview(self, run_id: str, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            ds, split = self._ensure_initialized(run_id)
            active_view = self._views[run_id][-1]
            preview = propose_remediation(
                ds=ds,
                split=split,
                view=active_view,
                options={"action": action, "params": params},
            )
            preview["test_integrity"] = verify_test_integrity(
                ds, split, expected_fingerprint=self._test_fp.get(run_id)
            )
            rsm_report = check_rsm(preview)
            preview["rsm_report"] = rsm_report
            self._previews[preview["preview_id"]] = {
                "run_id": run_id,
                "preview": preview,
            }
            self._log_rsm(run_id, {
                "event": "PREVIEW", "preview_id": preview["preview_id"], "decision": rsm_report["status"],
                "view_hash": active_view.get("view_hash"),
            })
            return preview

    def apply(self, preview_id: str, approval: Dict[str, Any], expected_plan_hash: Optional[str] = None) -> tuple[Dict[str, Any], Dict[str, Any]]:
        with self._lock:
            stored = self._previews.get(preview_id)
            if not stored:
                raise SmellScopeError(
                    code=E_FILE,
                    message=f"Preview '{preview_id}' not found.",
                    details={"preview_id": preview_id},
                )
            run_id = stored["run_id"]
            preview = stored["preview"]
            ds, split = self._ensure_initialized(run_id)
            active_view = self._views[run_id][-1]

            try:
                new_view, log_entry = apply_remediation(
                    ds=ds,
                    split=split,
                    view=active_view,
                    preview=preview,
                    approval=approval,
                    expected_plan_hash=expected_plan_hash,
                )
            except SmellScopeError as exc:
                self._log_rsm(run_id, {
                    "event": "APPLY_REJECTED", "preview_id": preview_id, "outcome": exc.code,
                    "message": exc.message, "preview_decision": (preview.get("rsm_report") or {}).get("status"),
                    "acknowledged": bool(approval.get("warning_ack", False)),
                })
                raise
            self._views[run_id].append(new_view)
            self._changelogs[run_id].append(log_entry)
            self._previews.pop(preview_id, None)  # a preview authorises exactly one application
            self._log_rsm(run_id, {"event": "APPLIED", "preview_id": preview_id, **log_entry.get("rsm_record", {})})
            return new_view, log_entry

    def rollback_to(self, run_id: str, target_entry_id: str) -> Dict[str, Any]:
        with self._lock:
            self._ensure_initialized(run_id)
            views = self._views[run_id]
            logs = self._changelogs[run_id]
            parent_view = rollback(views, logs, target_entry_id)
            self._views[run_id].append(parent_view)
            return parent_view

    def execute_rebenchmark(self, run_id: str, target_class: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            ds, split = self._ensure_initialized(run_id)
            views = self._views[run_id]
            if len(views) < 2:
                # Compare view_0000 against itself if no remediations yet
                orig_view = views[0]
                rem_view = views[0]
            else:
                orig_view = views[0]
                rem_view = views[-1]

            res = rebenchmark(
                ds=ds,
                split=split,
                original_view=orig_view,
                remediated_view=rem_view,
                target_class=target_class,
                run_id=run_id,
            )
            self._rebenchmarks[run_id] = res
            return res

    def get_last_rebenchmark(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._rebenchmarks.get(run_id)

    def get_recommendations(self, run_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            ds, split = self._ensure_initialized(run_id)
            job = self._job_manager.get_job(run_id)
            active_view = self._views[run_id][-1]
            return generate_repair_recommendations(
                ds=ds,
                audit_result=job.result if job else None,
                split=split,
                view=active_view,
            )

    def create_repair_plan_preview(self, run_id: str, selected_recs: List[Dict[str, Any]]) -> Dict[str, Any]:
        with self._lock:
            ds, split = self._ensure_initialized(run_id)
            active_view = self._views[run_id][-1]
            # Resolve each selection against the server-generated recommendations so that
            # action types/parameters can never be spoofed, stripped or stale on the client.
            job = self._job_manager.get_job(run_id)
            authoritative = {
                r["id"]: r
                for r in generate_repair_recommendations(
                    ds=ds,
                    audit_result=job.result if job else None,
                    split=split,
                    view=active_view,
                )
            }
            resolved: List[Dict[str, Any]] = []
            unknown: List[str] = []
            for sel in selected_recs:
                rec_id = sel.get("id")
                if rec_id in authoritative:
                    resolved.append(authoritative[rec_id])
                else:
                    unknown.append(str(rec_id))
            if unknown:
                raise SmellScopeError(
                    code=E_CONFIG,
                    message=f"Unknown or no-longer-applicable recommendation id(s): {', '.join(unknown)}. Refresh recommendations.",
                    details={"unknown_ids": unknown},
                )
            preview = generate_repair_plan_preview(
                ds=ds,
                split=split,
                view=active_view,
                selected_recs=resolved,
                original_test_fingerprint=self._test_fp.get(run_id),
            )
            self._previews[preview["preview_id"]] = {
                "run_id": run_id,
                "preview": preview,
            }
            self._log_rsm(run_id, {
                "event": "PREVIEW", "preview_id": preview["preview_id"], "decision": preview["rsm_report"]["status"],
                "view_hash": active_view.get("view_hash"), "plan_hash": preview.get("plan_hash"),
            })
            return preview

    def apply_repair_plan_action(self, preview_id: str, approval: Dict[str, Any], expected_plan_hash: Optional[str] = None) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
        with self._lock:
            stored = self._previews.get(preview_id)
            if not stored:
                raise SmellScopeError(
                    code=E_FILE,
                    message=f"Preview '{preview_id}' not found.",
                    details={"preview_id": preview_id},
                )
            run_id = stored["run_id"]
            preview = stored["preview"]
            ds, split = self._ensure_initialized(run_id)
            active_view = self._views[run_id][-1]

            try:
                new_view, log_entry, export_meta = apply_repair_plan(
                    ds=ds,
                    split=split,
                    view=active_view,
                    preview=preview,
                    approval=approval,
                    run_id=run_id,
                    expected_plan_hash=expected_plan_hash,
                )
            except SmellScopeError as exc:
                self._log_rsm(run_id, {
                    "event": "APPLY_REJECTED", "preview_id": preview_id, "outcome": exc.code,
                    "message": exc.message, "preview_decision": (preview.get("rsm_report") or {}).get("status"),
                    "acknowledged": bool(approval.get("warning_ack", False)),
                })
                raise
            if export_meta.get("outcome") == "NO_CHANGE":
                # Truthful no-op: do not fabricate a new dataset version or overwrite a real export.
                self._log_rsm(run_id, {"event": "NO_CHANGE", "preview_id": preview_id, **export_meta.get("rsm_record", {})})
                return new_view, log_entry, export_meta
            self._views[run_id].append(new_view)
            self._changelogs[run_id].append(log_entry)
            self._exports[run_id] = export_meta
            self._previews.pop(preview_id, None)  # a preview authorises exactly one application
            self._log_rsm(run_id, {"event": "APPLIED", "preview_id": preview_id, **export_meta.get("rsm_record", {})})
            return new_view, log_entry, export_meta

    def _get_reaudit(self, run_id: str, ds: Dict[str, Any], split: Dict[str, Any], view: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Return a (cached) real re-audit of a corrected view; None for the untouched root view."""
        if view.get("parent_view_id") is None:
            return None
        key = (run_id, view["view_hash"])
        if key not in self._reaudits:
            cfg = get_default_config()
            self._reaudits[key] = reaudit_view(ds=ds, split=split, view=view, cfg=cfg)
        return self._reaudits[key]

    def get_dataset_comparison(self, run_id: str, target_class: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            ds, split = self._ensure_initialized(run_id)
            views = self._views[run_id]
            orig_view = views[0]
            curr_view = views[-1]
            key = (run_id, curr_view["view_hash"], target_class)
            if key in self._comparisons:
                return self._comparisons[key]
            job = self._job_manager.get_job(run_id)
            reaudit = self._get_reaudit(run_id, ds, split, curr_view)
            result = get_dataset_comparison(
                ds=ds,
                split=split,
                original_view=orig_view,
                remediated_view=curr_view,
                target_class=target_class,
                original_audit=job.result if job else None,
                reaudit=reaudit,
                run_id=run_id,
            )
            self._comparisons[key] = result
            return result

    def get_dataset_scores(self, run_id: str) -> Dict[str, Any]:
        with self._lock:
            ds, split = self._ensure_initialized(run_id)
            job = self._job_manager.get_job(run_id)
            active_view = self._views[run_id][-1]
            train_subset = train_view_dataframe(ds, split, active_view)
            # Score the active view with the audit that actually describes it: the original run for
            # the untouched view, a real re-audit for any corrected view.
            audit = self._get_reaudit(run_id, ds, split, active_view) or (job.result if job else None)
            from smellscope.scoring import compute_overall_dataset_assessment
            return compute_overall_dataset_assessment(
                df=train_subset,
                label_col=ds["label_col"],
                benign_label=ds.get("benign_label", "BENIGN"),
                audit_result=audit,
                split=split,
                roles=roles_for_frame(ds, train_subset),
            )

    def get_export_metadata(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._exports.get(run_id)


# Global singletons
dataset_registry = DatasetRegistry()
audit_job_manager = AuditJobManager(dataset_registry)
remediation_session_manager = RemediationSessionManager(audit_job_manager, dataset_registry)
