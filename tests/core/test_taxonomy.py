"""Unit tests for feature controllability taxonomy."""
import pytest
from smellscope.core.taxonomy import classify_features


def test_classify_known_cic_and_unsw_columns():
    """Verify known columns map to correct categories A, B, C, D."""
    cic_cols = [
        "Destination Port",
        "Init_Win_bytes_forward",
        "Fwd Packet Length Mean",
        "SYN Flag Count",
        "completely_unknown_feature",
    ]
    mapped_cic = classify_features(cic_cols, schema_id="cic-ids-2017")
    assert mapped_cic["Destination Port"] == "A"
    assert mapped_cic["Init_Win_bytes_forward"] == "B"
    assert mapped_cic["Fwd Packet Length Mean"] == "C"
    assert mapped_cic["SYN Flag Count"] == "D"
    assert mapped_cic["completely_unknown_feature"] == "UNMAPPED"

    unsw_cols = ["dsport", "sttl", "sbytes", "state", "unknown_unsw"]
    mapped_unsw = classify_features(unsw_cols, schema_id="unsw-nb15")
    assert mapped_unsw["dsport"] == "A"
    assert mapped_unsw["sttl"] == "B"
    assert mapped_unsw["sbytes"] == "C"
    assert mapped_unsw["state"] == "D"
    assert mapped_unsw["unknown_unsw"] == "UNMAPPED"
