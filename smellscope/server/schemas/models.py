"""Pydantic models conforming to Shared Contract v1.0."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    api_version: str = "1.0.0"
    backend_available: bool = True
    research_engine_available: bool = True
    execution_mode: str = "local-first"
    scientific_disclaimer: str = (
        "SmellScope is a scientific benchmark dataset auditor, NOT an active network intrusion detection system."
    )


class DatasetUploadResponse(BaseModel):
    dataset_id: str
    source_basename: str
    sha256: str
    size_bytes: int
    message: str


class DatasetMetadataResponse(BaseModel):
    dataset_id: str
    source_basename: str
    sha256: str
    n_rows_raw: int
    n_rows_loaded: int
    dropped_inf_nan: int = 0
    label_col: str = ""
    benign_label: str = ""
    schema_id: str = "unknown"
    column_roles: Dict[str, Optional[str]] = Field(default_factory=dict)
    class_counts: Dict[str, int] = Field(default_factory=dict)
    columns: List[str]
    status: str = "validated"


class DatasetPreviewResponse(BaseModel):
    dataset_id: str
    total_rows: int
    total_columns: int
    columns: List[str]
    preview_rows: List[Dict[str, Any]]
    class_counts: Dict[str, int]
    missing_value_counts: Dict[str, int]
    infinite_value_counts: Dict[str, int]


class DatasetValidateRequest(BaseModel):
    label_col: str
    benign_label: str
    max_rows_per_class: Optional[int] = 20000
    seed: Optional[int] = 42


class DatasetValidateResponse(BaseModel):
    valid: bool
    schema_id: str
    unique_classes: List[str]
    class_counts: Dict[str, int]
    column_roles: Dict[str, Optional[str]]
    warnings: List[str] = Field(default_factory=list)


class AuditStartRequest(BaseModel):
    dataset_id: str
    classes: Optional[List[str]] = None
    seed: Optional[int] = 42
    max_rows_per_class: Optional[int] = 20000


class AuditStartResponse(BaseModel):
    run_id: str
    status: str = "QUEUED"
    message: str = "Audit job accepted for asynchronous execution."


class AuditStatusResponse(BaseModel):
    run_id: str
    dataset_id: str
    status: str  # QUEUED, RUNNING, COMPLETED, FAILED
    current_step: int
    total_steps: int
    current_class: Optional[str] = None
    progress_percent: float
    elapsed_seconds: float
    warnings: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None


class PaperHeuristics(BaseModel):
    UGT: Optional[float] = None
    WL: Optional[float] = None
    HDF: Optional[float] = None
    PDD: Optional[float] = None
    TC: Optional[float] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class BaselineMetrics(BaseModel):
    acc: Optional[float] = None
    f1: Optional[float] = None
    tpr: Optional[float] = None
    tnr: Optional[float] = None
    n_test: Optional[int] = None


class SfiFragilityCurve(BaseModel):
    delta: List[float] = Field(default_factory=list)
    recall_top: List[Optional[float]] = Field(default_factory=list)
    recall_null_mean: List[Optional[float]] = Field(default_factory=list)


class SfiResult(BaseModel):
    top_features: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    k: int = 4
    recall_baseline: Optional[float] = None
    sfi_top: Optional[float] = None
    sfi_null_mean: Optional[float] = None
    sfi_null_std: Optional[float] = None
    n_null_draws: int = 100
    delta: Optional[float] = None
    z: Optional[float] = None
    ci95: Optional[List[Optional[float]]] = None
    flag: bool = False
    flag_conditions: Dict[str, Any] = Field(default_factory=dict)
    fragility_curve: SfiFragilityCurve = Field(default_factory=SfiFragilityCurve)


class GgiResult(BaseModel):
    f1_random: Optional[float] = None
    f1_grouped: Optional[float] = None
    gap: Optional[float] = None
    lor: Optional[float] = None
    grouping: Optional[str] = None
    n_groups: Optional[int] = None
    group_sizes: List[int] = Field(default_factory=list)
    lor_threshold: Optional[float] = 0.05


class ClassAuditResultSchema(BaseModel):
    cls_name: str = Field(alias="class")
    n: int
    n_benign: int
    paper: PaperHeuristics
    baseline: BaselineMetrics
    sfi: SfiResult
    ggi: GgiResult
    na_reasons: Dict[str, str] = Field(default_factory=dict)
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class RunResultResponse(BaseModel):
    schema_version: str = "1.0"
    run_id: str
    created_at: str
    evidence_label: str
    dataset: Dict[str, Any]
    split: Dict[str, Any]
    classes: List[Dict[str, Any]]
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    degradations: List[str] = Field(default_factory=list)
    runtime: Dict[str, Any]
    env: Dict[str, Any]
    config_hash: str


class FragilityGridRequest(BaseModel):
    cls_name: str = Field(alias="class")
    features: List[str]

    model_config = ConfigDict(populate_by_name=True)


class FragilityGridResponse(BaseModel):
    features: List[str]
    grid_delta: List[Any]
    recall: List[List[Optional[float]]]
    recall_baseline: Optional[float]


class RemediationPreviewRequest(BaseModel):
    action: str  # R1 or R2
    params: Dict[str, Any]


class RemediationPreviewResponse(BaseModel):
    preview_id: str
    action: str
    params: Dict[str, Any]
    reason: str
    affected: Dict[str, Any]
    feature_changes: List[str]
    expected_train_size: Dict[str, int]
    rsm_report: Dict[str, Any]


class RemediationApproval(BaseModel):
    approved: bool
    warning_ack: bool = False
    approved_at: Optional[str] = None


class RemediationApplyRequest(BaseModel):
    preview_id: str
    approval: RemediationApproval


class TrainingViewSchema(BaseModel):
    view_id: str
    parent_view_id: Optional[str]
    split_hash: str
    n_included: int
    included_hash: str
    excluded_features: List[str]
    quarantined_count: int
    view_hash: str


class ChangeLogEntrySchema(BaseModel):
    entry_id: str
    timestamp: str
    action: str
    rule_name: str
    params: Dict[str, Any]
    seed: int
    affected_row_ids_ref: str
    before_counts: Dict[str, Any]
    after_counts: Dict[str, Any]
    rsm_status: str
    warnings: List[Dict[str, Any]]
    approval: Dict[str, Any]
    parent_view_id: str
    new_view_id: str


class RemediationApplyResponse(BaseModel):
    view: TrainingViewSchema
    change_log_entry: ChangeLogEntrySchema


class RollbackRequest(BaseModel):
    target_entry_id: str


class RollbackResponse(BaseModel):
    restored_view: TrainingViewSchema
    message: str
    integrity_verified: bool


class RebenchmarkRequest(BaseModel):
    target_class: Optional[str] = None


class RebenchmarkResponse(BaseModel):
    before: Dict[str, Any]
    after: Dict[str, Any]
    delta: Dict[str, Optional[float]]
    same_test_ids: bool
    split_hash: str
    train_sizes: Dict[str, int]
    ci95: Dict[str, Any]
    n_repeats: int
    seed: int


class ReportGenerateRequest(BaseModel):
    include_rebenchmark: bool = True


class ReportGenerateResponse(BaseModel):
    report_id: str
    run_id: str
    created_at: str
    download_url: str
    file_path: str


# ─── Improvement Centre Schemas ──────────────────────────────────────────────

class RepairRecommendationItem(BaseModel):
    id: str
    category: str  # DATA_QUALITY | DATASET_DESIGN | SHORTCUT_FRAGILITY
    severity: str  # HIGH | MEDIUM | LOW
    problem_name: str
    detected: str
    why_it_matters: str
    affected_columns: List[str]
    affected_records: int
    evidence: Any  # str or Dict depending on recommendation type
    suggested_correction: str
    expected_benefit: str
    potential_risk: str
    is_reversible: bool
    rsm_tier: str  # SAFE | WARN | REVIEW
    action_type: str


class RecommendationsResponse(BaseModel):
    run_id: str
    recommendations: List[RepairRecommendationItem]
    generated_at: str


class RepairPlanPreviewRequest(BaseModel):
    selected_recs: List[Dict[str, Any]]


class RepairPlanPreviewResponse(BaseModel):
    preview_id: str
    action: Optional[str] = "COMPOSITE_REPAIR_PLAN"
    params: Optional[Dict[str, Any]] = None
    reason: str
    affected: Optional[Dict[str, Any]] = None
    affected_row_ids: Optional[List[int]] = None
    affected_rows_by_class: Optional[Dict[str, Any]] = None
    feature_changes: Any = None
    expected_train_size: Any = None
    data_quality_delta: Optional[Dict[str, Any]] = None
    rsm_report: Optional[Dict[str, Any]] = None


class RepairPlanApplyRequest(BaseModel):
    preview_id: str
    approval: Dict[str, Any]


class RepairPlanApplyResponse(BaseModel):
    view: Dict[str, Any]
    change_log_entry: Dict[str, Any]
    export_metadata: Dict[str, Any]


class DatasetComparisonResponse(BaseModel):
    scores: Optional[Dict[str, Any]] = None
    data_quality: Dict[str, Any]
    ml_benchmark: Dict[str, Any]
    test_integrity: Dict[str, Any]
    view_lineage: Dict[str, Any]


# =============================================================================
# Model Registry & Persistence Schemas (Phase 13)
# =============================================================================

class ModelSaveRequest(BaseModel):
    run_id: str
    model_name: Optional[str] = None
    notes: Optional[str] = None


class ModelMetadataResponse(BaseModel):
    model_id: str
    model_name: str
    created_at: str
    algorithm: str
    model_sha256: str
    preprocessor_sha256: str
    provenance: Dict[str, Any]
    model_schema: Dict[str, Any] = Field(alias="schema", default_factory=dict)
    hyperparameters: Dict[str, Any]
    metrics: Dict[str, Any]
    environment: Dict[str, Any]

    model_config = ConfigDict(populate_by_name=True)


class ModelCompatibilityRequest(BaseModel):
    dataset_id: Optional[str] = None
    label_col: Optional[str] = None


class ModelCompatibilityResponse(BaseModel):
    model_id: str
    compatible: bool
    required_feature_count: int
    present_feature_count: int
    missing_features: List[str]
    extra_features_count: int
    type_mismatches: List[Dict[str, str]]
    label_col_match: bool
    model_algorithm: Optional[str] = None
    model_classes: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    trained_dataset: Optional[str] = None


class ModelPredictRequest(BaseModel):
    dataset_id: Optional[str] = None
    limit: Optional[int] = 50


class ModelPredictResponse(BaseModel):
    model_id: str
    n_evaluated: int
    predictions: List[str]
    probabilities: Optional[List[List[float]]] = None
    classes: List[str]
    row_ids: List[Any]
