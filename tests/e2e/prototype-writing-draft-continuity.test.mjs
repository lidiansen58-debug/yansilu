import test from "node:test";
import assert from "node:assert/strict";

import { createWritingReadyPermanentNote, optionalPlaywright, postJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing flow switches the last step to open current draft after saving", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const target = await createWritingReadyPermanentNote(apiBase, {
    title: "Draft Continuity Target",
    body: "# Draft Continuity Target\n\nA durable target note.",
    thesis: "A supporting target note helps the source note reach project-ready status.",
    threeLineSummary: [
      "The target note already has a reusable judgment.",
      "It matters because the source note should not remain isolated.",
      "It helps the source note enter writing-center project flow."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This target note is only useful when its relation is explicit."
  });

  const source = await createWritingReadyPermanentNote(apiBase, {
    title: "Draft Continuity Note",
    body: "# Draft Continuity Note\n\n[[Draft Continuity Target]]\n\nA confirmed note with one explicit relation and a boundary.",
    thesis: "Once a draft exists, the writing flow should tell the user to reopen the current draft instead of saving again.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because writing-center next-action continuity should stay explicit.",
      "The last step should switch to reopening the current draft after the first save."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This only makes sense after a scaffold already exists."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`, {
    toNoteId: target.json.item.id,
    relationType: "supports",
    rationale: "The target note gives the source note enough structure to justify project creation.",
    insightQuestion: "What should the user do after the first draft save?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, source.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Draft Continuity Project");
  await page.fill("#writingGoal", "Verify that the final writing step changes to opening the current draft.");
  await page.fill("#writingAudience", "Researchers");
  await page.fill("#writingTone", "clear");
  await page.fill("#writingVersionNote", "First draft note for continuity.");
  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingCreateProject");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Create project button not found");
    button.disabled = false;
    button.click();
  });

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /可写主题已确定：wp_/);
  }, 10000);

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const previewText = await page.locator("#writingScaffoldPreview").textContent();
    assert.match(String(previewText || ""), /文章提纲|Paragraph-Evidence Map/);
  }, 10000);

  await page.click("#btnWritingSaveDraft");
  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /草稿|打开当前草稿/);
  }, 10000);

  await waitFor(async () => {
    const stepFourText = await page.locator("#writingFlowSteps .writing-flow-step").nth(3).textContent();
    const openDraftText = await page.locator("#btnWritingOpenDraft").textContent();
    assert.match(String(stepFourText || ""), /打开当前草稿/);
    assert.match(String(stepFourText || ""), /继续写作/);
    assert.match(String(openDraftText || ""), /打开当前草稿/);
  }, 10000);
});
