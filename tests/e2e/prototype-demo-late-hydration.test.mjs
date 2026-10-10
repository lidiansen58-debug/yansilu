import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("a real completed demo import cannot navigate away from writing after its delayed response", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase, vaultPath } = h;
  const user = (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_fleeting_default", body: "# 导入等待期间保留我的记录\n\n保留 café 🌿。"
  })).json.item;
  const file = path.join(vaultPath, user.markdownPath), before = await fs.readFile(file);
  let release, importedResult;
  const held = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  await page.route("**/demo/product-thinking/smart-notes", async route => {
    const response = await route.fetch();
    assert.equal(response.status(), 200);
    importedResult = await response.json();
    await held;
    await route.fulfill({ response });
  });
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="desktop-help"]').click();
  const help = page.locator("details.settings-help-task", { has: page.getByText("查看一套完整示例", { exact: true }) });
  await help.locator("summary").click();
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#settingsImportSmartNotesDemo").click();
  await waitFor(async () => assert.ok(importedResult), 15000);
  const imported = importedResult.item;
  assert.ok(imported.directoryId);
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#writingPanel:visible").waitFor();
  await page.locator('[data-writing-sidebar-action="topics"]').click();
  await page.locator('[data-writing-index-card-id="THEME-INDEX-TO-WRITING"] button').click();
  await page.locator('[data-writing-tab="theme"]').click();
  await page.locator("#writingTitle").fill("这是用户正在写的新题目");
  const currentStatus = await page.locator("#statusText").textContent();
  const currentSelection = await page.evaluate(() => {
    const s = window.__prototypeState;
    return [s.browserRootId, s.selectedFolderId, s.selectedFileId, s.activeTabId];
  });
  release();
  await waitFor(async () => assert.equal(await page.locator("#settingsImportSmartNotesDemo").isEnabled(), true));
  assert.equal(await page.locator("#writingPanel").isVisible(), true);
  assert.equal(await page.locator("#writingTitle").inputValue(), "这是用户正在写的新题目");
  assert.equal(await page.locator("#statusText").textContent(), currentStatus);
  assert.deepEqual(await page.evaluate(() => {
    const s = window.__prototypeState;
    return [s.browserRootId, s.selectedFolderId, s.selectedFileId, s.activeTabId];
  }), currentSelection);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${imported.firstNoteId}`)).status, 200);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${user.id}`)).json.item.body, user.body);
  assert.deepEqual(await fs.readFile(file), before);
});
