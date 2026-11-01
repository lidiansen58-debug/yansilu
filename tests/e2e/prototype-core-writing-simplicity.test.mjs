import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, useWritingMarkdown, selectWritingChapter, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) test(`one viewpoint and in-place writing materials remain simple at ${width}px`, { timeout: 60000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase } = h;
  await page.setViewportSize({ width, height: 844 });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  async function shot(label) {
    if (!process.env.YANSILU_QA_OUTPUT) return;
    await fs.mkdir(process.env.YANSILU_QA_OUTPUT, { recursive: true });
    await page.screenshot({ path: path.join(process.env.YANSILU_QA_OUTPUT, `${label}-${width}.png`), fullPage: true });
  }
  try {
    await page.locator('[data-today-action="start-first-note"]').click();
    await page.waitForFunction(() => {
      const editor = window.__prototypeEditor, range = editor?.editorSelection();
      return !window.__prototypeState.pendingNoteCreation && range && editor.getEditorValue().slice(range.from, range.to) === "未命名笔记";
    });
    const sourceId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    await page.keyboard.insertText("阅读之后的一个困惑"); await page.keyboard.press("End"); await page.keyboard.press("Enter");
    await page.keyboard.insertText("我能复述原文，却举不出新的例子。先写自己的解释，再核对遗漏的前提。觉得熟悉不等于真的理解。");
    await page.keyboard.press("ControlOrMeta+s");
    await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${sourceId}`)).json.item.body, /举不出新的例子/));
    await page.locator("#btnRecordPermanent").click(); await page.locator("#permanentNoteCreate").click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, sourceId);
    const noteId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    const judgment = "举出新例子并核对前提，才能发现只会复述时遗漏的理解。";
    await page.locator("#btnShowRelated").click();
    await page.locator('#relatedPanel textarea[name="thesis"]').fill(judgment);
    await page.locator("#relatedPanel").getByRole("button", { name: "保存当前观点", exact: true }).click();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.thesis, judgment));
    const own = (await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item;
    assert.equal(own.status, "draft"); assert.equal(own.authorship.user_confirmed, true);
    assert.doesNotMatch(own.body, /## 核心观点|把这个想法写成一个清楚的判断/);
    assert.match(own.body, /原始记录/); assert.match(own.body, /举不出新的例子/);
    await page.locator("#btnHideRelated").click(); await shot("single-viewpoint");
    // Come from a different box: materials should not require reopening that note.
    await page.locator('[data-action="quick-fleeting"]').click();
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator("#btnWritingSaveThemeIndex").click(); await page.locator("#writingTitle").fill("怎样从复述走向理解？");
    await page.locator("#btnWritingStartManualDraft").click(); await page.locator("#writingDraftPanel:visible").waitFor();
    assert.equal(await page.locator('[data-writing-tab="outline"]').isVisible(), false);
    assert.equal(await page.locator("#writingDraftTarget").isVisible(), false);
    assert.equal(await page.locator("#writingChapterMenu").isVisible(), false);
    await useWritingMarkdown(page); await page.locator("#writingDraftEditor").fill("# 怎样从复述走向理解？\n\n先写下自己的解释，再逐步补材料。");
    await page.locator("#btnWritingSaveDraft").click();
    await waitFor(async () => assert.equal(await page.locator("#writingDraftSaveFeedback").innerText(), "已保存"));
    const project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items[0];
    await page.locator('button[data-writing-related-open]:visible').first().click();
    await page.locator("#writingCandidateDetails > summary").click();
    const pending = page.locator(`#writingCandidateList [data-writing-action="prepare"][data-writing-note-id="${noteId}"]`);
    await pending.waitFor(); await shot("materials-confirm");
    const visible = await page.locator("#writingRelatedNotesPanel").innerText();
    assert.doesNotMatch(visible, /pn_[\w-]+|yansilu:|##|先在永久笔记盒打开/);
    page.once("dialog", dialog => dialog.accept()); await pending.click();
    await page.locator(`#writingBasketList article[data-writing-note-id="${noteId}"]`).waitFor();
    page.removeAllListeners("dialog");
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.status, "active");
    assert.equal(await page.locator(`#writingCandidateList article[data-writing-note-id="${noteId}"]`).count(), 0);
    await page.locator('button[data-writing-related-close]:visible').click(); await shot("simple-writing");
    await page.locator('[data-writing-help-toggle]').click();
    assert.match(await page.locator("#writingHelpPopover").innerText(), /以后再补/);
    assert.doesNotMatch(await page.locator("#writingHelpPopover").innerText(), /先确认中心问题|再生成提纲/);
    await page.locator('[data-writing-help-toggle]').click();
    await page.locator("#writingMoreMenu > summary").click(); await shot("chapter-in-more");
    await page.locator("#btnWritingChapterAdd").click();
    await page.locator('[data-text-input-field]:visible').fill("一个新的例子"); await page.locator('[data-text-input-confirm]:visible').click();
    await page.waitForFunction(() => document.querySelector("#writingDraftTarget")?.selectedOptions[0]?.textContent.includes("一个新的例子"));
    assert.equal(await page.locator("#writingDraftTarget").isVisible(), width < 1024);
    await page.locator("#writingDraftEditor").fill("# 一个新的例子\n\n这是已保存的章节正文。"); await page.locator("#btnWritingSaveDraft").click();
    await waitFor(async () => assert.equal(await page.locator("#writingDraftSaveFeedback").innerText(), "已保存"));
    await selectWritingChapter(page, "");
    await page.locator("#writingDraftEditor").fill("# 怎样从复述走向理解？\n\n回到文章后继续补写。"); await page.locator("#btnWritingSaveDraft").click();
    await waitFor(async () => assert.equal(await page.locator("#writingDraftSaveFeedback").innerText(), "已保存", await page.locator("#statusText").innerText()));
    assert.match((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body, /回到文章后继续补写/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
  } catch (error) { await shot("failure"); throw error; }
});
