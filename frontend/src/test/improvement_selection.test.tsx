import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ImprovementScreen } from "../features/improvement/ImprovementScreen";

const { RECS } = vi.hoisted(() => {
  const base = {
    category: "DATA_QUALITY",
    why_it_matters: "why",
    affected_columns: ["colA"],
    affected_records: 10,
    evidence: { description: "e" },
    suggested_correction: "fix",
    expected_benefit: "b",
    potential_risk: "r",
    is_reversible: true,
    action_type: "IMPUTE_NUMERIC",
    action_params: { columns: ["colA"] },
  };
  return {
    RECS: [
      { ...base, id: "r_safe_high", severity: "HIGH", problem_name: "Safe high", detected: "d1", rsm_tier: "SAFE", is_safe_under_rsm: true, is_recommended: true, is_high_priority: true },
      { ...base, id: "r_warn_med", severity: "MEDIUM", problem_name: "Warn medium", detected: "d2", rsm_tier: "WARN", is_safe_under_rsm: false, is_recommended: true, is_high_priority: false },
      { ...base, id: "r_safe_low", severity: "LOW", problem_name: "Safe low", detected: "d3", rsm_tier: "SAFE", is_safe_under_rsm: true, is_recommended: false, is_high_priority: false },
    ],
  };
});

vi.mock("@/api/client", () => ({
  api: {
    getRecommendations: vi.fn().mockResolvedValue({ run_id: "run_x", recommendations: RECS, generated_at: "now" }),
    createRepairPlanPreview: vi.fn(),
    applyRepairPlan: vi.fn(),
  },
}));

vi.mock("@/stores/AuditContext", () => ({
  useAuditContext: () => ({
    activeRunId: "run_x",
    isHydrating: false,
    latestRunResult: { run_id: "run_x", classes: [], dataset: { name: "d" } },
  }),
}));

const renderScreen = () =>
  render(
    <BrowserRouter>
      <ImprovementScreen />
    </BrowserRouter>
  );

const checked = () => screen.getAllByRole("checkbox").filter((c) => (c as HTMLInputElement).checked).length;

describe("Improvement Centre quick selection", () => {
  it("selects only the matching recommendations and never applies anything", async () => {
    const { api } = await import("@/api/client");
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("selection-controls")).toBeInTheDocument());
    expect(checked()).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: /select all safe \(2\)/i }));
    expect(checked()).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: /select recommended \(2\)/i }));
    expect(checked()).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: /select high priority \(1\)/i }));
    expect(checked()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(checked()).toBe(0);

    // Selecting is purely local state: no preview/apply request was issued.
    expect(api.createRepairPlanPreview).not.toHaveBeenCalled();
    expect((api as any).applyRepairPlan).not.toHaveBeenCalled();
  });
});
