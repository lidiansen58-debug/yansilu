import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, payload = {}) {
  const authorship = payload.authorship || { user_confirmed: true, ai_assisted: false };
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: payload.directoryId || "dir_original_default",
    title: payload.title,
    body: payload.body,
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: "draft",
    boundaryOrCounterpoint: payload.boundaryOrCounterpoint
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));

  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title: payload.title || created.json.item.title,
    body: payload.body || created.json.item.body,
    status: "active",
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: payload.distillationStatus || "confirmed",
    originalityStatus: "pass",
    authorship,
    authorshipConfirmed: true,
    authorshipAiAssisted: Boolean(authorship.ai_assisted),
    boundaryOrCounterpoint: payload.boundaryOrCounterpoint
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

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

test("prototype main-path wikilink guidance asks to explain the relation instead of treating the note as fully isolated", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const target = await createWritingReadyPermanentNote(apiBase, {
    title: "Wikilink Guidance Target",
    body: "# Wikilink Guidance Target\n\nA target note that will only be linked by wikilink.",
    thesis: "The target note helps define the later relation rationale.",
    threeLineSummary: [
      "The target note helps define the later relation rationale.",
      "It matters because the source note should not look fully isolated.",
      "The main-path hint should ask for an explicit reason, not a first link from scratch."
    ],
    boundaryOrCounterpoint: "Only matters once the source note already points here in the body."
  });

  const source = await createWritingReadyPermanentNote(apiBase, {
    title: "Wikilink Guidance Source",
    body: "# Wikilink Guidance Source\n\nThis source already points to [[Wikilink Guidance Target]] in the body but still lacks an explicit relation rationale.",
    thesis: "A body-level wikilink should become a justified relation before this note enters writing center flow.",
    threeLineSummary: [
      "A body-level wikilink should become a justified relation.",
      "That matters because the note is not fully isolated anymore.",
      "The next step should ask to explain the relation instead of creating one from nothing."
    ],
    boundaryOrCounterpoint: "Only use this once the note has already been confirmed."
  });

  await page.goto(`${webBase}/prototype?note=${encodeURIComponent(source.json.item.id)}`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    (noteId) => Array.isArray(window.__prototypeState?.notes) && window.__prototypeState.notes.some((item) => item?.id === noteId),
    source.json.item.id
  );
  await page.evaluate((noteId) => {
    window.__prototypeState.selectedFileId = noteId;
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeEditor?.openNoteTab?.(noteId, { preferTitleSelection: false });
  }, source.json.item.id);
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();

  await waitFor(async () => {
    const mainPathText = await page.locator("[data-note-main-path-section]").textContent();
    assert.match(String(mainPathText || ""), /补关系理由/);
    assert.match(String(mainPathText || ""), /wikilink/);
    assert.match(String(mainPathText || ""), /正式关系/);
    assert.doesNotMatch(String(mainPathText || ""), /补关系，不要让它孤立/);
  }, 10000);

  const relationStepText = await page.locator("[data-note-main-path-section]").textContent();
  assert.match(String(relationStepText || ""), /补关系理由/);
  assert.match(String(relationStepText || ""), /关系为什么成立/);

  const actionButtonText = await page
    .locator('[data-note-main-route-action="relations"]')
    .first()
    .textContent();
  assert.match(String(actionButtonText || ""), /补关系理由/);
});
