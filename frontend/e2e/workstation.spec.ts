import { test, expect } from "@playwright/test";

test.describe("SmellScope 2.1 Scientific Workstation E2E Verification", () => {
  test("Complete 5-Stage Scientific Audit, Diagnostics, Remediation & Verification Workflow", async ({ page }) => {
    // Set higher timeout for ML model training and null calibration
    test.setTimeout(90000);

    // 1. Home Screen & Scientific Disclaimer
    await page.goto("/");
    await expect(page).toHaveTitle(/SmellScope 2.1/i);
    await expect(page.getByRole("heading", { name: "SMELLSCOPE" })).toBeVisible();
    await expect(page.getByText("Scientific Auditor · NIDS Benchmark Trust")).toBeVisible();
    await expect(
      page.getByText("SmellScope is a scientific benchmark dataset auditor, NOT an active intrusion detection system.")
    ).toBeVisible();
    await expect(page.getByText(/SMELLSCOPE 2.1 — BEGINNER-FRIENDLY SCIENTIFIC WORKSTATION/i)).toBeVisible();
    await expect(page.getByText("Understand whether your NIDS benchmark dataset can be trusted.")).toBeVisible();

    // 2. Navigation to New Audit Screen (Step 1-2)
    const beginAuditBtn = page.getByRole("button", { name: /START YOUR FIRST AUDIT/i });
    await expect(beginAuditBtn).toBeVisible();
    await beginAuditBtn.click();
    await expect(page).toHaveURL(/.*\/audit/);
    await expect(page.getByText("Step 1 · Dataset Source")).toBeVisible();

    // Verify sample dataset dropdown and inspection card
    const selectElem = page.locator("select").first();
    await expect(selectElem).toBeVisible();
    await expect(page.locator("option[value='cic2017_sample_planted']")).toBeAttached();
    await expect(page.getByText("Dataset Fingerprint:")).toBeVisible();
    await expect(page.getByText("Loaded Flows")).toBeVisible();
    await expect(page.getByText("Locked Test (20%)")).toBeVisible();

    // 3. Trigger Real Multi-Class Scientific Audit
    const runAuditBtn = page.getByRole("button", { name: /RUN SCIENTIFIC AUDIT/i });
    await expect(runAuditBtn).toBeVisible();
    await runAuditBtn.click();

    // Wait for audit execution to complete and transition to Findings (/findings)
    await expect(page).toHaveURL(/.*\/findings/, { timeout: 60000 });
    await expect(page.getByText(/Cross-Class Smell Matrix/i)).toBeVisible();

    // 4. Step 3: Findings Screen (Smells, SFI & Taxonomy)
    // Verify heuristic column headers exist
    await expect(page.getByText("UGT").first()).toBeVisible();
    await expect(page.getByText("WL").first()).toBeVisible();
    await expect(page.getByText("HDF").first()).toBeVisible();
    await expect(page.getByText("PDD").first()).toBeVisible();
    await expect(page.getByText("TC").first()).toBeVisible();

    // Toggle Published reference values comparison
    const compareBtn = page.getByRole("button", { name: /Compare Published/i });
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();
    await expect(page.getByText(/Literature Comparison \[ON\]/i)).toBeVisible();

    // Switch to Shortcut Diagnostics tab
    await page.click("text=2. Shortcut Diagnostics (SFI & GGI)");
    await expect(page.getByText("Shortcut Fragility Index (SFI)").first()).toBeVisible();

    // Verify KPI Cards
    await expect(page.getByText("Baseline Test F1").first()).toBeVisible();
    await expect(page.getByText("Null Mean Fragility").first()).toBeVisible();
    await expect(page.getByText("Generalisation Gap (GGI)").first()).toBeVisible();

    // Verify Plotly Container is rendered
    const plotlyContainer = page.locator(".js-plotly-plot");
    await expect(plotlyContainer).toBeVisible({ timeout: 15000 });

    // Test Basic vs Advanced View Mode toggle
    const advBtn = page.getByRole("button", { name: "Advanced View" });
    await expect(advBtn).toBeVisible();
    await advBtn.click();

    // 5. Step 4: Remediation (Optional)
    const toRemediationBtn = page.getByRole("button", { name: /Remediation \(Optional\)/i }).first();
    await expect(toRemediationBtn).toBeVisible();
    await toRemediationBtn.click();
    await expect(page).toHaveURL(/.*\/remediation/);
    await expect(page.getByText(/OPTIONAL WORKFLOW STAGE/i)).toBeVisible();
    await expect(page.getByText("R1 Feature Ablation")).toBeVisible();
    await expect(page.getByText("R2 Flow Quarantine")).toBeVisible();

    // Generate Preview
    const previewBtn = page.getByRole("button", { name: /Generate What-If Preview/i });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Wait for RSM report card
    await expect(page.getByText("Remediation Safety Monitor (RSM) Authorization")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/RSM (PASS|WARN|BLOCK)/i).first()).toBeVisible();

    // 6. Step 5: Verification & Reports Screen
    const skipToReportsBtn = page.getByText(/Skip to Reports/i);
    await expect(skipToReportsBtn).toBeVisible();
    await skipToReportsBtn.click();
    await expect(page).toHaveURL(/.*\/reports/);
    await expect(page.getByText("Verification & Offline Reporting")).toBeVisible();
    await expect(page.getByText("Locked Test Partition Integrity Verification")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate Offline Report/i })).toBeVisible();
  });

  test("Direct Audit-to-Report Workflow (Remediation is Optional)", async ({ page }) => {
    test.setTimeout(60000);

    // Navigate to Home
    await page.goto("/");
    await expect(page.getByText(/SMELLSCOPE 2.1 — BEGINNER-FRIENDLY SCIENTIFIC WORKSTATION/i)).toBeVisible();

    // Navigate to Audit
    await page.getByRole("link", { name: "New Audit" }).click();
    await expect(page).toHaveURL(/.*\/audit/);

    // Verify that user can navigate to Reports directly
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL(/.*\/reports/);
    await expect(page.getByText("Verification & Offline Reporting")).toBeVisible();
  });
});
