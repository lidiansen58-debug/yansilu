import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("visible relation deletion awaits native-shaped confirmation, cancellation preserves data and incoming deletion updates graph", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  const notes = [];
  for (const role of ["来源", "目标"]) {
    notes.push((await createWritingReadyPermanentNote(apiBase, {
      title: `异步确认${role}`, body: `# 异步确认${role}\n\n关联操作不能删除笔记正文。`,
      thesis: "删除关联前需要等待明确确认。", threeLineSummary: ["先核对关联。", "再决定是否删除。", "保留原笔记正文。"],
      boundaryOrCounterpoint: "取消操作时应当保留已保存关系。"
    })).json.item);
  }
  const source = notes[0], target = notes[1];
  const created = await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
    toNoteId: target.id, relationType: "supports", rationale: "目标材料为来源判断提供依据。", status: "confirmed"
  });
  assert.equal(created.status, 201);
  const relationId = created.json.item.id;
  const readSource = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item;
  const originalRelations = await readSource();
  const originalFiles = await Promise.all(notes.map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  const deletes = [];
  page.on("request", request => {
    if (request.method() === "DELETE" && request.url().endsWith(`/api/v1/relations/${relationId}`)) deletes.push(request.url());
  });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: source.title }).click();
  await page.locator('#btnShowRelated').click();
  await page.locator('#relatedPanel [data-permanent-workspace-tab="relations"]:visible').click();
  await page.locator('#relatedPanel [data-relation-tab="external"]').click();
  await page.locator(`#relatedPanel [data-relation-action="open-edit"][data-relation-id="${relationId}"]`).click();
  const workspace = page.locator('[data-permanent-relation-workspace]');
  await workspace.waitFor({ state: "visible" });
  await page.evaluate(() => {
    const original = window.confirm;
    window.__nativeConfirmTest = { pending: [], messages: [], restore: () => { window.confirm = original; } };
    window.confirm = message => new Promise(resolve => {
      window.__nativeConfirmTest.messages.push(message);
      window.__nativeConfirmTest.pending.push(resolve);
    });
  });
  const remove = workspace.locator('[data-relation-action="delete"]');
  await remove.click();
  await page.waitForFunction(() => window.__nativeConfirmTest.pending.length === 1);
  assert.deepEqual(await readSource(), originalRelations);
  assert.equal(deletes.length, 0, "No DELETE before the asynchronous native decision");
  await remove.click();
  assert.equal(await page.evaluate(() => window.__nativeConfirmTest.messages.length), 1);
  assert.equal(deletes.length, 0);
  await page.evaluate(() => window.__nativeConfirmTest.pending.shift()(false));
  assert.deepEqual(await readSource(), originalRelations);
  assert.equal(deletes.length, 0);
  await workspace.locator('[data-permanent-relation-action="close"]').click();
  await page.locator('#btnHideRelated').click();

  await page.locator('.explorer-item[data-kind="file"]', { hasText: target.title }).click();
  await page.locator('#btnShowRelated').click();
  await page.locator('#relatedPanel [data-permanent-workspace-tab="relations"]:visible').click();
  await page.locator('#relatedPanel [data-relation-tab="external"]').click();
  assert.match(await page.locator('#relatedPanel').innerText(), /对方 → 当前/);
  await page.locator(`#relatedPanel [data-relation-action="open-edit"][data-relation-id="${relationId}"]`).click();
  await workspace.locator('[data-relation-action="delete"]').click();
  await page.waitForFunction(() => window.__nativeConfirmTest.pending.length === 1);
  assert.deepEqual(await readSource(), originalRelations);
  await page.evaluate(() => window.__nativeConfirmTest.pending.shift()(true));
  await waitFor(async () => {
    assert.deepEqual((await readSource()).outgoingLinks, []);
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${target.id}/relations`)).json.item.backlinks, []);
  });
  assert.equal(deletes.length, 1);
  await workspace.waitFor({ state: "detached" });
  await page.evaluate(() => { window.__nativeConfirmTest.restore(); delete window.__nativeConfirmTest; });
  await page.locator('#btnHideRelated').click();
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    assert.equal(await page.locator('#graphCanvas .graph-map-node').count(), 2);
    assert.equal(await page.locator('#graphCanvas .graph-map-edge-group').count(), 0);
  });
  for (let index = 0; index < notes.length; index++) {
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${notes[index].id}`)).json.item.body, notes[index].body);
    assert.deepEqual(await fs.readFile(path.join(vaultPath, notes[index].markdownPath)), originalFiles[index]);
  }
});
