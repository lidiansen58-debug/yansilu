import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("relation responses from the previous vault are ignored after a real vault switch", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const source = (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# 旧笔记库来源\n\n独立观点。"
  })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${source.id}"]`).click();
  await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
  let release, entered;
  const held = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  t.after(() => release());
  const endpoint = `**/api/v1/notes/${source.id}/relations`;
  await page.route(endpoint, async route => {
    const response = await route.fetch();
    entered();
    await held;
    await route.fulfill({ response });
  });
  await page.evaluate(id => {
    const editor = window.__prototypeEditor;
    const apply = editor.applyRelationNetworkStatusesFromRelations.bind(editor);
    window.__relationAppliedAfterSwitch = 0;
    editor.applyRelationNetworkStatusesFromRelations = (...args) => { window.__relationAppliedAfterSwitch++; return apply(...args); };
    window.__heldRelationRefresh = editor.refreshRelationNetworkStatuses(id);
  }, source.id);
  await started;
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="current-vault"]').click();
  const nextVault = path.join(vaultPath, "test-next-vault");
  await page.locator("#settingsVaultPath").fill(nextVault);
  await page.locator("#settingsSwitchVault").click();
  await waitFor(async () => {
    assert.equal(path.resolve((await fetchJson(apiBase, "/health")).json.vaultPath), path.resolve(nextVault));
    assert.equal(path.resolve(await page.evaluate(() => window.__prototypeEditor.vaultScope())), path.resolve(nextVault));
  });
  release();
  await page.evaluate(() => window.__heldRelationRefresh);
  assert.equal(await page.evaluate(() => window.__relationAppliedAfterSwitch), 0);
  assert.ok(!(await page.evaluate(() => window.__prototypeState.notes.map(note => note.id))).includes(source.id));
});
