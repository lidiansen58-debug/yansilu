import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, directoryId, title) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    title,
    body: `# ${title}\n\nA mature permanent note for the graph writing handoff.`,
    thesis: `${title} should participate in a graph handoff into the writing center.`,
    threeLineSummary: [
      `${title} should participate in a graph handoff into the writing center.`,
      "That matters because the next-action note should describe continuing this graph slice, not re-picking notes from scratch.",
      "It should stay aligned with the auto-prefill behavior already implemented."
    ],
    distillationStatus: "draft",
    boundaryOrCounterpoint: "This only works once the graph already has explicit structure."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title,
    body: `# ${title}\n\nA mature permanent note for the graph writing handoff.`,
    status: "active",
    thesis: `${title} should participate in a graph handoff into the writing center.`,
    threeLineSummary: [
      `${title} should participate in a graph handoff into the writing center.`,
      "That matters because the next-action note should describe continuing this graph slice, not re-picking notes from scratch.",
      "It should stay aligned with the auto-prefill behavior already implemented."
    ],
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false,
    boundaryOrCounterpoint: "This only works once the graph already has explicit structure."
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype graph next-action note describes carrying the current slice into the writing center", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase, vaultPath } = stack;

  const noteA = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Graph Next Action A");
  const noteB = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Graph Next Action B");

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "The second note gives the first enough explicit structure to justify entering the writing center.",
    insightQuestion: "Which part of this graph slice should move forward into writing first?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.route("**/api/v1/graph?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        item: {
          directoryTitle: "永久笔记盒",
          nodes: [
            { id: noteA.json.item.id, title: "Graph Next Action A", noteType: "permanent" },
            { id: noteB.json.item.id, title: "Graph Next Action B", noteType: "permanent" }
          ],
          edges: [
            {
              id: relation.json.item.id,
              fromNoteId: noteA.json.item.id,
              toNoteId: noteB.json.item.id,
              fromTitle: "Graph Next Action A",
              toTitle: "Graph Next Action B",
              relationType: "supports",
              rationale: "The second note gives the first enough explicit structure to justify continuing in the writing center.",
              status: "confirmed",
              createdBy: "user"
            }
          ],
          insights: {
            bridgeGaps: [],
            untypedRelations: []
          }
        }
      })
    });
  });
  await page.route("**/api/v1/graph/conflicts?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conflicts: [] })
    });
  });
  await page.route("**/api/v1/relations/review-queue?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0 })
    });
  });

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    const panelText = await page.locator("#graphPanel").textContent();
    assert.match(String(panelText || ""), /带进写作中心/);
    assert.doesNotMatch(String(panelText || ""), /去写作中心挑选/);
  }, 10000);
});
