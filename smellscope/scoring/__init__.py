"""SmellScope 2.0 Dataset Scoring Subsystem."""

from smellscope.scoring.evaluation_reliability_score import compute_evaluation_reliability_score
from smellscope.scoring.nids_suitability_score import compute_nids_suitability_score
from smellscope.scoring.overall_assessment import compute_overall_dataset_assessment
from smellscope.scoring.quality_score import compute_data_quality_score
from smellscope.scoring.score_config import (
    DEFAULT_QUALITY_BANDS,
    DEFAULT_RISK_BANDS,
    SCORING_VERSION,
    get_default_scoring_config,
    get_interpretation_category,
    validate_scoring_config,
)
from smellscope.scoring.score_explanations import (
    format_breakdown_table_html,
    format_breakdown_table_markdown,
)
from smellscope.scoring.score_validation import clamp_score, safe_ratio, sanitize_floats
from smellscope.scoring.shortcut_risk_score import compute_shortcut_risk_score

__all__ = [
    "SCORING_VERSION",
    "compute_overall_dataset_assessment",
    "compute_data_quality_score",
    "compute_nids_suitability_score",
    "compute_shortcut_risk_score",
    "compute_evaluation_reliability_score",
    "get_default_scoring_config",
    "validate_scoring_config",
    "get_interpretation_category",
    "format_breakdown_table_markdown",
    "format_breakdown_table_html",
    "clamp_score",
    "safe_ratio",
    "sanitize_floats",
    "DEFAULT_QUALITY_BANDS",
    "DEFAULT_RISK_BANDS",
]
