import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const mode of ["source", "wysiwyg"]) {
  test(`removing broken links retains literal Markdown labels (${mode})`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const { page, apiBase } = await startPrototypeStack(t, pw);
    page.setDefaultTimeout(7000);
    const labels = ["- 清单", "1. 顺序", "~~划线~~", "---", "==="];
    const tokens = labels.map(label => `[[note_missing|${label}]]`);
    const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 保留原文字\n\n" + tokens.join("\n\n") })).json.item;
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    if (mode === "source") await page.locator("#btnModeToggle").click();
    for (const token of tokens) {
      assert.ok((await page.evaluate(() => window.__prototypeEditor.getEditorValue())).includes(token), `Current token ${token}: ${await page.evaluate(() => window.__prototypeEditor.getEditorValue())}`);
      await page.evaluate(token => { const e = window.__prototypeEditor, at = e.getEditorValue().indexOf(token) + 3; e.setEditorSelectionRange(at, at); e.focusEditor(); }, token);
      await page.locator("#btnInsertLink").click();
      assert.equal(await page.locator("#linkPicker .link-picker-head strong").textContent(), "修改笔记链接", JSON.stringify(await page.evaluate(() => { const e = window.__prototypeEditor; return { selection: e.editorSelection(), manual: e.manualLinkReturnSelection, body: e.getEditorValue() }; })));
      await page.locator("#btnRemoveBodyLink").click();
      await page.waitForFunction(() => !window.__prototypeEditor.isSubmittingLinkInsert);
      assert.equal(await page.locator("#statusText").textContent(), "已移除链接，文字已保留。");
      await waitFor(async () => assert.ok(!(await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.includes(token)));
    }
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    if (!(await page.evaluate(() => window.__prototypeEditor.isWysiwygMode()))) await page.locator("#btnModeToggle").click();
    const editor = page.locator("#wysiwygHost .ProseMirror:visible");
    for (const label of labels) assert.ok((await editor.innerText()).includes(label));
    assert.equal(await editor.locator("ul, ol, hr, del, h2").count(), 0);
    assert.equal(await editor.locator("h1").count(), 1);
    await page.screenshot({ path: `output/note-editor-validation/link-literal-${mode}.png`, fullPage: true });
  });
}

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
    await page.keyboard.press("Enter");
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

for (const mode of ["source", "wysiwyg"]) {
  test(`removing a body link keeps its words and independent relation (${mode})`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const { page, apiBase } = await startPrototypeStack(t, pw);
    page.setDefaultTimeout(7000);
    const create = async body => (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", body })).json.item;
    const target = await create("# 链接移除目标\n\n独立的材料。");
    const other = await create("# 其他独立关系目标\n\n与正文链接独立。");
    const token = `[[${target.id}|我的引用]]`;
    const source = await create(`# 移除正文关联\n\n第一处 ${token}。\n\n第二处 ${token}。`);
    const independent = (await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, { toNoteId: other.id, relationType: "supports", rationale: "这条独立支持关系需要保留。" })).json.item;
    const readRelations = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item.outgoingLinks;
    const checkRelations = async hasBodyLink => {
      const links = await readRelations();
      assert.equal(links.some(link => link.toNoteId === target.id && link.rationale === "markdown_wikilink"), hasBodyLink);
      const kept = links.find(link => link.id === independent.id);
      assert.equal(kept.relationType, "supports"); assert.equal(kept.rationale, "这条独立支持关系需要保留。");
    };
    await checkRelations(true);
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    if (mode === "source") await page.locator("#btnModeToggle").click();
    if (mode === "wysiwyg") await page.setViewportSize({ width: 390, height: 900 });
    const openLink = async () => {
      await page.evaluate(token => { const e = window.__prototypeEditor, at = e.getEditorValue().indexOf(token) + 3; e.setEditorSelectionRange(at, at); e.focusEditor(); }, token);
      await page.locator("#btnInsertLink").click();
      await page.locator("#btnRemoveBodyLink").waitFor({ state: "visible" });
      assert.ok(await page.evaluate(() => ["btnRemoveBodyLink", "btnCloseLinkPicker", "btnConfirmLinkInsert"].every(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })), "All link controls must fit the viewport");
    };
    const deletedRelations = [];
    page.on("request", r => { if (r.method() === "DELETE" && /\/relations\//.test(r.url())) deletedRelations.push(r.url()); });
    const endpoint = `**/api/v1/notes/${source.id}`;
    await page.route(endpoint, route => route.request().method() === "PUT" ? route.fulfill({ status: 500, json: { error: { message: "模拟保存失败" } } }) : route.continue());
    await openLink();
    await page.screenshot({ path: `output/note-editor-validation/link-remove-picker-${mode}.png`, fullPage: true });
    await page.locator("#btnRemoveBodyLink").click();
    await page.waitForFunction(() => !window.__prototypeEditor.isSubmittingLinkInsert);
    assert.ok((await page.evaluate(() => window.__prototypeEditor.getEditorValue())).includes(`第一处 我的引用。\n\n第二处 ${token}。`));
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.split(token).length - 1, 2);
    await checkRelations(true);
    await page.unroute(endpoint);
    await page.keyboard.press("Control+s");
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.split(token).length - 1, 1));
    await checkRelations(true);
    await openLink();
    const samePair = (await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, { toNoteId: target.id, relationType: "supports", rationale: "同一目标的独立支持关系也要保留。" })).json.item;
    await page.locator("#btnRemoveBodyLink").click();
    await waitFor(async () => assert.ok(!(await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.includes(token)));
    await checkRelations(false);
    const samePairKept = (await readRelations()).find(link => link.id === samePair.id);
    assert.equal(samePairKept.relationType, "supports");
    assert.equal(samePairKept.rationale, "同一目标的独立支持关系也要保留。");
    assert.equal(deletedRelations.length, 0);
    await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    const reopened = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    assert.ok(reopened.includes("第一处 我的引用。")); assert.ok(reopened.includes("第二处 我的引用。"));
    assert.ok(!reopened.includes(token));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
}

