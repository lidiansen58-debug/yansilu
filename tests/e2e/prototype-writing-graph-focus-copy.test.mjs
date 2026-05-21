import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, directoryId, title) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    title,
    body: `# ${title}\n\nA mature permanent note for graph-to-writing continuity.`,
    thesis: `${title} should stay inside the focused graph slice when entering the writing center.`,
    threeLineSummary: [
      `${title} should stay inside the focused graph slice when entering the writing center.`,
      "That matters because graph follow-up should not immediately fall back to the whole directory.",
      "The writing center should keep the current slice visible until the user broadens scope."
    ],
    distillationStatus: "draft",
    boundaryOrCounterpoint: "This only works after the graph already has explicit structure."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title,
    body: `# ${title}\n\nA mature permanent note for graph-to-writing continuity.`,
    status: "active",
    thesis: `${title} should stay inside the focused graph slice when entering the writing center.`,
    threeLineSummary: [
      `${title} should stay inside the focused graph slice when entering the writing center.`,
      "That matters because graph follow-up should not immediately fall back to the whole directory.",
      "The writing center should keep the current slice visible until the user broadens scope."
    ],
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false,
    boundaryOrCounterpoint: "This only works after the graph already has explicit structure."
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype graph writing follow-up keeps the focused graph slice visible in the writing center", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase, vaultPath } = stack;

  const directory = await postJson(apiBase, "/api/v1/directories", {
    title: "Graph Writing Focus Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "graph-writing-focus-scope"),
    maxNotes: 500
  });
  assert.equal(directory.status, 201, JSON.stringify(directory.json));
  const directoryId = directory.json.item.id;

  const noteA = await createWritingReadyPermanentNote(apiBase, directoryId, "Graph Focus Note A");
  const noteB = await createWritingReadyPermanentNote(apiBase, directoryId, "Graph Focus Note B");
  const noteC = await createWritingReadyPermanentNote(apiBase, directoryId, "Directory Extra Note");

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "These two notes already form a small explicit structure that can enter the writing center together.",
    insightQuestion: "Which part of this focused graph slice should move into writing first?",
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
            { id: noteA.json.item.id, title: "Graph Focus Note A", noteType: "permanent" },
            { id: noteB.json.item.id, title: "Graph Focus Note B", noteType: "permanent" },
            { id: noteC.json.item.id, title: "Directory Extra Note", noteType: "permanent" }
          ],
          edges: [
            {
              id: relation.json.item.id,
              fromNoteId: noteA.json.item.id,
              toNoteId: noteB.json.item.id,
              fromTitle: "Graph Focus Note A",
              toTitle: "Graph Focus Note B",
              relationType: "supports",
              rationale: "These two notes already form a small explicit structure that can enter the writing center together.",
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
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${directoryId}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    await page.locator("#graphRelationTypeFilter").selectOption("supports");
    const buttonText = await page.locator('[data-graph-followup-action="writing"]').textContent();
    assert.match(String(buttonText || ""), /进入写作中心/);
  }, 10000);

  await page.locator('[data-graph-followup-action="writing"]').click();

  await waitFor(async () => {
    const scopeHint = await page.locator("#writingScopeHint").textContent();
    const summaryText = await page.locator("#writingCandidateSummary").textContent();
    const actionLabel = await page.locator("#btnWritingAddVisible").textContent();
    const candidateText = await page.locator("#writingCandidateList").textContent();

    assert.match(String(scopeHint || ""), /图谱切片/);
    assert.match(String(summaryText || ""), /当前图谱切片/);
    assert.match(String(actionLabel || ""), /把当前图谱切片加入写作篮/);
    assert.match(String(candidateText || ""), /Graph Focus Note A/);
    assert.match(String(candidateText || ""), /Graph Focus Note B/);
    assert.doesNotMatch(String(candidateText || ""), /Directory Extra Note/);
  }, 10000);
});
