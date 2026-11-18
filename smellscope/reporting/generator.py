"""Offline HTML Report Generator for SmellScope 2.0.

Produces self-contained, offline HTML audit reports with embedded CSS styling,
cryptographic verification fingerprints, and explicit scientific limitations.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional


def generate_offline_html_report(
    run_result: Dict[str, Any],
    rebenchmark_result: Optional[Dict[str, Any]] = None,
    change_log: Optional[List[Dict[str, Any]]] = None,
    output_path: Optional[str] = None,
    dataset_scores: Optional[Dict[str, Any]] = None,
    recommendations: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Generate a self-contained, offline HTML report from real audit results.

    Args:
        run_result: Full RunResult dictionary conforming to Shared Contract v1.0.
        rebenchmark_result: Optional RebenchmarkResult dictionary.
        change_log: Optional list of ChangeLogEntry dictionaries.
        output_path: Optional output file path. Defaults to reports/<run_id>.html.
        dataset_scores: Optional 4-dimension assessment dictionary.
        recommendations: Optional list of repair recommendations.

    Returns:
        Absolute path to the generated HTML report file.
    """
    run_id = run_result.get("run_id", "audit_run")
    created_at = run_result.get("created_at", datetime.now(timezone.utc).isoformat())
    dataset_meta = run_result.get("dataset", {})
    split_meta = run_result.get("split", {})
    classes_data = run_result.get("classes", [])
    runtime_meta = run_result.get("runtime", {})
    env_meta = run_result.get("env", {})

    reports_dir = Path(os.environ.get("SMELLSCOPE_HOME", "./reports"))
    if not output_path:
        reports_dir.mkdir(parents=True, exist_ok=True)
        out_file = reports_dir / f"{run_id}.html"
    else:
        out_file = Path(output_path)
        out_file.parent.mkdir(parents=True, exist_ok=True)

    # Build Class rows for table
    table_rows = []
    for cls_res in classes_data:
        c_name = cls_res.get("class", "unknown")
        paper = cls_res.get("paper", {})
        baseline = cls_res.get("baseline", {})
        sfi = cls_res.get("sfi", {})
        ggi = cls_res.get("ggi", {})

        ugt_val = f"{paper.get('UGT'):.3f}" if paper.get("UGT") is not None else "N/A"
        wl_val = f"{paper.get('WL'):.3f}" if paper.get("WL") is not None else "N/A"
        hdf_val = f"{paper.get('HDF'):.3f}" if paper.get("HDF") is not None else "N/A"
        pdd_val = f"{paper.get('PDD'):.3f}" if paper.get("PDD") is not None else "N/A"
        tc_val = f"{paper.get('TC'):.3f}" if paper.get("TC") is not None else "N/A"
        f1_val = f"{baseline.get('f1'):.3f}" if baseline.get("f1") is not None else "N/A"
        sfi_val = f"{sfi.get('sfi_top'):.3f}" if sfi.get("sfi_top") is not None else "N/A"
        sfi_flag = "FLAGGED" if sfi.get("flag") else "CLEAN"
        flag_color = "#DC2626" if sfi.get("flag") else "#16A34A"
        gap_val = f"{ggi.get('gap'):.3f}" if ggi.get("gap") is not None else "N/A"

        table_rows.append(f"""
        <tr>
          <td class="font-bold">{c_name}</td>
          <td>{cls_res.get('n', 0):,}</td>
          <td>{f1_val}</td>
          <td>{ugt_val}</td>
          <td>{wl_val}</td>
          <td>{hdf_val}</td>
          <td>{pdd_val}</td>
          <td>{tc_val}</td>
          <td>{sfi_val}</td>
          <td><span class="badge" style="background-color: {flag_color}22; color: {flag_color}; border: 1px solid {flag_color}66;">{sfi_flag}</span></td>
          <td>{gap_val}</td>
        </tr>
        """)

    table_body = "\n".join(table_rows) if table_rows else "<tr><td colspan='11'>No class audit results available.</td></tr>"

    # Remediation / rebenchmark section
    rebenchmark_html = ""
    if rebenchmark_result:
        b_eval = rebenchmark_result.get("before", {})
        a_eval = rebenchmark_result.get("after", {})
        delta = rebenchmark_result.get("delta", {})

        def fmt_pct(val):
            return f"{val:.1%}" if val is not None else "N/A"

        def fmt_diff(val):
            if val is None:
                return "N/A"
            sign = "+" if val > 0 else ""
            return f"{sign}{val:.4f}"

        rebenchmark_html = f"""
        <div class="card mb-4">
          <h2 class="card-title">Remediation Verification & Locked Rebenchmark</h2>
          <p class="text-muted mb-2">Evaluated on identical locked test set (Split Hash: <code>{rebenchmark_result.get('split_hash', '')[:16]}...</code>).</p>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Original Baseline</th>
                <th>Remediated State</th>
                <th>Delta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Accuracy</td>
                <td>{fmt_pct(b_eval.get('acc'))}</td>
                <td>{fmt_pct(a_eval.get('acc'))}</td>
                <td class="font-mono">{fmt_diff(delta.get('acc'))}</td>
              </tr>
              <tr>
                <td>Macro F1</td>
                <td>{fmt_pct(b_eval.get('f1'))}</td>
                <td>{fmt_pct(a_eval.get('f1'))}</td>
                <td class="font-mono">{fmt_diff(delta.get('f1'))}</td>
              </tr>
              <tr>
                <td>TPR (Recall)</td>
                <td>{fmt_pct(b_eval.get('tpr'))}</td>
                <td>{fmt_pct(a_eval.get('tpr'))}</td>
                <td class="font-mono">{fmt_diff(delta.get('tpr'))}</td>
              </tr>
              <tr>
                <td>TNR (Specificity)</td>
                <td>{fmt_pct(b_eval.get('tnr'))}</td>
                <td>{fmt_pct(a_eval.get('tnr'))}</td>
                <td class="font-mono">{fmt_diff(delta.get('tnr'))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        """

    # Change log table
    changelog_html = ""
    if change_log:
        log_rows = []
        for entry in change_log:
            log_rows.append(f"""
            <tr>
              <td><code>{entry.get('entry_id')}</code></td>
              <td>{entry.get('timestamp')}</td>
              <td><span class="badge badge-accent">{entry.get('action')}</span></td>
              <td>{entry.get('rule_name')}</td>
              <td><span class="badge" style="background-color: #16A34A22; color: #16A34A;">{entry.get('rsm_status')}</span></td>
              <td><code>{entry.get('parent_view_id')}</code> &rarr; <code>{entry.get('new_view_id')}</code></td>
            </tr>
            """)
        changelog_html = f"""
        <div class="card mb-4">
          <h2 class="card-title">Remediation Governance & Change Lineage</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Rule Name</th>
                <th>RSM Authorization</th>
                <th>View Transition</th>
              </tr>
            </thead>
            <tbody>
              {''.join(log_rows)}
            </tbody>
          </table>
        </div>
        """

    # Scoring assessment HTML block
    scores_html = ""
    if dataset_scores:
        overall = dataset_scores.get("overall_score", 0.0)
        overall_cat = dataset_scores.get("overall_category", {})
        dims = dataset_scores.get("dimensions", {})
        dq = dims.get("data_quality", {})
        nids = dims.get("nids_suitability", {})
        sc = dims.get("shortcut_risk", {})
        rel = dims.get("evaluation_reliability", {})

        scores_html = f"""
        <div class="card mb-4" style="border: 1px solid rgba(99, 102, 241, 0.4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h2 class="card-title" style="margin-bottom: 4px;">Authoritative Dataset Trust Assessment</h2>
              <p class="text-muted" style="font-size: 13px;">Decomposed 4-dimension scientific scoring (Version {dataset_scores.get('scoring_version', '1.0.0')}) Â· Evidence Coverage: {int(dataset_scores.get('evidence_coverage', 0) * 100)}%</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 32px; font-weight: 800; font-family: ui-monospace, monospace; color: {overall_cat.get('color', '#16A34A')};">{overall:.1f}</span><span style="font-size: 16px; color: var(--text-muted);"> / 100</span>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: {overall_cat.get('color', '#16A34A')};">{overall_cat.get('label', 'Good')}</div>
            </div>
          </div>
          <div class="grid-4" style="margin-bottom: 16px;">
            <div style="background: var(--bg-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border);">
              <div class="metric-val" style="color: {dq.get('category', {}).get('color', '#16A34A')};">{dq.get('score', 0.0):.1f}</div>
              <div class="metric-lbl">Data Quality (0-100)</div>
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">{dq.get('summary', '')}</p>
            </div>
            <div style="background: var(--bg-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border);">
              <div class="metric-val" style="color: {nids.get('category', {}).get('color', '#16A34A')};">{nids.get('score', 0.0):.1f}</div>
              <div class="metric-lbl">NIDS Suitability (0-100)</div>
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">{nids.get('summary', '')}</p>
            </div>
            <div style="background: var(--bg-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border);">
              <div class="metric-val" style="color: {sc.get('category', {}).get('color', '#DC2626')};">{sc.get('score', 0.0):.1f}</div>
              <div class="metric-lbl">Shortcut Risk (0-100, High=Risk)</div>
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">{sc.get('summary', '')}</p>
            </div>
            <div style="background: var(--bg-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border);">
              <div class="metric-val" style="color: {rel.get('category', {}).get('color', '#16A34A')};">{rel.get('score', 0.0):.1f}</div>
              <div class="metric-lbl">Evaluation Reliability (0-100)</div>
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">{rel.get('summary', '')}</p>
            </div>
          </div>
        </div>
        """

    # Recommendations HTML block
    recommendations_html = ""
    if recommendations:
        rec_rows = []
        for r in recommendations:
            sev_color = "#DC2626" if r.get("severity") == "HIGH" else "#D97706" if r.get("severity") == "MEDIUM" else "#94A3B8"
            rsm_tier = r.get("rsm_tier", "PASS")
            rsm_color = "#16A34A" if rsm_tier == "PASS" else "#D97706"
            rec_rows.append(f"""
            <tr>
              <td class="font-bold">{r.get('problem_name', '')}</td>
              <td><span class="badge" style="background-color: {sev_color}22; color: {sev_color}; border: 1px solid {sev_color}66;">{r.get('severity', '')}</span></td>
              <td class="text-sm">{r.get('detected', '')}</td>
              <td class="text-sm text-muted">{r.get('suggested_correction', '')}</td>
              <td><span class="badge" style="background-color: {rsm_color}22; color: {rsm_color}; border: 1px solid {rsm_color}66;">{rsm_tier}</span></td>
            </tr>
            """)
        recommendations_html = f"""
        <div class="card mb-4">
          <h2 class="card-title">Intelligent Repair Recommendations ({len(recommendations)})</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Severity</th>
                <th>Detected Evidence</th>
                <th>Recommended Action</th>
                <th>RSM Safety Tier</th>
              </tr>
            </thead>
            <tbody>
              {''.join(rec_rows)}
            </tbody>
          </table>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmellScope 2.0 Audit Report — {run_id}</title>
  <style>
    :root {{
      --bg-main: #0B0F19;
      --bg-card: #111827;
      --bg-elevated: #182234;
      --border: #263244;
      --text-primary: #F8FAFC;
      --text-secondary: #CBD5E1;
      --text-muted: #94A3B8;
      --accent: #6366F1;
      --cyan: #38BDF8;
      --success: #16A34A;
      --warning: #D97706;
      --danger: #DC2626;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background-color: var(--bg-main);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 32px 20px;
    }}
    .container {{
      max-width: 1200px;
      margin: 0 auto;
    }}
    header {{
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 24px;
    }}
    .brand-title {{
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .brand-subtitle {{
      color: var(--cyan);
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }}
    .disclaimer-box {{
      background: rgba(99, 102, 241, 0.08);
      border-left: 4px solid var(--accent);
      padding: 12px 16px;
      margin-top: 16px;
      border-radius: 4px;
      font-size: 13px;
      color: var(--text-secondary);
    }}
    .grid-4 {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }}
    .card {{
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }}
    .card-title {{
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .metric-val {{
      font-size: 26px;
      font-weight: 800;
      color: var(--text-primary);
      font-family: ui-monospace, monospace;
    }}
    .metric-lbl {{
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 4px;
    }}
    .data-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }}
    .data-table th {{
      background-color: var(--bg-elevated);
      color: var(--text-secondary);
      padding: 10px 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }}
    .data-table td {{
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
    }}
    .data-table tr:hover td {{
      background-color: rgba(255, 255, 255, 0.02);
    }}
    .badge {{
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }}
    .badge-accent {{
      background-color: rgba(99, 102, 241, 0.2);
      color: #A5B4FC;
      border: 1px solid rgba(99, 102, 241, 0.4);
    }}
    .text-muted {{ color: var(--text-muted); }}
    .font-mono {{ font-family: ui-monospace, monospace; }}
    .font-bold {{ font-weight: 600; color: var(--text-primary); }}
    .limitations-list {{
      padding-left: 20px;
      color: var(--text-secondary);
      font-size: 13px;
      line-height: 1.7;
    }}
    footer {{
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-title">
        <span>SMELLSCOPE 2.0</span>
        <span class="badge badge-accent">AUDIT REPORT</span>
      </div>
      <div class="brand-subtitle">Scientific Dataset Trust & Shortcut Audit Intelligence</div>
      <div class="disclaimer-box">
        <strong>SCIENTIFIC INTEGRITY NOTICE:</strong> SmellScope is a scientific benchmark dataset auditor that investigates design artifacts, shortcut vulnerability, and generalization gaps in machine learning NIDS benchmarks. It is <strong>NOT</strong> an active network intrusion detection system and does not monitor live traffic.
      </div>
    </header>

    <div class="grid-4">
      <div class="card">
        <div class="metric-val">{len(classes_data)}</div>
        <div class="metric-lbl">Audited Attack Classes</div>
      </div>
      <div class="card">
        <div class="metric-val">{dataset_meta.get('n_rows_loaded', 0):,}</div>
        <div class="metric-lbl">Total Sample Rows</div>
      </div>
      <div class="card">
        <div class="metric-val">{runtime_meta.get('total_seconds', 0.0):.1f}s</div>
        <div class="metric-lbl">Audit Runtime</div>
      </div>
      <div class="card">
        <div class="metric-val font-mono">{split_meta.get('split_hash', '')[:8]}...</div>
        <div class="metric-lbl">Locked Split Hash</div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Provenance & Cryptographic Fingerprints</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
        <div>
          <p><strong>Dataset Source:</strong> {dataset_meta.get('source_basename', 'Unknown')}</p>
          <p><strong>Schema ID:</strong> {dataset_meta.get('schema_id', 'Unknown')}</p>
          <p><strong>Dataset SHA-256:</strong> <code class="font-mono">{dataset_meta.get('sha256', 'Unknown')}</code></p>
          <p><strong>Label Column:</strong> {dataset_meta.get('label_col', 'Unknown')} (Benign: <code>{dataset_meta.get('benign_label', 'Unknown')}</code>)</p>
        </div>
        <div>
          <p><strong>Audit Run ID:</strong> <code class="font-mono">{run_id}</code></p>
          <p><strong>Generated At:</strong> {created_at}</p>
          <p><strong>Config Hash:</strong> <code class="font-mono">{run_result.get('config_hash', 'Unknown')}</code></p>
          <p><strong>Environment:</strong> Python {env_meta.get('python', '3.13')} · NumPy {env_meta.get('numpy')} · Scikit-Learn {env_meta.get('sklearn')}</p>
        </div>
      </div>
    </div>

    {scores_html}

    <div class="card">
      <h2 class="card-title">Cross-Class Smell Matrix (Heuristic & Shortcut Audit)</h2>
      <p class="text-muted mb-2">Metrics: UGT (Unassigned Port Traffic), WL (Window Length Anomaly), HDF (High Dimension Feature Dominance), PDD (Partition Distance Disparity), TC (Temporal Concentration), SFI (Shortcut Fragility Index), GGI (Generalisation Gap).</p>
      <table class="data-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Sample N</th>
            <th>Base F1</th>
            <th>UGT</th>
            <th>WL</th>
            <th>HDF</th>
            <th>PDD</th>
            <th>TC</th>
            <th>SFI (Top)</th>
            <th>Status</th>
            <th>GGI Gap</th>
          </tr>
        </thead>
        <tbody>
          {table_body}
        </tbody>
      </table>
    </div>

    {recommendations_html}

    {rebenchmark_html}

    {changelog_html}

    <div class="card">
      <h2 class="card-title">Scientific Limitations & Methodological Caveats</h2>
      <ul class="limitations-list">
        <li><strong>Heuristics are signals, not definitive verdicts:</strong> High heuristic values (UGT, WL, HDF, PDD, TC) indicate potential non-generalizable statistical artifacts or protocol biases, but do not replace domain expert review.</li>
        <li><strong>SFI measures sensitivity, not causal proof:</strong> A high null-calibrated Shortcut Fragility Index demonstrates that classifier performance degrades disproportionately under targeted perturbation, but does not definitively prove the feature was maliciously or synthetically introduced.</li>
        <li><strong>GGI evaluates clustering disparities:</strong> The Generalisation Gap Index compares grouped versus randomized evaluation splits; a gap signifies subtype sensitivity rather than direct test leakage.</li>
        <li><strong>Reversible remediation is experimental:</strong> Feature ablation and candidate flow quarantine are designed to evaluate model robustness under counterfactual conditions without corrupting original benchmark files.</li>
        <li><strong>Conditionality:</strong> All findings are strictly conditional on the loaded sample subset, Random Forest baseline architecture, and stratified locked split.</li>
      </ul>
    </div>

    <footer>
      <div>Generated by SmellScope 2.0 Scientific Dataset Trust Auditor</div>
      <div>Local-First Cryptographic Provenance · Shared Contract v1.0 Compliant</div>
    </footer>
  </div>
</body>
</html>"""

    with open(out_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    return str(out_file.resolve())
