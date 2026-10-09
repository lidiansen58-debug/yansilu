import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor, useWritingMarkdown, selectWritingChapter } from "./prototype-copy-test-helpers.mjs";
import { initVault, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createIndexCard } from "../../packages/domain/src/index-card-store.mjs";
import { createWritingProject } from "../../packages/writing-engine/src/writing-engine.mjs";

async function moveWritingCaretToEnd(page) {
  await page.keyboard.press("Control+End");
  // Native selectionchange reaches ProseMirror after the browser's caret moves.
  await page.waitForFunction(() => {
    const state = document.querySelector("#writingDocumentEditor").__wysiwygMarkdownEditor.editor.wwEditor.view.state;
    return state.selection.to === state.doc.content.size - 1;
  });
}

test("writing uses shared controls, one heading, dismissible chapter tools and truthful save feedback", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  let source, index, project;
  const stack = await startPrototypeStack(t, pw, { prepareVault: async vaultPath => {
  await initVault(vaultPath);
  source = await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    title: "用解释检验理解", body: "# 用解释检验理解\n\n合上原文，试着解释其中的判断。", thesis: "解释时的遗漏可以帮助检验理解。"
  });
  index = await createIndexCard(vaultPath, {
    directoryId: "dir_original_default", indexType: "topic", title: "从阅读到表达",
    centralQuestion: "如何检验理解？", items: [{ noteId: source.id, shortLabel: "检验理解", rationale: "解释可以发现遗漏。" }]
  });
  project = await createWritingProject(vaultPath, {
    title: "从阅读到表达", basketNoteIds: [source.id], relatedIndexIds: [index.id],
    bookStructure: { schema_version: 1, parts: [{ id: "part", title: "阅读与表达", chapters: [
      { id: "first", title: "第一章：检验理解", evidence_note_ids: [source.id] },
      { id: "second", title: "第二章：形成判断", evidence_note_ids: [source.id] }
    ] }] }
  });
  } });
  if (!stack) return;
  const { page, apiBase } = stack;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`#writingProjectsList [data-writing-project-id="${project.id}"]`).first().waitFor({ state: "attached" });
  await page.locator(`[data-writing-index-card-id="${index.id}"] button`).click();
  await page.waitForFunction(() => document.querySelector('#writingDraftTarget option[value="first"]'));
  await page.locator('[data-writing-tab="draft"]').click();
  await selectWritingChapter(page, "first");
  await page.waitForFunction(() => document.querySelector("#writingDraftEditor").value.includes("第一章"));
  const menu = page.locator("#writingChapterMenu");
  const summary = menu.locator("summary");
  const editor = page.locator("#writingDraftEditor");
  const documentEditor = page.locator("#writingDocumentEditor");
  const proseEditor = documentEditor.locator('.toastui-editor-ww-container .ProseMirror');
  await proseEditor.waitFor({ state: "visible" });
  assert.equal(await editor.isVisible(), false);
  assert.equal(await proseEditor.locator('h1').innerText(), "第一章：检验理解");
  assert.equal(await proseEditor.locator('[data-wikilink]').innerText(), source.title);
  assert.equal(await proseEditor.locator('.tui-widget').getAttribute('contenteditable'), "false");
  assert.ok((await editor.inputValue()).includes(`[[${source.id}|${source.title}]]`));
  const save = page.locator("#btnWritingSaveDraft");
  const feedback = page.locator("#writingDraftSaveFeedback");
  await mkdir("output/main-flow-design-system", { recursive: true });
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.locator("#writingDraftTitle").innerText(), "正文");
    assert.equal(await page.locator('#writingDraftTarget').isVisible(), width < 1024);
    assert.equal(await page.locator('[data-writing-chapter="first"][aria-current="page"]').isVisible(), width >= 1024);
    assert.equal(await page.locator("#btnWritingChapterAdd").isVisible(), false);
    await summary.click();
    await page.locator("#btnWritingChapterAdd").focus();
    await page.keyboard.press("Escape");
    assert.equal(await menu.getAttribute("open"), null);
    assert.equal(await summary.evaluate(el => el === document.activeElement), true);
    await summary.click();
    await page.locator('#writingDraftTitle').click();
    assert.equal(await menu.getAttribute("open"), null);
    const geometry = await page.locator("#writingDraftPanel").evaluate(el => {
      const style = node => { const s = getComputedStyle(node); return { font: s.fontSize, radius: s.borderRadius, height: node.getBoundingClientRect().height }; };
      return { overflow: el.scrollWidth - el.clientWidth, field: style(el.querySelector("select")),
        button: style(el.querySelector("#btnWritingSaveDraft")), editor: style(el.querySelector(".toastui-editor-ww-container .toastui-editor-contents")) };
    });
    assert.ok(geometry.overflow <= 1, JSON.stringify(geometry));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await page.locator('.writing-head-actions').evaluate(el => {
      const bounds = el.getBoundingClientRect();
      return [...el.querySelectorAll(':scope > button, :scope > details > summary')].every(button => {
        const rect = button.getBoundingClientRect();
        return !rect.width || rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
      });
    }), `Writing actions must fit at ${width}px`);
    assert.equal(geometry.button.font, "14px");
    assert.equal(geometry.field.radius, geometry.button.radius);
    assert.ok(geometry.button.height >= (width < 700 ? 44 : 40), JSON.stringify(geometry));
    assert.equal(geometry.editor.font, "16px");
    await page.screenshot({ path: `output/main-flow-design-system/writing-${width}.png` });
  }
  await proseEditor.click();
  await moveWritingCaretToEnd(page);
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("解释能帮助发现遗漏，也需要回到原文核对。");
  const prose = await editor.inputValue();
  assert.equal(await proseEditor.locator("h1").innerText(), "第一章：检验理解");
  assert.ok(prose.includes(`[[${source.id}|${source.title}]]`));
  assert.match(prose, /解释能帮助发现遗漏/);
  assert.doesNotMatch(prose, /\$\$widget/);
  await useWritingMarkdown(page);
  assert.equal(await editor.inputValue(), prose);
  await page.locator("#btnWritingEditorMode").click();
  assert.equal(await editor.inputValue(), prose);
  assert.equal(await editor.isVisible(), false);
  assert.equal(await save.innerText(), "保存");
  assert.match(await feedback.innerText(), /未保存/);
  await page.setViewportSize({ width: 1366, height: 900 });
  await selectWritingChapter(page, "second");
  assert.equal(await editor.inputValue(), prose);
  assert.equal(await page.locator('[data-writing-chapter="first"]').getAttribute('aria-current'), "page");
  let fail = true;
  await page.route("**/api/v1/notes", route => route.request().method() === "POST" && fail
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "UNAVAILABLE", message: "服务暂时不可用" } }) })
    : route.continue());
  await save.click();
  await waitFor(async () => assert.match(await feedback.innerText(), /保存失败/));
  assert.equal(await editor.inputValue(), prose);
  assert.equal(await save.innerText(), "重试保存");
  fail = false;
  await save.click();
  await waitFor(async () => assert.equal(await feedback.innerText(), "已保存"));
  assert.equal(await save.innerText(), "保存");
  const savedProject = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
  const noteId = savedProject.book_structure.parts[0].chapters[0].draft_note_id;
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.body.trimEnd(), prose.trimEnd());
  await proseEditor.click();
  await moveWritingCaretToEnd(page);
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("格式检查");
  await page.keyboard.press("Shift+Home");
  await page.locator('[data-writing-format="bold"]').click();
  await waitFor(async () => assert.match(await editor.inputValue(), /\*\*格式检查\*\*/));
  const beforePending = await editor.inputValue();
  let release, requested = false;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(`**/api/v1/notes/${noteId}`, async route => {
    if (route.request().method() !== "PUT") return route.continue();
    requested = true; await gate; await route.continue();
  });
  try {
    await proseEditor.click();
    await page.keyboard.press("Control+s");
    await waitFor(() => assert.ok(requested));
    await moveWritingCaretToEnd(page);
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("保存期间继续写下的内容。");
    release();
    await waitFor(async () => assert.match(await feedback.innerText(), /未保存/));
    assert.match(await proseEditor.innerText(), /保存期间继续写下的内容/);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.body.trimEnd(), beforePending.trimEnd());
    await page.keyboard.press("Control+s");
    await waitFor(async () => assert.equal(await feedback.innerText(), "已保存"));
    const finalBody = (await fetchJson(apiBase, `/api/v1/notes/${noteId}`)).json.item.body;
    assert.match(finalBody, /保存期间继续写下的内容/);
    assert.ok(finalBody.includes(`[[${source.id}|${source.title}]]`));
    assert.doesNotMatch(finalBody, /\$\$widget/);
  } finally { release(); await page.unroute(`**/api/v1/notes/${noteId}`); }
  await selectWritingChapter(page, "second");
  await page.waitForFunction(() => document.querySelector("#writingDraftEditor").value.includes("第二章"));
  assert.match(await feedback.innerText(), /尚未保存/);
  assert.equal(await menu.getAttribute("open"), null);
  await summary.click();
  await page.locator("#btnWritingChapterAdd").click();
  const chapterDialog = page.locator('.text-input-modal:not(.hidden)');
  await chapterDialog.locator('[data-text-input-field]').waitFor();
  await page.waitForFunction(() => document.activeElement?.matches('[data-text-input-field]'));
  await chapterDialog.locator('[data-text-input-cancel]').click();
  assert.equal(await menu.getAttribute("open"), null);
  assert.equal(await summary.evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('#writingDraftTarget option').count(), 3);
  // The shared control contract applies beyond the writing sample.
  await page.setViewportSize({ width: 1366, height: 900 });
  await proseEditor.locator('[data-wikilink]').click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
  await page.locator("#btnShowRelated").click();
  const polish = page.locator("#relatedPanel");
  await polish.locator('textarea[name="thesis"]').waitFor();
  const noteControls = await polish.evaluate(el => {
    const button = el.querySelector('button[data-note-distillation-action="save"]') || el.querySelector('.mini-btn.primary');
    return { font: getComputedStyle(button).fontSize, height: button.getBoundingClientRect().height,
      fieldRadius: getComputedStyle(el.querySelector('textarea[name="thesis"]')).borderRadius, radius: getComputedStyle(button).borderRadius };
  });
  assert.equal(noteControls.font, "14px");
  assert.equal(noteControls.height, 40);
  assert.equal(noteControls.fieldRadius, noteControls.radius);
  await page.screenshot({ path: "output/main-flow-design-system/polish-1366.png" });
  await page.keyboard.press("Escape");
  await page.locator('.rail-btn[data-module="graph"]').click();
  const graphTab = page.locator('.graph-view-tabs [data-graph-task-view="structure"]');
  await graphTab.waitFor({ state: "visible" });
  assert.equal(await graphTab.evaluate(el => getComputedStyle(el).fontSize), "14px");
  assert.ok((await graphTab.boundingBox()).height >= 40);
  await page.screenshot({ path: "output/main-flow-design-system/graph-1366.png" });
  await page.setViewportSize({ width: 390, height: 900 });
  assert.ok((await graphTab.boundingBox()).height >= 44);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: "output/main-flow-design-system/graph-390.png" });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="permanent-template"]').click();
  const templateSave = page.locator('[data-settings-template-kind="permanent"] [data-settings-template-action="save"]');
  const template = page.locator("#settingsPermanentTemplateEditor");
  assert.equal(await templateSave.evaluate(el => getComputedStyle(el).fontSize), "14px");
  assert.ok((await templateSave.boundingBox()).height >= 40);
  assert.equal(await template.evaluate(el => getComputedStyle(el).borderRadius), "8px");
  await page.screenshot({ path: "output/main-flow-design-system/settings-1366.png" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator("#settingsMobileItemSelect").selectOption("permanent-template");
  await templateSave.waitFor({ state: "visible" });
  assert.ok((await templateSave.boundingBox()).height >= 44);
  assert.equal(await template.evaluate(el => getComputedStyle(el).fontSize), "16px");
  assert.deepEqual(errors, []);
});
