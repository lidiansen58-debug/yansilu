import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes } from "./prototype-writing-flow-helpers.mjs";

test("prototype writing module summary describes the visible theme outline and draft path", async (t) => {
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

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();

  await waitFor(async () => {
    const entry = page.locator("#writingEmptyTopic h2");
    assert.equal(await entry.isVisible(), true);
    assert.equal((await entry.innerText()).trim(), "选择一个可写主题");
    const create = page.locator("#btnWritingSaveThemeIndex");
    assert.equal(await create.isVisible(), true);
    assert.equal((await create.innerText()).trim(), "新建主题");
  }, 10000);
  const notes = await addWritingSupportNotes(apiBase, note.json.item);
  const saved = await postJson(apiBase, "/api/v1/index-cards", { directoryId: "dir_original_default", indexType: "topic",
    title: "核对理解", centralQuestion: "如何结合材料核对与适用边界检验理解？", noteIds: notes.map(item => item.id) });
  assert.equal(saved.status, 201, JSON.stringify(saved.json));
  const baselineNotes = await Promise.all(notes.map(async source => (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item));
  const baselineFiles = await Promise.all(notes.map(source => fs.readFile(path.join(stack.vaultPath, source.markdownPath))));
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`[data-writing-index-card-id="${saved.json.item.id}"] button.primary`).click();
  const steps = page.getByRole("tablist", { name: "写作步骤" });
  await steps.waitFor({ state: "visible" });
  assert.deepEqual((await steps.getByRole("tab").allTextContents()).map(text => text.trim()), ["主题", "提纲", "草稿"]);
  assert.doesNotMatch(await steps.innerText(), /项目|草稿骨架|脚手架|scaffold|写作篮/);
  for (const label of ["主题", "提纲", "草稿"]) {
    const tab = steps.getByRole("tab", { name: label, exact: true });
    await tab.click();
    assert.equal(await tab.getAttribute("aria-selected"), "true");
    assert.equal(await steps.locator('[aria-selected="true"]').count(), 1);
  }
  for (const [index, source] of notes.entries()) {
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item, baselineNotes[index]);
    assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, source.markdownPath)), baselineFiles[index]);
  }
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/index-cards/${saved.json.item.id}`)).json.item, saved.json.item);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
});
