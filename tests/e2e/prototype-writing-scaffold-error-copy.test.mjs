import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype scaffold copy/export errors use 草稿骨架 Markdown wording", async (t) => {
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
    title: "Writing Scaffold Error Note",
    body: "# Writing Scaffold Error Note\n\nA confirmed note ready for project creation.",
    thesis: "Copy and export failures should use 草稿骨架 Markdown wording in the result card.",
    threeLineSummary: [
      "This note already has a reusable judgment.",
      "It matters because scaffold copy/export failures are still a live writing-center surface.",
      "They should not fall back to mixed English wording."
    ],
    boundaryOrCounterpoint: "This only makes sense once the project exists but no scaffold exists yet."
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Scaffold Error Project");
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

  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingCopyScaffold");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Copy scaffold button not found");
    button.disabled = false;
    button.click();
  });

  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /草稿骨架 Markdown 复制失败/);
    assert.doesNotMatch(String(resultText || ""), /Scaffold 复制失败/);
  }, 10000);

  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingExportScaffold");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Export scaffold button not found");
    button.disabled = false;
    button.click();
  });

  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /草稿骨架 Markdown 导出失败/);
    assert.doesNotMatch(String(resultText || ""), /Scaffold 导出失败/);
  }, 10000);
});
