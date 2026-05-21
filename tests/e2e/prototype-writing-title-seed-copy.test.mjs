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

test("prototype writing title seed uses 项目 wording when current note enters the basket", async (t) => {
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
    title: "Title Seed Note",
    body: "# Title Seed Note\n\nA confirmed note used to verify the default project title seed.",
    thesis: "The default writing title seed should use 项目 wording once the note enters the basket.",
    threeLineSummary: [
      "The default writing title seed should use 项目 wording.",
      "That matters because users see the seed before they decide whether to rename it.",
      "It should stay aligned with the rest of the create-project wording."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This only matters when the field is still blank and the system is choosing a default."
  });

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

  await waitFor(async () => {
    const titleValue = await page.inputValue("#writingTitle");
    assert.equal(titleValue, "Title Seed Note 项目");

    const panelText = await page.locator("#writingPanel").textContent();
    assert.doesNotMatch(String(panelText || ""), /Title Seed Note 写作项目/);
    assert.doesNotMatch(String(panelText || ""), /未命名写作项目/);
  }, 10000);
});
