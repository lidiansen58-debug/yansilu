import test from "node:test";
import assert from "node:assert/strict";

import { createGraphRouteRuntime } from "../../apps/web/src/graph-route-runtime.js";

test("graph route runtime saves a first-class theme index and transfers writing context", async () => {
  const notes = new Map([
    ["n1", { id: "n1", title: "关系理由", noteType: "permanent", thesis: "关系理由让写作可追溯。" }],
    ["n2", { id: "n2", title: "边界条件", noteType: "permanent", thesis: "边界条件避免主题过顺。" }],
    ["n3", { id: "n3", title: "写作入口", noteType: "permanent", thesis: "主题索引是写作入口。" }]
  ]);
  const calls = [];
  let savedPayload = null;
  const runtime = createGraphRouteRuntime({
    addSystemMessage: (message) => calls.push(["system", message]),
    createIndexCard: async (payload) => {
      savedPayload = payload;
      return { id: "idx-1", title: payload.title, item_note_ids: payload.noteIds, items: payload.items };
    },
    graphState: { item: { edges: [{ id: "e1" }, { id: "e2" }] } },
    graphDataList: () => [],
    graphScopeDirectoryId: () => "dir-original",
    isDirectoryUnderOriginalRoot: () => true,
    isWritingEligibleNote: () => true,
    normalizeWritingProjectTitleSeed: (title) => `${title} 主题`,
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (message, tone) => calls.push(["status", message, tone]),
    setWritingSourceIndexIds: (ids) => calls.push(["source-index", ids]),
    suggestedThemeIndexTitle: () => "关系如何变成写作入口",
    uniqueStrings: (items = []) => [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))],
    ensureNotesLoaded: async (ids) => calls.push(["load", ids]),
    writingKnownNoteById: (id) => notes.get(id),
    writingNoteById: (id) => notes.get(id),
    writingThemeIndexScopeDirectoryId: () => "dir-theme",
    upsertWritingThemeIndex: (card) => calls.push(["upsert", card.id]),
    continueWritingEntry: (ids, options) => calls.push(["writing", ids, options]),
    openWritingModule: async (options) => calls.push(["open-writing", options])
  });

  const card = await runtime.createGraphThemeIndexFromNoteIds(["n1", "n2", "n3"], {
    title: "关系如何变成写作入口",
    source: "test-graph"
  });

  assert.equal(card.id, "idx-1");
  assert.equal(savedPayload.directoryId, "dir-theme");
  assert.equal(savedPayload.indexType, "topic");
  assert.match(savedPayload.centralQuestion, /关系如何变成写作入口/);
  assert.match(savedPayload.threeLineSummary[2], /下一步可以写/);
  assert.deepEqual(savedPayload.noteIds, ["n1", "n2", "n3"]);
  assert.ok(savedPayload.items.every((item) => /为什么重要/.test(item.rationale)));
  assert.deepEqual(calls.find((call) => call[0] === "source-index"), ["source-index", ["idx-1"]]);
  assert.deepEqual(calls.find((call) => call[0] === "writing"), [
    "writing",
    ["n1", "n2", "n3"],
    { title: "关系如何变成写作入口 主题", source: "test-graph", sourceIndexIds: ["idx-1"] }
  ]);
  assert.deepEqual(calls.find((call) => call[0] === "open-writing"), [
    "open-writing",
    {
      statusMessage: "已从主题索引打开写作中心：关系如何变成写作入口",
      preserveFocusedCandidateScope: true,
      entryReason: "从图谱主题索引继续写作",
      entrySourceLabel: "主题索引笔记"
    }
  ]);
  assert.equal(calls.find((call) => call[0] === "system")[1].workflowRoute.indexCardId, "idx-1");
});
