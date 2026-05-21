import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing readiness messages use Chinese labels in scaffold result", async (t) => {
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
    title: "Writing Readiness Message Note",
    body: "# Writing Readiness Message Note\n\nA confirmed note ready for project creation.",
    thesis: "A project-ready note should show Chinese field labels in readiness messages.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because writing-center output should not leak internal field keys.",
      "The readiness result should be readable in the same language as the rest of the UI."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This only makes sense once the note is ready for project creation."
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Readiness Message Project");
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
    assert.match(String(resultText || ""), /- 写作意图: 先说清这个项目到底想表达什么。/);
    assert.match(String(resultText || ""), /- 读者收获: 写下读者最后应该带走的判断。/);
    assert.doesNotMatch(String(resultText || ""), /- intent: Clarify what this writing project is trying to say\./);
    assert.doesNotMatch(String(resultText || ""), /- desired_reader_takeaway: Write the judgment the reader should take away\./);
  }, 10000);
});
