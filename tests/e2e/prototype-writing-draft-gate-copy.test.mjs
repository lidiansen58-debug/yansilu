import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype draft-save gate result uses 草稿骨架 wording", async (t) => {
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
    title: "Writing Draft Gate Note",
    body: "# Writing Draft Gate Note\n\nA confirmed note ready for project creation.",
    thesis: "Saving a draft should ask for 草稿骨架 wording before a draft note exists.",
    threeLineSummary: [
      "This note already has a reusable judgment.",
      "It matters because the draft-save gate should match the rest of the writing center vocabulary.",
      "It should not fall back to scaffold wording."
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
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Draft Gate Project");
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
    const button = document.querySelector("#btnWritingSaveDraft");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Save draft button not found");
    button.disabled = false;
    button.click();
  });

  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /请先生成草稿骨架，再保存成草稿笔记。/);
    assert.doesNotMatch(String(resultText || ""), /请先生成 scaffold，再保存成草稿笔记。/);
  }, 10000);
});
