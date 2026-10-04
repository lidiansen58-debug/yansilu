import test from "node:test";
import assert from "node:assert/strict";

import { createGraphRouteRuntime } from "../../apps/web/src/graph-route-runtime.js";

function themeHarness(overrides = {}) {
  const saved = [];
  const notes = new Map(["a", "b", "c", "d"].map(id => [id, { id, title: id, noteType: "permanent" }]));
  const runtime = createGraphRouteRuntime({
    graphState: { item: { edges: [] } }, uniqueStrings: ids => [...new Set(ids)],
    ensureNotesLoaded: async () => {}, isDirectoryUnderOriginalRoot: () => false,
    writingKnownNoteById: id => notes.get(id), writingNoteById: id => notes.get(id),
    suggestedThemeIndexTitle: () => "候选", writingThemeIndexScopeDirectoryId: () => "dir",
    isWritingEligibleNote: () => false,
    requestGraphThemeConfirmation: async () => ({ title: "主题", centralQuestion: "问题？", noteIds: ["a", "b", "c"] }),
    createIndexCard: async payload => { saved.push(payload); return { id: "card" }; },
    upsertWritingThemeIndex() {}, addSystemMessage() {}, setStatus() {}, renderGraphPanel() {},
    ...overrides
  });
  return { runtime, saved };
}

test("cancelling theme confirmation creates nothing", async () => {
  const { runtime, saved } = themeHarness({ requestGraphThemeConfirmation: async () => null });
  assert.equal(await runtime.createGraphThemeIndexFromNoteIds(["a", "b", "c"]), null);
  assert.equal(saved.length, 0);
});

test("a vault or graph scope switch during confirmation cannot save stale materials", async () => {
  let vault = "vault-a";
  const { runtime, saved } = themeHarness({
    graphThemeContextKey: () => [vault],
    requestGraphThemeConfirmation: async () => {
      vault = "vault-b";
      return { title: "主题", centralQuestion: "问题？", noteIds: ["a", "b", "c"] };
    }
  });
  assert.equal(await runtime.createGraphThemeIndexFromNoteIds(["a", "b", "c"]), null);
  assert.equal(saved.length, 0);
});

test("theme creation uses only confirmed note membership and excludes ids not offered", async () => {
  const { runtime, saved } = themeHarness({ requestGraphThemeConfirmation: async () => ({
    title: "主题", centralQuestion: "问题？", noteIds: ["a", "b", "c", "outside"]
  }) });
  await runtime.createGraphThemeIndexFromNoteIds(["a", "b", "c", "d"]);
  assert.deepEqual(saved[0].noteIds, ["a", "b", "c"]);
});

test("duplicate theme actions share a single confirmation and save", async () => {
  let resolveConfirmation;
  let confirmations = 0;
  const deferred = new Promise(resolve => { resolveConfirmation = resolve; });
  const { runtime, saved } = themeHarness({ requestGraphThemeConfirmation: () => { confirmations++; return deferred; } });
  const first = runtime.createGraphThemeIndexFromNoteIds(["a", "b", "c"]);
  const second = runtime.createGraphThemeIndexFromNoteIds(["a", "b", "c"]);
  await Promise.resolve();
  resolveConfirmation({ title: "主题", centralQuestion: "问题？", noteIds: ["a", "b", "c"] });
  await Promise.all([first, second]);
  assert.equal(confirmations, 1);
  assert.equal(saved.length, 1);
});

test("a writing handoff failure reports the saved theme rather than inviting another creation", async () => {
  const statuses = [];
  const { runtime, saved } = themeHarness({
    isWritingEligibleNote: () => true,
    useThemeIndexAsWritingEntry: async () => { throw new Error("草稿尚未保存"); },
    setStatus: message => statuses.push(message)
  });
  assert.equal((await runtime.createGraphThemeIndexFromNoteIds(["a", "b", "c"])).id, "card");
  assert.equal(saved.length, 1);
  assert.match(statuses.at(-1), /已保存.*草稿尚未保存.*主题库继续/);
});

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

  assert.deepEqual(calls.find((call) => call[0] === "ready"), ["ready", { feature: "graph_analysis", openSettings: false }]);
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
    requestGraphThemeConfirmation: async ({ notes }) => ({
      title: "关系如何变成写作入口", centralQuestion: "关系如何帮助写作？",
      noteIds: notes.map(note => note.id), roles: { n1: "说明关系理由的作用" }
    }),
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
    useThemeIndexAsWritingEntry: async (id, options) => calls.push(["use-theme", id, options]),
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
  assert.equal(savedPayload.centralQuestion, "关系如何帮助写作？");
  assert.match(savedPayload.threeLineSummary[2], /整理提纲/);
  assert.deepEqual(savedPayload.noteIds, ["n1", "n2", "n3"]);
  assert.equal(savedPayload.items[0].rationale, "说明关系理由的作用");
  assert.equal(savedPayload.items[1].rationale, "");
  const handoff = calls.find((call) => call[0] === "use-theme");
  assert.equal(handoff[1], "idx-1");
  assert.equal(handoff[2].replaceBasket, true);
  assert.equal(handoff[2].resetContext, true);
  assert.equal(handoff[2].source, "test-graph");
  assert.equal(typeof handoff[2].assertCurrent, "function");
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
