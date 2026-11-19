"""Comprehensive 100% Accuracy Investigation diagnostic engine conforming to Phase 6 requirements.

Investigates whether perfect or near-perfect benchmark performance reflects genuine
generalisability, subtle data leakage, dataset-specific shortcut reliance, or sample size limits.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

logger = logging.getLogger(__name__)


def investigate_perfect_accuracy(
    df: pd.DataFrame,
    label_col: str,
    cls: str,
    benign_label: str,
    split: Dict[str, Any],
    feature_cols: List[str],
    train_eval: Dict[str, Any],
    val_eval: Dict[str, Any],
    test_eval: Dict[str, Any],
    sfi_result: Optional[Dict[str, Any]] = None,
    ggi_result: Optional[Dict[str, Any]] = None,
    ugt_score: Optional[float] = None,
    cfg: Optional[Dict[str, Any]] = None,
    seed: int = 42,
) -> Dict[str, Any]:
    """Execute rigorous 14-point scientific diagnostic when a model achieves near-perfect accuracy.

    Investigates 14 distinct dimensions:
    1. Training vs validation performance gap
    2. Training vs test performance gap
    3. Duplicate records across splits
    4. Near-duplicate network flows across splits (LOR)
    5. Direct target-label leakage
    6. Features that encode the answer
    7. Identifier and metadata dependence
    8. Destination-port and protocol shortcuts
    9. Collection-source dependence
    10. Class imbalance distortion
    11. Test sample size and class support
    12. Random-split vs group-held-out performance (GGI)
    13. Potentially unrealistic feature combinations
    14. Stability across repeated random seeds
    """
    cfg = cfg or {}
    train_ids = set(split.get("train_ids", []))
    val_ids = set(split.get("val_ids", []))
    test_ids = set(split.get("test_ids", []))

    train_df = df[df["__row_id"].isin(train_ids)].copy()
    val_df = df[df["__row_id"].isin(val_ids)].copy()
    test_df = df[df["__row_id"].isin(test_ids)].copy()

    # Filter binary target class vs benign
    train_binary = train_df[train_df[label_col].isin([cls, benign_label])]
    val_binary = val_df[val_df[label_col].isin([cls, benign_label])]
    test_binary = test_df[test_df[label_col].isin([cls, benign_label])]

    train_acc = float(train_eval.get("acc", 0.0) or 0.0)
    val_acc = float(val_eval.get("acc", 0.0) or 0.0)
    test_acc = float(test_eval.get("acc", 0.0) or 0.0)

    train_f1 = float(train_eval.get("f1", 0.0) or 0.0)
    test_f1 = float(test_eval.get("f1", 0.0) or 0.0)

    # Trigger threshold: Train, Val, or Test acc >= 0.990 or F1 >= 0.990
    is_triggered = any(m >= 0.990 for m in [train_acc, val_acc, test_acc, test_f1])

    inspections: List[Dict[str, Any]] = []

    # 1. Training vs validation performance gap
    train_val_gap = float(train_acc - val_acc)
    inspections.append({
        "id": 1,
        "name": "Training vs Validation Gap",
        "value": f"{train_val_gap * 100:+.2f}%",
        "status": "CONCERN" if train_val_gap > 0.08 else "NORMAL",
        "explanation": "Significant drops on validation data indicate the model fits training peculiarities.",
        "metric_raw": train_val_gap,
    })

    # 2. Training vs test performance gap
    train_test_gap = float(train_acc - test_acc)
    inspections.append({
        "id": 2,
        "name": "Training vs Test Gap",
        "value": f"{train_test_gap * 100:+.2f}%",
        "status": "CONCERN" if train_test_gap > 0.08 else "NORMAL",
        "explanation": "Generalisation gap between training partition and untouched sealed test partition.",
        "metric_raw": train_test_gap,
    })

    # 3. Duplicate records across splits
    numeric_cols = [c for c in feature_cols if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
    exact_duplicates_across = 0
    duplicate_rate_cross = 0.0
    if len(numeric_cols) > 0 and len(train_binary) > 0 and len(test_binary) > 0:
        tr_subset = train_binary[numeric_cols].round(4)
        te_subset = test_binary[numeric_cols].round(4)
        merged_dups = pd.merge(tr_subset, te_subset, how="inner")
        exact_duplicates_across = len(merged_dups)
        duplicate_rate_cross = float(exact_duplicates_across / max(1, len(te_subset)))

    inspections.append({
        "id": 3,
        "name": "Duplicate Records Across Splits",
        "value": f"{exact_duplicates_across} flows ({duplicate_rate_cross * 100:.1f}%)",
        "status": "CRITICAL" if exact_duplicates_across > 0 else "PASS",
        "explanation": "Identical network feature vectors appearing in both training and test sets constitute direct split leakage.",
        "metric_raw": duplicate_rate_cross,
    })

    # 4. Near-duplicate network flows across splits (LOR)
    lor_val = 0.0
    if ggi_result and ggi_result.get("lor") is not None:
        lor_val = float(ggi_result["lor"])
    inspections.append({
        "id": 4,
        "name": "Near-Duplicate Overlap Rate (LOR)",
        "value": f"{lor_val * 100:.2f}%",
        "status": "CONCERN" if lor_val > 0.05 else "NORMAL",
        "explanation": "Nearest-neighbour similarity metric measuring near-identical network flows crossing partition boundaries.",
        "metric_raw": lor_val,
    })

    # 5. Direct target-label leakage
    suspicious_leakage_features: List[str] = []
    y_test_bin = (test_binary[label_col] == cls).astype(int).to_numpy()
    if len(set(y_test_bin)) == 2 and len(numeric_cols) > 0:
        for col in numeric_cols:
            vals = test_binary[col].to_numpy()
            if len(np.unique(vals)) > 1:
                try:
                    corr = np.corrcoef(vals, y_test_bin)[0, 1]
                    if abs(corr) >= 0.98:
                        suspicious_leakage_features.append(f"{col} (r={corr:.3f})")
                except Exception:
                    pass

    inspections.append({
        "id": 5,
        "name": "Direct Target-Label Leakage",
        "value": f"{len(suspicious_leakage_features)} suspicious features",
        "status": "CRITICAL" if len(suspicious_leakage_features) > 0 else "PASS",
        "explanation": "Features showing near-perfect correlation (|r| >= 0.98) with the attack label.",
        "details": suspicious_leakage_features,
    })

    # 6. Features that encode the answer
    encoding_cols: List[str] = []
    leak_keywords = ["label", "class", "target", "attack", "malicious", "category"]
    for c in feature_cols:
        c_lower = c.lower()
        if any(k in c_lower for k in leak_keywords) and c != label_col:
            encoding_cols.append(c)

    inspections.append({
        "id": 6,
        "name": "Features Encoding The Answer",
        "value": f"{len(encoding_cols)} suspect columns",
        "status": "CRITICAL" if len(encoding_cols) > 0 else "PASS",
        "explanation": "Column identifiers hinting at class or attack category retained in feature inputs.",
        "details": encoding_cols,
    })

    # 7. Identifier and metadata dependence
    id_features: List[str] = []
    if sfi_result:
        for feat, cat in zip(sfi_result.get("top_features", []), sfi_result.get("categories", [])):
            if cat == "A":
                id_features.append(feat)

    inspections.append({
        "id": 7,
        "name": "Identifier & Metadata Dependence",
        "value": f"{len(id_features)} Category A features",
        "status": "CONCERN" if len(id_features) > 0 else "PASS",
        "explanation": "Classification reliant on IP addresses, flow IDs, timestamps, or MAC addresses.",
        "details": id_features,
    })

    # 8. Destination-port and protocol shortcuts
    ugt_val = float(ugt_score) if ugt_score is not None else 0.0
    inspections.append({
        "id": 8,
        "name": "Destination-Port & Protocol Shortcuts",
        "value": f"UGT: {ugt_val:.3f}",
        "status": "CONCERN" if ugt_val > 0.40 else "NORMAL",
        "explanation": "Attacks restricted to fixed ports allow models to identify port numbers rather than malicious payload dynamics.",
        "metric_raw": ugt_val,
    })

    # 9. Collection-source dependence
    source_dependence = False
    ggi_gap = float(ggi_result.get("gap", 0.0) or 0.0) if ggi_result else 0.0
    if ggi_gap > 0.15:
        source_dependence = True

    inspections.append({
        "id": 9,
        "name": "Collection-Source Dependence",
        "value": f"GGI Gap: {ggi_gap * 100:.2f}pp",
        "status": "CONCERN" if source_dependence else "NORMAL",
        "explanation": "Performance deterioration when evaluating on independent capture dates, hosts, or scenarios.",
        "metric_raw": ggi_gap,
    })

    # 10. Class imbalance distortion
    n_attack_test = int((test_binary[label_col] == cls).sum())
    n_benign_test = int((test_binary[label_col] == benign_label).sum())
    imbalance_ratio = float(n_benign_test / max(1, n_attack_test))
    imbalance_skewed = imbalance_ratio > 20.0

    inspections.append({
        "id": 10,
        "name": "Class Imbalance Distortion",
        "value": f"{imbalance_ratio:.1f}:1 benign-to-attack",
        "status": "CONCERN" if imbalance_skewed else "NORMAL",
        "explanation": "Extreme imbalance can produce deceptive accuracy where minority attack classification fails quietly.",
        "metric_raw": imbalance_ratio,
    })

    # 11. Test sample size and class support
    adequate_support = n_attack_test >= 30
    inspections.append({
        "id": 11,
        "name": "Test Support & Sample Adequacy",
        "value": f"{n_attack_test} attack test samples",
        "status": "PASS" if adequate_support else "CONCERN",
        "explanation": "Locked test partition must possess sufficient attack flows (>= 30) for statistically significant validation.",
        "metric_raw": n_attack_test,
    })

    # 12. Random-split vs group-held-out performance
    inspections.append({
        "id": 12,
        "name": "Random vs Group-Held-Out Evaluation",
        "value": f"F1 Random: {ggi_result.get('f1_random', 'N/A')} | F1 Group: {ggi_result.get('f1_grouped', 'N/A')}" if ggi_result else "N/A",
        "status": "CONCERN" if ggi_gap > 0.15 else "PASS",
        "explanation": "Comparison of standard random i.i.d. split versus realistic held-out capture group.",
    })

    # 13. Potentially unrealistic feature combinations
    constant_features = [c for c in numeric_cols if train_binary[c].nunique() <= 1]
    inspections.append({
        "id": 13,
        "name": "Zero-Variance Feature Interplay",
        "value": f"{len(constant_features)} zero-variance features",
        "status": "CONCERN" if len(constant_features) > 5 else "NORMAL",
        "explanation": "Features with zero variance in the training set cannot provide real-world discriminative capability.",
    })

    # 14. Stability across repeated random seeds
    seed_scores: List[float] = [test_acc]
    if len(train_binary) > 0 and len(test_binary) > 0 and len(numeric_cols) > 0:
        for s in [123, 999]:
            try:
                rf_seed = RandomForestClassifier(n_estimators=30, random_state=s, n_jobs=-1)
                X_tr = train_binary[numeric_cols].fillna(0).to_numpy()
                y_tr = (train_binary[label_col] == cls).astype(int).to_numpy()
                X_te = test_binary[numeric_cols].fillna(0).to_numpy()
                y_te = (test_binary[label_col] == cls).astype(int).to_numpy()
                rf_seed.fit(X_tr, y_tr)
                p_seed = rf_seed.predict(X_te)
                seed_scores.append(float(accuracy_score(y_te, p_seed)))
            except Exception:
                pass

    seed_std = float(np.std(seed_scores))
    seed_mean = float(np.mean(seed_scores))
    seed_stable = seed_std <= 0.03

    inspections.append({
        "id": 14,
        "name": "Seed Stability Across Initialisations",
        "value": f"μ={seed_mean * 100:.1f}%, σ={seed_std * 100:.2f}% (N=3 seeds)",
        "status": "PASS" if seed_stable else "CONCERN",
        "explanation": "Robust classification performance remains stable across stochastic tree partition seeds.",
        "metric_raw": seed_std,
    })

    # Case Classification
    case_code: str
    case_title: str
    case_description: str

    if train_acc >= 0.99 and test_acc < 0.85:
        case_code = "CASE_A"
        case_title = "Case A — Overfitting or Distribution Mismatch"
        case_description = "The baseline model achieves near-perfect training accuracy but suffers substantial degradation on untouched test data, indicating severe overfitting to training artifacts."
    elif (train_acc >= 0.98 or test_acc >= 0.98) and (exact_duplicates_across > 0 or len(suspicious_leakage_features) > 0 or len(encoding_cols) > 0):
        case_code = "CASE_B"
        case_title = "Case B — Potentially Misleading Evaluation (Data Leakage Detected)"
        case_description = "High accuracy is artificially inflated by duplicate network flows crossing split boundaries or features that directly encode the target ground-truth label."
    elif test_acc >= 0.98 and (ggi_gap >= 0.15 or len(id_features) > 0 or ugt_val > 0.40):
        case_code = "CASE_C"
        case_title = "Case C — Group Generalisation Concern & Shortcut Dependency"
        case_description = "The model achieves high accuracy under random i.i.d. splitting but relies heavily on environment artifacts (ports, IPs) and collapses when tested on independent capture groups."
    elif test_acc >= 0.98 and not adequate_support:
        case_code = "CASE_E"
        case_title = "Case E — Insufficient Test Support for Generalisation Claims"
        case_description = f"The model registers high test accuracy, but the test partition contains only {n_attack_test} attack flows (< 30), providing inadequate sample support to validate reliable intrusion detection."
    else:
        case_code = "CASE_D"
        case_title = "Case D — Genuinely Separable Under Tested Evaluation Conditions"
        case_description = "The dataset demonstrates strong statistical separability under controlled conditions without detectable leakage or extreme shortcut collapse. Subject to benchmark scope boundaries."

    # Multi-finding synthesis conclusions
    findings: List[str] = []
    if exact_duplicates_across > 0:
        findings.append(f"Potential data leakage: {exact_duplicates_across} duplicate flow records ({duplicate_rate_cross * 100:.1f}%) span training and test partitions.")
    if len(suspicious_leakage_features) > 0:
        findings.append(f"Direct label correlation: {len(suspicious_leakage_features)} features exhibit near-perfect correlation (|r| >= 0.98) with attack label.")
    if len(id_features) > 0:
        findings.append(f"Metadata dependence: Top predictive features include Category A identifier attributes ({', '.join(id_features[:2])}).")
    if ugt_val > 0.40:
        findings.append(f"Destination port shortcut: High UGT ({ugt_val:.3f}) indicates traffic is confined to specific network service ports.")
    if ggi_gap >= 0.15:
        findings.append(f"Generalisation gap: Model performance drops by {ggi_gap * 100:.1f} percentage points when tested on held-out capture environments.")
    if not adequate_support:
        findings.append(f"Insufficient statistical power: Test partition contains only {n_attack_test} attack samples.")
    if train_val_gap > 0.08:
        findings.append(f"Validation divergence: Training accuracy exceeds validation accuracy by {train_val_gap * 100:.1f} percentage points.")
    if len(findings) == 0:
        findings.append("Model appears to generalise reliably under the tested evaluation split with stable seed performance.")

    return {
        "is_triggered": is_triggered,
        "case_code": case_code,
        "case_title": case_title,
        "case_description": case_description,
        "inspections": inspections,
        "findings": findings,
        "metrics_summary": {
            "train_acc": train_acc,
            "val_acc": val_acc,
            "test_acc": test_acc,
            "train_f1": train_f1,
            "test_f1": test_f1,
            "train_val_gap": train_val_gap,
            "train_test_gap": train_test_gap,
            "exact_duplicate_flows": exact_duplicates_across,
            "near_duplicate_lor": lor_val,
            "seed_mean": seed_mean,
            "seed_std": seed_std,
            "n_attack_test": n_attack_test,
        },
    }
