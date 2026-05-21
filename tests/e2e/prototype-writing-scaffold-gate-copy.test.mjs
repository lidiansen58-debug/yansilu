import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function ensureNoteMode(page) {
  const alreadyNoteMode = await page.evaluate(() =>
    document.querySelector("#markdownSplit")?.classList.contains("editor-mode-wysiwyg")
  ).catch(() => false);
  if (alreadyNoteMode) return;
  const modeButton = page.locator("#btnModeToggle");
  if (!(await modeButton.isVisible().catch(() => false))) return;
  await modeButton.click();
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const host = document.querySelector("#wysiwygHost");
    if (!split || !host) return false;
    return split.classList.contains("editor-mode-wysiwyg") && window.getComputedStyle(host).display !== "none";
  });
}

test("prototype scaffold gate asks to create 项目 before generating a scaffold", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const note = await createWritingReadyPermanentNote(apiBase, {
    title: "Scaffold Gate Note",
    body: "# Scaffold Gate Note\n\nA confirmed note with one explicit relation and a boundary.",
    thesis: "A project-ready note should still ask to create a project before generating a scaffold.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because scaffold generation should be gated behind project creation.",
      "The warning copy should match the newer create-project wording."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This only applies once the note is ready for project creation."
  });

  const target = await createWritingReadyPermanentNote(apiBase, {
    title: "Scaffold Gate Target",
    body: "# Scaffold Gate Target\n\nA target note for project readiness.",
    thesis: "A supporting note helps the source note reach project-ready status.",
    threeLineSummary: [
      "The target note already has a reusable judgment.",
      "It matters because the source note should not remain isolated.",
      "It helps unlock project creation before scaffold generation."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This target note is only useful when its relation is explicit."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}/relations`, {
    toNoteId: target.json.item.id,
    relationType: "supports",
    rationale: "The target note gives the source note enough structure to justify project creation first.",
    insightQuestion: "What should the writing center ask for before scaffold generation?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype?note=${encodeURIComponent(note.json.item.id)}`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    (noteId) => Array.isArray(window.__prototypeState?.notes) && window.__prototypeState.notes.some((item) => item?.id === noteId),
    note.json.item.id
  );
  await page.evaluate((noteId) => {
    window.__prototypeState.selectedFileId = noteId;
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeEditor?.openNoteTab?.(noteId, { preferTitleSelection: false });
  }, note.json.item.id);
  await ensureNoteMode(page);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));
  await page.click("#btnWritingUseCurrent");

  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingCreateScaffold");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Create scaffold button not found");
    button.disabled = false;
    button.click();
  });

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.equal(String(statusText || "").trim(), "请先创建项目");
  }, 10000);
});
