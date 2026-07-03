import test from "node:test";
import assert from "node:assert/strict";
import {
  createWritingReadyPermanentNote,
  fetchJson,
  optionalPlaywright,
  postJson,
  startPrototypeStack,
  waitFor
} from "./prototype-copy-test-helpers.mjs";

function graphNodeFromNote(note = {}, degree = 2) {
  return {
    id: note.id,
    title: note.title,
    noteType: "original",
    directoryId: note.folderId || "dir_original_default",
    folderId: note.folderId || "dir_original_default",
    degree
  };
}

function graphEdge(from = {}, to = {}, index = 1) {
  return {
    id: `theme-entry-edge-${index}`,
    fromNoteId: from.id,
    toNoteId: to.id,
    fromTitle: from.title,
    toTitle: to.title,
    relationType: index % 3 === 0 ? "bridges" : "supports",
    rationale: "These notes answer the same topic-index question from different angles.",
    status: "confirmed",
    createdBy: "user"
  };
}

test("prototype graph creates a theme index from 3-5 related permanent notes and opens writing center", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const notes = [];
  for (const suffix of ["A", "B", "C", "D"]) {
    const created = await createWritingReadyPermanentNote(apiBase, {
      title: `Browser Theme Index ${suffix}`,
      body: `# Browser Theme Index ${suffix}\n\nA permanent note that belongs to the same browser acceptance topic.`,
      thesis: `Browser theme index note ${suffix} contributes one angle to the shared question.`,
      threeLineSummary: [
        `Browser theme index note ${suffix} contributes one angle to the shared question.`,
        "It matters because the graph should turn related permanent notes into a reusable topic entry.",
        "The next writing step is to open the writing center from the saved theme index."
      ],
      boundaryOrCounterpoint: "The topic should stay focused on the graph to writing-center handoff."
    });
    notes.push(created.json.item);
  }

  for (let index = 0; index < notes.length - 1; index += 1) {
    const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(notes[index].id)}/relations`, {
      toNoteId: notes[index + 1].id,
      relationType: "supports",
      rationale: "This relation keeps the acceptance notes in one theme-index cluster.",
      insightQuestion: "How should a relation cluster become a topic index entry?",
      confidence: 1
    });
    assert.equal(relation.status, 201, JSON.stringify(relation.json));
  }

  const graph = {
    directoryTitle: "Browser Theme Index Scope",
    nodes: notes.map((note, index) => graphNodeFromNote(note, 4 - index)),
    edges: [
      graphEdge(notes[0], notes[1], 1),
      graphEdge(notes[1], notes[2], 2),
      graphEdge(notes[2], notes[3], 3),
      graphEdge(notes[3], notes[0], 4)
    ],
    insights: {
      bridgeGaps: [],
      untypedRelations: []
    }
  };

  await page.route("**/api/v1/graph?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ item: graph })
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
      body: JSON.stringify({ total: 0, items: [] })
    });
  });

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    assert.ok(await page.locator(`.graph-map-node[data-node-id="${notes[0].id}"]`).isVisible());
  }, 10000);

  await page.locator(`.graph-map-node[data-node-id="${notes[0].id}"]`).click();
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-selection-panel.is-node").isVisible());
    assert.ok((await page.locator(".graph-selection-panel.is-node [data-graph-create-theme-index]:not([disabled])").count()) >= 1);
  }, 5000);
  await page.locator(".graph-selection-panel.is-node details.graph-selection-details summary").first().click();
  await waitFor(async () => {
    assert.ok((await page.locator(".graph-selection-panel.is-node [data-graph-create-theme-index]:not([disabled]):visible").count()) >= 1);
  }, 5000);

  await page.locator(".graph-selection-panel.is-node [data-graph-create-theme-index]:not([disabled]):visible").first().click();

  let savedIndex = null;
  await waitFor(async () => {
    const list = await fetchJson(apiBase, "/api/v1/index-cards?indexType=topic&limit=20");
    assert.equal(list.status, 200, JSON.stringify(list.json));
    const noteIdSet = new Set(notes.map((note) => note.id));
    savedIndex = list.json.items.find((item) => {
      const itemNoteIds = (item.items || []).map((entry) => String(entry.note_id || entry.noteId || "").trim()).filter(Boolean);
      return itemNoteIds.length >= 3 && itemNoteIds.length <= 5 && itemNoteIds.every((noteId) => noteIdSet.has(noteId));
    });
    assert.ok(savedIndex, "theme index was saved from the graph cluster");
    assert.match(String(savedIndex.central_question || savedIndex.centralQuestion || ""), /Browser Theme Index/);
    assert.ok(savedIndex.items.length >= 3 && savedIndex.items.length <= 5);
    assert.ok(savedIndex.items.every((item) => String(item.rationale || "").includes("为什么重要")));
  }, 10000);

  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"), null, { timeout: 10000 });
  await waitFor(async () => {
    const detailTitle = await page.locator("#writingThemeDetailTitle").inputValue();
    const themeListText = await page.locator("#writingThemeIndexList").textContent();
    const basketText = await page.locator("#writingBasketList").textContent();
    assert.match(String(detailTitle || ""), /Browser Theme Index/);
    assert.match(String(themeListText || ""), new RegExp(savedIndex.id));
    assert.match(String(basketText || ""), /Browser Theme Index A/);
    assert.match(String(basketText || ""), /Browser Theme Index B|Browser Theme Index D/);
  }, 10000);
});
