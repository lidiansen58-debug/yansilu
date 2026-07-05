import test from "node:test";
import assert from "node:assert/strict";

import { buildTodayOrganizingState } from "../../apps/web/src/today-organizing-model.js";
import { renderTodayOrganizingPanel } from "../../apps/web/src/today-organizing-panel.js";
import { installTodayOrganizingEvents } from "../../apps/web/src/today-organizing-events.js";
import { createTodayOrganizingRuntime } from "../../apps/web/src/today-organizing-runtime.js";

test("today organizing state prioritizes pending materials, isolated notes, and writable themes", () => {
  const state = buildTodayOrganizingState({
    notes: [
      { id: "fn_1", title: "手机随笔待处理", noteType: "fleeting", status: "needs_processing" },
      { id: "ln_1", title: "文献笔记待转述", noteType: "literature", status: "pending" },
      { id: "pn_1", title: "孤立判断", noteType: "permanent", relationNetworkStatus: "isolated" },
      { id: "pn_2", title: "已有关系", noteType: "permanent", relationNetworkStatus: "connected", thesis: "判断", threeLineSummary: ["a", "b", "c"], distillationStatus: "confirmed" }
    ],
    relations: [{ sourceNoteId: "pn_2", targetNoteId: "pn_3", relationType: "supports", status: "confirmed" }],
    themeIndexes: [
      { id: "idx_empty", title: "空主题", item_note_ids: [], updated_at: "2026-06-20T00:00:00Z" },
      { id: "idx_1", title: "判断训练", item_note_ids: ["pn_1", "pn_2"], updated_at: "2026-06-19T00:00:00Z" }
    ]
  }, {
    relationNetworkStatusForNote: (note) => note.relationNetworkStatus
  });

  assert.equal(state.pendingMaterialCount, 2);
  assert.equal(state.firstPendingMaterial.title, "手机随笔待处理");
  assert.equal(state.permanentCount, 2);
  assert.equal(state.isolatedCount, 1);
  assert.equal(state.firstIsolated.title, "孤立判断");
  assert.equal(state.firstTheme.title, "判断训练");
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
    notes: [{ id: "pn_unknown", title: "图谱已确认无关系", noteType: "permanent" }],
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

test("today organizing state keeps import overview objects visible after confirm", () => {
  const state = buildTodayOrganizingState({
    notes: [
      { id: "pn_unknown", title: "图谱暂未加载", noteType: "permanent" }
    ],
    relations: [],
    relationsReady: false,
    organizingOverview: {
      permanentCount: 4,
      isolatedCount: 2,
      recommendedFirst: [{ noteId: "pn_imported", title: "导入后的第一条判断" }],
      themeCandidates: [{ title: "慢读训练", noteCount: 3, noteIds: ["pn_a", "pn_b", "pn_c"] }],
      writingReady: true
    }
  }, {
    relationNetworkStatusForNote: () => "unknown"
  });

  assert.equal(state.isolatedCount, 2);
  assert.deepEqual(state.firstIsolated, {
    id: "pn_imported",
    title: "导入后的第一条判断",
    relationCount: 0,
    source: "import"
  });
  assert.equal(state.themeCount, 1);
  assert.equal(state.firstTheme.title, "慢读训练");
  assert.deepEqual(state.firstTheme.noteIds, ["pn_a", "pn_b", "pn_c"]);
  assert.equal(state.firstTheme.source, "import");
});

test("today organizing state does not let stale import overview override connected live notes", () => {
  const state = buildTodayOrganizingState({
    notes: [
      { id: "pn_imported", title: "Already connected", noteType: "permanent", explicitRelationCount: 1 },
      { id: "pn_next", title: "Next isolated", noteType: "permanent", explicitRelationCount: 0 }
    ],
    relations: [],
    relationsReady: true,
    organizingOverview: {
      permanentCount: 2,
      isolatedCount: 2,
      recommendedFirst: [{ noteId: "pn_imported", title: "Imported first" }]
    }
  });

  assert.equal(state.isolatedCount, 1);
  assert.equal(state.firstIsolated.id, "pn_next");
  assert.equal(state.firstIsolated.title, "Next isolated");
});

test("today organizing state prefers loaded theme indexes over import-only themes", () => {
  const state = buildTodayOrganizingState({
    notes: [],
    themeIndexes: [
      { id: "idx_live", title: "Live theme", item_note_ids: ["pn_live_a", "pn_live_b"] }
    ],
    organizingOverview: {
      permanentCount: 2,
      themeCandidates: [{ title: "Imported theme", noteCount: 3, noteIds: ["pn_a", "pn_b", "pn_c"] }]
    }
  });

  assert.equal(state.themeCount, 1);
  assert.deepEqual(state.firstTheme, {
    id: "idx_live",
    title: "Live theme",
    noteCount: 2,
    noteIds: ["pn_live_a", "pn_live_b"],
    source: "theme-index"
  });
});

test("today organizing ignores blank local placeholders for first-run demo entry", () => {
  const state = buildTodayOrganizingState({
    notes: [
      {
        id: "local_note_1",
        title: "未命名笔记",
        noteType: "permanent",
        status: "draft",
        markdownPath: "",
        body: "# 未命名笔记\n\n",
        isLocalOnly: true
      }
    ],
    relations: [],
    relationsReady: true
  });

  assert.equal(state.permanentCount, 0);
  assert.equal(state.isolatedCount, 0);
  assert.equal(state.isEmptyLibrary, true);
});

test("today organizing panel uses readable action words", () => {
  const html = renderTodayOrganizingPanel({
    permanentCount: 3,
    pendingMaterialCount: 1,
    isolatedCount: 1,
    themeCount: 1,
    writingReadyCount: 1,
    firstPendingMaterial: { id: "fn_1", title: "手机随笔待处理", noteType: "fleeting" },
    firstIsolated: { id: "pn_1", title: "孤立判断" },
    firstTheme: { id: "idx_1", title: "判断训练", noteCount: 3 },
    firstWritingReady: { id: "pn_2", title: "已有观点" }
  });

  assert.match(html, /现在最重要/);
  assert.doesNotMatch(html, /从这里开始整理知识/);
  assert.match(html, /待处理材料/);
  assert.match(html, /手机随笔待处理/);
  assert.match(html, /补一条关系/);
  assert.match(html, /整理主题/);
  assert.match(html, /进入写作/);
  assert.match(html, /中心问题、关键笔记和阅读顺序/);
  assert.match(html, /先生成提纲，再决定是否起草/);
  assert.match(html, /处理这条材料/);
  assert.match(html, /data-today-action="review-material"/);
  assert.doesNotMatch(html, /data-today-action="review-material" disabled/);
  assert.match(html, /去关联/);
  assert.match(html, /打开主题索引/);
  assert.match(html, /进入写作/);
  assert.ok(html.indexOf("现在最重要") < html.indexOf("当前笔记库状态"));
  assert.ok(html.indexOf("现在最重要") < html.indexOf("辅助检查"));
  assert.match(html, /<details class="today-secondary-details">/);
  assert.doesNotMatch(html, /候选队列|复核|线索|高级检查/);
});

test("today organizing empty home makes demo import the primary first action", () => {
  const html = renderTodayOrganizingPanel({ isEmptyLibrary: true });

  assert.match(html, /第一次打开，建议先体验示例库/);
  assert.ok(html.includes("导入示例库 / 体验 Demo"));
  assert.match(html, /用 10 分钟看懂研思录怎么让笔记生长为思想/);
  assert.ok(html.indexOf("导入示例库 / 体验 Demo") < html.indexOf("先记录"));
  assert.doesNotMatch(html, /当前笔记库状态/);
  assert.doesNotMatch(html, /辅助检查/);
});

test("today organizing runtime loads theme indexes once when opened", async () => {
  const panel = {
    innerHTML: "",
    classList: { contains: () => false }
  };
  const state = {
    themeIndexes: [],
    loadingThemeIndexes: false,
    loadCalls: 0
  };
  const runtime = createTodayOrganizingRuntime(() => ({
    panel,
    notes: [],
    relations: [],
    themeIndexes: state.themeIndexes,
    loadingThemeIndexes: state.loadingThemeIndexes,
    loadThemeIndexes: async () => {
      state.loadCalls += 1;
      state.themeIndexes = [{ id: "idx_1", title: "判断训练", item_note_ids: ["pn_1"] }];
      return state.themeIndexes;
    }
  }));

  runtime.render();
  runtime.render();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(state.loadCalls, 1);
  assert.match(panel.innerHTML, /判断训练/);
});

test("today organizing runtime does not reload forever when no themes exist", async () => {
  const panel = {
    innerHTML: "",
    classList: { contains: () => false }
  };
  let loadCalls = 0;
  const runtime = createTodayOrganizingRuntime(() => ({
    panel,
    notes: [],
    relations: [],
    themeIndexes: [],
    loadThemeIndexes: async () => {
      loadCalls += 1;
      return [];
    }
  }));

  runtime.render();
  await Promise.resolve();
  await Promise.resolve();
  runtime.render();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(loadCalls, 1);
});

test("today organizing runtime retries theme load after a failed attempt", async () => {
  const panel = {
    innerHTML: "",
    classList: { contains: () => false }
  };
  let loadCalls = 0;
  const runtime = createTodayOrganizingRuntime(() => ({
    panel,
    notes: [],
    relations: [],
    themeIndexes: [],
    loadThemeIndexes: async () => {
      loadCalls += 1;
      if (loadCalls === 1) throw new Error("temporary failure");
      return [];
    }
  }));

  runtime.render();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  runtime.render();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(loadCalls, 2);
});

test("today organizing runtime retries theme load when the host scope key changes", async () => {
  const panel = {
    innerHTML: "",
    classList: { contains: () => false }
  };
  const state = {
    key: "vault-a|import-1",
    loadCalls: 0
  };
  const runtime = createTodayOrganizingRuntime(() => ({
    panel,
    notes: [],
    relations: [],
    themeIndexes: [],
    themeLoadKey: state.key,
    loadThemeIndexes: async () => {
      state.loadCalls += 1;
      return [];
    }
  }));

  runtime.render();
  await Promise.resolve();
  await Promise.resolve();
  state.key = "vault-a|import-2";
  runtime.render();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(state.loadCalls, 2);
});

test("today organizing events route main actions to existing workflows", async () => {
  const calls = [];
  const handler = installTodayOrganizingEvents({
    addEventListener: (event, callback) => {
      calls.push(["listener", event, callback]);
    }
  }, () => ({
    todayState: {
      firstPendingMaterial: { id: "fn_1" },
      firstIsolated: { id: "pn_1" },
      firstTheme: { id: "idx_1", noteIds: ["pn_1", "pn_2"] },
      firstWritingReady: { id: "pn_2" }
    },
    handleStateChange: async (reason, payload) => calls.push(["state", reason, payload]),
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openNoteById: (noteId, options) => calls.push(["open-note", noteId, options]),
    openWritingModule: async () => calls.push(["writing"]),
    addWritingBasketIds: (ids, options) => calls.push(["basket", ids, options]),
    selectWritingThemeIndex: (themeId) => calls.push(["theme", themeId]),
    applyWritingTab: (tab) => calls.push(["tab", tab]),
    createReviewOutline: async (options) => calls.push(["outline", options])
  }));

  assert.equal(typeof handler, "function");
  const callback = calls[0][2];
  const eventFor = (action) => ({
    preventDefault: () => calls.push(["prevent", action]),
    target: {
      closest: (selector) => selector === "[data-today-action]"
        ? { getAttribute: (name) => (name === "data-today-action" ? action : "") }
        : null
    }
  });

  await callback(eventFor("review-material"));
  await callback(eventFor("connect-first-isolated"));
  await callback(eventFor("open-first-theme"));
  await callback(eventFor("open-writing"));

  assert.ok(calls.some((call) => call[0] === "open-note" && call[1] === "fn_1"));
  assert.ok(calls.some((call) => call[0] === "module" && call[1] === "explorer"));
  assert.ok(calls.some((call) => call[0] === "state" && call[1] === "graph-associate-note" && call[2]?.noteId === "pn_1"));
  assert.ok(calls.some((call) => call[0] === "module" && call[1] === "writing"));
  assert.ok(calls.some((call) => call[0] === "theme" && call[1] === "idx_1"));
});

test("today organizing writing action adds the ready note only when no theme is available", async () => {
  const handlers = new Map();
  const calls = [];
  installTodayOrganizingEvents({ addEventListener: (eventName, handler) => handlers.set(eventName, handler) }, () => ({
    todayState: {
      firstTheme: null,
      firstWritingReady: { id: "pn_ready", title: "已有观点" }
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
  assert.equal(calls[2][1].entrySourceLabel, "首页");
  assert.equal(calls[2][1].statusMessage, "已把这条笔记加入写作中心");
  assert.match(calls[2][1].entryReason, /已有观点|明确观点|三句摘要/);
  assert.equal(calls.some((call) => call[0] === "theme"), false);
});

test("today organizing routes imported theme note ids into writing", async () => {
  const handlers = new Map();
  const calls = [];
  installTodayOrganizingEvents({ addEventListener: (eventName, handler) => handlers.set(eventName, handler) }, () => ({
    todayState: {
      firstTheme: { id: "", title: "慢读训练", noteCount: 3, noteIds: ["pn_a", "pn_b", "pn_c"], source: "import" }
    },
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

  await click("open-first-theme");
  await click("open-writing");

  assert.deepEqual(calls[0], ["module", "writing"]);
  assert.equal(calls[1][0], "writing");
  assert.deepEqual(calls[2], ["basket", ["pn_a", "pn_b", "pn_c"]]);
  assert.deepEqual(calls[3], ["basket", ["pn_a", "pn_b", "pn_c"]]);
  assert.deepEqual(calls[4], ["module", "writing"]);
  assert.equal(calls[5][0], "writing");
  assert.equal(calls[5][1].statusMessage, "已把 3 条主题笔记加入写作中心");
  assert.match(calls[5][1].entryReason, /慢读训练/);
  assert.equal(calls.some((call) => call[0] === "theme"), false);
});
