import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing counterpoint prompt uses Chinese copy in scaffold result", async (t) => {
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
    title: "Writing Counterpoint Prompt Note",
    body: "# Writing Counterpoint Prompt Note\n\nA confirmed note ready for project creation.",
    thesis: "A note with an explicit boundary should render a Chinese counterpoint prompt.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because the scaffold result should not leak English prompt prefixes.",
      "The counterpoint prompt should match the surrounding Chinese UI."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This readiness only makes sense after at least one explicit relation is added."
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Counterpoint Prompt Project");
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
    assert.match(String(resultText || ""), /在「Writing Counterpoint Prompt Note」这一段里，要正面处理哪条反方或边界：This readiness only makes sense after at least one explicit relation is added\./);
    assert.doesNotMatch(String(resultText || ""), /Address this counterpoint or boundary in \"Writing Counterpoint Prompt Note\": This readiness only makes sense after at least one explicit relation is added\./);
  }, 10000);
});
