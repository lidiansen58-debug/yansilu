import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing reader-takeaway pass message uses Chinese copy", async (t) => {
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
    title: "Writing Reader Takeaway Pass Note",
    body: "# Writing Reader Takeaway Pass Note\n\nA confirmed note ready for project creation.",
    thesis: "A project with a filled reader takeaway should show a Chinese pass message.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because pass messages are still visible system copy.",
      "They should align with the rest of the writing-center language."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This only makes sense once the project has a reader takeaway."
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Reader Takeaway Pass Project");
  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingCreateProject");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Create project button not found");
    button.disabled = false;
    button.click();
  });

  let projectId = "";
  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    const match = String(statusText || "").match(/wp_[a-z0-9]+/i);
    assert.ok(match);
    projectId = match[0];
  }, 10000);

  await page.evaluate(async ({ id, apiBase: baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/writing-projects/${encodeURIComponent(id)}/intent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "Explain why a confirmed note should become a writing project.",
        desiredReaderTakeaway: "The reader should leave with one durable project judgment."
      })
    });
    if (!response.ok) throw new Error(`intent patch failed: ${response.status}`);
  }, { id: projectId, apiBase });

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /- 通过 读者收获: 读者最后应带走的判断已经明确。/);
    assert.doesNotMatch(String(resultText || ""), /The desired reader takeaway is explicit\./);
  }, 10000);
});
