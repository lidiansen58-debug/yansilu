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

test("prototype current-note writing action surfaces the real draft eligibility reason", async (t) => {
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
    title: "Draft Eligibility Note",
    body: "# Draft Eligibility Note\n\nA permanent note that is still draft.",
    thesis: "The writing center should explain that this note is still draft, not that it is the wrong type.",
    threeLineSummary: [
      "This note is still draft.",
      "That matters because the current-note button should surface the real reason it cannot enter the basket.",
      "The warning should mention originality confirmation and the writing center."
    ],
    distillationStatus: "confirmed",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    }
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

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));
  await page.click("#btnWritingUseCurrent");

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /仍是 draft/);
    assert.match(String(statusText || ""), /进入写作中心/);
    assert.doesNotMatch(String(statusText || ""), /写作篮只接受永久笔记/);
  }, 10000);
});
