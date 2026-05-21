import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing counterpoint fallback prompt uses Chinese copy", async (t) => {
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
    title: "Writing Counterpoint Fallback Note",
    body: "# Writing Counterpoint Fallback Note\n\nA confirmed note ready for project creation.",
    thesis: "A note without a stored boundary should show the fallback counterpoint prompt in Chinese.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because fallback prompts are still visible system-authored copy.",
      "The scaffold result should not leak English even when boundary data is missing."
    ],
    distillationStatus: "confirmed"
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Counterpoint Fallback Project");
  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingCreateProject");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Create project button not found");
    button.disabled = false;
    button.click();
  });

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /项目已创建：wp_/);
  }, 10000);

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /正式起草前，至少先补一条反方或边界，不然论证会太顺。/);
    assert.match(String(resultText || ""), /「Writing Counterpoint Fallback Note」这一段还应该补出哪条反方、限制或例外？/);
    assert.doesNotMatch(String(resultText || ""), /Add at least one boundary or counterpoint before drafting, or the argument may become too smooth\./);
    assert.doesNotMatch(String(resultText || ""), /What counterpoint, limit, or exception should \"Writing Counterpoint Fallback Note\" acknowledge\?/);
  }, 10000);
});