for (const mode of ["source", "wysiwyg"]) {
  test(`linking selected prose preserves its label and surrounding spaces (${mode})`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const { page, apiBase } = await startPrototypeStack(t, pw);
    page.setDefaultTimeout(7000);
    const target = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_literature_default", body: "# 判断的材料\n\n链接指向的原始资料。" })).json.item;
    const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 选中文字关联\n\n前文 我的判断 后文。" })).json.item;
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    if (mode === "source") await page.locator("#btnModeToggle").click();
    if (mode === "wysiwyg") await page.setViewportSize({ width: 390, height: 900 });
    await page.locator(mode === "source" ? "#editorHost .cm-content:visible" : "#wysiwygHost .ProseMirror:visible").click();
    await page.keyboard.press("Control+End");
    if (mode === "source") await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Home");
    for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 6; i++) await page.keyboard.press("Shift+ArrowRight");
    await page.locator("#btnInsertLink").click();
    await page.locator("#linkSearchInput").fill("判断的材料");
    await page.locator(`[data-link-note-id="${target.id}"]`).click();
    await page.keyboard.press("Enter");
    const expected = `前文 [[${target.id}|我的判断]] 后文。`;
    await waitFor(async () => assert.ok((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.includes(expected)));
    await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    assert.ok((await page.evaluate(() => window.__prototypeEditor.getEditorValue())).includes(expected));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
}

for (const mode of ["source", "wysiwyg"]) {
  test(`canceling the link picker resumes writing at the original selection (${mode})`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const { page, apiBase } = await startPrototypeStack(t, pw);
    page.setDefaultTimeout(7000);
    const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 取消链接后继续写\n\n前文 选择文字 后文。" })).json.item;
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    if (mode === "source") await page.locator("#btnModeToggle").click();
    if (mode === "wysiwyg") await page.setViewportSize({ width: 390, height: 900 });
    for (const [action, selected, replacement] of [["escape", "选择文字", "接着写"], ["close", "接着写", "新文字"]]) {
      await page.locator(mode === "source" ? "#editorHost .cm-content:visible" : "#wysiwygHost .ProseMirror:visible").click();
      await page.keyboard.press("Control+End");
      if (mode === "source") await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Home");
      for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
      for (let i = 0; i < selected.length; i++) await page.keyboard.press("Shift+ArrowRight");
      const before = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
      await page.locator("#btnInsertLink").click();
      await page.locator("#linkSearchInput").fill("准备取消的搜索");
      if (action === "escape") await page.keyboard.press("Escape");
      else await page.locator("#btnCloseLinkPicker").click();
      await page.locator("#linkPicker").waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), before);
      await page.waitForFunction(() => Boolean(document.activeElement?.closest("#editorHost, #wysiwygHost")));
      await page.keyboard.type(replacement);
      await page.keyboard.press("Control+s");
      await waitFor(async () => assert.ok((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.includes(`前文 ${replacement} 后文。`)));
    }
  });
}

for (const mode of ["source", "wysiwyg"]) {
  test(`editing a body link keeps its alias and keyboard selection changes the target (${mode})`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const { page, apiBase } = await startPrototypeStack(t, pw);
    page.setDefaultTimeout(7000);
    const create = async body => (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", body })).json.item;
    const first = await create("# 重名材料\n\n## 段落\n\n第一条材料。");
    const second = await create("# 重名材料\n\n第二条材料。");
    const token = `[[${first.id}#段落|我的引用]]`;
    const source = await create(`# 编辑链接验证\n\n前文 ${token} 后文。`);
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    if (mode === "source") await page.locator("#btnModeToggle").click();
    if (mode === "wysiwyg") await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(ids => { const e = window.__prototypeEditor; e.state.notes = e.state.notes.filter(n => !ids.includes(n.id)); }, [first.id, second.id]);
    const openExisting = async raw => {
      await page.evaluate(raw => { const e = window.__prototypeEditor, at = e.getEditorValue().indexOf(raw) + 3; e.setEditorSelectionRange(at, at); e.focusEditor(); }, raw);
      await page.locator("#btnInsertLink").click();
      assert.equal(await page.locator("#linkPicker .link-picker-head strong").textContent(), "修改笔记链接");
      assert.equal(await page.locator("#btnConfirmLinkInsert").textContent(), "保存链接");
    };
    await openExisting(token);
    await page.locator("#btnConfirmLinkInsert").click();
    await page.waitForFunction(() => !window.__prototypeEditor.isSubmittingLinkInsert);
    assert.ok((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body.includes(token));
    await openExisting(token);
    await page.locator(`[data-link-note-id="${second.id}"]`).waitFor();
    // The old target is pinned on open. An arrow must make the other row authoritative.
    await page.locator("#linkSearchInput").press("ArrowDown");
    assert.equal(await page.locator("#linkSearchList .active").getAttribute("data-link-note-id"), second.id);
    await page.locator("#btnConfirmLinkInsert").click();
    const replacement = `[[${second.id}|我的引用]]`;
    await waitFor(async () => {
      const body = (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body;
      assert.ok(body.includes(replacement)); assert.ok(!body.includes(token));
      assert.ok(body.includes(`前文 ${replacement} 后文。`));
    });
    await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
    await page.screenshot({ path: `output/note-editor-validation/link-edit-alias-${mode}.png`, fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
}
