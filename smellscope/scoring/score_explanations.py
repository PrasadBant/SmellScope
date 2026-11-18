"""Human-Friendly Score Explanations & Table Generators for SmellScope 2.0."""

from __future__ import annotations

from typing import Any, Dict, List


def format_breakdown_table_markdown(breakdown: List[Dict[str, Any]]) -> str:
    """Format scoring breakdown rows into GitHub-flavored Markdown table."""
    headers = ["Metric / Component", "Measured Value", "Subscore", "Weight", "Contribution", "Explanation"]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in breakdown:
        lines.append(
            f"| **{row.get('metric', '')}** | {row.get('measured_value', '')} | "
            f"{row.get('subscore', 0.0):.1f} | {row.get('weight', 0.0):.2f} | "
            f"+{row.get('contribution', 0.0):.2f} | {row.get('explanation', '')} |"
        )
    return "\n".join(lines)


def format_breakdown_table_html(breakdown: List[Dict[str, Any]]) -> str:
    """Format scoring breakdown rows into semantic HTML table for offline reports."""
    rows = []
    for row in breakdown:
        rows.append(f"""
        <tr>
          <td class="font-bold">{row.get('metric', '')}</td>
          <td class="font-mono text-right">{row.get('measured_value', '')}</td>
          <td class="text-right font-bold">{row.get('subscore', 0.0):.1f}</td>
          <td class="text-right font-mono">{row.get('weight', 0.0):.2f}</td>
          <td class="text-right font-bold text-accent">+{row.get('contribution', 0.0):.2f}</td>
          <td class="text-muted text-sm">{row.get('explanation', '')}</td>
        </tr>
        """)
    return f"""
    <table class="data-table">
      <thead>
        <tr>
          <th>Metric / Component</th>
          <th>Measured Value</th>
          <th>Subscore</th>
          <th>Weight</th>
          <th>Contribution</th>
          <th>Explanation</th>
        </tr>
      </thead>
      <tbody>
        {''.join(rows)}
      </tbody>
    </table>
    """
