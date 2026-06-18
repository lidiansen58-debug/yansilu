import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, directoryId, title, bodyText) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    title,
    body: `# ${title}\n\n${bodyText}`,
    thesis: `${title} participates in graph follow-up guidance.`,
    threeLineSummary: [
      `${title} participates in graph follow-up guidance.`,
      "That matters because graph next-action quality should reflect whether a slice is structurally ready.",
      "A sparse slice should stay in relation-building mode before writing handoff."
    ],
    distillationStatus: "draft",
    boundaryOrCounterpoint: "This only matters once the note is already mature enough for graph follow-up."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title,
    body: `# ${title}\n\n${bodyText}`,
    status: "active",
    thesis: `${title} participates in graph follow-up guidance.`,
    threeLineSummary: [
      `${title} participates in graph follow-up guidance.`,
      "That matters because graph next-action quality should reflect whether a slice is structurally ready.",
      "A sparse slice should stay in relation-building mode before writing handoff."
    ],
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false,
    boundaryOrCounterpoint: "This only matters once the note is already mature enough for graph follow-up."
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype graph next-action keeps sparse three-note slices in relation-building mode", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const noteA = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Sparse Graph A", "This note only has one explicit support edge.");
  const noteB = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Sparse Graph B", "This note is the only connected partner so far.");
  const noteC = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Sparse Graph C", "This note is visible in the slice but not yet connected through an explicit relation.");

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "These two notes form one explicit local edge, but the whole slice is still sparse.",
    insightQuestion: "Which relation should be added next before this slice enters writing?",
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
            { id: noteA.json.item.id, title: "Sparse Graph A", noteType: "permanent" },
            { id: noteB.json.item.id, title: "Sparse Graph B", noteType: "permanent" },
            { id: noteC.json.item.id, title: "Sparse Graph C", noteType: "permanent" }
          ],
          edges: [
            {
              id: relation.json.item.id,
              fromNoteId: noteA.json.item.id,
              toNoteId: noteB.json.item.id,
              fromTitle: "Sparse Graph A",
              toTitle: "Sparse Graph B",
              relationType: "supports",
              rationale: "These two notes form one explicit local edge, but the whole slice is still sparse.",
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
    assert.match(String(panelText || ""), /先补关键关系/);
    assert.match(String(panelText || ""), /正式关系还太少/);
    assert.doesNotMatch(String(panelText || ""), /带进写作中心/);
  }, 10000);

  const buttonText = await page.locator(".graph-next-card [data-graph-followup-action='relations']").textContent();
  assert.match(String(buttonText || ""), /先补关键关系/);
});
