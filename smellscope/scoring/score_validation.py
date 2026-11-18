"""Defensive validation and boundary checks for SmellScope scoring."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional
import numpy as np


def clamp_score(val: Any, default: float = 0.0) -> float:
    """Clamp score strictly to [0.0, 100.0], handling NaN, Inf, and None safely."""
    if val is None:
        return default
    try:
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            return default
        return max(0.0, min(100.0, f_val))
    except (ValueError, TypeError):
        return default


def safe_ratio(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Compute division with zero-division and NaN protection."""
    if denominator == 0.0 or math.isnan(denominator) or math.isinf(denominator):
        return default
    if math.isnan(numerator) or math.isinf(numerator):
        return default
    res = float(numerator / denominator)
    return 0.0 if (math.isnan(res) or math.isinf(res)) else res


def sanitize_floats(obj: Any) -> Any:
    """Recursively sanitize dictionary or list data, removing NaNs and Infs."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return round(obj, 4)
    elif isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_floats(i) for i in obj]
    elif isinstance(obj, (np.floating, np.float32, np.float64)):
        val = float(obj)
        return 0.0 if (math.isnan(val) or math.isinf(val)) else round(val, 4)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj
