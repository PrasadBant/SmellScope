/**
 * TypeScript API Type Definitions for SmellScope 2.0.
 * Conforms to Shared Contract v1.0 and FastAPI Pydantic Models.
 */

export interface HealthResponse {
  status: string;
  api_version: string;
  backend_available: boolean;
  research_engine_available: boolean;
  execution_mode: string;
  scientific_disclaimer: string;
}

export interface DatasetItem {
  dataset_id: string;
  name: string;
  schema_id: string;
  label_col: string;
  benign_label: string;
  n_rows_loaded: number;
  sha256: string;
  source_basename: string;
}

export interface DatasetMetadata {
  dataset_id: string;
  source_basename: string;
  sha256: string;
  n_rows_raw: number;
  n_rows_loaded: number;
  dropped_inf_nan: number;
  label_col: string;
  benign_label: string;
  schema_id: string;
  column_roles: {
    dst_port: string | null;
    timestamp: string | null;
    group: string | null;
  };
  class_counts: Record<string, number>;
  columns: string[];
}

export interface DatasetPreview {
  dataset_id: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  preview_rows: Record<string, any>[];
  class_counts: Record<string, number>;
  missing_value_counts: Record<string, number>;
  infinite_value_counts: Record<string, number>;
}

export interface DatasetValidateResponse {
  valid: boolean;
  schema_id: string;
  unique_classes: string[];
  class_counts: Record<string, number>;
  column_roles: {
    dst_port: string | null;
    timestamp: string | null;
    group: string | null;
  };
  warnings: string[];
}

export interface AuditStartResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface AuditStatus {
  run_id: string;
  dataset_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  current_step: number;
  total_steps: number;
  current_class: string | null;
  progress_percent: number;
  elapsed_seconds: number;
  warnings: string[];
  error_message: string | null;
}

export interface PaperHeuristics {
  UGT: number | null;
  WL: number | null;
  HDF: number | null;
  PDD: number | null;
  TC: number | null;
  details: Record<string, any>;
}

export interface BaselineMetrics {
  acc: number | null;
  f1: number | null;
  tpr: number | null;
  tnr: number | null;
  n_test: number | null;
}

export interface SfiFragilityCurve {
  delta: number[];
  recall_top: (number | null)[];
  recall_null_mean: (number | null)[];
}

export interface SfiResult {
  top_features: string[];
  categories: ("A" | "B" | "C" | "D" | "UNMAPPED")[];
  k: number;
  recall_baseline: number | null;
  sfi_top: number | null;
  sfi_null_mean: number | null;
  sfi_null_std: number | null;
  n_null_draws: number;
  delta: number | null;
  z: number | null;
  ci95: [number | null, number | null] | null;
  flag: boolean;
  flag_conditions: {
    hdf_high?: boolean;
    excess_fragility?: boolean;
    category_eligible?: boolean;
    category_c_needs_context?: boolean;
  };
  fragility_curve: SfiFragilityCurve;
}

export interface GgiResult {
  f1_random: number | null;
  f1_grouped: number | null;
  gap: number | null;
  lor: number | null;
  grouping: string | null;
  n_groups: number | null;
  group_sizes: number[];
  lor_threshold: number;
}

export interface ClassAuditResult {
  class: string;
  n: number;
  n_benign: number;
  paper: PaperHeuristics;
  baseline: BaselineMetrics;
  sfi: SfiResult;
  ggi: GgiResult;
  na_reasons: Record<string, string>;
  meta: Record<string, any>;
}

export interface RunResult {
  schema_version: string;
  run_id: string;
  created_at: string;
  evidence_label: "published" | "target" | "measured" | "synthetic" | "cached" | "mock";
  dataset: {
    name: string;
    schema_id: string;
    source_basename: string;
    sha256: string;
    n_rows_loaded: number;
    label_col: string;
    benign_label: string;
    class_counts: Record<string, number>;
  };
  split: {
    seed: number;
    split_hash: string;
    n_train: number;
    n_val: number;
    n_test: number;
  };
  classes: ClassAuditResult[];
  errors: any[];
  degradations: string[];
  runtime: {
    total_seconds: number;
    per_class_seconds: Record<string, number>;
  };
  env: {
    python: string;
    numpy: string;
    pandas: string;
    sklearn: string;
  };
  config_hash: string;
}

export interface FragilityGridResponse {
  features: [string, string];
  grid_delta: number[][];
  recall: (number | null)[][];
  recall_baseline: number | null;
}

export interface RSMReport {
  status: "PASS" | "WARN" | "BLOCK";
  warnings: { code: string; class: string | null; message: string }[];
  blocks: { code: string; class: string | null; message: string }[];
  impact: Record<string, any>;
  policy: Record<string, any>;
}

export interface RemediationPreview {
  preview_id: string;
  action: string;
  params: Record<string, any>;
  reason: string;
  affected: {
    n_rows: number;
    by_class: Record<string, { before: number; after: number; retention: number }>;
    by_cluster: Record<string, Record<string, { before: number; after: number; retention: number }>>;
  };
  feature_changes: string[];
  expected_train_size: {
    before: number;
    after: number;
  };
  rsm_report: RSMReport;
}

export interface TrainingView {
  view_id: string;
  parent_view_id: string | null;
  split_hash: string;
  n_included: number;
  included_hash: string;
  excluded_features: string[];
  quarantined_count: number;
  view_hash: string;
}

export interface ChangeLogEntry {
  entry_id: string;
  timestamp: string;
  action: string;
  rule_name: string;
  params: Record<string, any>;
  seed: number;
  affected_row_ids_ref: string;
  before_counts: Record<string, any>;
  after_counts: Record<string, any>;
  rsm_status: string;
  warnings: any[];
  approval: {
    approved: boolean;
    warning_ack: boolean;
    approved_at: string;
  };
  parent_view_id: string;
  new_view_id: string;
}

export interface RebenchmarkResult {
  before: BaselineMetrics;
  after: BaselineMetrics;
  delta: {
    acc: number | null;
    f1: number | null;
    tpr: number | null;
    tnr: number | null;
  };
  same_test_ids: boolean;
  split_hash: string;
  train_sizes: {
    before: number;
    after: number;
  };
  ci95: Record<string, any>;
  n_repeats: number;
  seed: number;
}

export interface ViewsResponse {
  run_id: string;
  active_view: TrainingView;
  views: TrainingView[];
  change_log: ChangeLogEntry[];
  last_rebenchmark: RebenchmarkResult | null;
}

export interface ReportGenerateResponse {
  report_id: string;
  run_id: string;
  created_at: string;
  download_url: string;
  file_path: string;
}
