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
      "That matters because graph next-action quality should reflect whether relation reasons are strong enough.",
      "A thin rationale should stay in graph cleanup before writing handoff."
    ],
    distillationStatus: "draft",
    boundaryOrCounterpoint: "This only matters after the note is already mature enough for graph follow-up."
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
      "That matters because graph next-action quality should reflect whether relation reasons are strong enough.",
      "A thin rationale should stay in graph cleanup before writing handoff."
    ],
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false,
    boundaryOrCounterpoint: "This only matters after the note is already mature enough for graph follow-up."
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype graph next-action keeps thin-rationale slices in relation-strengthening mode", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const noteA = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Thin Rationale A", "This note already has one explicit support edge, but the reason is still thin.");
  const noteB = await createWritingReadyPermanentNote(apiBase, "dir_original_default", "Thin Rationale B", "This note is the connected partner in the thin-rationale slice.");

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "A short reason.",
    insightQuestion: "",
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
            { id: noteA.json.item.id, title: "Thin Rationale A", noteType: "permanent" },
            { id: noteB.json.item.id, title: "Thin Rationale B", noteType: "permanent" }
          ],
          edges: [
            {
              id: relation.json.item.id,
              fromNoteId: noteA.json.item.id,
              toNoteId: noteB.json.item.id,
              fromTitle: "Thin Rationale A",
              toTitle: "Thin Rationale B",
              relationType: "supports",
              rationale: "A short reason.",
              rationaleQualityLevel: "basic",
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
    assert.match(String(panelText || ""), /先补关系理由/);
    assert.match(String(panelText || ""), /正式关系/);
    assert.doesNotMatch(String(panelText || ""), /带进写作中心/);
  }, 10000);
});
