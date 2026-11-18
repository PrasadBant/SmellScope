"""Configuration loader for SmellScope.

Loads and merges configuration YAML files from the config directory
and computes a stable config_hash.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict

import yaml


def _deep_merge(base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively merge update dict into base dict."""
    result = dict(base)
    for k, v in update.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def load_config(config_dir: str | Path | None = None) -> Dict[str, Any]:
    """Load and merge configuration files from the config directory.

    Merges default.yaml, heuristics.yaml, published_values.yaml,
    remediation_rules.yaml, and taxonomy configs. Computes a deterministic
    SHA-256 config_hash.
    """
    if config_dir is None:
        config_dir = os.environ.get("SMELLSCOPE_CONFIG_DIR", "./config")
    cfg_path = Path(config_dir)

    merged: Dict[str, Any] = {}

    # Standard configuration files in load order
    config_files = [
        "default.yaml",
        "heuristics.yaml",
        "published_values.yaml",
        "remediation_rules.yaml",
        "taxonomy_cic2017.yaml",
        "taxonomy_unsw.yaml",
        "ui.yaml",
    ]

    for fname in config_files:
        fpath = cfg_path / fname
        if fpath.exists():
            with open(fpath, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if isinstance(data, dict):
                    # For taxonomy files, nest under taxonomies dict if not already
                    if fname.startswith("taxonomy_"):
                        schema_key = fname.replace("taxonomy_", "").replace(".yaml", "")
                        tax_dict = merged.setdefault("taxonomies", {})
                        tax_dict[schema_key] = data
                    else:
                        merged = _deep_merge(merged, data)

    # Compute deterministic config_hash
    # Filter to JSON-serializable primitives for hashing
    canonical_repr = json.dumps(merged, sort_keys=True, default=str)
    config_hash = hashlib.sha256(canonical_repr.encode("utf-8")).hexdigest()
    merged["config_hash"] = config_hash

    return merged
