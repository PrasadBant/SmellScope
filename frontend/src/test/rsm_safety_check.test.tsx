import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  RsmSafetyCheck,
  RsmSafetyRecord,
  canApplyPlan,
  RsmReportV2,
  TestIntegrity,
} from "../components/rsm/RsmSafetyCheck";

const policy = {
  min_class_retention_warn: 0.5,
  min_class_retention_block: 0.2,
  min_cluster_retention_warn: 0.25,
  min_cluster_retention_block: 0.1,
  max_ablation_features_warn: 10,
  min_total_train_rows_block: 10,
};

const features = { planned_removals: 0, names: [], threshold_warn: 10, triggered: false, status: "PASS", original_count: 8, remaining_count: 8 };
const klass = (name: string, before: number, after: number, status = "PASS") => ({
  class: name, original_rows: before, remaining_rows: after, removed_rows: before - after, retention: after / before, status,
});

const passReport: RsmReportV2 = {
  status: "PASS", warnings: [], blocks: [], policy,
  requires_acknowledgement: false,
  checks: {
    classes: [klass("BENIGN", 120, 120), klass("DDoS", 48, 48), klass("PortScan", 48, 48)],
    clusters: [
      { class: "DDoS", cluster_id: "0", original_rows: 30, remaining_rows: 30, retention: 1, evaluated: true, status: "PASS" },
      { class: "DDoS", cluster_id: "1", original_rows: 4, remaining_rows: 4, retention: 1, evaluated: false, status: "NOT_EVALUATED", reason: "Cluster has 4 original rows (needs more than 5)." },
    ],
    features,
  },
};

const warnReport: RsmReportV2 = {
  ...passReport,
  status: "WARN",
  requires_acknowledgement: true,
  warnings: [{
    code: "RSM_WARN_HIGH_CLASS_ATTRITION", class: "DDoS",
    title: "DDoS training-data retention warning",
    message: "m",
    explanation: "Your repair plan retains only 42% of the original 'DDoS' training records (42 of 100; 58 removed or quarantined). This is below the 50% warning threshold.",
    evidence: { original_rows: 100, remaining_rows: 42, removed_rows: 58, retention: 0.42, threshold_warn: 0.5, threshold_block: 0.2 },
  }],
  checks: { ...passReport.checks!, classes: [klass("BENIGN", 120, 120), klass("DDoS", 100, 42, "WARN")] },
};

const blockReport: RsmReportV2 = {
  ...passReport,
  status: "BLOCK",
  blocks: [{
    code: "RSM_BLOCK_CLASS_ERASURE", class: "PortScan", title: "PortScan training-data retention is critically low", message: "m",
    explanation: "Your repair plan would keep only 10% of the original 'PortScan' training records.",
    evidence: { original_rows: 50, remaining_rows: 5, removed_rows: 45, retention: 0.1, threshold_warn: 0.5, threshold_block: 0.2 },
  }],
  checks: { ...passReport.checks!, classes: [klass("PortScan", 50, 5, "BLOCK")] },
};

const verified: TestIntegrity = {
  status: "VERIFIED", original_fingerprint: "a".repeat(64), current_fingerprint: "a".repeat(64),
  test_record_count: 72, verification_outcome: "Test records unchanged and excluded from every planned operation.",
};

const Harness: React.FC<{ report: RsmReportV2 | null; integrity?: TestIntegrity }> = ({ report, integrity = verified }) => {
  const [ack, setAck] = useState(false);
  return (
    <div>
      <RsmSafetyCheck report={report} testIntegrity={integrity} acknowledged={ack} onAcknowledgedChange={setAck} />
      <button disabled={!canApplyPlan(report, ack, integrity)}>Apply</button>
    </div>
  );
};

