import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing sidebar opens saved themes and selects related notes without creating an article", async (t) => {
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
    title: "Writing Sidebar Scaffold Note",
    body: "# Writing Sidebar Scaffold Note\n\nA confirmed note ready for the writing center.",
    thesis: "The writing sidebar should use 草稿骨架 wording instead of scaffold.",
    threeLineSummary: [
      "This note already has a reusable judgment.",
      "It matters because the writing sidebar should match the rest of the writing center vocabulary.",
      "It should not slip back into scaffold wording."
    ],
    boundaryOrCounterpoint: "This only makes sense once the note is confirmed and reusable."
  });

  const theme = await postJson(apiBase, "/api/v1/index-cards", { directoryId: "dir_original_default", indexType: "topic",
    title: "侧栏主题", centralQuestion: "怎样通过材料核对理解？", noteIds: [note.json.item.id] });
  assert.equal(theme.status, 201, JSON.stringify(theme.json));
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();

  await waitFor(async () => {
    const sidebarText = await page.locator("#moduleSidebar").textContent();
    assert.match(String(sidebarText || ""), /主题库/);
    assert.match(String(sidebarText || ""), /相关笔记/);
    assert.doesNotMatch(String(sidebarText || ""), /scaffold|草稿骨架|脚手架|写作篮/);
  }, 10000);
  await page.locator('[data-writing-sidebar-action="topics"]').click();
  await page.locator(`#writingThemeIndexList [data-writing-index-card-id="${theme.json.item.id}"]`).waitFor({ state: "visible" });
  assert.equal(await page.locator('[data-writing-sidebar-action="topics"]').getAttribute("aria-pressed"), "true");
  await page.locator('[data-writing-sidebar-action="related"]').click();
  await page.locator("#writingRelatedNotesPanel:visible").waitFor();
  if (!(await page.locator("#writingCandidateList:visible").isVisible())) await page.locator("#writingCandidateDetails > summary").click();
  await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.json.item.id}"]`).click();
  await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
  await waitFor(async () => assert.equal((await page.locator("#writingSidebarRelatedCount").innerText()).trim(), "1"));
  assert.equal(await page.locator('[data-writing-sidebar-action="related"]').getAttribute("aria-pressed"), "false");
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/index-cards/${theme.json.item.id}`)).json.item, theme.json.item);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${note.json.item.id}`)).json.item, note.json.item);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
});
