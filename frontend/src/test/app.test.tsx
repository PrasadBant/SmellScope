import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";
import { formatPercent, formatNumber, formatDelta } from "../utils/cn";

describe("SmellScope 2.1 Simplified Frontend Shell & Foundation", () => {
  it("renders brand title, subtitle, and scientific disclaimer", () => {
    render(<App />);
    expect(screen.getByText("SMELLSCOPE")).toBeInTheDocument();
    expect(screen.getByText("Dataset Auditor")).toBeInTheDocument();
    expect(screen.getByText(/Scientific Auditor · NIDS Benchmark Trust/i)).toBeInTheDocument();
  });

  it("renders 6-stage scientific workflow stepper (dataset -> audit -> findings -> improvement -> comparison -> reports)", () => {
    render(<App />);
    for (const label of ["DATASET", "AUDIT", "FINDINGS", "IMPROVEMENT", "COMPARISON", "REPORTS"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // The old optional-remediation stage is no longer part of the stepper.
    expect(screen.queryByText("REMEDIATION (OPT.)")).not.toBeInTheDocument();
  });

  it("renders primary 5-stage workflow navigation links", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dataset" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Findings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Remediation/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verify & Report" })).toBeInTheDocument();
  });

  it("formats scientific metrics accurately", () => {
    expect(formatPercent(0.9542)).toBe("95.4%");
    expect(formatPercent(null)).toBe("N/A");
    expect(formatNumber(12500)).toBe("12,500");
    expect(formatDelta(0.0456)).toBe("+0.0456");
    expect(formatDelta(-0.0210)).toBe("-0.0210");
  });
});
