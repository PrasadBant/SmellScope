# SHARED INTEGRATION CONTRACT v1.0 (FROZEN)

## 2.1 Conventions
- Package `smellscope`; Python 3.11; JSON UTF-8; timestamps ISO-8601 UTC; NaN/inf → `null` in JSON.
- Reserved column prefix `__` (e.g. `__row_id`) is never a feature.
- Global default seed 42. All randomness takes a seed.
- Metric that cannot be computed → value `null` and an entry in `na_reasons` (dotted path → reason string). A failed measure never aborts a run.
- `evidence_label` ∈ `published | target | measured | synthetic | cached | mock`.

## 2.2 Error model
Python: `class SmellScopeError(Exception)` with `.code`, `.message`, `.details` (dict). JSON form: `{"code","message","details","measure"?,"class"?}`.
Codes: `E_SCHEMA`, `E_LABEL_COLUMN`, `E_BENIGN_LABEL_MISSING`, `E_CLASS_TOO_SMALL`, `E_SPLIT_INVALID`, `E_TEST_LEAK`, `E_CONFIG`, `E_MEASURE_FAILED`, `E_RULE_UNAVAILABLE`, `E_RSM_BLOCK`, `E_RSM_WARN_UNACKED`, `E_ROLLBACK_MISMATCH`, `E_FILE`, `E_INTERNAL`. Never use new codes without a contract change.

## 2.3 Config files (merged by `smellscope.pipeline.config.load_config(config_dir) -> dict` with `config_hash`)
| File | Owner | Contents |
|---|---|---|
| `config/default.yaml` | M2 | `seed`, `sampling.max_rows_per_class` (20000), `split` (train 0.6/val 0.2/test 0.2, stratified), `runtime.budget_seconds`, `rsm.policy`, paths |
| `config/heuristics.yaml` | M1 | `bg_ports`, `enn_k`, `hdf_rf`, `pdd`, `tc_threshold`, `baseline.rf`, `sfi` (k, deltas, n_null, z_threshold, hdf_high, quantiles, min_test_examples), `ggi` |
| `config/taxonomy_cic2017.yaml`, `config/taxonomy_unsw.yaml` | M1 | regex + overrides per category |
| `config/remediation_rules.yaml` | M2 | R2 rule definitions with column aliases per `schema_id` |
| `config/ui.yaml` | M3 | labels, colours, wording rules (read only by UI) |
Env vars (no secrets exist): `SMELLSCOPE_HOME` (default `./runs`), `SMELLSCOPE_DATA_DIR` (default `./data`), `SMELLSCOPE_CONFIG_DIR` (default `./config`), `SMELLSCOPE_SEED`, `SMELLSCOPE_LOG_LEVEL`.

## 2.4 I-1 Dataset load — producer M2, consumers M1 (tests), M3 (via api)
`load_dataset(path_or_sample_id: str, label_col: str, benign_label: str, cfg: dict) -> LoadedDataset`
```
LoadedDataset = {
  "df": pandas.DataFrame,   # normalised (stripped) column names, "__row_id" int stable (position in raw file), numeric features
  "label_col": str, "benign_label": str,
  "schema_id": "cic-ids-2017" | "unsw-nb15" | "synthetic-planted" | "unknown",
  "column_roles": {"dst_port": str|null, "timestamp": str|null, "group": str|null},
  "meta": {"source_basename": str, "sha256": str, "n_rows_raw": int, "n_rows_loaded": int,
           "dropped_inf_nan": int, "class_counts": {str:int},
           "subsample": {"max_rows_per_class": int, "seed": int}}
}
```
Validation: file exists, `.csv`/`.parquet` only, label column present, benign label present, ≥2 classes, numeric coercion with logged drop counts. Errors: `E_FILE`, `E_LABEL_COLUMN`, `E_BENIGN_LABEL_MISSING`, `E_SCHEMA`.

## 2.5 I-2 Locked split — producer M2, consumers M1, M2
`make_locked_split(ds: LoadedDataset, cfg) -> SplitManifest`
```
SplitManifest = {"seed": int, "fractions": {"train":0.6,"val":0.2,"test":0.2},
  "train_ids": [int], "val_ids": [int], "test_ids": [int],
  "split_hash": str,   # sha256 over sorted ids per partition, in order train,val,test
  "group_col": str|null, "created_at": str}
assert_test_untouched(manifest, row_ids: Iterable[int]) -> None   # raises E_TEST_LEAK if any id is in test_ids
```
Stratified by label. Written once to `runs/<run_id>/split_manifest.json`, never modified. Classes with too few rows for the split → `E_CLASS_TOO_SMALL` (class marked n/a, run continues).

