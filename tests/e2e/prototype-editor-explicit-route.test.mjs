import test from "node:test";
import assert from "node:assert/strict";
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
