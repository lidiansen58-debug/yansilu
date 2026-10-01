import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const kind of ["original", "fleeting"]) {
for (const mode of ["wysiwyg", "source"]) {
test(`a new ${kind} note accepts title and body in ${mode} mode`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.locator(`[data-action="quick-${kind}"]`).click();
  await page.locator("#btnNewNote").click();
  if (mode === "source") {
    await page.locator("#btnModeToggle").click();
    await page.locator("#editorHost .cm-content:visible").waitFor();
    await page.locator("#btnNewNote").click();
  }
  await page.waitForFunction(() => {
    const editor = window.__prototypeEditor;
    const range = editor?.editorSelection();
    return range && editor.getEditorValue().slice(range.from, range.to) === "未命名笔记";
  });
  const original = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
  if (kind === "original") assert.match(original, /\n## 核心观点\n/);
  const template = original.slice(original.indexOf("\n")).trimStart();
  await page.keyboard.insertText("今天的观察");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("先把想法记下来，再慢慢整理。");
  const body = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
  if (kind === "original") {
    assert.match(body, /^# 今天的观察\n\n先把想法记下来，再慢慢整理。\n\n## 核心观点\n/);
    assert.deepEqual(body.slice(body.indexOf("## 核心观点")).split("\n").filter(Boolean), template.split("\n").filter(Boolean));
  } else {
    assert.equal(body.trimEnd(), "# 今天的观察\n\n先把想法记下来，再慢慢整理。");
  }
  await page.keyboard.press("Control+s");
  const noteId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
  await waitFor(async () => assert.match(
    (await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.body,
    /^# 今天的观察\n\n先把想法记下来，再慢慢整理。(?:\n|$)/
  ));
  await page.screenshot({ path: `output/note-core-autosave/title-to-body-${kind}-${mode}.png`, fullPage: true });
});
}
}
