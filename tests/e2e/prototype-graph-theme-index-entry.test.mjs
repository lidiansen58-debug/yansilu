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

test("mixed eligible theme materials remain saved without entering writing", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const notes = [];
  for (const title of ["写作材料甲", "写作材料乙"]) {
    notes.push((await createWritingReadyPermanentNote(apiBase, {
      title, body: `# ${title}\n\n共同问题的已确认判断。\n\n边界：相似主题并不自动构成支持关系。`,
      thesis: "知识关联需要保留真实理由才能用于写作。",
      threeLineSummary: ["知识关联需要保留真实理由才能用于写作。", "已有关系保存证据。", "写作应当检查判断的边界。"],
      boundaryOrCounterpoint: "相似主题并不自动构成支持关系。"
    })).json.item);
  }
  const draft = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# 未确认材料\n\n仍在整理的判断。"
  });
  assert.equal(draft.status, 201);
  notes.push(draft.json.item);
  for (const target of notes.slice(1)) {
    assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
      toNoteId: target.id, relationType: "supports", rationale: "共同讨论知识关联的理由。"
    })).status, 201);
  }
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
  const previousBasket = await page.locator("#writingBasketNoteIds").inputValue();
  const node = page.locator(`.graph-map-node[data-node-id="${notes[0].id}"]`);
  await node.focus();
  await node.press("Enter");
  await page.locator(".graph-selection-panel [data-graph-create-theme-index]").click();
  const question = "知识关联怎样成为可靠的写作材料？";
  await page.locator("#graphThemeQuestion").fill(question);
  await page.locator('[data-graph-theme-confirmation-form] button[type="submit"]').click();
  await waitFor(async () => {
    assert.match(await page.locator("#statusText").textContent(), /已保存.*1 条材料.*作者或原创确认/);
    assert.equal(await page.evaluate(() => window.__prototypeState.module), "graph");
    assert.equal(await page.locator("#writingBasketNoteIds").inputValue(), previousBasket);
    const list = await fetchJson(apiBase, "/api/v1/index-cards?indexType=topic&limit=20");
    assert.equal(list.status, 200);
    const card = list.json.items.find(item => item.central_question === question);
    assert.ok(card);
    assert.deepEqual([...card.item_note_ids].sort(), notes.map(note => note.id).sort());
  });
});

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
  await waitFor(async () => {
    assert.ok((await page.locator(".graph-selection-panel.is-node [data-graph-create-theme-index]:not([disabled]):visible").count()) >= 1);
  }, 5000);

  await page.locator(".graph-selection-panel.is-node [data-graph-create-theme-index]:not([disabled]):visible").first().click();
  await page.locator("#graphThemeQuestion").fill("How should Browser Theme Index relations support writing?");
  await page.locator('[data-graph-theme-confirmation-form] button[type="submit"]').click();

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
    assert.ok(savedIndex.items.every((item) => String(item.rationale || "").trim().length > 0));
  }, 10000);

  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"), null, { timeout: 10000 });
  await waitFor(async () => {
    const detailTitle = await page.locator("#writingThemeDetailTitle").inputValue();
    const themeListText = await page.locator("#writingThemeIndexList").textContent();
    const basketText = await page.locator("#writingBasketList").textContent();
    assert.match(String(detailTitle || ""), /Browser Theme Index/);
    assert.equal(await page.locator(`[data-writing-index-card-id="${savedIndex.id}"]`).count(), 1);
    assert.match(String(themeListText || ""), /Browser Theme Index/);
    assert.match(String(basketText || ""), /Browser Theme Index A/);
    assert.match(String(basketText || ""), /Browser Theme Index B|Browser Theme Index D/);
  }, 10000);
});
