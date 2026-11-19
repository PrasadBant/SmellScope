import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuditProvider } from "../stores/AuditContext";
import { DatasetScreen } from "../features/dataset/DatasetScreen";
import { FindingsScreen } from "../features/findings/FindingsScreen";
import { RemediationScreen } from "../features/remediation/RemediationScreen";

const { mockRunResult } = vi.hoisted(() => ({
  mockRunResult: {
    schema_version: "1.0",
    run_id: "run_test_123",
    classes: [
      {
        class: "PortScan",
        n: 200,
        paper: { UGT: 0.8, WL: 0.1, HDF: 0.95, PDD: 0.2, TC: 0.1 },
        baseline: { acc: 0.99, f1: 0.99, tpr: 0.99, tnr: 1.0 },
        sfi: {
          flag: true,
          sfi_top: 0.6,
          sfi_null_mean: 0.1,
          z: 3.5,
          top_features: ["Destination Port"],
          categories: ["A"],
          flag_conditions: { excess_fragility: true },
          fragility_curve: { delta: [0, 0.1], recall_top: [1, 0.4], recall_null_mean: [1, 0.9] },
        },
        ggi: { gap: 0.05 },
      },
    ],
    dataset: { name: "cic2017_sample_planted" },
  },
}));

// Mock API client
vi.mock("@/api/client", () => ({
  api: {
    listDatasets: vi.fn().mockResolvedValue([
      { dataset_id: "cic2017_sample_planted", name: "CIC-IDS-2017 Sample", rows: 1000 },
      { dataset_id: "unsw_nb15_sample", name: "UNSW-NB15 Sample", rows: 1200 },
    ]),
    getDatasetMetadata: vi.fn().mockImplementation((id: string) =>
      Promise.resolve({
        dataset_id: id,
        source_basename: `${id}.csv`,
        sha256: "abcdef1234567890abcdef1234567890",
        n_rows_raw: 1000,
        n_rows_loaded: 1000,
        dropped_inf_nan: 0,
        label_col: "Label",
        benign_label: "BENIGN",
        schema_id: "cic-ids-2017",
        column_roles: { dst_port: "Destination Port", timestamp: null, group: null },
        class_counts: { BENIGN: 800, PortScan: 200 },
        columns: ["Destination Port", "Flow_Duration", "Init_Win_bytes_backward"],
        status: "validated",
      })
    ),
    getDatasetPreview: vi.fn().mockResolvedValue({
      dataset_id: "cic2017_sample_planted",
      total_rows: 1000,
      total_columns: 3,
      columns: ["Destination Port", "Flow_Duration", "Init_Win_bytes_backward"],
      preview_rows: [],
      class_counts: { BENIGN: 800, PortScan: 200 },
      missing_value_counts: {},
      infinite_value_counts: {},
    }),
    validateDataset: vi.fn().mockResolvedValue({
      valid: true,
      schema_id: "cic-ids-2017",
      unique_classes: ["BENIGN", "PortScan"],
      class_counts: { BENIGN: 800, PortScan: 200 },
      column_roles: { dst_port: "Destination Port", timestamp: null, group: null },
      warnings: [],
    }),
    getAuditViews: vi.fn().mockResolvedValue({
      views: [{ view_id: "view_0000", parent_view_id: null, excluded_features: [], quarantined_count: 0 }],
      active_view: { view_id: "view_0000", parent_view_id: null, excluded_features: [], quarantined_count: 0 },
    }),
    getRemediationViews: vi.fn().mockResolvedValue({
      views: [{ view_id: "view_0000", parent_view_id: null, excluded_features: [], quarantined_count: 0 }],
      active_view: { view_id: "view_0000", parent_view_id: null, excluded_features: [], quarantined_count: 0 },
    }),
    getAuditChangeLog: vi.fn().mockResolvedValue({ log: [] }),
    listAudits: vi.fn().mockResolvedValue([{ run_id: "run_test_123", status: "COMPLETED" }]),
    getAuditResults: vi.fn().mockResolvedValue(mockRunResult),
    getAuditStatus: vi.fn().mockResolvedValue({ status: "COMPLETED", current_step: 6, total_steps: 6, progress_percent: 100 }),
    getDatasetScores: vi.fn().mockResolvedValue(null),
    previewRemediation: vi.fn().mockResolvedValue({
      preview_id: "prev_123",
      action: "R1",
      rsm_report: { status: "PASS", warnings: [], blocks: [] },
      affected: { n_rows: 0, by_class: {} },
      expected_train_size: { before: 600, after: 600 },
    }),
  },
}));

describe("Master Workflow Fixes Verification (Phases 4, 6, 7)", () => {
  it("Test G: Option A contains explicit 'None' option and disables continuing when None is selected", async () => {
    render(
      <BrowserRouter>
        <AuditProvider>
          <DatasetScreen />
        </AuditProvider>
      </BrowserRouter>
    );

    // Verify Option A dropdown contains None option
    const selectElem = await screen.findByRole("combobox");
    expect(selectElem).toBeInTheDocument();

    const noneOption = screen.getByRole("option", { name: /None — Do not select a benchmark dataset/i });
    expect(noneOption).toBeInTheDocument();

    // Select None option
    fireEvent.change(selectElem, { target: { value: "" } });

    // Verify continue button is disabled
    const continueBtn = screen.getByRole("button", { name: /CONTINUE TO VALIDATION/i });
    expect(continueBtn).toBeDisabled();

    // Verify notice displayed
    expect(screen.getByText(/No benchmark dataset selected/i)).toBeInTheDocument();
  });

  it("Test D: Findings screen removes Path A and presents clean Improve My Dataset and Generate Final Report choices", async () => {
    render(
      <BrowserRouter>
        <AuditProvider>
          <FindingsScreen />
        </AuditProvider>
      </BrowserRouter>
    );

    // Await hydration of audit findings
    const improveBtn = await screen.findByRole("button", { name: /Improve My Dataset/i });
    expect(improveBtn).toBeInTheDocument();

    // Path A must NOT be present
    expect(screen.queryByText(/Path A · Explore Remediation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Path B · Skip Remediation/i)).not.toBeInTheDocument();

    // The two clean choices must be present
    expect(screen.getByRole("button", { name: /Generate Final Report/i })).toBeInTheDocument();
  });

  it("Test F: Remediation screen removes R2 Flow Quarantine and preserves R1 Feature Ablation", async () => {
    render(
      <BrowserRouter>
        <AuditProvider>
          <RemediationScreen />
        </AuditProvider>
      </BrowserRouter>
    );

    // Await hydration of remediation screen
    const r1Badge = await screen.findByText("SUPPORTED");
    expect(r1Badge).toBeInTheDocument();

    // R2 Flow Quarantine must NOT be present
    expect(screen.queryByText(/R2 Flow Quarantine/i)).not.toBeInTheDocument();

    // R1 Feature Ablation must be present and marked supported
    expect(screen.getByText("R1 Feature Ablation")).toBeInTheDocument();
    expect(screen.getByText(/Candidate Shortcut Features to Ablate/i)).toBeInTheDocument();
  });
});
