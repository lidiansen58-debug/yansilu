import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { snapshotDemoNoteInventory } from "./prototype-demo-inventory-helpers.mjs";

test("a late first writing entry cannot replace the themes of a second visible entry", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const h = await startPrototypeStack(t, pw);
  if (!h) return;
  const { page, apiBase, webBase } = h;
  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: "networkidle" });
  await waitFor(async () => assert.equal(await page.evaluate(() => window.__prototypeState.selectedFileId), "NOTE-YANSILU-CONTENTS"), 15000);
  const inventory = await snapshotDemoNoteInventory(apiBase);
  let release, began, finished, held = false;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { began = resolve; });
  const done = new Promise(resolve => { finished = resolve; });
  await page.route("**/api/v1/index-cards?*", async route => {
    const url = new URL(route.request().url());
    if (held || url.searchParams.get("directoryId") !== "dir_yansilu_usage_notes") return route.continue();
    held = true;
    try {
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      assert.deepEqual((await response.json()).items, []);
      began(); await gate; await route.fulfill({ response });
    } finally { finished(); }
  });
  try {
    await page.locator('.rail-btn[data-module="writing"]').click();
    await Promise.race([started, new Promise((_, reject) => setTimeout(() => reject(new Error("Scoped writing request was not reached")), 10000).unref())]);
    await page.locator('.rail-btn[data-module="today"]').click();
    await page.locator('.rail-btn[data-module="writing"]').click();
    const resume = page.locator('[data-writing-index-card-id="THEME-INDEX-TO-WRITING"] button.primary');
    await resume.waitFor({ state: "visible", timeout: 10000 });
    await waitFor(async () => assert.equal(await resume.getAttribute("data-writing-project-id"), "WRITE-SMART-NOTES-DEMO"), 10000);
    release(); await done;
    await page.waitForLoadState("networkidle");
    assert.equal(await resume.isVisible(), true);
    await resume.click();
    await page.locator("#writingDocumentEditor:visible").waitFor();
    assert.match(await page.locator("#writingDocumentEditor").innerText(), /研思录使用说明/);
    assert.deepEqual(await snapshotDemoNoteInventory(apiBase), inventory);
  } finally {
    release();
    if (held) await done;
  }
});
