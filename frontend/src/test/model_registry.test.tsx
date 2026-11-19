import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuditProvider } from "../stores/AuditContext";
import { AuditScreen } from "../features/audit/AuditScreen";
import { FindingsScreen } from "../features/findings/FindingsScreen";
import { ComparisonScreen } from "../features/comparison/ComparisonScreen";

const { mockRunResult, mockComparisonData } = vi.hoisted(() => ({
  mockRunResult: {
    schema_version: "1.0",
    run_id: "run_perf_test_123",
    split: { seed: 42, split_hash: "hash123", n_train: 600, n_val: 200, n_test: 200 },
    classes: [
      {
        class: "PortScan",
        n: 300,
        paper: { UGT: 0.9, WL: 0.2, HDF: 0.85, PDD: 0.1, TC: 0.1 },
        baseline: {
          acc: 1.0,
          f1: 1.0,
          tpr: 1.0,
          tnr: 1.0,
          train: { accuracy: 1.0, macro_f1: 1.0, tpr: 1.0, roc_auc: 1.0 },
          val: { accuracy: 0.99, macro_f1: 0.99, tpr: 1.0, roc_auc: 1.0 },
          test: { accuracy: 1.0, macro_f1: 1.0, tpr: 1.0, tnr: 1.0 },
          perfect_accuracy_investigation: {
            triggered: true,
            case: "CASE_D",
            case_title: "High Inherent Separability",
            description: "No technical defects, duplicate leakage, or non-causal Category A feature reliance detected.",
            recommendation: "Valid benchmark performance under locked test holdout. Document complete protocol in research report.",
            findings: ["No split contamination found", "Zero duplicate records across splits"],
            areas_evaluated: {
              train_val_gap: { status: "PASS", detail: "Train 100.0% vs Val 99.0% (gap: 1.0%)" },
              split_duplicates: { status: "PASS", detail: "0 duplicate rows detected" },
              category_a_reliance: { status: "PASS", detail: "No Category A port shortcut reliance" },
            },
          },
        },
        sfi: {
          flag: false,
          delta: 0.05,
          sfi_top: 0.1,
          sfi_null_mean: 0.05,
          top_features: ["Destination Port"],
          categories: ["A"],
          fragility_curve: { delta: [0, 0.1], recall_top: [1, 0.95], recall_null_mean: [1, 0.95] },
        },
        ggi: { gap: 0.02, lor: 1.0 },
      },
    ],
    dataset: { name: "cic2017_sample_planted", sha256: "abc123def456" },
  },
  mockComparisonData: {
    scores: {
      before: { scoring_version: "1.0.0", overall_score: 65 },
      after: { scoring_version: "1.0.0", overall_score: 82 },
      delta: { overall_score: 17 },
    },
    data_quality: {
      before: { total_rows: 1000, missing_values: 20 },
      after: { total_rows: 1000, missing_values: 0 },
      delta: { missing_values: -20 },
    },
    ml_benchmark: {
      before: { accuracy: 0.98, macro_f1: 0.97 },
      after: { accuracy: 0.98, macro_f1: 0.97 },
      delta: { accuracy: 0.0, macro_f1: 0.0 },
      same_test_ids: true,
      split_hash: "splithash123",
      train_sizes: { original: 600, remediated: 600 },
    },
    test_integrity: {
      same_test_ids: true,
      test_sample_count: 200,
      split_hash: "splithash123",
      status: "PASS",
    },
    view_lineage: {
      original_view_id: "view_0000",
      corrected_view_id: "view_0001",
      excluded_features: ["Destination Port"],
    },
  },
}));

