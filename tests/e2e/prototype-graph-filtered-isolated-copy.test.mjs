import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, directoryId, title, bodyText) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    title,
    body: `# ${title}\n\n${bodyText}`,
    thesis: `${title} participates in graph filter guidance.`,
    threeLineSummary: [
      `${title} participates in graph filter guidance.`,
      "That matters because the filtered graph view should judge only the current visible slice.",
      "Hidden isolated notes should not hijack the next action for a focused relation view."
    ],
    distillationStatus: "draft",
    boundaryOrCounterpoint: "This only matters after the notes are mature enough for graph follow-up."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title,
    body: `# ${title}\n\n${bodyText}`,
    status: "active",
    thesis: `${title} participates in graph filter guidance.`,
    threeLineSummary: [
      `${title} participates in graph filter guidance.`,
      "That matters because the filtered graph view should judge only the current visible slice.",
      "Hidden isolated notes should not hijack the next action for a focused relation view."
    ],
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false,
    boundaryOrCounterpoint: "This only matters after the notes are mature enough for graph follow-up."
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype filtered graph view ignores hidden isolated notes when choosing the next action", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const noteA = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Filtered Graph A", "This note connects to Filtered Graph B with one support edge.");
  const noteB = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Filtered Graph B", "This note is the visible partner in the filtered slice.");
  const hiddenIsolated = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Hidden Isolated Graph Note", "This note stays outside the current filtered relation slice.");

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "These two notes form the visible support slice.",
    insightQuestion: "Should the current filtered slice still be blocked by a hidden isolated note?",
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
            { id: noteA.json.item.id, title: "Filtered Graph A", noteType: "permanent" },
            { id: noteB.json.item.id, title: "Filtered Graph B", noteType: "permanent" },
            { id: hiddenIsolated.json.item.id, title: "Hidden Isolated Graph Note", noteType: "permanent" }
          ],
          edges: [
            {
              id: relation.json.item.id,
              fromNoteId: noteA.json.item.id,
              toNoteId: noteB.json.item.id,
              fromTitle: "Filtered Graph A",
              toTitle: "Filtered Graph B",
              relationType: "supports",
              rationale: "These two notes form the visible support slice.",
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
  await page.locator("#graphRelationTypeFilter").selectOption("supports");

  await waitFor(async () => {
    const panelText = await page.locator("#graphPanel").textContent();
    assert.doesNotMatch(String(panelText || ""), /先补孤立观点/);
    assert.match(String(panelText || ""), /进入写作中心|先补关键关系/);
  }, 10000);
});
