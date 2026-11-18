import { test, expect } from "@playwright/test";

test.describe("SmellScope 2.0 Scientific Workstation E2E Verification", () => {
  test("Complete 6-Screen Scientific Audit, Diagnostics & Remediation Workflow", async ({ page }) => {
    // Set higher timeout for scientific ML model training
    test.setTimeout(90000);

    // 1. App Shell & Scientific Auditor Disclaimer
    await page.goto("/");
    await expect(page).toHaveTitle(/SmellScope 2.0/i);
    await expect(page.getByRole("heading", { name: "SMELLSCOPE" })).toBeVisible();
    await expect(page.getByText(/Scientific Auditor · NIDS Benchmark Trust/i)).toBeVisible();
    await expect(
      page.getByText("SmellScope is a scientific benchmark dataset auditor, NOT an active intrusion detection system.")
    ).toBeVisible();

    // 2. Navigation to Dataset Ingestion Screen
    await page.click("text=Dataset Ingestion");
    await expect(page).toHaveURL(/.*\/ingestion/);
    await expect(page.getByText("Dataset Ingestion & Inspection")).toBeVisible();

    // Verify sample dataset dropdown and metadata card
    const selectElem = page.locator("select").first();
    await expect(selectElem).toBeVisible();
    await expect(page.locator("option[value='cic2017_sample_planted']")).toBeAttached();
    await expect(page.getByText("Inspection & Cryptographic Fingerprint")).toBeVisible();
    await expect(page.getByText("Loaded Flows")).toBeVisible();

    // 3. Trigger Real Multi-Class Scientific Audit
    const runAuditBtn = page.getByRole("button", { name: /RUN MULTI-CLASS AUDIT/i });
    await expect(runAuditBtn).toBeVisible();
    await runAuditBtn.click();

    // Wait for audit execution to complete and transition to Smell Matrix (/heatmap)
    await expect(page).toHaveURL(/.*\/heatmap/, { timeout: 60000 });
    await expect(page.getByText("Cross-Class Smell Matrix")).toBeVisible();

    // 4. Smell Matrix Screen & Literature Comparison
    // Verify heuristic column headers exist
    await expect(page.getByText("UGT").first()).toBeVisible();
    await expect(page.getByText("WL").first()).toBeVisible();
    await expect(page.getByText("HDF").first()).toBeVisible();
    await expect(page.getByText("PDD").first()).toBeVisible();
    await expect(page.getByText("TC").first()).toBeVisible();

    // Toggle EuroS&P 2024 published values comparison
    const compareBtn = page.getByRole("button", { name: /Compare Published/i });
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();
    await expect(page.getByText("Flood et al. EuroS&P 2024 Published Reference Values")).toBeVisible();
    await expect(page.getByText("DoS Hulk").first()).toBeVisible();

    // 5. Shortcut Diagnostics Screen & Interactive Plotly Chart
    await page.click("text=Shortcut Diagnostics");
    await expect(page).toHaveURL(/.*\/diagnostics/);
    await expect(page.getByText("Null-Calibrated Shortcut Fragility Index (SFI)")).toBeVisible();

    // Verify KPI Cards
    await expect(page.getByText("Baseline Test F1").first()).toBeVisible();
    await expect(page.getByText("Shortcut Fragility Index (SFI)").first()).toBeVisible();
    await expect(page.getByText("Null Mean Fragility").first()).toBeVisible();
    await expect(page.getByText("Generalisation Gap (GGI)").first()).toBeVisible();

    // Verify Plotly Container is rendered
    const plotlyContainer = page.locator(".js-plotly-plot");
    await expect(plotlyContainer).toBeVisible({ timeout: 15000 });

    // 6. Remediation Lab Screen & RSM Verification
    await page.click("text=Remediation Lab");
    await expect(page).toHaveURL(/.*\/remediation/);
    await expect(page.getByText("Remediation Lab & Remediation Safety Monitor (RSM)")).toBeVisible();

    // Verify R1 Feature Ablation and R2 Flow Quarantine options
    await expect(page.getByText("R1 Feature Ablation")).toBeVisible();
    await expect(page.getByText("R2 Flow Quarantine")).toBeVisible();

    // Generate Preview
    const previewBtn = page.getByRole("button", { name: /Generate What-If Preview/i });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Wait for RSM report card
    await expect(page.getByText("Remediation Safety Monitor (RSM) Authorization")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/RSM (PASS|WARN|BLOCK)/i).first()).toBeVisible();

    // 7. Overview Screen Verification
    await page.click("text=Overview");
    await expect(page).toHaveURL(/.*\/overview/);
    await expect(page.getByText("SMELLSCOPE 2.0 WORKSTATION")).toBeVisible();

    // 8. Verification & Reports Screen
    await page.click("text=Verification & Reports");
    await expect(page).toHaveURL(/.*\/reports/);
    await expect(page.getByText("Verification & Offline Reporting")).toBeVisible();
    await expect(page.getByText("Locked Test Partition Integrity Verification")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate Offline Report/i })).toBeVisible();
  });
});
