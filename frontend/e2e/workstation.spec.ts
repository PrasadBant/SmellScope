import { test, expect } from "@playwright/test";

test.describe("SmellScope 2.1 Complete Guided Scientific Workflow E2E Verification", () => {
  test("Path A — No Remediation: Complete 13-Step Guided Audit directly to Offline Report", async ({ page }) => {
    // Generous timeout for ML model training and Monte Carlo draws
    test.setTimeout(90000);

    // 1. Home Screen & Scientific Integrity Disclaimer
    await page.goto("/");
    await expect(page).toHaveTitle(/SmellScope 2.1/i);
    await expect(page.getByRole("heading", { name: "SMELLSCOPE" })).toBeVisible();
    await expect(page.getByText("Scientific Auditor · NIDS Benchmark Trust")).toBeVisible();
    await expect(
      page.getByText("SmellScope is a scientific benchmark dataset auditor, NOT an active intrusion detection system.")
    ).toBeVisible();

    // 2. Step 1: Upload Your Dataset (Stage 01: Dataset)
    const startAuditBtn = page.getByRole("button", { name: /START YOUR FIRST AUDIT/i });
    await expect(startAuditBtn).toBeVisible();
    await startAuditBtn.click();
    await expect(page).toHaveURL(/.*\/dataset/);
    await expect(page.getByText("Upload Your Dataset")).toBeVisible();

    // Select standard benchmark and inspect fingerprint
    const selectElem = page.locator("select").first();
    await expect(selectElem).toBeVisible();
    await expect(page.locator("option[value='cic2017_sample_planted']")).toBeAttached();
    await expect(page.getByText("SHA-256 Fingerprint:")).toBeVisible();

    // 3. Step 2: Check Dataset Health (Validation)
    const toValidationBtn = page.getByRole("button", { name: /CONTINUE TO VALIDATION/i });
    await expect(toValidationBtn).toBeVisible();
    await toValidationBtn.click();
    await expect(page.getByText("Check Dataset Health")).toBeVisible();
    await expect(page.getByText("1. File Readability")).toBeVisible();
    await expect(page.getByText("3. Label Column")).toBeVisible();
    await expect(page.getByText("10. Sample Requirements")).toBeVisible();

    // 4. Step 3: Prepare Your Dataset (Preprocessing)
    const toPreprocessBtn = page.getByRole("button", { name: /CONTINUE TO PREPROCESSING/i });
    await expect(toPreprocessBtn).toBeVisible();
    await toPreprocessBtn.click();
    await expect(page.getByText("Prepare Your Dataset")).toBeVisible();
    await expect(page.getByText("Retained Rows")).toBeVisible();
    await expect(page.getByText("Locked Test Partition (20%)")).toBeVisible();

    // 5. Transition to Stage 02: Audit
    const toAuditBtn = page.getByRole("button", { name: /CONTINUE TO AUDIT/i });
    await expect(toAuditBtn).toBeVisible();
    await toAuditBtn.click();
    await expect(page).toHaveURL(/.*\/audit/);

    // Launch Scientific Audit
    const runAuditBtn = page.getByRole("button", { name: /RUN SCIENTIFIC AUDIT/i });
    await expect(runAuditBtn).toBeVisible();
    await runAuditBtn.click();

    // 6. Step 4: Check Dataset Design Smells (Five Heuristics)
    await expect(page.getByText("Check Dataset Design Smells"), { timeout: 60000 }).toBeVisible();
    await expect(page.getByText("UGT").first()).toBeVisible();
    await expect(page.getByText("WL").first()).toBeVisible();
    await expect(page.getByText("HDF").first()).toBeVisible();
    await expect(page.getByText("PDD").first()).toBeVisible();
    await expect(page.getByText("TC").first()).toBeVisible();

    // Toggle literature comparison
    const compareBtn = page.getByRole("button", { name: /Compare Published/i });
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();
    await expect(page.getByText(/Literature Comparison \[ON\]/i)).toBeVisible();

    // 7. Step 5: Establish Baseline Performance
    const toBaselineBtn = page.getByRole("button", { name: /CONTINUE TO BASELINE EVALUATION/i });
    await expect(toBaselineBtn).toBeVisible();
    await toBaselineBtn.click();
    await expect(page.getByText("Establish Baseline Performance")).toBeVisible();
    await expect(page.getByText("Baseline Test F1")).toBeVisible();
    await expect(page.getByText("Recall (TPR)")).toBeVisible();

    // 8. Step 6: Investigate Shortcut Sensitivity (SFI)
    const toSfiBtn = page.getByRole("button", { name: /CONTINUE TO SHORTCUT ANALYSIS/i });
    await expect(toSfiBtn).toBeVisible();
    await toSfiBtn.click();
    await expect(page.getByText("Investigate Shortcut Sensitivity")).toBeVisible();
    await expect(page.getByText("Shortcut Fragility Index (SFI)")).toBeVisible();
    const plotlyContainer = page.locator(".js-plotly-plot");
    await expect(plotlyContainer).toBeVisible({ timeout: 15000 });

    // 9. Step 7: Test Model Generalisation (GGI)
    const toGgiBtn = page.getByRole("button", { name: /CONTINUE TO GENERALISATION ANALYSIS/i });
    await expect(toGgiBtn).toBeVisible();
    await toGgiBtn.click();
    await expect(page.getByText("Test Model Generalisation")).toBeVisible();
    await expect(page.getByText("Generalisation Gap Index (GGI)")).toBeVisible();

    // 10. Step 8: Complete Audit Findings (Stage 03: Findings)
    const toFindingsBtn = page.getByRole("button", { name: /VIEW AUDIT FINDINGS/i });
    await expect(toFindingsBtn).toBeVisible();
    await toFindingsBtn.click();
    await expect(page).toHaveURL(/.*\/findings/);
    await expect(page.getByText("Your Dataset Audit Results")).toBeVisible();

    // 11. Choose Path B: Skip Remediation — Go to Final Report
    const skipRemediationBtn = page.getByRole("button", { name: /Skip Remediation — Go to Final Report/i });
    await expect(skipRemediationBtn).toBeVisible();
    await skipRemediationBtn.click();
    await expect(page).toHaveURL(/.*\/reports/);

    // 12. Step 12: Verify the Impact (Original Baseline card shown without fake comparison)
    await expect(page.getByText("Verify the Impact")).toBeVisible();
    await expect(page.getByText("Original Benchmark Baseline Audit (No Remediation Applied)")).toBeVisible();
    await expect(page.getByText("Locked Test Partition Integrity Verification")).toBeVisible();

    // 13. Step 13: Your SmellScope Audit Report
    const toReportBtn = page.getByRole("button", { name: /PROCEED TO FINAL REPORT/i });
    await expect(toReportBtn).toBeVisible();
    await toReportBtn.click();
    await expect(page.getByText("Your SmellScope Audit Report")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate Offline Report/i })).toBeVisible();
  });

  test("Path B — With Remediation: Preview -> RSM -> Apply -> Rebenchmark -> Final Report", async ({ page }) => {
    test.setTimeout(90000);

    // Navigate to Findings with already completed audit
    await page.goto("/findings");
    await expect(page.getByText("Your Dataset Audit Results")).toBeVisible({ timeout: 15000 });

    // Click Explore Remediation
    const exploreRemediationBtn = page.getByRole("button", { name: /Explore Remediation/i });
    await expect(exploreRemediationBtn).toBeVisible();
    await exploreRemediationBtn.click();
    await expect(page).toHaveURL(/.*\/remediation/);

    // Step 9: Explore Possible Improvements
    await expect(page.getByText("Explore Possible Improvements")).toBeVisible();
    await expect(page.getByText("R1 Feature Ablation")).toBeVisible();

    // Continue to Step 10: Safety Check (RSM)
    const toSafetyBtn = page.getByRole("button", { name: /CONTINUE TO SAFETY CHECK/i });
    await expect(toSafetyBtn).toBeVisible();
    await toSafetyBtn.click();

    // Verify RSM card
    await expect(page.getByText("Check Remediation Safety")).toBeVisible();
    await expect(page.getByText("Remediation Safety Monitor (RSM) Authorization")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/RSM (PASS|WARN|BLOCK)/i)).toBeVisible();

    // Step 11: Apply Approved Remediation
    const applyBtn = page.getByRole("button", { name: /APPLY APPROVED REMEDIATION/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();
    await expect(page.getByText("Apply Approved Changes")).toBeVisible();
    await expect(page.getByText("Cryptographic View Lineage & Rollback Ledger")).toBeVisible();

    // Step 12: Re-Benchmark Model
    const rebenchmarkBtn = page.getByRole("button", { name: /RE-BENCHMARK MODEL/i });
    await expect(rebenchmarkBtn).toBeVisible();
    await rebenchmarkBtn.click();
    await expect(page).toHaveURL(/.*\/reports/);
    await expect(page.getByText("Verify the Impact")).toBeVisible();

    // Step 13: Final Report
    const toFinalReportBtn = page.getByRole("button", { name: /PROCEED TO FINAL REPORT/i });
    await expect(toFinalReportBtn).toBeVisible();
    await toFinalReportBtn.click();
    await expect(page.getByText("Your SmellScope Audit Report")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate Offline Report/i })).toBeVisible();
  });
});
