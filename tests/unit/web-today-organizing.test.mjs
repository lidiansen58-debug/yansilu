import test from "node:test";
import assert from "node:assert/strict";

import { buildTodayOrganizingState } from "../../apps/web/src/today-organizing-model.js";
import { renderTodayOrganizingPanel } from "../../apps/web/src/today-organizing-panel.js";
import { installTodayOrganizingEvents } from "../../apps/web/src/today-organizing-events.js";

test("today organizing state prioritizes isolated permanent notes and writable themes", () => {
  const state = buildTodayOrganizingState({
    notes: [
      { id: "pn_1", title: "孤立判断", folderId: "original", noteType: "permanent", relationNetworkStatus: "isolated" },
      { id: "pn_2", title: "已有关系", folderId: "original", noteType: "permanent", relationNetworkStatus: "connected", thesis: "判断", threeLineSummary: ["a", "b", "c"], distillationStatus: "confirmed" },
      { id: "fn_1", title: "随笔", noteType: "fleeting" }
    ],
    relations: [{ sourceNoteId: "pn_2", targetNoteId: "pn_3", relationType: "supports", status: "confirmed" }],
    themeIndexes: [
      { id: "idx_empty", title: "空主题", item_note_ids: [], updated_at: "2026-06-20T00:00:00Z" },
      { id: "idx_1", title: "判断训练", item_note_ids: ["pn_1", "pn_2"], updated_at: "2026-06-19T00:00:00Z" }
    ]
  }, {
    typeFromFolder: () => "permanent",
    relationNetworkStatusForNote: (note) => note.relationNetworkStatus
  });

  assert.equal(state.permanentCount, 2);
  assert.equal(state.isolatedCount, 1);
  assert.equal(state.firstIsolated.title, "孤立判断");
  assert.equal(state.firstTheme.title, "判断训练");
  assert.equal(state.firstTheme.noteCount, 2);
  assert.equal(state.firstWritingReady.title, "已有关系");
});

test("today organizing does not treat unknown cold-start relation state as isolated", () => {
  const coldStart = buildTodayOrganizingState({
    notes: [
      { id: "pn_unknown", title: "旧库已有关系但未加载", noteType: "permanent" },
      { id: "pn_counted", title: "已有计数", noteType: "permanent", explicitRelationCount: 1 },
      { id: "pn_clear", title: "明确未关联", noteType: "permanent", relationNetworkStatus: "isolated" }
    ],
    relations: [],
    relationsReady: false
  }, {
    relationNetworkStatusForNote: (note) => note.relationNetworkStatus || "unknown"
  });

  assert.equal(coldStart.isolatedCount, 1);
  assert.equal(coldStart.firstIsolated.title, "明确未关联");

  const loaded = buildTodayOrganizingState({
    notes: [
      { id: "pn_unknown", title: "图谱已确认无关系", noteType: "permanent" }
    ],
    relations: [],
    relationsReady: true
  }, {
    relationNetworkStatusForNote: () => "unknown"
  });

  assert.equal(loaded.isolatedCount, 1);
  assert.equal(loaded.firstIsolated.title, "图谱已确认无关系");
});

test("today organizing counts only explicit saved relations from note link summaries", () => {
  const state = buildTodayOrganizingState({
    notes: [
      {
        id: "pn_wiki",
        title: "只有正文链接",
        noteType: "permanent",
        outgoingLinks: [{ relationType: "markdown_link", rationale: "markdown_wikilink", status: "confirmed" }]
      },
      {
        id: "pn_formal",
        title: "已有正式关系",
        noteType: "permanent",
        outgoingLinks: [{ relationType: "supports", rationale: "这条关系有明确理由。", status: "confirmed" }]
      }
    ],
    relationsReady: false
  }, {
    relationNetworkStatusForNote: () => "unknown"
  });

  assert.equal(state.isolatedCount, 1);
  assert.equal(state.firstIsolated.title, "只有正文链接");
});

