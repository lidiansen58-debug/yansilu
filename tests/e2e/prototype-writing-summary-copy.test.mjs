import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing module summary uses 草稿骨架 wording", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const note = await createWritingReadyPermanentNote(apiBase, {
    title: "Writing Summary Note",
    body: "# Writing Summary Note\n\nA confirmed note ready for the writing center.",
    thesis: "The writing module summary should align with 草稿骨架 wording.",
    threeLineSummary: [
      "This note already has a reusable judgment.",
      "It matters because the writing-center summary should match the rest of the page vocabulary.",
      "It should not slip back into 脚手架 wording."
    ],
    boundaryOrCounterpoint: "This only makes sense once the note is confirmed and reusable."
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();

  await waitFor(async () => {
    const summaryText = await page.locator("#moduleSummary").textContent();
    assert.match(String(summaryText || ""), /可写主题、项目和草稿骨架/);
    assert.doesNotMatch(String(summaryText || ""), /可写主题、项目和脚手架/);
  }, 10000);
});
