import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createIndexCard(baseUrl, payload = {}) {
  const res = await fetch(`${baseUrl}/api/v1/index-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directoryId: payload.directoryId || "dir_original_default",
      title: payload.title || "Missing Central Question Index",
      centralQuestion: payload.centralQuestion || "",
      thesis: payload.thesis || "A project should point to a real topic entry.",
      threeLineSummary: payload.threeLineSummary || ["one", "two", "three"],
      noteIds: payload.noteIds || []
    })
  });
  const json = await res.json();
  assert.equal(res.status, 201, JSON.stringify(json));
  return json.item;
}

test("prototype missing-central-question message uses Chinese copy", async (t) => {
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
    title: "Writing Missing Central Question Note",
    body: "# Writing Missing Central Question Note\n\nA confirmed note ready for project creation.",
    thesis: "A project linked to an index without a central question should show a Chinese warning.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because topic-entry quality is part of the visible writing-center flow.",
      "The missing-central-question warning should not leak English."
    ]
  });

  const indexCard = await createIndexCard(apiBase, {
    noteIds: [note.json.item.id]
  });

  const createdProject = await postJson(apiBase, "/api/v1/writing-projects", {
    title: "Missing Central Question Project",
    basketNoteIds: [note.json.item.id],
    relatedIndexIds: [indexCard.id]
  });
  assert.equal(createdProject.status, 201, JSON.stringify(createdProject.json));

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));
  await waitFor(async () => {
    const projectsText = await page.locator("#writingProjectsList").textContent();
    assert.match(String(projectsText || ""), /Missing Central Question Project/);
  }, 10000);

  await page.locator('#writingProjectsList button[data-writing-project-action="open"]').first().click();
  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /已恢复项目：wp_/);
  }, 10000);

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /补一张带中心问题的主题卡，或改用已经写出中心问题的主题。/);
    assert.doesNotMatch(String(resultText || ""), /Add or choose a topic with a central question\./);
  }, 10000);
});
