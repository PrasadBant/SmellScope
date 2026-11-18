import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EvidenceBadge } from "../components/ui/EvidenceBadge";
import { FingerprintDisplay } from "../components/ui/FingerprintDisplay";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";
import { MetricCard } from "../components/ui/MetricCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";

describe("SmellScope 2.0 Obsidian Component Library", () => {
  it("renders EvidenceBadge with proper provenance tags", () => {
    const { rerender } = render(<EvidenceBadge type="published" />);
    expect(screen.getByText("[published]")).toBeInTheDocument();

    rerender(<EvidenceBadge type="measured" />);
    expect(screen.getByText("[measured]")).toBeInTheDocument();

    rerender(<EvidenceBadge type="synthetic" />);
    expect(screen.getByText("[synthetic]")).toBeInTheDocument();

    rerender(<EvidenceBadge type="cached" />);
    expect(screen.getByText("[cached]")).toBeInTheDocument();

    rerender(<EvidenceBadge type="target" />);
    expect(screen.getByText("[target]")).toBeInTheDocument();
  });

  it("renders FingerprintDisplay with truncated hash and copy button", () => {
    render(<FingerprintDisplay hash="a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890" label="SHA-256" />);
    expect(screen.getByText("SHA-256:")).toBeInTheDocument();
    expect(screen.getByText(/a1b2c3d4e5f6\.\.\.ef1234567890/)).toBeInTheDocument();
  });

  it("renders MetricCard with title, value, subtitle and evidence badge", () => {
    render(
      <MetricCard
        title="Test Metric"
        value="0.952"
        subtitle="Sample subtitle"
        evidenceType="measured"
        delta={{ value: "+0.041", isPositive: true }}
      />
    );
    expect(screen.getByText("Test Metric")).toBeInTheDocument();
    expect(screen.getByText("0.952")).toBeInTheDocument();
    expect(screen.getByText("Sample subtitle")).toBeInTheDocument();
    expect(screen.getByText("[measured]")).toBeInTheDocument();
    expect(screen.getByText("+0.041")).toBeInTheDocument();
  });

  it("renders SectionHeader with title, description, and action elements", () => {
    render(
      <SectionHeader
        title="Diagnostic Control Center"
        description="Detailed description of the diagnostics workflow."
        actions={<button>Action Button</button>}
      />
    );
    expect(screen.getByText("Diagnostic Control Center")).toBeInTheDocument();
    expect(screen.getByText("Detailed description of the diagnostics workflow.")).toBeInTheDocument();
    expect(screen.getByText("Action Button")).toBeInTheDocument();
  });

  it("renders ConfirmationDialog and triggers callback on confirm", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Rollback Intervention"
        description="Are you sure you want to revert to view_0000?"
        confirmLabel="Confirm Rollback"
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText("Rollback Intervention")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to revert to view_0000?")).toBeInTheDocument();

    const confirmBtn = screen.getByText("Confirm Rollback");
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("renders EmptyState, LoadingState, and ErrorState correctly", () => {
    const { rerender } = render(
      <EmptyState
        title="No Datasets Found"
        description="Please upload a benchmark."
        actionLabel="Upload Now"
        onAction={() => {}}
      />
    );
    expect(screen.getByText("No Datasets Found")).toBeInTheDocument();
    expect(screen.getByText("Upload Now")).toBeInTheDocument();

    rerender(<LoadingState title="Computing SFI..." description="Evaluating Monte Carlo draws" />);
    expect(screen.getByText("Computing SFI...")).toBeInTheDocument();
    expect(screen.getByText("Evaluating Monte Carlo draws")).toBeInTheDocument();

    rerender(<ErrorState title="Execution Failed" message="Null calibration error" />);
    expect(screen.getByText("Execution Failed")).toBeInTheDocument();
    expect(screen.getByText("Null calibration error")).toBeInTheDocument();
  });
});
