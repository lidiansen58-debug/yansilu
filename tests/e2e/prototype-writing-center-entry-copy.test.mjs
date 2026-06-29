import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing module summary uses 写作中心 and 草稿骨架 wording", async (t) => {
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
    title: "Writing Center Entry Note",
    body: "# Writing Center Entry Note\n\nA confirmed note that should be ready to enter the writing center.",
    thesis: "A confirmed note with three-line compression should advertise the writing center as the next handoff.",
    threeLineSummary: [
      "The note already has a reusable judgment.",
      "It matters because the handoff should use the same route name across surfaces.",
      "It should push the user toward the writing center instead of older preparation wording."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This wording only makes sense once the note is confirmed and reusable."
  });
  assert.equal(note.status, 200, JSON.stringify(note.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();

  await waitFor(async () => {
    const sidebarText = await page.locator("#moduleSidebar").textContent();
    const subtitleText = await page.locator("#sidebarSubtitle").textContent();
    const summaryText = await page.locator("#moduleSummary").textContent();
    assert.match(String(subtitleText || ""), /从成熟笔记进入写作中心。/);
    assert.match(String(sidebarText || ""), /写作原则/);
    assert.match(String(sidebarText || ""), /永久笔记加入写作篮/);
    assert.doesNotMatch(String(sidebarText || ""), /永久笔记进入写作篮/);
    assert.match(String(summaryText || ""), /可写主题、项目和草稿骨架/);
    assert.match(String(summaryText || ""), /写作中心这条主路径展开/);
    assert.doesNotMatch(String(summaryText || ""), /可写主题、项目和脚手架/);
    assert.doesNotMatch(String(summaryText || ""), /写作项目和脚手架/);
    assert.doesNotMatch(String(summaryText || ""), /写作准备展开/);
  }, 10000);
});
