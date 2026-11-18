"""SmellScope Core Research Engine: Heuristics, SFI, GGI, and Evaluation."""

from smellscope.core.errors import SmellScopeError
from smellscope.core.preprocess import fit_preprocessor
from smellscope.core.heuristics import (
    compute_ugt,
    compute_wl,
    compute_hdf,
    compute_pdd_and_tc,
)
from smellscope.core.eval import fit_and_evaluate
from smellscope.core.taxonomy import classify_features
from smellscope.core.sfi import compute_sfi, fragility_grid
from smellscope.core.ggi import compute_ggi
from smellscope.core.audit import audit_class, get_cluster_assignments
from smellscope.core.planted import make_planted_dataset

__all__ = [
    "SmellScopeError",
    "fit_preprocessor",
    "compute_ugt",
    "compute_wl",
    "compute_hdf",
    "compute_pdd_and_tc",
    "fit_and_evaluate",
    "classify_features",
    "compute_sfi",
    "fragility_grid",
    "compute_ggi",
    "audit_class",
    "get_cluster_assignments",
    "make_planted_dataset",
]