describe("RSM Dataset Safety Check", () => {
  it("explains RSM to a beginner and hides technical rules until requested", () => {
    render(<Harness report={passReport} />);
    expect(screen.getByText("Dataset Safety Check")).toBeInTheDocument();
    expect(screen.getByText(/protects your dataset from excessive cleaning/i)).toBeInTheDocument();
    expect(screen.getByText("Why is this important?")).toBeInTheDocument();
    expect(screen.getByText("How does RSM work?")).toBeInTheDocument();
  });

  it("PASS: shows every class, cluster rules and a usable Apply", () => {
    render(<Harness report={passReport} />);
    expect(screen.getByText("PASS — Safe to proceed")).toBeInTheDocument();
    expect(screen.getByText(/meet the configured safety thresholds/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("rsm-class-row").map((r) => r.getAttribute("data-class"))).toEqual(["BENIGN", "DDoS", "PortScan"]);
    expect(screen.getByText(/1 cluster\(s\) evaluated/)).toBeInTheDocument();
    expect(screen.getByText(/1 small cluster\(s\) listed but not evaluated/)).toBeInTheDocument();
    expect(screen.queryByTestId("rsm-ack")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
  });

  it("WARN: shows the exact evidence and requires an explicit acknowledgement", () => {
    render(<Harness report={warnReport} />);
    expect(screen.getByText("WARN — Review before applying")).toBeInTheDocument();
    const issue = screen.getByTestId("rsm-issue");
    expect(within(issue).getByText("DDoS training-data retention warning")).toBeInTheDocument();
    expect(within(issue).getByText(/retains only 42%/)).toBeInTheDocument();
    expect(within(issue).getByText("58")).toBeInTheDocument(); // removed rows, from backend evidence
    expect(within(issue).getByText("below 50%")).toBeInTheDocument();
    expect(within(issue).getByText("below 20%")).toBeInTheDocument();

    const ack = screen.getByRole("checkbox") as HTMLInputElement;
    expect(ack.checked).toBe(false); // never pre-acknowledged
    expect(screen.getByText(/I have reviewed the safety warnings and understand the possible impact/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.click(ack);
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    fireEvent.click(ack);
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("BLOCK: explains the violation, offers guidance, and offers no way to enable Apply", () => {
    render(<Harness report={blockReport} />);
    expect(screen.getByText("BLOCK — Repair cannot be applied")).toBeInTheDocument();
    expect(screen.getByText(/SmellScope will not apply this repair plan/)).toBeInTheDocument();
    expect(screen.getByText("PortScan training-data retention is critically low")).toBeInTheDocument();
    expect(screen.getByTestId("rsm-block-guidance")).toHaveTextContent(/Remove the risky operation/);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument(); // acknowledgement cannot bypass a block
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("locked test-set failure prevents applying even when RSM says PASS", () => {
    const failed: TestIntegrity = { ...verified, status: "FAILED", current_fingerprint: "b".repeat(64), verification_outcome: "Test-set fingerprint mismatch: the locked test data changed since the preview." };
    render(<Harness report={passReport} integrity={failed} />);
    expect(screen.getByText("PASS — Safe to proceed")).toBeInTheDocument();
    expect(screen.getByText("Test-set integrity: FAILED")).toBeInTheDocument();
    expect(screen.getByText(/regardless of the RSM decision/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("shows locked-test protection separately with counts and fingerprints", () => {
    render(<Harness report={passReport} />);
    const box = screen.getByTestId("rsm-test-protection");
    expect(within(box).getByText("Test-set integrity: VERIFIED")).toBeInTheDocument();
    expect(within(box).getByText(/Your final evaluation records are protected/)).toBeInTheDocument();
    expect(box).toHaveTextContent("72 test records");
  });

  it("never invents a safety result: a missing report cannot be applied", () => {
    render(<Harness report={null} />);
    expect(screen.getByTestId("rsm-missing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(canApplyPlan(undefined, true, verified)).toBe(false);
  });

  it("displays thresholds from the loaded policy, not constants baked into the UI", () => {
    const custom = { ...passReport, policy: { ...policy, min_class_retention_warn: 0.8, min_class_retention_block: 0.3, max_ablation_features_warn: 7 } };
    render(<Harness report={custom} />);
    const how = screen.getByTestId("rsm-how-it-works");
    expect(how).toHaveTextContent("below 80%");
    expect(how).toHaveTextContent("below 30%");
    expect(how).toHaveTextContent("more than 7");
    expect(how).not.toHaveTextContent("below 50%");
  });

  it("feature protection lists the actual excluded feature names", () => {
    const names = Array.from({ length: 12 }, (_, i) => `feat_${i}`);
    const report: RsmReportV2 = {
      ...passReport, status: "WARN", requires_acknowledgement: true,
      warnings: [{ code: "RSM_WARN_EXCESSIVE_ABLATION", class: null, title: "Many features would be removed", message: "m", explanation: "removes 12", evidence: { planned_removals: 12, features: names, threshold_warn: 10 } }],
      checks: { ...passReport.checks!, features: { ...features, planned_removals: 12, names, triggered: true, status: "WARN", remaining_count: -4 } },
    };
    render(<Harness report={report} />);
    const box = screen.getByTestId("rsm-feature-protection");
    expect(box).toHaveTextContent("feat_0, feat_1");
    expect(box).toHaveTextContent("Triggered (more than 10)");
  });
});

describe("RSM Safety Record", () => {
  const base = {
    preview_id: "plan_1", transformation_id: "log_1", dataset_version: "view_0001",
    preview_decision: "PASS" as const, apply_decision: "PASS" as const,
    acknowledgement_required: false, acknowledged: false,
    class_retention_actual: { DDoS: { before: 48, after: 40, retention: 40 / 48 } },
    cluster_retention: [], features_removed: { planned_removals: 2 }, test_integrity: verified,
    outcome: "APPLIED" as const, message: "Your improvement plan was applied after passing the required RSM checks.",
    recorded_at: "2026-11-19T10:00:00Z",
  };

  it("shows the plain-language outcome and the identifiers that tie it to the preview and version", () => {
    render(<RsmSafetyRecord record={base} />);
    expect(screen.getByTestId("rsm-record-message")).toHaveTextContent("applied after passing the required RSM checks");
    const rec = screen.getByTestId("rsm-safety-record");
    expect(rec).toHaveTextContent("plan_1");
    expect(rec).toHaveTextContent("log_1");
    expect(rec).toHaveTextContent("view_0001");
    expect(rec).toHaveTextContent("40 of 48 training rows");
  });

  it("records the acknowledgement for a WARN", () => {
    render(<RsmSafetyRecord record={{ ...base, preview_decision: "WARN", apply_decision: "WARN", acknowledgement_required: true, acknowledged: true, message: "Your improvement plan was applied after reviewing and acknowledging the safety warning." }} />);
    expect(screen.getByTestId("rsm-record-message")).toHaveTextContent("reviewing and acknowledging the safety warning");
    expect(screen.getByTestId("rsm-safety-record")).toHaveTextContent("Acknowledged");
  });

  it("NO_CHANGE never looks like a successful new version", () => {
    render(<RsmSafetyRecord record={{ ...base, outcome: "NO_CHANGE", transformation_id: null, dataset_version: null, message: "RSM approved the proposed plan, but the transformation produced no actual dataset changes. No new improved dataset version was created." }} />);
    const rec = screen.getByTestId("rsm-safety-record");
    expect(rec).toHaveAttribute("data-outcome", "NO_CHANGE");
    expect(rec).toHaveTextContent("no new version");
    expect(rec).toHaveTextContent("none (no change)");
    expect(screen.getByTestId("rsm-record-message")).toHaveTextContent("produced no actual dataset changes");
  });
});
