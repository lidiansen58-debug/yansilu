import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, selectWritingChapter } from "./prototype-copy-test-helpers.mjs";
import { initVault, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createIndexCard } from "../../packages/domain/src/index-card-store.mjs";
import { createWritingProject } from "../../packages/writing-engine/src/writing-engine.mjs";

async function setup(t, { delayEditor = false } = {}) {
  const pw = await optionalPlaywright(t);
  if (!pw) return null;
  let index, project, release;
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const stack = await startPrototypeStack(t, pw, {
    navigateWaitUntil: delayEditor ? "domcontentloaded" : "networkidle",
    prepareVault: async vault => {
      await initVault(vault);
      const source = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "来源", body: "# 来源\n\n资料。", thesis: "资料有用。" });
      const draft = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "第一章", body: "# 第一章\n\n已经保存的章节内容。" });
      index = await createIndexCard(vault, { directoryId: "dir_original_default", indexType: "topic", title: "继续写作", centralQuestion: "如何继续输入？", items: [{ noteId: source.id, shortLabel: "来源", rationale: "理由" }] });
      project = await createWritingProject(vault, { title: index.title, basketNoteIds: [source.id], relatedIndexIds: [index.id],
        bookStructure: { schema_version: 1, parts: [{ id: "part", title: "正文", chapters: [
          { id: "first", title: "第一章", draft_note_id: draft.id, evidence_note_ids: [source.id] },
          { id: "second", title: "第二章", evidence_note_ids: [source.id] }
        ] }] } });
    },
    beforeNavigate: delayEditor ? async page => {
      await page.route("**/vendor/toastui-editor.bundle.js", async route => { await gate; await route.continue(); });
    } : null
  });
  if (!stack) return null;
  const { page } = stack;
  await page.waitForFunction(() => window.__prototypeEditor?.activeNote);
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`#writingProjectsList [data-writing-project-id="${project.id}"]`).first().waitFor({ state: "attached" });
  await page.locator(`[data-writing-index-card-id="${index.id}"] button`).click();
  await page.waitForFunction(() => document.querySelector('#writingDraftTarget option[value="first"]'));
  await page.locator('[data-writing-tab="draft"]').click();
  await selectWritingChapter(page, "first");
  await page.waitForFunction(() => document.querySelector("#writingDraftEditor").value.includes("已经保存的章节内容。"));
  return { ...stack, release };
}

for (const interaction of ["typing", "focus"]) test(`slow editor load preserves ${interaction} and the source selection`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const stack = await setup(t, { delayEditor: true });
  if (!stack) return;
  const { page, release } = stack;
  const source = page.locator("#writingDraftEditor"), toggle = page.locator("#btnWritingEditorMode");
  if (interaction === "typing") await source.fill("# 第一章\n\n正在输入的内容。");
  await source.focus();
  await page.keyboard.press("Control+End");
  const selection = await source.evaluate(el => [el.selectionStart, el.selectionEnd]);
  release();
  await page.waitForFunction(() => !document.querySelector("#btnWritingEditorMode").disabled);
  assert.equal(await source.isVisible(), true);
  assert.equal(await source.evaluate(el => el.ownerDocument.activeElement === el), true);
  assert.deepEqual(await source.evaluate(el => [el.selectionStart, el.selectionEnd]), selection);
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  await page.keyboard.insertText("继续写。");
  assert.match(await source.inputValue(), /继续写。$/);
  assert.equal(await page.locator("#writingDraftSaveFeedback").innerText(), "有未保存的修改");
  await toggle.click();
  const rich = page.locator("#writingDocumentEditor .toastui-editor-ww-container .ProseMirror");
  await rich.waitFor({ state: "visible" });
  assert.match(await rich.innerText(), /继续写。/);
  await page.keyboard.press("Control+s");
  await page.waitForFunction(() => document.querySelector("#writingDraftSaveFeedback").textContent === "已保存");
});

test("persisted chapters reopen as saved and new chapters remain unsaved", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const stack = await setup(t);
  if (!stack) return;
  const { page } = stack;
  const feedback = page.locator("#writingDraftSaveFeedback");
  assert.equal(await feedback.innerText(), "已保存");
  await selectWritingChapter(page, "second");
  await page.waitForFunction(() => document.querySelector("#writingDraftEditor").value.includes("第二章"));
  assert.equal(await feedback.innerText(), "尚未保存");
  await selectWritingChapter(page, "first");
  await page.waitForFunction(() => document.querySelector("#writingDraftEditor").value.includes("已经保存的章节内容。"));
  assert.equal(await feedback.innerText(), "已保存");
});
