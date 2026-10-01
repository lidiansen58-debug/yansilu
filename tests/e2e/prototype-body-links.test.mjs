import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const [kind, mode, width] of [["original", "source", 1366], ["fleeting", "source", 1366], ["literature", "source", 1366], ["original", "wysiwyg", 1366], ["fleeting", "wysiwyg", 390]]) {
  test(`${kind} body links insert, replace and open the chosen note (${mode}, ${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const { page, apiBase } = await startPrototypeStack(t, pw);
    page.setDefaultTimeout(7000);
    const create = async (directory, body) => (await postJson(apiBase, "/api/v1/notes", { directoryId: `dir_${directory}_default`, body })).json.item;
    const first = await create("original", "# 同名目标\n\n第一个目标。");
    const chosen = await create("literature", "# 同名目标\n\n准确选中的第二个目标。");
    const replacement = await create("fleeting", "# 替换目标\n\n更换后的链接目标。");
    const source = await create(kind, "# 正文链接测试\n\n前面的材料。\n\n[[docs/原材料.md#段落|旧别名]]\n\n末尾。");
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    if (mode === "source") await page.locator("#btnModeToggle").click();
    await page.setViewportSize({ width, height: 900 });
    const editor = page.locator(mode === "source" ? "#editorHost .cm-content:visible" : "#wysiwygHost .ProseMirror:visible");
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Enter");
    const before = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    // Simulate targets not yet loaded by the directory browser: search must reach the vault.
    await page.evaluate(ids => { const e = window.__prototypeEditor; e.state.notes = e.state.notes.filter(n => !ids.includes(n.id)); }, [first.id, chosen.id, replacement.id]);
    const relationWrites = [];
    page.on("request", r => { if (r.method() === "POST" && /\/relations$/.test(r.url())) relationWrites.push(r.url()); });
    await page.locator("#btnInsertLink").click();
    await page.locator("#linkSearchInput").fill("同名目标");
    await page.locator(`[data-link-note-id="${chosen.id}"]`).click();
    assert.equal(await page.locator("#linkReasonInput").count(), 0);
    await page.locator("#btnConfirmLinkInsert").click();
    const token = `[[${chosen.id}|同名目标]]`;
    await waitFor(async () => assert.ok((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.includes(token)));
    const inserted = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    assert.equal(inserted.replace(token, "").trimEnd(), before.trimEnd());
    assert.ok(inserted.includes("[[docs/原材料.md#段落|旧别名]]"));
    assert.equal(relationWrites.length, 0);
    // Put the cursor inside the existing token; the same action replaces the whole link.
    await page.evaluate(token => { const e = window.__prototypeEditor, at = e.getEditorValue().indexOf(token) + 3; e.setEditorSelectionRange(at, at); e.focusEditor(); }, token);
    await page.locator("#btnInsertLink").click();
    await page.locator("#linkSearchInput").fill("替换目标");
    await page.locator(`[data-link-note-id="${replacement.id}"]`).click();
    await page.locator("#btnConfirmLinkInsert").click();
    const nextToken = `[[${replacement.id}|替换目标]]`;
    await waitFor(async () => {
      const body = (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body;
      assert.ok(body.includes(nextToken)); assert.ok(!body.includes(token));
    });
    assert.equal(relationWrites.length, 0);
    await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    const rich = await page.evaluate(() => window.__prototypeEditor.isWysiwygMode());
    if ((mode === "wysiwyg") !== rich) await page.locator("#btnModeToggle").click();
    await page.screenshot({ path: `output/note-editor-validation/body-link-before-preview-${kind}-${mode}-${width}.png`, fullPage: true });
    if (mode === "source") {
      await page.locator("#editorHost .cm-line").filter({ hasText: nextToken }).click({ position: { x: 45, y: 10 }, modifiers: ["Control"] });
    } else {
      const link = page.locator(`#wysiwygHost [data-wikilink="${replacement.id}|替换目标"]:visible`);
      assert.equal(await link.textContent(), "[[替换目标]]");
      await link.click();
    }
    await page.locator(".note-peek-actions").waitFor();
    await page.screenshot({ path: `output/note-editor-validation/body-link-preview-${kind}-${mode}-${width}.png`, fullPage: true });
    await page.locator(`.note-peek-actions [data-open-linked-note="${replacement.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, replacement.id);
    assert.ok((await page.evaluate(() => window.__prototypeEditor.getEditorValue())).includes("更换后的链接目标"));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
}
