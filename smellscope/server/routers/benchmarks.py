"""Benchmark reference values router exposing published literature results."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
import yaml

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])


@router.get("/published-values")
def get_published_values() -> Dict[str, Any]:
    """Return published reference heuristic values from Flood et al. EuroS&P 2024."""
    config_dir = Path(os.environ.get("SMELLSCOPE_CONFIG_DIR", "./config"))
    val_file = config_dir / "published_values.yaml"

    if not val_file.exists():
        # Fallback to relative to repo root
        val_file = Path(__file__).resolve().parent.parent.parent.parent / "config" / "published_values.yaml"

    if not val_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Published reference heuristic values file 'published_values.yaml' not found.",
        )

    try:
        with open(val_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data or {}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load published reference values: {exc}",
        )