test("today organizing panel uses action words without internal workflow terms", () => {
  const html = renderTodayOrganizingPanel({
    permanentCount: 3,
    isolatedCount: 1,
    themeCount: 1,
    writingReadyCount: 1,
    firstIsolated: { id: "pn_1", title: "孤立判断" },
    firstTheme: { id: "idx_1", title: "判断训练", noteCount: 3 },
    firstWritingReady: { id: "pn_2", title: "已有观点" }
  });

  assert.match(html, /今日整理/);
  assert.match(html, /找旧笔记、写关系理由、查看主题是否已凑到 3-7 条/);
  assert.match(html, /检查中心问题、关键关系，以及是否已经凑到 3-7 条/);
  assert.match(html, /从这个主题索引进入写作中心/);
  assert.match(html, /处理这条笔记/);
  assert.match(html, /查看主题/);
  assert.match(html, /打开写作中心/);
  assert.doesNotMatch(html, /候选|队列|复核|线索/);
});

test("today organizing events route main actions to existing workflows", async () => {
  const handlers = new Map();
  const calls = [];
  const panel = { addEventListener: (eventName, handler) => handlers.set(eventName, handler) };
  installTodayOrganizingEvents(panel, () => ({
    todayState: {
      firstIsolated: { id: "pn_1" },
      firstTheme: { id: "idx_1" },
      firstWritingReady: { id: "pn_2" }
    },
    handleStateChange: async (reason, payload) => calls.push(["state", reason, payload]),
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openWritingModule: async (options = {}) => calls.push(["writing", options]),
    addWritingBasketIds: (noteIds) => calls.push(["basket", noteIds]),
    selectWritingThemeIndex: async (id) => calls.push(["theme", id])
  }));

  const click = async (action) => handlers.get("click")({
    preventDefault() {},
    target: {
      closest: (selector) => selector === "[data-today-action]"
        ? { disabled: false, getAttribute: () => action }
        : null
    }
  });

  await click("connect-first-isolated");
  await click("open-first-theme");
  await click("open-writing");

  assert.deepEqual(calls[0], ["state", "graph-associate-note", { noteId: "pn_1", source: "today-organizing" }]);
  assert.deepEqual(calls[1], ["module", "writing"]);
  assert.equal(calls[2][0], "writing");
  assert.equal(calls[2][1].entrySourceLabel, "今日整理");
  assert.match(calls[2][1].entryReason, /可写主题|续接/);
  assert.deepEqual(calls[3], ["theme", "idx_1"]);
  assert.deepEqual(calls[4], ["module", "writing"]);
  assert.equal(calls[5][0], "writing");
  assert.equal(calls[5][1].entrySourceLabel, "今日整理");
  assert.match(calls[5][1].entryReason, /可写主题|续接/);
  assert.deepEqual(calls[6], ["theme", "idx_1"]);
  assert.equal(calls.some((call) => call[0] === "basket"), false);
});

test("today organizing writing action adds the ready note only when no theme is available", async () => {
  const handlers = new Map();
  const calls = [];
  const panel = { addEventListener: (eventName, handler) => handlers.set(eventName, handler) };
  installTodayOrganizingEvents(panel, () => ({
    todayState: {
      firstTheme: null,
      firstWritingReady: { id: "pn_ready" }
    },
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openWritingModule: async (options = {}) => calls.push(["writing", options]),
    addWritingBasketIds: (noteIds) => calls.push(["basket", noteIds]),
    selectWritingThemeIndex: async (id) => calls.push(["theme", id])
  }));

  await handlers.get("click")({
    preventDefault() {},
    target: {
      closest: (selector) => selector === "[data-today-action]"
        ? { disabled: false, getAttribute: () => "open-writing" }
        : null
    }
  });

  assert.deepEqual(calls[0], ["basket", ["pn_ready"]]);
  assert.deepEqual(calls[1], ["module", "writing"]);
  assert.equal(calls[2][0], "writing");
  assert.equal(calls[2][1].entrySourceLabel, "今日整理");
  assert.equal(calls[2][1].statusMessage, "已把这条笔记加入写作中心");
  assert.match(calls[2][1].entryReason, /明确观点|三句摘要/);
  assert.equal(calls.some((call) => call[0] === "theme"), false);
});
