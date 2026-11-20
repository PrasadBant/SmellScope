import { test, expect, APIRequestContext, Page } from "@playwright/test";

const API = "http://127.0.0.1:8000/api/v1";

/** Deterministic pseudo-random generator so datasets are identical on every run. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * BENIGN and DDoS rows are unique; "Rare" has 100 rows built from only `rareUnique` distinct rows.
 * Deduplication therefore removes most of "Rare": 18 distinct rows -> WARN, 3 distinct rows -> BLOCK.
 */
function buildCsv(rareUnique: number): string {
  const rnd = lcg(7);
  const row = (label: string, offset: number) =>
    [Math.floor(rnd() * 59999) + 1, rnd() * 1e5 + offset, Math.floor(rnd() * 499) + 1, rnd() * 1e4, label];
  const lines: (string | number)[][] = [];
  for (let i = 0; i < 300; i++) lines.push(row("BENIGN", 0));
  for (let i = 0; i < 100; i++) lines.push(row("DDoS", 2e5));
  const rareBase = Array.from({ length: rareUnique }, () => row("Rare", 5e5));
  for (let i = 0; i < 100; i++) lines.push(rareBase[i % rareUnique]);
  const header = "Destination Port,Flow Duration,Total Fwd Packets,Flow Bytes/s,Label";
  return [header, ...lines.map((r) => r.join(","))].join("\n");
}

