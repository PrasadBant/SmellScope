"""Feature controllability taxonomy classification conforming to contract Section 2.7."""
from pathlib import Path
import re
from typing import Any, Optional
import yaml


def _load_schema_taxonomy(schema_id: str, cfg: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Load taxonomy configuration for a given schema."""
    if cfg and "taxonomy" in cfg:
        return cfg["taxonomy"]

    config_dir = Path("config")
    file_map = {
        "cic-ids-2017": config_dir / "taxonomy_cic2017.yaml",
        "unsw-nb15": config_dir / "taxonomy_unsw.yaml",
    }

    target_file = file_map.get(schema_id)
    if target_file and target_file.exists():
        try:
            with open(target_file, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        except Exception:
            return {}
    return {}


def classify_features(
    columns: list[str],
    schema_id: str,
    cfg: Optional[dict[str, Any]] = None,
) -> dict[str, str]:
    """Map feature columns into controllability categories A, B, C, D, or UNMAPPED.

    Parameters
    ----------
    columns : list[str]
        List of feature column names to categorize.
    schema_id : str
        Schema identifier ('cic-ids-2017', 'unsw-nb15', etc.).
    cfg : dict, optional
        Configuration containing category regex patterns and explicit column overrides.

    Returns
    -------
    dict[str, str]
        Mapping from column name to category ('A' | 'B' | 'C' | 'D' | 'UNMAPPED').
    """
    tax_data = _load_schema_taxonomy(schema_id, cfg)

    # Category precedence: overrides first, then regex in order A -> B -> C -> D
    cat_defs = [
        ("A", tax_data.get("category_a", {})),
        ("B", tax_data.get("category_b", {})),
        ("C", tax_data.get("category_c", {})),
        ("D", tax_data.get("category_d", {})),
    ]

    # Precompile regex and gather overrides
    compiled_patterns = []
    override_maps: dict[str, str] = {}

    for cat_name, cat_dict in cat_defs:
        overrides = cat_dict.get("overrides", [])
        for ovr in overrides:
            override_maps[str(ovr).strip().lower()] = cat_name

        patterns = cat_dict.get("regex", [])
        for pat in patterns:
            try:
                c_pat = re.compile(pat)
                compiled_patterns.append((cat_name, c_pat))
            except re.error:
                continue

    result: dict[str, str] = {}
    for col in columns:
        col_clean = str(col).strip()
        col_lower = col_clean.lower()

        # 1. Exact / normalized override check
        if col_lower in override_maps:
            result[col] = override_maps[col_lower]
            continue

        # 2. Regex matching
        matched_cat = "UNMAPPED"
        for cat_name, pattern in compiled_patterns:
            if pattern.search(col_clean):
                matched_cat = cat_name
                break

        result[col] = matched_cat

    return result
