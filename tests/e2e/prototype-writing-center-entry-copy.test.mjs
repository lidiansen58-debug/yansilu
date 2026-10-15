import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing entry uses visible plain-language actions without a duplicate instruction panel", async (t) => {
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
  await page.locator('.rail-btn[data-module="writing"]').click();

  await waitFor(async () => {
    const sidebarText = await page.locator("#moduleSidebar").textContent();
    assert.equal(await page.locator("#writingEmptyTopic h2").isVisible(), true);
    assert.equal((await page.locator("#writingEmptyTopic h2").innerText()).trim(), "选择一个可写主题");
    assert.equal(await page.getByRole("heading", { name: "选择一个可写主题", exact: true }).count(), 1);
    const actions = page.locator("#moduleSidebar [data-writing-sidebar-action]");
    assert.equal(await actions.count(), 2);
    assert.equal(await actions.nth(0).isVisible(), true);
    assert.equal(await actions.nth(1).isVisible(), true);
    assert.equal((await actions.nth(0).innerText()).trim(), "主题库");
    assert.match(await actions.nth(1).innerText(), /相关笔记/);
    assert.doesNotMatch(String(sidebarText || ""), /写作篮|脚手架|草稿骨架|你要回答四件事|操作顺序/);
  }, 10000);
  const related = page.locator('[data-writing-sidebar-action="related"]');
  await related.click();
  await page.locator("#writingRelatedNotesPanel:visible").waitFor();
  assert.equal(await related.getAttribute("aria-pressed"), "true");
  await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
  assert.equal(await related.getAttribute("aria-pressed"), "false");
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${note.json.item.id}`)).json.item, note.json.item);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
});
