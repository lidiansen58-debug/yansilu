import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) test(`example notes use ordinary search and reading at ${width}px without a demo workflow`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: "networkidle" });
  await waitFor(async () => assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote()?.id), "NOTE-YANSILU-CONTENTS"), 15000);
  assert.match(await page.locator('#statusText').innerText(), /已导入 Smart Notes Demo/);
  assert.equal(await page.locator("#demoGuidePanel, [data-smart-notes-demo-guide], [data-sidebar-flow-action^=open-demo]").count(), 0);
  assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /示例目录/);
  await page.screenshot({ path: `.tmp/demo-ordinary-${width}.png`, fullPage: false });
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects/WRITE-SMART-NOTES-DEMO")).status, 200);
  await page.locator("#btnToggleSearch").click();
  await page.locator("#globalNoteSearchInput").fill("关联笔记：选择对象并说明关系理由");
  await page.locator('[data-search-note="NOTE-YANSILU-RELATE"]').click();
  await page.waitForFunction(() => window.__prototypeEditor.activeNote()?.id === "NOTE-YANSILU-RELATE");
  assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /手动关联时打开关联表单/);
  assert.equal(await page.evaluate(() => "smartNotesDemoCompletedSteps" in window.__prototypeState), false);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await waitFor(async () => assert.equal(await page.evaluate(() => window.__prototypeState.module), "today"));
  assert.equal(await page.locator("[data-smart-notes-demo-guide]").count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
});
