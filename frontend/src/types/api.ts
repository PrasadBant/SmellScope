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
  status?: string;
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
  is_single_class?: boolean;
  single_class_name?: string | null;
  supported_diagnostics?: string[];
  unsupported_diagnostics?: Record<string, string>;
  capability_matrix?: Record<string, {
    status: string;
    category: string;
    reason: string;
  }>;
}

export interface DatasetProfile {
  dataset_id: string;
  dataset_version: string;
  dataset_fingerprint: string;
  row_count: number;
  column_count: number;
  feature_columns: string[];
  feature_types: Record<string, string>;
  label_column: string;
  benign_label: string;
  available_classes: string[];
  class_counts: Record<string, number>;
  class_ratios: Record<string, number>;
  is_single_class: boolean;
  is_binary: boolean;
  is_multiclass: boolean;
  has_benign: boolean;
  has_attacks: boolean;
  attack_classes: string[];
  missing_value_summary: {
    total_cells: number;
    affected_columns: string[];
    affected_rows: number;
    columns_dict: Record<string, number>;
  };
  infinite_value_summary: {
    total_cells: number;
    affected_columns: string[];
    affected_rows: number;
    columns_dict: Record<string, number>;
  };
  duplicate_summary: {
    duplicate_count: number;
    duplicate_percentage: number;
  };
  constant_feature_summary: {
    constant_features: string[];
    count: number;
  };
  port_columns_detected: string[];
  packet_size_columns_detected: string[];
  supported_diagnostics: string[];
  unsupported_diagnostics: Record<string, string>;
  capability_matrix: Record<string, {
    status: string;
    category: string;
    reason: string;
  }>;
}

export interface AuditLogEntry {
  timestamp: string;
  stage: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  operation: string;
  duration_ms: number;
  details: Record<string, any>;
}

export interface SmellMatrixHeatmap {
  run_id: string;
  classes: string[];
  metrics: string[];
  thresholds: Record<string, number>;
  matrix: (number | null)[][];
  is_single_class: boolean;
  message?: string;
}

export interface FeatureImportanceHeatmap {
  run_id: string;
  classes: string[];
  features: string[];
  matrix: number[][];
  message?: string;
}

export interface CorrelationHeatmap {
  run_id: string;
  features: string[];
  matrix: number[][];
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

export interface PartitionMetrics {
  accuracy: number | null;
  macro_f1: number | null;
  weighted_f1: number | null;
  precision: number | null;
  recall: number | null;
  fpr: number | null;
  fnr: number | null;
  tpr: number | null;
  tnr: number | null;
  roc_auc: number | null;
  pr_auc: number | null;
  confusion_matrix: number[][] | null;
  per_class?: Record<string, { recall: number | null; precision: number | null; f1: number | null; n: number }>;
}

export interface InspectionDimension {
  status: "PASS" | "NORMAL" | "CONCERN" | "CRITICAL";
  detail: string;
  [key: string]: any;
}

export interface PerfectAccuracyInvestigation {
  triggered: boolean;
  case: "CASE_A" | "CASE_B" | "CASE_C" | "CASE_D" | "CASE_E";
  case_title: string;
  description: string;
  recommendation: string;
  findings: string[];
  areas_evaluated: Record<string, InspectionDimension>;
}

export interface BaselineMetrics {
  acc: number | null;
  f1: number | null;
  tpr: number | null;
  tnr: number | null;
  fpr?: number | null;
  fnr?: number | null;
  precision?: number | null;
  weighted_f1?: number | null;
  roc_auc?: number | null;
  pr_auc?: number | null;
  confusion_matrix?: number[][] | null;
  n_test: number | null;
  train?: PartitionMetrics;
  val?: PartitionMetrics;
  test?: PartitionMetrics;
  perfect_accuracy_investigation?: PerfectAccuracyInvestigation | null;
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
  is_single_class?: boolean;
  profile?: DatasetProfile;
  capability_matrix?: Record<string, any>;
  audit_logs?: AuditLogEntry[];
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

export interface ModelMetadata {
  model_id: string;
  model_name: string;
  created_at: string;
  algorithm: string;
  model_sha256: string;
  preprocessor_sha256: string;
  provenance: {
    run_id: string;
    original_dataset_id: string;
    view_id: string;
    parent_view_id?: string;
    n_train_rows: number;
    n_features: number;
    target_class?: string;
    rebenchmark_metrics?: any;
    [key: string]: any;
  };
  schema: {
    feature_count: number;
    feature_names: string[];
    feature_dtypes: Record<string, string>;
    label_column: string;
    classes: string[];
  };
  hyperparameters: Record<string, any>;
  metrics: Record<string, any>;
  environment: Record<string, string>;
}

export interface ModelCompatibilityResponse {
  compatible: boolean;
  checks: {
    feature_count_match: boolean;
    missing_features: string[];
    extra_features: string[];
    dtype_mismatches: Record<string, { expected: string; actual: string }>;
    label_column_found: boolean;
  };
  message: string;
}

export interface ModelPredictResponse {
  model_id: string;
  predictions: (string | number)[];
  probabilities?: number[][];
  sample_count: number;
  class_names: string[];
  label_col: string;
}

export interface RepairRecommendation {
  id: string;
  category: "DATA_QUALITY" | "DATASET_DESIGN" | "SHORTCUT_FRAGILITY" | string;
  severity: "HIGH" | "MEDIUM" | "LOW" | string;
  problem_name: string;
  detected: string;
  why_it_matters: string;
  affected_columns: string[];
  affected_records: number;
  evidence: any;
  suggested_correction: string;
  expected_benefit: string;
  potential_risk: string;
  is_reversible: boolean;
  rsm_tier: string;
  action_type: string;
  action_params?: Record<string, any>;
  what_is_the_problem?: string;
  why_should_i_improve_it?: string;
  what_will_change?: string;
  what_could_become_worse?: string;
  is_safe_under_rsm?: boolean;
  is_recommended?: boolean;
  is_high_priority?: boolean;
}

export interface ComparisonData {
  scores?: {
    before: Record<string, any>;
    after: Record<string, any>;
    delta: Record<string, number>;
  };
  data_quality: {
    before: Record<string, any>;
    after: Record<string, any>;
    delta: Record<string, number>;
  };
  ml_benchmark: {
    before: Record<string, any>;
    after: Record<string, any>;
    delta: Record<string, number | null>;
    same_test_ids: boolean;
    split_hash: string;
    train_sizes: Record<string, number>;
  };
  test_integrity: {
    same_test_ids: boolean;
    test_sample_count: number;
    split_hash: string;
    status: string;
  };
  view_lineage: {
    original_view_id: string;
    corrected_view_id: string;
    excluded_features: string[];
  };
  row_diff?: {
    original_rows: number;
    retained_rows: number;
    modified_rows: number;
    removed_rows: number;
    quarantined_rows: number;
    added_rows: number;
    unchanged_rows: number;
  };
  feature_diff?: {
    original_count: number;
    improved_count: number;
    features_retained: number;
    features_excluded: string[];
    features_transformed: string[];
  };
  applied_transformations?: {
    name: string;
    problem: string;
    action: string;
    affected_records: number;
    affected_features: string[];
    reason: string;
    impact_on_metric: string;
    negative_side_effect: string;
  }[];
  confusion_matrix_comparison?: {
    labels: string[];
    before: number[][];
    after: number[][];
    before_pct: number[][];
    after_pct: number[][];
  };
  scientific_verdict?: {
    verdict_type: string;
    summary: string;
    problems_corrected: string[];
    problems_remaining: string[];
    what_this_proves: string;
    what_this_does_not_prove: string;
  };
}