## 2.6 I-3 Per-class audit — producer M1, consumer M2
`audit_class(df, label_col: str, cls: str, benign_label: str, cfg: dict, split: SplitManifest) -> ClassAuditResult`
```
ClassAuditResult = {
 "class": str, "n": int, "n_benign": int,
 "paper": {"UGT": f|null, "WL": f|null, "HDF": f|null, "PDD": f|null, "TC": f|null,
           "details": {"pdd_n_clusters": int|null, "hdf_top_feature": str|null, "wl_no_tie_bias": f|null}},
 "baseline": {"acc": f|null, "f1": f|null, "tpr": f|null, "tnr": f|null, "n_test": int},
 "sfi": {"top_features": [str], "categories": ["A"|"B"|"C"|"D"|"UNMAPPED"], "k": int,
         "recall_baseline": f|null, "sfi_top": f|null, "sfi_null_mean": f|null, "sfi_null_std": f|null,
         "n_null_draws": int, "delta": f|null, "z": f|null, "ci95": [f,f]|null,
         "flag": bool,
         "flag_conditions": {"hdf_high": bool, "excess_fragility": bool, "category_eligible": bool, "category_c_needs_context": bool},
         "fragility_curve": {"delta": [f], "recall_top": [f], "recall_null_mean": [f]}},
 "ggi": {"f1_random": f|null, "f1_grouped": f|null, "gap": f|null, "lor": f|null,
         "grouping": "provenance" | "cluster_proxy", "n_groups": int|null, "group_sizes": [int], "lor_threshold": f},
 "na_reasons": {"<dotted.path>": str},
 "meta": {"seed": int, "timestamp": str, "versions": {"python": str, "numpy": str, "pandas": str, "sklearn": str}}
}
```
Never raises for a failed measure (sets `null` + `na_reasons`). Raises only `E_SPLIT_INVALID`, `E_CONFIG`, `E_CLASS_TOO_SMALL`.

## 2.7 I-4 Other core functions — producer M1, consumers M2 (and M3 via api)
- `get_cluster_assignments(df, label_col, cls, benign_label, cfg, seed) -> pandas.Series` (index `__row_id`, int cluster id; same KMeans as PDD).
- `fit_and_evaluate(train_df, test_df, label_col, benign_label, feature_cols: list[str], cfg, seed, target_class: str|None) -> EvalResult` where `EvalResult = {"acc","f1","tpr","tnr","per_class": {cls: {"recall","precision","f1","n"}}, "n_train": int, "n_test": int, "seed": int, "model": {"type":"RandomForest","n_estimators": int}}`. `target_class` set → binary (class vs benign); `None` → multiclass. Preprocessing fitted on `train_df` only.
- `fragility_grid(df, label_col, cls, benign_label, features: list[str] (len 2), cfg, split) -> {"features": [str,str], "grid_delta": [[f]], "recall": [[f]], "recall_baseline": f}`.
- `classify_features(columns: list[str], schema_id: str, cfg) -> {col: "A"|"B"|"C"|"D"|"UNMAPPED"}`.
- `make_planted_dataset(base_df, label_col, benign_label, cls, shortcut_spec: dict, seed) -> (df, truth: dict)` (always labelled synthetic).

## 2.8 I-5 Run results — producer M2, consumers M3 (and M1 for experiments)
```
RunResult = {
 "schema_version": "1.0", "run_id": str, "created_at": str,
 "evidence_label": "measured"|"synthetic"|"cached"|"mock",
 "dataset": {"name": str, "schema_id": str, "source_basename": str, "sha256": str, "n_rows_loaded": int,
             "label_col": str, "benign_label": str, "class_counts": {str:int},
             "subsample": {"max_rows_per_class": int, "seed": int}},
 "split": {"seed": int, "split_hash": str, "n_train": int, "n_val": int, "n_test": int},
 "classes": [ClassAuditResult],
 "errors": [ErrorObj], "degradations": [str],
 "runtime": {"total_seconds": f, "per_class_seconds": {str: f}},
 "env": {"python": str, "numpy": str, "pandas": str, "sklearn": str}, "config_hash": str
}
```
JSON Schema file: `smellscope/contracts/run_result.schema.json` (M2 creates; M1 and M3 may copy for validation tests under their own test dirs).

