import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { scheduledTaskPayloadFromForm } from "../../apps/web/src/scheduled-tasks-model.js";

async function stackFor(t) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t); return pw ? startPrototypeStack(t, pw) : null;
}
async function installAsyncConfirm(page) {
  await page.evaluate(() => {
    window.__manualConfirmTest = { pending: [], messages: [] };
    window.confirm = message => new Promise(resolve => {
      window.__manualConfirmTest.messages.push(message); window.__manualConfirmTest.pending.push(resolve);
    });
  });
}
async function decide(page, accepted) {
  await page.waitForFunction(() => window.__manualConfirmTest.pending.length === 1);
  await page.evaluate(accepted => window.__manualConfirmTest.pending.shift()(accepted), accepted);
}

test("visible help Demo import waits for async confirmation, cancels safely and imports once after approval", async t => {
  const h = await stackFor(t); if (!h) return;
  const { page, apiBase, vaultPath } = h;
  const user = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 用户原有记录\n\n保留 café 🌿。" })).json.item;
  const file = path.join(vaultPath, user.markdownPath), before = await fs.readFile(file);
  const requests = [];
  page.on("request", req => { if (req.method() === "POST" && req.url().endsWith("/demo/product-thinking/smart-notes")) requests.push(req.url()); });
  const open = async () => {
    await page.locator('.rail-btn[data-module="settings"]').click();
    await page.locator('[data-settings-item="desktop-help"]').click();
    const details = page.locator("details.settings-help-task", { has: page.getByText("查看一套完整示例", { exact: true }) });
    if (!await details.evaluate(el => el.open)) await details.locator("summary").click();
    await page.locator("#settingsImportSmartNotesDemo").waitFor({ state: "visible" });
  };
  await open(); await installAsyncConfirm(page);
  const button = page.locator("#settingsImportSmartNotesDemo");
  await button.click(); await page.waitForFunction(() => window.__manualConfirmTest.pending.length === 1);
  assert.equal(await button.isDisabled(), true); assert.equal(requests.length, 0);
  assert.deepEqual(await fs.readFile(file), before);
  await decide(page, false);
  await waitFor(async () => { assert.equal(await button.isEnabled(), true); assert.match(await page.locator("#settingsImportSmartNotesDemoStatus").innerText(), /已取消/); });
  assert.equal(requests.length, 0);
  await button.click(); await page.waitForFunction(() => window.__manualConfirmTest.pending.length === 1);
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#writingPanel:visible").waitFor();
  await page.waitForLoadState("networkidle");
  const latestStatus = await page.locator("#statusText").textContent();
  await decide(page, true);
  await waitFor(async () => assert.equal(await button.isEnabled(), true));
  assert.equal(requests.length, 0, "Changed navigation invalidates the old import approval");
  assert.equal(await page.locator("#statusText").textContent(), latestStatus, "Old cancellation cannot replace feedback from the new page");
  await open(); await button.click();
  const importResponse = page.waitForResponse(response => response.request().method() === "POST"
    && response.url().endsWith("/demo/product-thinking/smart-notes"));
  await decide(page, true);
  await waitFor(async () => {
    assert.equal(requests.length, 1);
    assert.match(await page.locator("#settingsImportSmartNotesDemoStatus").textContent(), /示例已导入/);
  }, 15000);
  const response = await importResponse;
  assert.equal(response.status(), 200);
  const imported = (await response.json()).item;
  assert.equal(imported.directoryId, "dir_demo_smart_notes_product_thinking_original");
  const directories = await fetchJson(apiBase, "/api/v1/directories");
  assert.equal(directories.status, 200);
  assert.ok(directories.json.items.some(item => item.id === imported.directoryId));
  const guides = await fetchJson(apiBase, `/api/v1/directories/${imported.directoryId}/notes`);
  assert.equal(guides.status, 200);
  const notes = guides.json.items;
  assert.ok(notes.length > 1);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${imported.firstNoteId}`)).status, 200);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${user.id}`)).json.item.body, user.body);
  assert.deepEqual(await fs.readFile(file), before);
});

test("visible unlimited-rule activation and fee confirmation await decisions without running AI on cancellation", async t => {
  const h = await stackFor(t); if (!h) return;
  const { page, apiBase, vaultPath } = h;
  const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 整理规则确认\n\n取消不改变正文。" })).json.item;
  const before = await fs.readFile(path.join(vaultPath, note.markdownPath));
  const created = await postJson(apiBase, "/api/v1/ai/scheduled-tasks", scheduledTaskPayloadFromForm({
    templateId: "reflection_reminder", name: "确认后启用的无限范围规则", status: "paused", scheduleType: "manual_only"
  }));
  assert.ok([200, 201].includes(created.status), JSON.stringify(created.json));
  const id = created.json.item.scheduledTaskId;
  const readRule = async () => (await fetchJson(apiBase, "/api/v1/ai/scheduled-tasks?limit=100")).json.items.find(item => item.scheduledTaskId === id);
  const requests = [];
  page.on("request", req => { if (req.method() === "POST" && req.url().includes("/ai/scheduled-tasks/")) requests.push(req.url()); });
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="automation"]').click();
  await page.locator('label[for="settingsAutomationTabRules"]').click();
  const activate = page.locator(`[data-scheduled-task-status="active"][data-scheduled-task-id="${id}"]`);
  await activate.waitFor({ state: "visible" }); await installAsyncConfirm(page);
  await activate.click(); await page.waitForFunction(() => window.__manualConfirmTest.pending.length === 1);
  await activate.click(); assert.equal(await page.evaluate(() => window.__manualConfirmTest.messages.length), 1);
  assert.equal((await readRule()).status, "paused"); assert.deepEqual(requests, []);
  await decide(page, false); assert.equal((await readRule()).status, "paused");
  await activate.click(); await decide(page, true);
  await waitFor(async () => assert.equal((await readRule()).status, "active"));
  assert.equal(requests.length, 1);
  await page.locator("#btnScheduledTasksRunDue").click();
  await page.waitForFunction(() => window.__manualConfirmTest.pending.length === 1);
  assert.equal(requests.length, 1);
  await decide(page, false); assert.equal(requests.length, 1);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
  assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), before);
});
