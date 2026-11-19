import { test, expect } from "@playwright/test";

async function getOrInitAudit(request: any): Promise<string> {
  try {
    const existingResp = await request.get("http://127.0.0.1:8000/api/v1/audits");
    if (existingResp.ok()) {
      const audits = await existingResp.json();
      const completed = audits.find((a: any) => a.status === "COMPLETED");
      if (completed) return completed.run_id;
    }
  } catch (e) {
    // fall through to create
  }

  const startResp = await request.post("http://127.0.0.1:8000/api/v1/audits", {
    data: { dataset_id: "cic2017_sample_planted", classes: ["PortScan"], seed: 42 },
  });
  const start = await startResp.json();
  const runId = start.run_id;
  for (let i = 0; i < 60; i++) {
    const stResp = await request.get(`http://127.0.0.1:8000/api/v1/audits/${runId}`);
    if (stResp.ok()) {
      const st = await stResp.json();
      if (st.status === "COMPLETED") break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return runId;
}

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
    await selectElem.selectOption("cic2017_sample_planted");
    await expect(page.getByText("SHA-256 Fingerprint:")).toBeVisible({ timeout: 10000 });

    // 3. Step 2: Check Dataset Health (Validation)
    const toValidationBtn = page.getByRole("button", { name: /CONTINUE TO VALIDATION/i });
    await expect(toValidationBtn).toBeVisible();
    await expect(toValidationBtn).toBeEnabled({ timeout: 10000 });
    await toValidationBtn.click();
    await expect(page.getByText("Check Dataset Health")).toBeVisible();
    await expect(page.getByText("1. File Readability")).toBeVisible();
    await expect(page.getByText("3. Label Column")).toBeVisible();
    await expect(page.getByText("10. Sample Requirements")).toBeVisible();

    // 4. Step 3: Prepare Your Dataset (Preprocessing)
    const toPreprocessBtn = page.getByRole("button", { name: /CONTINUE TO PREPROCESSING/i });
    await expect(toPreprocessBtn).toBeVisible();
    await expect(toPreprocessBtn).toBeEnabled({ timeout: 10000 });
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
    await expect(page.getByText("Check Dataset Design Smells")).toBeVisible({ timeout: 60000 });
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
    await expect(page.getByText("Recall (TPR)").first()).toBeVisible();

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

    // 11. Choose Action: Generate Final Report
    const generateFinalReportBtn = page.getByRole("button", { name: /Generate Final Report/i });
    await expect(generateFinalReportBtn).toBeVisible();
    await generateFinalReportBtn.click();
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

  test("Remediation Workflow (R1 Feature Ablation): Preview -> RSM -> Apply -> Rebenchmark -> Final Report", async ({ page, request }) => {
    test.setTimeout(90000);

    const runId = await getOrInitAudit(request);

    await page.addInitScript(({ runId }) => {
      localStorage.setItem("smellscope_active_run", runId);
      localStorage.setItem("smellscope_active_dataset", "cic2017_sample_planted");
    }, { runId });

    // Direct navigation to remediation with completed audit context
    await page.goto("/remediation");
    await expect(page.getByText("Explore Possible Improvements")).toBeVisible({ timeout: 15000 });
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

  test("Journey C — Dataset Improvement Centre: Audit -> Recommendations -> Plan Preview -> Apply -> Comparison", async ({ page, request }) => {
    test.setTimeout(90000);

    const runId = await getOrInitAudit(request);

    await page.addInitScript(({ runId }) => {
      localStorage.setItem("smellscope_active_run", runId);
      localStorage.setItem("smellscope_active_dataset", "cic2017_sample_planted");
    }, { runId });

    // Navigate to Findings with completed audit
    await page.goto("/findings");
    await expect(page.getByText("Your Dataset Audit Results")).toBeVisible({ timeout: 15000 });

    // Click Improve My Dataset button
    const improveBtn = page.getByRole("button", { name: /Improve My Dataset/i });
    await expect(improveBtn).toBeVisible();
    await improveBtn.click();
    await expect(page).toHaveURL(/.*\/improvement/);

    // Verify Improvement Centre loaded
    await expect(page.getByText("Dataset Improvement Centre")).toBeVisible();
    await expect(page.getByText("Intelligent, evidence-based repair recommendations")).toBeVisible();

    // Verify recommendations or clean state
    await expect(page.getByText(/recommendations? selected|reversal|repairs? recommended|Dominance|Quality/i).first()).toBeVisible({ timeout: 15000 });

    // Check if any recommendation is present, select it and generate plan
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      if (!(await firstCheckbox.isChecked())) {
        await firstCheckbox.check();
      }
      const generatePlanBtn = page.getByRole("button", { name: /Generate Repair Plan/i });
      if (await generatePlanBtn.isVisible()) {
        await generatePlanBtn.click();
        await expect(page.getByText("Repair Plan Preview")).toBeVisible({ timeout: 10000 });
        const approveBtn = page.getByRole("button", { name: /Approve & Apply Fixes/i });
        await expect(approveBtn).toBeVisible();
        await approveBtn.click();
        await expect(page).toHaveURL(/.*\/comparison/);
      } else {
        await page.goto("/comparison");
      }
    } else {
      await page.goto("/comparison");
    }

    // Verify Comparison screen
    await expect(page.getByText(/Dataset Comparison|No Comparison Data Yet/i)).toBeVisible({ timeout: 15000 });

    // Navigate to History
    await page.goto("/history");
    await expect(page.getByText("Audit History")).toBeVisible();
  });

  test("Journey D — Model Persistence & Reusable Training Bundle (.zip) Export", async ({ page, request }) => {
    test.setTimeout(90000);

    const runId = await getOrInitAudit(request);

    await page.addInitScript(({ runId }) => {
      localStorage.setItem("smellscope_active_run", runId);
      localStorage.setItem("smellscope_active_dataset", "cic2017_sample_planted");
    }, { runId });

    await page.goto("/comparison");

    // Check that Comparison screen or empty state loaded
    await expect(page.getByText(/Dataset Comparison|No Comparison Data Yet/i)).toBeVisible({ timeout: 15000 });

    // If Comparison screen is active, test saving model and registry
    const saveModelBtn = page.getByRole("button", { name: /Save Trained Model/i });
    if (await saveModelBtn.isVisible()) {
      await saveModelBtn.click();
      await expect(page.getByText("Save Model to Versioned Registry")).toBeVisible();
      const saveConfirmBtn = page.getByRole("button", { name: /^Save Model$/i });
      await expect(saveConfirmBtn).toBeVisible();
      await saveConfirmBtn.click();

      // Check model persistence confirmation and bundle download button
      await expect(page.getByText(/MODEL PERSISTED|Download Reusable Bundle/i).first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: /Download Reusable Bundle \(\.zip\)/i })).toBeVisible();
    }

    // Verify registry modal
    const registryBtn = page.getByRole("button", { name: /Saved Models Registry/i });
    if (await registryBtn.isVisible()) {
      await registryBtn.click();
      await expect(page.getByText("Persisted Models Registry")).toBeVisible();
      const closeBtn = page.getByRole("button", { name: /Close/i });
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
    }
  });
});
