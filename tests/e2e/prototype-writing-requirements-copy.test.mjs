import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

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

test("prototype requirements route says 进入写作中心 in the warning copy", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const note = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "draft",
    title: "Requirements Route Note",
    body: "# Requirements Route Note\n\nA confirmed note that still needs originality confirmation before entering the writing center.",
    thesis: "Requirements-mode notes should point users toward the writing center, not a generic writing step.",
    threeLineSummary: [
      "Requirements-mode notes should point users toward the writing center.",
      "That matters because this route now opens the writing center directly.",
      "The warning copy should match the actual module the user lands in."
    ],
    distillationStatus: "confirmed",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    },
    boundaryOrCounterpoint: "This only matters once the main-path writing action opens the writing center."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

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
  await page.locator("#btnShowRelated").click();

  await page.locator('[data-note-main-route-action="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /进入写作中心/);
    assert.doesNotMatch(String(statusText || ""), /再进入写作。/);
  }, 10000);
});
