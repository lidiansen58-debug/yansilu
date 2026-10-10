import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, postJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("visible relation input survives async Escape cancellation, changed input and duplicate keys; approved dismissal keeps saved data", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw); if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const notes = [];
  for (const title of ["确认关联来源", "确认关联目标"]) {
    const created = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", body: `# ${title}\n\n保留正文。` });
    assert.equal(created.status, 201); notes.push(created.json.item);
  }
  const created = await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
    toNoteId: notes[1].id, relationType: "supports", rationale: "已保存的关联依据。", status: "confirmed"
  });
  assert.equal(created.status, 201);
  const relationId = created.json.item.id;
  const readRelations = async () => (await fetchJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`)).json.item;
  const savedRelations = await readRelations();
  const files = await Promise.all(notes.map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  const mutations = [];
  page.on("request", request => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && /\/api\/v1\/(relations|notes)\//.test(request.url())) mutations.push(request.url());
  });
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${notes[0].id}"]`).click();
  await page.locator("#btnShowRelated").click();
  await page.locator('#relatedPanel [data-permanent-workspace-tab="relations"]:visible').click();
  await page.locator('#relatedPanel [data-relation-tab="external"]').click();
  const edit = () => page.locator(`#relatedPanel [data-relation-action="open-edit"][data-relation-id="${relationId}"]`).click();
  await edit();
  const workspace = page.locator("[data-permanent-relation-workspace]");
  await workspace.waitFor({ state: "visible" });
  await page.evaluate(() => {
    window.__overlayConfirmTest = { pending: [], messages: [] };
    window.confirm = message => new Promise(resolve => {
      window.__overlayConfirmTest.messages.push(message);
      window.__overlayConfirmTest.pending.push(resolve);
    });
  });
  const input = workspace.locator('textarea[name="rationale"]');
  await input.fill("未保存的关联输入 café 🌿。");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__overlayConfirmTest.pending.length === 1);
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.__overlayConfirmTest.messages.length), 1);
  assert.equal(await workspace.isVisible(), true);
  assert.equal(await input.inputValue(), "未保存的关联输入 café 🌿。");
  await page.evaluate(() => window.__overlayConfirmTest.pending.shift()(false));
  await waitFor(async () => { assert.equal(await workspace.isVisible(), true); assert.match(await input.inputValue(), /未保存的关联输入/); });

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__overlayConfirmTest.pending.length === 1);
  await input.fill("等待确认期间的新输入，需要保留。");
  await page.evaluate(() => window.__overlayConfirmTest.pending.shift()(true));
  await waitFor(async () => { assert.equal(await input.inputValue(), "等待确认期间的新输入，需要保留。"); });
  assert.equal(await workspace.isVisible(), true);

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__overlayConfirmTest.pending.length === 1);
  await page.evaluate(() => window.__overlayConfirmTest.pending.shift()(true));
  await workspace.waitFor({ state: "detached" });
  assert.deepEqual(await readRelations(), savedRelations);
  assert.deepEqual(mutations, []);
  await edit();
  assert.equal(await input.inputValue(), "已保存的关联依据。");
  await workspace.locator('[data-permanent-relation-action="close"]').click();
  await page.locator("#btnHideRelated").click();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#writingPanel:visible").waitFor();
  assert.deepEqual(await readRelations(), savedRelations);
  for (let index = 0; index < notes.length; index++) {
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${notes[index].id}`)).json.item.body, notes[index].body);
    assert.deepEqual(await fs.readFile(path.join(vaultPath, notes[index].markdownPath)), files[index]);
  }
});