## 2.9 I-6 Facade `smellscope.api` — producer M2, consumer M3 (M3 imports ONLY this module)
```
list_sample_datasets() -> [{"id","name","schema_id","label_col","benign_label","available": bool,"note": str}]
load_dataset(path_or_sample_id, label_col, benign_label, cfg=None) -> LoadedDataset  (see 2.4)
get_default_config() -> dict
run_audit(ds, classes: list[str]|None, cfg, progress_cb: Callable[[int,int,str],None]|None) -> RunResult
load_cached_run(path_or_name) -> RunResult            # evidence_label "cached"
get_fragility_grid(ds, cls, features, cfg, split) -> dict
get_split(run_id) -> SplitManifest
new_training_view(ds, split) -> TrainingView
propose_remediation(view, flags, options) -> RemediationPreview
check_rsm(preview, policy|None) -> RSMReport
apply_remediation(view, preview, approval) -> (TrainingView, ChangeLogEntry)
rollback(view, change_log_entry) -> TrainingView
rebenchmark(ds, split, original_view, remediated_view, cfg, target_class) -> RebenchmarkResult
get_change_log(run_id) -> [ChangeLogEntry]
export_results_json(run_id, path) -> str
```

## 2.10 I-7 Remediation types — producer M2, consumer M3
```
TrainingView = {"view_id": str, "parent_view_id": str|null, "split_hash": str,
                "n_included": int, "included_hash": str, "excluded_features": [str],
                "quarantined_count": int, "view_hash": str}
RemediationOptions = {"action": "R1"|"R2", "params": {...}}
   R1 params: {"features": [str]}      R2 params: {"rule": str, "classes": [str]|null}
RemediationPreview = {"preview_id": str, "action": str, "params": {}, "reason": str,
   "affected": {"n_rows": int,
                "by_class": {cls: {"before": int, "after": int, "retention": f}},
                "by_cluster": {cls: {cluster_id: {"before": int, "after": int, "retention": f}}}},
   "feature_changes": [str], "expected_train_size": {"before": int, "after": int}}
RSMReport = {"status": "PASS"|"WARN"|"BLOCK",
   "warnings": [{"code": str, "class": str|null, "message": str}],
   "blocks": [{"code": str, "class": str|null, "message": str}],
   "impact": {...same shape as "affected"...}, "policy": {...}}
approval = {"approved": bool, "warning_ack": bool, "approved_at": str}   # WARN needs warning_ack=true else E_RSM_WARN_UNACKED; BLOCK always raises E_RSM_BLOCK
ChangeLogEntry = {"entry_id": str, "timestamp": str, "action": str, "rule_name": str, "params": {}, "seed": int,
   "affected_row_ids_ref": str, "before_counts": {}, "after_counts": {}, "rsm_status": str, "warnings": [],
   "approval": approval, "parent_view_id": str, "new_view_id": str}
RebenchmarkResult = {"before": EvalResult, "after": EvalResult, "delta": {"acc","f1","tpr","tnr"},
   "same_test_ids": bool, "split_hash": str, "train_sizes": {"before": int, "after": int},
   "ci95": {"f1_before": [f,f]|null, "f1_after": [f,f]|null}, "n_repeats": int, "seed": int}
```
Rollback must restore the previous view **exactly** (identical `view_hash`).

## 2.11 Storage layout (M2 owns)
`runs/<run_id>/{results.json, split_manifest.json, change_log.jsonl, views/<view_id>.json, run.log}` · `cache/` (parquet) · `cached_results/*.json` (committed demo fallbacks, small) · `data/raw/` and `data/samples/` (git-ignored) with committed `data/MANIFEST.md` (file names, row counts, sha256).

## 2.12 Integration sequence
1. Phase 2 end: contract written identically by all three (frozen).
2. Phase 3: M1 builds on a local split stub; M2 builds on a mock core (`tests/mocks/mock_core.py`, M2-owned) returning schema-valid `ClassAuditResult`; M3 builds on a mock api (`smellscope/ui/mock_api.py`, M3-owned) returning fixtures labelled `mock`.
3. Phase 5: M2 swaps mock core → real core (core↔pipeline integration); M3 swaps mock api → real api (pipeline↔UI integration). Each uses the user-approved merged/available branches; if another member's branch is not available, keep the mock and report the dependency.
4. Phase 6: end-to-end run of the demo sequence (FR-213 in Member 3's FRD) on the integrated code; the **user** merges.
