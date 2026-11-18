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

  it("renders 5-stage scientific workflow stepper", () => {
    render(<App />);
    expect(screen.getByText("DATASET")).toBeInTheDocument();
    expect(screen.getByText("AUDIT")).toBeInTheDocument();
    expect(screen.getByText("FINDINGS")).toBeInTheDocument();
    expect(screen.getByText("REMEDIATION (OPT.)")).toBeInTheDocument();
    expect(screen.getByText("VERIFY & REPORT")).toBeInTheDocument();
  });

  it("renders primary 5-stage workflow navigation links", () => {
    render(<App />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("New Audit")).toBeInTheDocument();
    expect(screen.getByText("Findings")).toBeInTheDocument();
    expect(screen.getByText("Remediation")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it("formats scientific metrics accurately", () => {
    expect(formatPercent(0.9542)).toBe("95.4%");
    expect(formatPercent(null)).toBe("N/A");
    expect(formatNumber(12500)).toBe("12,500");
    expect(formatDelta(0.0456)).toBe("+0.0456");
    expect(formatDelta(-0.0210)).toBe("-0.0210");
  });
});
