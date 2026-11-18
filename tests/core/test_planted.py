"""Unit tests for planted shortcut generator."""
import pytest
from smellscope.core.planted import make_planted_dataset


def test_make_planted_dataset_recovery_and_labels():
    """Verify planted dataset generator produces ground-truth synthetic data with expected properties."""
    df, truth = make_planted_dataset(
        base_df=None,
        label_col="label",
        benign_label="BENIGN",
        cls="DoS",
        shortcut_spec={"feature_name": "planted_ttl", "category": "B", "strength": 1.0},
        seed=42,
    )

    assert "planted_ttl" in df.columns
    assert truth["evidence_label"] == "synthetic"
    assert truth["planted_feature"] == "planted_ttl"
    assert truth["category"] == "B"
    assert truth["strength"] == 1.0

    # Under strength=1.0 and low noise, attack flows have values near 53.0 and benign near 80.0
    attack_vals = df[df["label"] == "DoS"]["planted_ttl"]
    benign_vals = df[df["label"] == "BENIGN"]["planted_ttl"]
    assert attack_vals.mean() == pytest.approx(53.0, abs=0.5)
    assert benign_vals.mean() == pytest.approx(80.0, abs=0.5)