async function auditedDataset(request: APIRequestContext, rareUnique: number): Promise<{ runId: string; datasetId: string }> {
  const up = await request.post(`${API}/datasets/upload`, {
    multipart: { file: { name: `rsm_e2e_${rareUnique}.csv`, mimeType: "text/csv", buffer: Buffer.from(buildCsv(rareUnique)) } },
  });
  expect(up.ok()).toBeTruthy();
  const datasetId = (await up.json()).dataset_id as string;
  const val = await request.post(`${API}/datasets/${datasetId}/validate`, { data: { label_col: "Label", benign_label: "BENIGN" } });
  expect(val.ok()).toBeTruthy();
  const start = await request.post(`${API}/audits`, { data: { dataset_id: datasetId, seed: 42 } });
  const runId = (await start.json()).run_id as string;
  for (let i = 0; i < 240; i++) {
    const st = await (await request.get(`${API}/audits/${runId}`)).json();
    if (st.status === "COMPLETED") return { runId, datasetId };
    if (st.status === "FAILED") throw new Error(`audit failed: ${st.error_message}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("audit timed out");
}

async function openPlanPreview(page: Page, runId: string, datasetId: string) {
  await page.addInitScript(({ runId, datasetId }) => {
    localStorage.setItem("smellscope_active_run", runId);
    localStorage.setItem("smellscope_active_dataset", datasetId);
  }, { runId, datasetId });
  await page.goto("/improvement");
  await expect(page.getByText("Dataset Improvement Centre")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Duplicate Network Flow Records")).toBeVisible({ timeout: 20000 });

  // Select only the duplicate-removal repair (it is the one that shrinks the "Rare" class).
  await page
    .getByText("Duplicate Network Flow Records")
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]//input[@type="checkbox"]')
    .check();
  await page.getByRole("button", { name: /Generate Repair Plan/i }).click();
  await expect(page.getByText("Repair Plan Preview")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("rsm-safety-check")).toBeVisible({ timeout: 30000 });
}

test.describe("RSM — Dataset Safety Check", () => {
  test("BLOCK: exact reason is shown, Apply is disabled, and the backend rejects a direct apply", async ({ page, request }) => {
    test.setTimeout(180000);
    const { runId, datasetId } = await auditedDataset(request, 3);
    await openPlanPreview(page, runId, datasetId);

    // Beginner introduction + decision
    await expect(page.getByText("Dataset Safety Check")).toBeVisible();
    await expect(page.getByText(/protects your dataset from excessive cleaning/i)).toBeVisible();
    await expect(page.getByTestId("rsm-safety-check")).toHaveAttribute("data-rsm-status", "BLOCK");
    await expect(page.getByText("BLOCK — Repair cannot be applied")).toBeVisible();
    await expect(page.getByText(/SmellScope will not apply this repair plan/)).toBeVisible();

    // Exact blocked condition with the real class and thresholds
    const issue = page.getByTestId("rsm-issue").first();
    await expect(issue).toContainText("Rare");
    await expect(issue).toContainText("below 20%");
    await expect(issue).toContainText("Retention");

    // Class protection lists every class with the affected one highlighted
    const rows = page.getByTestId("rsm-class-row");
    await expect(rows).toHaveCount(3);
    await expect(page.locator('[data-testid="rsm-class-row"][data-class="Rare"]')).toContainText("BLOCK");
    await expect(page.locator('[data-testid="rsm-class-row"][data-class="BENIGN"]')).toContainText("PASS");

    // Guidance, no acknowledgement checkbox, disabled apply button
    await expect(page.getByTestId("rsm-block-guidance")).toContainText("Generate a new preview");
    await expect(page.getByTestId("rsm-ack")).toHaveCount(0);
    const applyBtn = page.getByRole("button", { name: /Apply Disabled — Plan Blocked/i });
    await expect(applyBtn).toBeDisabled();

    // Locked test-set protection is shown separately and verified
    await expect(page.getByTestId("rsm-test-protection")).toContainText("Test-set integrity: VERIFIED");

    // Bypassing the UI does not help: the backend refuses even with acknowledgement.
    const preview = await (await request.post(`${API}/audits/${runId}/repair-plan/preview`, {
      data: { selected_recs: (await (await request.get(`${API}/audits/${runId}/recommendations`)).json()).recommendations.filter((r: any) => r.id === "rec_dq_duplicate_rows") },
    })).json();
    const direct = await request.post(`${API}/audits/${runId}/repair-plan/apply`, {
      data: { preview_id: preview.preview_id, plan_hash: preview.plan_hash, approval: { approved: true, warning_ack: true } },
    });
    expect(direct.status()).toBe(403);
    expect((await direct.json()).detail.code).toBe("E_RSM_BLOCK");

    // The refusal is on the record and nothing was applied.
    const records = (await (await request.get(`${API}/audits/${runId}/rsm-records`)).json()).records;
    expect(records.some((r: any) => r.event === "APPLY_REJECTED" && r.outcome === "E_RSM_BLOCK")).toBeTruthy();
    expect((await request.get(`${API}/audits/${runId}/export/dataset`)).status()).toBe(404);
  });

  test("WARN: acknowledgement is required, then the plan applies and a Safety Record is shown", async ({ page, request }) => {
    test.setTimeout(180000);
    const { runId, datasetId } = await auditedDataset(request, 18);
    await openPlanPreview(page, runId, datasetId);

    await expect(page.getByTestId("rsm-safety-check")).toHaveAttribute("data-rsm-status", "WARN");
    await expect(page.getByText("WARN — Review before applying")).toBeVisible();
    const issue = page.getByTestId("rsm-issue").first();
    await expect(issue).toContainText("Rare");
    await expect(issue).toContainText("below 50%");
    await expect(issue).toContainText("Records remaining");

    // Apply is blocked until the acknowledgement is ticked; it is never pre-ticked.
    const applyBtn = page.getByRole("button", { name: /Apply Despite Warnings/i });
    await expect(applyBtn).toBeDisabled();
    const ack = page.getByTestId("rsm-ack").locator('input[type="checkbox"]');
    await expect(ack).not.toBeChecked();
    await expect(page.getByText(/I have reviewed the safety warnings and understand the possible impact/)).toBeVisible();
    await ack.check();
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // Post-improvement Safety Record
    const record = page.getByTestId("rsm-safety-record");
    await expect(record).toBeVisible({ timeout: 60000 });
    await expect(record).toHaveAttribute("data-outcome", "APPLIED");
    await expect(page.getByTestId("rsm-record-message")).toContainText("reviewing and acknowledging the safety warning");
    await expect(record).toContainText("Backend decision at apply");
    await expect(record).toContainText("view_0001");
    await expect(record).toContainText("VERIFIED");
    await expect(record).toContainText("Rare");

    // The recorded values are the backend's, and they match the stored safety log.
    const records = (await (await request.get(`${API}/audits/${runId}/rsm-records`)).json()).records;
    const applied = records.find((r: any) => r.event === "APPLIED");
    expect(applied.acknowledged).toBe(true);
    expect(applied.apply_decision).toBe("WARN");

    await page.getByTestId("goto-comparison").click();
    await expect(page).toHaveURL(/.*\/comparison/);
  });
});
