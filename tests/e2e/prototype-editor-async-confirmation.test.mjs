import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

function nativeConfirmShape() {
  window.__editorConfirmTest = { pending: [], messages: [] };
  window.confirm = message => new Promise(resolve => {
    window.__editorConfirmTest.messages.push(message);
    window.__editorConfirmTest.pending.push(resolve);
  });
}
async function openNote(page, noteId) {
  await page.locator('#btnToggleSearch').click();
  await page.locator(`[data-search-note="${noteId}"]`).click();
  await page.locator(`.tab.active[data-tab="tab_${noteId}"]`).waitFor({ state: "visible" });
}
async function appendInput(page, text) {
  if (!await page.locator('#editorHost .cm-content:visible').isVisible()) await page.locator('#btnModeToggle').click();
  await page.locator('#editorHost .cm-content:visible').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText(`\n\n${text}`);
  await waitFor(async () => { assert.ok((await page.locator('.tab.active .tab-dirty').textContent()).trim()); });
}

test("visible dirty-tab closes await async decisions, cancellation keeps drafts and acceptance discards without writing files", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw); if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const notes = [];
  for (const title of ["确认关闭一", "确认关闭二"]) {
    const created = await postJson(apiBase, '/api/v1/notes', { directoryId: 'dir_fleeting_default', body: `# ${title}\n\n保留已保存正文。` });
    assert.equal(created.status, 201); notes.push(created.json.item);
  }
  const baselines = await Promise.all(notes.map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  await openNote(page, notes[1].id); await openNote(page, notes[0].id);
  await page.clock.install();
  await page.evaluate(nativeConfirmShape);
  for (const index of [0, 1]) {
    const note = notes[index], key = `yansilu:draft:${note.id}`;
    await appendInput(page, `未保存输入 ${index} café 🌿。`);
    const draft = await page.evaluate(key => localStorage.getItem(key), key);
    assert.ok(draft?.includes('未保存输入'));
    const trigger = () => page.locator('.tab.active .tab-close').click();
    const beforePrompts = await page.evaluate(() => window.__editorConfirmTest.messages.length);
    await trigger();
    await page.waitForFunction(() => window.__editorConfirmTest.pending.length === 1);
    await trigger();
    assert.equal(await page.evaluate(() => window.__editorConfirmTest.messages.length), beforePrompts + 1);
    assert.equal(await page.locator(`.tab[data-tab="tab_${note.id}"]`).count(), 1);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), draft);
    assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), baselines[index]);
    await page.evaluate(() => window.__editorConfirmTest.pending.shift()(false));
    assert.equal(await page.locator(`.tab[data-tab="tab_${note.id}"]`).count(), 1);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), draft);
    await trigger();
    await page.waitForFunction(() => window.__editorConfirmTest.pending.length === 1);
    await page.evaluate(() => window.__editorConfirmTest.pending.shift()(true));
    await waitFor(async () => {
      assert.equal(await page.locator(`.tab[data-tab="tab_${note.id}"]`).count(), 0);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    });
    await page.clock.fastForward(15001);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
    assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), baselines[index]);
  }
  await page.clock.resume();
});

test("actual typed draft reload waits for async decline or acceptance and restores only after approval, then saves and reloads", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw); if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const created = await postJson(apiBase, '/api/v1/notes', { directoryId: 'dir_fleeting_default', body: '# 草稿恢复确认\n\n磁盘上的原文。' });
  assert.equal(created.status, 201);
  const note = created.json.item, key = `yansilu:draft:${note.id}`;
  const baseline = await fs.readFile(path.join(vaultPath, note.markdownPath));
  await page.addInitScript(nativeConfirmShape);
  await page.clock.install();
  for (const accepted of [false, true]) {
    await openNote(page, note.id);
    await appendInput(page, `需要确认恢复的真实输入 ${accepted} café 🌿。`);
    const rawDraft = await page.evaluate(key => localStorage.getItem(key), key);
    const expectedBody = JSON.parse(rawDraft).body;
    await page.reload({ waitUntil: 'networkidle' });
    await openNote(page, note.id);
    await page.waitForFunction(() => window.__editorConfirmTest.pending.length === 1);
    assert.equal(await page.locator('#editorBody').inputValue(), note.body);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), rawDraft);
    await page.clock.fastForward(15001);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
    assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), baseline);
    await page.evaluate(accepted => window.__editorConfirmTest.pending.shift()(accepted), accepted);
    if (!accepted) {
      await waitFor(async () => { assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null); });
      assert.equal(await page.locator('#editorBody').inputValue(), note.body);
    } else {
      await waitFor(async () => { assert.equal(await page.locator('#editorBody').inputValue(), expectedBody); });
      if (!await page.locator('#editorHost .cm-content:visible').isVisible()) await page.locator('#btnModeToggle').click();
      await page.locator('#editorHost .cm-content:visible').click();
      await page.keyboard.press('Control+s');
      await waitFor(async () => {
        assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body.trimEnd(), expectedBody.trimEnd());
      });
      await page.reload({ waitUntil: 'networkidle' });
      await openNote(page, note.id);
      await waitFor(async () => { assert.equal((await page.locator('#editorBody').inputValue()).trimEnd(), expectedBody.trimEnd()); });
      assert.equal(await page.evaluate(() => window.__editorConfirmTest.messages.length), 0);
    }
  }
  await page.clock.resume();
});
