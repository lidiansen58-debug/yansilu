import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createIndexCard(baseUrl, payload = {}) {
  const res = await fetch(`${baseUrl}/api/v1/index-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directoryId: payload.directoryId || "dir_original_default",
      title: payload.title || "Topic Entry Index",
      centralQuestion: payload.centralQuestion || "How should a project connect to a reusable topic entry?",
      thesis: payload.thesis || "Projects should keep a reusable topic entry.",
      threeLineSummary: payload.threeLineSummary || ["one", "two", "three"],
      noteIds: payload.noteIds || []
    })
  });
  const json = await res.json();
  assert.equal(res.status, 201, JSON.stringify(json));
  return json.item;
}

test("prototype writing topic-entry pass message uses Chinese copy", async (t) => {
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
    title: "Writing Topic Entry Pass Note",
    body: "# Writing Topic Entry Pass Note\n\nA confirmed note ready for project creation.",
    thesis: "A project with a linked topic entry should show a Chinese pass message.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because topic-entry pass messages are visible writing-center copy.",
      "They should align with the rest of the Chinese UI."
    ]
  });

  const indexCard = await createIndexCard(apiBase, {
    noteIds: [note.json.item.id]
  });

  const createdProject = await postJson(apiBase, "/api/v1/writing-projects", {
    title: "Topic Entry Pass Project",
    basketNoteIds: [note.json.item.id],
    relatedIndexIds: [indexCard.id]
  });
  assert.equal(createdProject.status, 201, JSON.stringify(createdProject.json));

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));
  await waitFor(async () => {
    const projectsText = await page.locator("#writingProjectsList").textContent();
    assert.match(String(projectsText || ""), /Topic Entry Pass Project/);
  }, 10000);

  await page.locator('#writingProjectsList button[data-writing-project-action="open"]').first().click();
  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /已恢复项目：wp_/);
  }, 10000);

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /- 通过 主题入口: 这个项目已经挂到主题或索引入口上。/);
    assert.doesNotMatch(String(resultText || ""), /The project is tied to a theme\/index entry\./);
  }, 10000);
});
