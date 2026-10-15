import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, fetchJson, startPrototypeStack, waitFor, useWritingMarkdown } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

test("prototype saved writing theme resumes the actual draft after reload and opens its note", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const source = (await createWritingReadyPermanentNote(apiBase, {
    title: "解释与理解", body: "# 解释与理解\n\n解释不清时，应回到材料核对。",
    thesis: "解释不清时应回到材料核对。", threeLineSummary: ["先尝试解释。", "核对遗漏的依据。", "考虑具体材料与适用条件。"],
    boundaryOrCounterpoint: "尚未读过材料时，先阅读再解释。"
  })).json.item;
  const notes = await addWritingSupportNotes(apiBase, source);
  const title = "草稿继续写作验收";
  await createManualWritingTheme(stack, notes, { title });
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  await page.locator("#btnWritingStartDraft").click();
  await useWritingMarkdown(page);
  const markdown = `# ${title}\n\n保存后的正文：中文、[[解释与理解]] 与唯一标记 draft-resume-evidence。`;
  await page.locator("#writingDraftEditor:visible").fill(markdown);
  await page.locator("#btnWritingSaveDraft").click();
  let project, saved;
  await waitFor(async () => {
    project = await findWritingProject(stack, notes, title);
    assert.ok(project.draft_note_id);
    saved = (await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item;
    assert.match(saved.body, /draft-resume-evidence/);
  });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  const resume = page.locator(`#writingThemeIndexList [data-writing-project-id="${project.id}"]`);
  assert.equal(await resume.innerText(), "继续草稿");
  await resume.click();
  await page.locator("#writingDraftPanel:visible").waitFor();
  await useWritingMarkdown(page);
  assert.equal(await page.locator("#writingDraftEditor").inputValue(), saved.body);
  await page.locator("#writingMoreMenu > summary").click();
  await page.locator("#btnWritingOpenDraft").click();
  await page.waitForFunction(id => window.__prototypeState.module === "explorer" && window.__prototypeState.selectedFileId === id, project.draft_note_id);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${project.draft_note_id}`)).json.item.body, saved.body);
  const projects = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items;
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, project.id);
  assert.equal(projects[0].draft_note_id, saved.id);
});
