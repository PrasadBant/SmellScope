import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";
import { formatPercent, formatNumber, formatDelta } from "../utils/cn";

describe("SmellScope 2.0 Frontend Shell & Foundation", () => {
  it("renders brand title, subtitle, and scientific disclaimer", () => {
    render(<App />);
    expect(screen.getByText("SMELLSCOPE")).toBeInTheDocument();
    expect(screen.getByText("Dataset Auditor")).toBeInTheDocument();
    expect(screen.getByText(/Scientific Auditor · NIDS Benchmark Trust/i)).toBeInTheDocument();
  });

  it("renders 5-stage research workflow bar", () => {
    render(<App />);
    expect(screen.getByText("INGEST")).toBeInTheDocument();
    expect(screen.getByText("OVERVIEW")).toBeInTheDocument();
    expect(screen.getByText("DIAGNOSE")).toBeInTheDocument();
    expect(screen.getByText("REMEDIATE")).toBeInTheDocument();
    expect(screen.getByText("VERIFY")).toBeInTheDocument();
  });

  it("renders workspace navigation links", () => {
    render(<App />);
    expect(screen.getByText("Dataset Ingestion")).toBeInTheDocument();
    expect(screen.getByText("Smell Matrix")).toBeInTheDocument();
    expect(screen.getByText("Shortcut Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Remediation Lab")).toBeInTheDocument();
    expect(screen.getByText("Verification & Reports")).toBeInTheDocument();
  });

  it("formats scientific metrics accurately", () => {
    expect(formatPercent(0.9542)).toBe("95.4%");
    expect(formatPercent(null)).toBe("N/A");
    expect(formatNumber(12500)).toBe("12,500");
    expect(formatDelta(0.0456)).toBe("+0.0456");
    expect(formatDelta(-0.0210)).toBe("-0.0210");
  });
});