vi.mock("@/api/client", () => ({
  api: {
    listModels: vi.fn().mockResolvedValue([
      {
        model_id: "model_test_saved_01",
        model_name: "Test-RandomForest-Model",
        created_at: new Date().toISOString(),
        algorithm: "RandomForestClassifier",
        model_sha256: "hash_model_123",
        preprocessor_sha256: "hash_prep_123",
        provenance: { n_train_rows: 600 },
        schema: { feature_count: 10 },
      },
    ]),
    saveModel: vi.fn().mockResolvedValue({
      model_id: "model_new_saved_02",
      model_name: "Saved-RF-02",
      algorithm: "RandomForestClassifier",
      model_sha256: "hash_new_model",
      preprocessor_sha256: "hash_new_prep",
    }),
    getDatasetComparison: vi.fn().mockResolvedValue(mockComparisonData),
    getDatasetScores: vi.fn().mockResolvedValue({ scoring_version: "1.0.0", overall_score: 75 }),
    getPublishedValues: vi.fn().mockResolvedValue({ benchmarks: {} }),
    getAuditResults: vi.fn().mockResolvedValue(mockRunResult),
    getAuditStatus: vi.fn().mockResolvedValue({ status: "COMPLETED", current_step: 6, total_steps: 6, progress_percent: 100 }),
    listAudits: vi.fn().mockResolvedValue([{ run_id: "run_perf_test_123", status: "COMPLETED" }]),
    getModelBundleUrl: vi.fn().mockReturnValue("http://127.0.0.1:8000/api/v1/models/model_test_saved_01/bundle"),
    getModelDownloadUrl: vi.fn().mockReturnValue("http://127.0.0.1:8000/api/v1/models/model_test_saved_01/download"),
    getDownloadUrl: vi.fn().mockReturnValue("http://127.0.0.1:8000/api/v1/audits/run_123/export/dataset"),
    verifyModelCompatibility: vi.fn().mockResolvedValue({
      compatible: true,
      message: "Target dataset matches all 10 required features.",
    }),
    deleteModel: vi.fn().mockResolvedValue({ status: "deleted" }),
  },
}));

describe("Phase 6, 7, 13 Frontend Integration Tests", () => {
  it("renders 100% Accuracy Diagnostic Panel when triggered in Audit Baseline step", async () => {
    localStorage.setItem("smellscope_active_run", "run_perf_test_123");
    localStorage.setItem("smellscope_active_dataset", "cic2017_sample_planted");
    localStorage.setItem("smellscope_selected_class", "PortScan");

    render(
      <BrowserRouter>
        <AuditProvider>
          <AuditScreen />
        </AuditProvider>
      </BrowserRouter>
    );

    // Switch to Step 5 (Baseline)
    const baselineStepBtn = await screen.findByRole("button", { name: /Step 5 · Baseline/i });
    fireEvent.click(baselineStepBtn);

    // Verify 100% Accuracy Investigation Panel is rendered
    await waitFor(() => {
      expect(screen.getByText(/100% Accuracy — Verification Required/i)).toBeInTheDocument();
      expect(screen.getByText(/High Inherent Separability/i)).toBeInTheDocument();
      expect(screen.getByText(/Partition Metrics Breakdown/i)).toBeInTheDocument();
      expect(screen.getByText(/14-Dimension Diagnostic Inspection Matrix/i)).toBeInTheDocument();
    });
  });

  it("renders Scientific Heatmaps tab and per-class matrix in FindingsScreen", async () => {
    localStorage.setItem("smellscope_active_run", "run_perf_test_123");
    localStorage.setItem("smellscope_active_dataset", "cic2017_sample_planted");
    localStorage.setItem("smellscope_selected_class", "PortScan");

    render(
      <BrowserRouter>
        <AuditProvider>
          <FindingsScreen />
        </AuditProvider>
      </BrowserRouter>
    );

    // Switch to Heatmaps tab
    const heatmapsTabBtn = await screen.findByRole("button", { name: /3\. Scientific Heatmaps/i });
    fireEvent.click(heatmapsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Per-Class Smell Severity Heatmap/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature Importance & Taxonomy Taxonomy Matrix/i)).toBeInTheDocument();
      expect(screen.getByText(/UGT \(Port\)/i)).toBeInTheDocument();
    });
  });

  it("renders Save Trained Model and Persisted Models Registry in ComparisonScreen", async () => {
    localStorage.setItem("smellscope_active_run", "run_perf_test_123");
    localStorage.setItem("smellscope_active_dataset", "cic2017_sample_planted");
    localStorage.setItem("smellscope_selected_class", "PortScan");

    render(
      <BrowserRouter>
        <AuditProvider>
          <ComparisonScreen />
        </AuditProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dataset Comparison & Model Deployment/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save Trained Model/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Saved Models Registry/i })).toBeInTheDocument();
      expect(screen.getByText(/Trained Model & Reusable Training Bundle/i)).toBeInTheDocument();
    });
  });
});
