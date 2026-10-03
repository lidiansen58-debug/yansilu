import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const kind of ["original", "fleeting", "literature"]) {
  test(`standalone ${kind} note opens outside the initial directory, saves and reopens`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, webBase } = stack;
    const note = (await postJson(apiBase, "/api/v1/notes", {
      directoryId: `dir_${kind}_default`, body: `# 独立编辑器 ${kind}\n\n已保存的中文原文。`
    })).json.item;
    const url = `${webBase}/editor?note=${encodeURIComponent(note.id)}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#markdownPanel:visible").waitFor();
    assert.equal(await page.locator(".rail").isVisible(), false);
    assert.equal(await page.locator(".sidebar").isVisible(), false);
    if (!(await page.locator("#editorHost .cm-content").isVisible())) await page.locator("#btnModeToggle").click();
    await page.locator("#editorHost .cm-content:visible").click();
    await page.keyboard.press("Control+End");
    await page.keyboard.insertText(`\n\n从独立编辑器保存 ${kind}。`);
    await page.keyboard.press("Control+s");
    await waitFor(async () => assert.match(
      (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body,
      new RegExp(`从独立编辑器保存 ${kind}。`)
    ));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#markdownPanel:visible").waitFor();
    await waitFor(async () => assert.match(
      await page.evaluate(() => window.__prototypeEditor.getEditorValue()),
      new RegExp(`从独立编辑器保存 ${kind}。`)
    ));
    assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote().id), note.id);
  });
}

test("an unavailable explicit note shows the editor with an error and does not open another note", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", body: "# 不应打开\n\n其他笔记。" });
  await page.goto(`${webBase}/editor?note=missing_explicit_note`, { waitUntil: "networkidle" });
  await page.locator("#editorWorkspace:visible").waitFor();
  await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /无法打开笔记|笔记已不存在/));
  assert.equal(await page.evaluate(() => window.__prototypeState.tabs.length), 0);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote()), null);
  assert.equal(await page.evaluate(() => window.__prototypeState.selectedFileId), null);
  const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
  assert.equal(notes.json.total, 1);
});

async function holdExplicitStartupNoteRead(t, page, noteId) {
  let release, captured;
  const gate = new Promise(resolve => { release = resolve; });
  const capturedPromise = new Promise(resolve => { captured = resolve; });
  let held = false;
  await page.route(`**/api/v1/notes/${noteId}`, async route => {
    if (held || route.request().method() !== "GET") return route.continue();
    held = true;
    const response = await route.fetch();
    captured();
    await gate;
    await route.fulfill({ response });
  });
  t.after(release);
  return { capturedPromise, release };
}

test("late explicit startup note reads cannot reappear after a real vault switch", { timeout: 30000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  const note = (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_fleeting_default", body: "# Old vault private note\n\nOnly belongs to vault A."
  })).json.item;
  const held = await holdExplicitStartupNoteRead(t, page, note.id);
  try {
    await page.goto(`${webBase}/prototype?note=${note.id}`, { waitUntil: "domcontentloaded" });
    await held.capturedPromise;
    await page.locator('.rail-btn[data-module="settings"]').click();
    await page.locator('[data-settings-item="current-vault"]').click();
    const target = path.join(vaultPath, "startup-vault-b");
    await page.locator("#settingsVaultPath").fill(target);
    await page.locator("#settingsSwitchVault").click();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, target));
    await page.locator("[data-vault-switch-recovery]").waitFor({ state: "detached" });
    const before = await page.evaluate(() => ({
      module: window.__prototypeState.module,
      selected: window.__prototypeState.selectedFileId,
      folder: window.__prototypeState.selectedFolderId
    }));
    held.release();
    await page.waitForLoadState("networkidle");
    const after = await page.evaluate(id => ({
      module: window.__prototypeState.module,
      selected: window.__prototypeState.selectedFileId,
      folder: window.__prototypeState.selectedFolderId,
      status: document.querySelector("#statusText").textContent,
      leaked: window.__prototypeState.notes.some(note => note.id === id),
      tabs: window.__prototypeState.tabs.length
    }), note.id);
    assert.equal(after.leaked, false);
    assert.equal(after.tabs, 0);
    assert.deepEqual({ module: after.module, selected: after.selected, folder: after.folder }, before);
    assert.doesNotMatch(after.status, /无法打开笔记|笔记已不存在/);
    assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, target);
  } finally { held.release(); }
});

test("explicit startup hydration and concurrent directory loading render a note only once", { timeout: 30000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const note = (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_fleeting_default", body: "# Same vault note\n\nOne catalog row."
  })).json.item;
  const held = await holdExplicitStartupNoteRead(t, page, note.id);
  try {
    await page.goto(`${webBase}/prototype?note=${note.id}`, { waitUntil: "domcontentloaded" });
    await held.capturedPromise;
    await page.locator('[data-action="quick-fleeting"]').click();
    await page.waitForFunction(id => window.__prototypeState.notes.some(note => note.id === id), note.id);
    held.release();
    await page.waitForLoadState("networkidle");
    assert.equal(await page.evaluate(id => window.__prototypeState.notes.filter(note => note.id === id).length, note.id), 1);
    assert.equal(await page.locator(`.explorer-item[data-id="${note.id}"]`).count(), 1);
    assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote()?.id), note.id);
  } finally { held.release(); }
});
