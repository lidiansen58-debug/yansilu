import test from "node:test";
import assert from "node:assert/strict";

import { createGraphRouteRuntime } from "../../apps/web/src/graph-route-runtime.js";

test("graph route runtime blocks graph AI analysis behind default local setup guide", async () => {
  const calls = [];
  const runtime = createGraphRouteRuntime({
    graphState: { aiAnalysisLoading: false },
    graphScopeDirectoryId: () => "dir-original",
    localOllamaSetupActive: () => false,
    ensureLocalAiReadyForFeature: async (options) => {
      calls.push(["ready", options]);
      return { ready: false, message: "AI 关系图谱分析需要本地 AI。推荐模型：qwen3:8b：默认推荐；不影响继续写笔记。" };
    },
    analyzeDirectoryGraph: async () => {
      calls.push(["analyze"]);
      return {};
    },
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args])
  });

  await runtime.runGraphAiAnalysis();

  assert.deepEqual(calls.find((call) => call[0] === "ready"), ["ready", { feature: "graph_analysis" }]);
  assert.equal(calls.some((call) => call[0] === "analyze"), false);
  assert.equal(calls.some((call) => call[0] === "status"), false);
});

test("graph route runtime saves a first-class theme index and transfers writing context", async () => {
  const notes = new Map([
    ["n1", { id: "n1", title: "关系理由", noteType: "permanent", thesis: "关系理由让写作可追溯。" }],
    ["n2", { id: "n2", title: "边界条件", noteType: "permanent", thesis: "边界条件避免主题过顺。" }],
    ["n3", { id: "n3", title: "写作入口", noteType: "permanent", thesis: "可写主题是写作入口。" }]
  ]);
  const calls = [];
  let savedPayload = null;
  let localAiReadyChecked = false;
  const runtime = createGraphRouteRuntime({
    addSystemMessage: (message) => calls.push(["system", message]),
    createIndexCard: async (payload) => {
      savedPayload = payload;
      return { id: "idx-1", title: payload.title, item_note_ids: payload.noteIds, items: payload.items };
    },
    graphState: { item: { edges: [{ id: "e1" }, { id: "e2" }] } },
    graphDataList: () => [],
    graphScopeDirectoryId: () => "dir-original",
    ensureLocalAiReadyForFeature: async () => {
      localAiReadyChecked = true;
      return { ready: false };
    },
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
  assert.equal(localAiReadyChecked, false);
  assert.equal(savedPayload.directoryId, "dir-theme");
  assert.equal(savedPayload.indexType, "topic");
  assert.match(savedPayload.centralQuestion, /关系如何变成写作入口/);
  assert.match(savedPayload.threeLineSummary[2], /下一步建议/);
  assert.deepEqual(savedPayload.noteIds, ["n1", "n2", "n3"]);
  assert.ok(savedPayload.items.every((item) => /关键判断|说明作用/.test(item.rationale)));
  assert.deepEqual(calls.find((call) => call[0] === "source-index"), ["source-index", ["idx-1"]]);
  assert.deepEqual(calls.find((call) => call[0] === "writing"), [
    "writing",
    ["n1", "n2", "n3"],
    { title: "关系如何变成写作入口 主题", source: "test-graph", sourceIndexIds: ["idx-1"] }
  ]);
  assert.deepEqual(calls.find((call) => call[0] === "open-writing"), [
    "open-writing",
    {
      statusMessage: "已从可写主题打开写作：关系如何变成写作入口",
      preserveFocusedCandidateScope: true,
      entryReason: "从图谱可写主题继续写作",
      entrySourceLabel: "可写主题"
    }
  ]);
  assert.equal(calls.find((call) => call[0] === "system")[1].workflowRoute.indexCardId, "idx-1");
});
