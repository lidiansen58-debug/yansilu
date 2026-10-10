import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("HTML paste strips executable markup while preserving Chinese, formatting and safe links through save and reload", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.addInitScript(() => { window.__editorPasteExecuted = 0; });
  const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 安全粘贴\n\n保留原始中文、café 和 🙂。\n\n```html\n<img onerror=\"literal-code-only\">\n```\n\n接着记录。\n" })).json.item;
  const openNote = async () => {
    await page.locator('#btnToggleSearch').click();
    await page.locator(`[data-search-note="${note.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, note.id);
  };
  await openNote();
  if (!(await page.locator('#wysiwygHost .ProseMirror:visible').isVisible())) await page.locator('#btnModeToggle').click();
  await page.evaluate(() => { window.__editorPasteExecuted = 0; });
  const editor = page.locator('#wysiwygHost .ProseMirror:visible');
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await editor.evaluate(element => {
    const clipboard = new DataTransfer();
    clipboard.setData('text/html', '<p>粘贴后的 <strong>中文加粗</strong>、café 🙂 和 <a href="https://example.com/notes">安全链接</a>。</p><img src="/__editor_synthetic_missing_image__" onerror="window.__editorPasteExecuted++"><svg onload="window.__editorPasteExecuted++"><script>window.__editorPasteExecuted++</script></svg><a href="javascript:window.__editorPasteExecuted++">危险链接文字</a>');
    clipboard.setData('text/plain', '粘贴后的 中文加粗、café 🙂 和 安全链接。危险链接文字');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
  });
  await waitFor(async () => assert.match(await editor.innerText(), /粘贴后的/));
  assert.equal(await page.evaluate(() => window.__editorPasteExecuted), 0);
  assert.equal(await editor.locator('script,[onerror],[onload],a[href^="javascript:"]').count(), 0);
  assert.equal(await editor.locator('a[href="https://example.com/notes"]').count(), 1);
  await page.keyboard.press('Control+s');
  await waitFor(async () => {
    const body = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body;
    for (const text of ['保留原始中文', '中文加粗', 'café', '🙂', 'https://example.com/notes', '<img onerror="literal-code-only">']) assert.ok(body.includes(text), text);
    assert.doesNotMatch(body, /window\.__editorPasteExecuted/);
  });
  await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
  await page.reload({ waitUntil: 'networkidle' });
  await openNote();
  assert.equal(await page.evaluate(() => window.__editorPasteExecuted), 0);
  assert.equal(await page.locator('#wysiwygHost script,#wysiwygHost [onerror],#wysiwygHost [onload],#wysiwygHost a[href^="javascript:"]').count(), 0);
  assert.match(await page.locator('#wysiwygHost').innerText(), /中文加粗/);
});

test("malformed imported HTML opens as source, stays unchanged until save and can be corrected for WYSIWYG", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.addInitScript(() => { window.__malformedExecuted = 0; });
  await page.evaluate(() => { window.__malformedExecuted = 0; });
  const body = '# 畸形 HTML 材料\n\n原文必须保留。\n\n<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=window.__malformedExecuted++>">\n\n结尾文字。\n';
  const note = (await postJson(apiBase, '/api/v1/notes', { directoryId: 'dir_fleeting_default', body })).json.item;
  const normal = (await postJson(apiBase, '/api/v1/notes', { directoryId: 'dir_fleeting_default', body: '# 正常材料\n\n正常中文正文。\n' })).json.item;
  const openNote = async id => {
    await page.locator('#btnToggleSearch').click();
    await page.locator(`[data-search-note="${id}"]`).click();
    await page.locator('#noteSearchDialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
  };
  await openNote(note.id);
  await page.locator('#editorHost .cm-content:visible').waitFor();
  assert.equal(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), body);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, body);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.activeTab()?.dirty), false);
  assert.equal(await page.evaluate(() => window.__malformedExecuted), 0);
  await page.reload({ waitUntil: 'networkidle' });
  await openNote(note.id);
  await page.locator('#editorHost .cm-content:visible').waitFor();
  assert.equal(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), body);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, body);
  await page.locator('#btnModeToggle').click();
  assert.equal(await page.locator('#editorHost .cm-content').isVisible(), true);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), body);
  await page.locator('#editorHost .cm-content').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText('\n补充的中文说明。');
  const editedSource = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
  assert.ok(editedSource.startsWith(body.trimEnd()));
  assert.match(editedSource, /补充的中文说明。/);
  await page.keyboard.press('Control+s');
  const savedSource = editedSource.endsWith('\n') ? editedSource : `${editedSource}\n`;
  await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, savedSource));
  await openNote(normal.id);
  await page.locator('#wysiwygHost .ProseMirror:visible').waitFor();
  await openNote(note.id);
  await page.locator('#editorHost .cm-content:visible').click();
  await page.keyboard.press('Control+a');
  await page.keyboard.insertText('# 修正后的材料\n\n保留中文内容，移除错误的 HTML 标签。\n');
  await page.locator('#btnModeToggle').click();
  await page.locator('#wysiwygHost .ProseMirror:visible').waitFor();
  assert.match(await page.locator('#wysiwygHost').innerText(), /保留中文内容/);
  await page.locator('#wysiwygHost .ProseMirror:visible').click();
  await page.keyboard.press('Control+s');
  await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, /保留中文内容，移除错误的 HTML 标签/));
  assert.equal(await page.evaluate(() => window.__malformedExecuted), 0);
});

test("imported raw HTML stays inert in WYSIWYG and mode switches preserve the source without writing it", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => { window.__editorImportedExecuted = 0; });
  await page.evaluate(() => { window.__editorImportedExecuted = 0; });
  const body = '# 导入的 HTML 材料\n\n中文原文。\n\n<img src="/__imported_synthetic_missing_image__" onerror="window.__editorImportedExecuted++">\n\n<svg onload="window.__editorImportedExecuted++"><script>window.__editorImportedExecuted++</script></svg>\n\n结尾文字。\n';
  const note = (await postJson(apiBase, '/api/v1/notes', { directoryId: 'dir_literature_default', body })).json.item;
  await page.locator('#btnToggleSearch').click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, note.id);
  await page.waitForLoadState('networkidle');
  assert.ok(await page.locator('#btnModeToggle').isVisible(), JSON.stringify({ pageErrors, ui: (await page.locator('body').innerText()).slice(0,2500) }));
  assert.equal(await page.evaluate(() => window.__editorImportedExecuted), 0);
  assert.equal(await page.locator('#wysiwygHost script,#wysiwygHost [onerror],#wysiwygHost [onload],#wysiwygHost a[href^="javascript:"]').count(), 0);
  await page.locator('#btnModeToggle').click();
  await page.locator('#editorHost .cm-content:visible').waitFor();
  assert.equal(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), body);
  await page.locator('#btnModeToggle').click();
  await page.locator('#wysiwygHost .ProseMirror:visible').waitFor();
  assert.equal(await page.evaluate(() => window.__editorImportedExecuted), 0);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, body);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.activeTab()?.dirty), false);
});
