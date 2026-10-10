import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, postJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("visible explorer deletion waits for async confirmation, cancellation keeps disk data, and occupied folders are preserved", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  const directories = [];
  for (const [name, segment] of [["删除验证目录", "occupied"], ["待取消空目录", "empty"]]) {
    const created = await postJson(apiBase, "/api/v1/directories", {
      title: name, parentDirectoryId: "dir_original_default", directoryType: "custom",
      fsPath: path.join(vaultPath, "notes", "original", segment), maxNotes: 500
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    directories.push(created.json.item);
  }
  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: directories[0].id, title: "删除前要等待确认", body: "# 删除前要等待确认\n\n取消时保留中文 café 和 emoji 🌿。"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const note = created.json.item;
  const notePath = path.join(vaultPath, note.markdownPath);
  const baseline = await fs.readFile(notePath);
  const deletes = [];
  page.on("request", request => { if (request.method() === "DELETE") deletes.push({ url: request.url(), body: request.postDataJSON() }); });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  const openDelete = async locator => {
    await locator.click({ button: "right" });
    await page.locator('#contextMenu button[data-action="delete"]').click();
  };
  await page.evaluate(() => {
    const original = window.confirm;
    window.__explorerConfirmTest = { pending: [], messages: [], restore: () => { window.confirm = original; } };
    window.confirm = message => new Promise(resolve => {
      window.__explorerConfirmTest.messages.push(message);
      window.__explorerConfirmTest.pending.push(resolve);
    });
  });

  await openDelete(page.locator('.explorer-item[data-kind="folder"]', { hasText: directories[0].title }));
  assert.match(await page.locator('#statusText').textContent(), /请先移走目录中的笔记和子目录/);
  assert.equal(await page.evaluate(() => window.__explorerConfirmTest.messages.length), 0);
  assert.deepEqual(await fs.readFile(notePath), baseline);
  await page.locator('.explorer-item[data-kind="folder"]', { hasText: directories[0].title }).click();
  const noteRow = page.locator('.explorer-item[data-kind="file"]', { hasText: note.title });
  await openDelete(noteRow);
  await page.waitForFunction(() => window.__explorerConfirmTest.pending.length === 1);
  assert.equal(deletes.length, 0);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).status, 200);
  assert.deepEqual(await fs.readFile(notePath), baseline);
  await openDelete(noteRow);
  assert.equal(await page.evaluate(() => window.__explorerConfirmTest.messages.length), 1);
  await page.evaluate(() => window.__explorerConfirmTest.pending.shift()(false));
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
  assert.deepEqual(await fs.readFile(notePath), baseline);
  assert.equal(deletes.length, 0);
  await openDelete(noteRow);
  await page.waitForFunction(() => window.__explorerConfirmTest.pending.length === 1);
  assert.equal(deletes.length, 0);
  await page.evaluate(() => window.__explorerConfirmTest.pending.shift()(true));
  await waitFor(async () => {
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).status, 404);
    await assert.rejects(fs.access(notePath), { code: "ENOENT" });
    assert.equal(await noteRow.count(), 0);
  });
  assert.equal(deletes.length, 1);
  await fs.access(directories[0].fsPath);

  await page.locator('[data-action="quick-original"]').click();
  const emptyRow = page.locator('.explorer-item[data-kind="folder"]', { hasText: directories[1].title });
  await openDelete(emptyRow);
  await page.waitForFunction(() => window.__explorerConfirmTest.pending.length === 1);
  assert.match(await page.evaluate(() => window.__explorerConfirmTest.messages.at(-1)), /删除空目录/);
  await fs.access(directories[1].fsPath);
  assert.equal(deletes.length, 1);
  await page.evaluate(() => window.__explorerConfirmTest.pending.shift()(false));
  await fs.access(directories[1].fsPath);
  assert.equal(await emptyRow.count(), 1);
  await openDelete(emptyRow);
  await page.waitForFunction(() => window.__explorerConfirmTest.pending.length === 1);
  assert.equal(deletes.length, 1);
  await page.evaluate(() => window.__explorerConfirmTest.pending.shift()(true));
  await waitFor(async () => {
    await assert.rejects(fs.access(directories[1].fsPath), { code: "ENOENT" });
    assert.equal(await emptyRow.count(), 0);
  });
  assert.equal(deletes.length, 2);
  assert.deepEqual(deletes.map(item => item.body), [{ expectedVaultPath: vaultPath }, { expectedVaultPath: vaultPath }]);
  await page.evaluate(() => { window.__explorerConfirmTest.restore(); delete window.__explorerConfirmTest; });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator('.explorer-item[data-kind="folder"]', { hasText: directories[0].title }).waitFor({ state: "visible" });
  assert.equal(await emptyRow.count(), 0);
});
