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
        title: "已有关联",
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

  assert.match(html, /手机随笔待处理/);
  assert.doesNotMatch(html, /从这里开始整理知识/);
  assert.match(html, /待处理材料/);
  assert.match(html, /手机随笔待处理/);
  assert.match(html, /补一条关系/);
  assert.match(html, /整理主题/);
  assert.match(html, /进入写作/);
  assert.match(html, /确认这组笔记能否写成文章/);
  assert.match(html, /生成提纲，再决定是否起草/);
  assert.match(html, /推荐路径/);
  assert.match(html, /材料 -> 关系 -> 主题 -> 写作/);
  assert.match(html, /建立关系/);
  assert.match(html, /开始写作/);
  assert.match(html, /先完成上方推荐任务/);
  assert.match(html, /处理这条材料/);
  assert.match(html, /data-today-action="review-material"/);
  assert.doesNotMatch(html, /data-today-action="review-material" disabled/);
  assert.match(html, /去关联/);
  assert.match(html, /打开主题索引/);
  assert.match(html, /进入写作/);
  assert.ok(html.indexOf('data-today-action="review-material"') < html.indexOf('data-today-secondary-tab="path"'));
  assert.ok(html.indexOf('data-today-action="review-material"') < html.indexOf('data-today-secondary-tab="check"'));
  assert.match(html, /today-path-inline/);
  assert.match(html, /data-today-secondary-tab="path"/);
  assert.match(html, /data-today-secondary-tab="check"/);
  assert.match(html, /data-today-secondary-panel="path" hidden/);
  assert.match(html, /data-today-secondary-panel="check" hidden/);
  assert.doesNotMatch(html, /<details class="today-secondary-details"/);
  assert.doesNotMatch(html, /候选队列|复核|线索|高级检查/);
});

test("today organizing panel shows demo import completion notice", () => {
  const state = buildTodayOrganizingState({
    notes: [{ id: "pn_1", title: "导入后的笔记", noteType: "permanent" }],
    relationsReady: true,
    noticeMessage: "已导入 Smart Notes Demo：3 条永久笔记，2 条关系，1 个写作项目。首页已刷新。"
  });
  const html = renderTodayOrganizingPanel({
    ...state,
    isEmptyLibrary: false
  });

  assert.equal(state.noticeMessage, "已导入 Smart Notes Demo：3 条永久笔记，2 条关系，1 个写作项目。首页已刷新。");
  assert.match(html, /today-import-notice/);
  assert.match(html, /导入完成/);
  assert.match(html, /首页已刷新/);
});

test("today organizing secondary tabs switch one full-width panel", async () => {
  const panels = [
    { hidden: false, getAttribute: (name) => (name === "data-today-secondary-panel" ? "path" : "") },
    { hidden: true, getAttribute: (name) => (name === "data-today-secondary-panel" ? "check" : "") }
  ];
  const tabs = ["path", "check"].map((key, index) => ({
    key,
    attrs: { "aria-selected": index === 0 ? "true" : "false" },
    span: { textContent: index === 0 ? "收起" : "展开" },
    classList: { toggle(name, active) { this[name] = active; } },
    getAttribute(name) {
      if (name === "data-today-secondary-tab") return this.key;
      return this.attrs[name] || "";
    },
    setAttribute(name, value) { this.attrs[name] = value; },
    querySelector(selector) { return selector === "span" ? this.span : null; }
  }));
  const panel = {
    listener: null,
    addEventListener(type, handler) {
      if (type === "click") this.listener = handler;
    },
    querySelector(selector) {
      const match = selector.match(/\[data-today-secondary-tab="([^"]+)"\]/);
      return match ? tabs.find((tab) => tab.key === match[1]) || null : null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-today-secondary-tab]") return tabs;
      if (selector === "[data-today-secondary-panel]") return panels;
      return [];
    }
  };

  installTodayOrganizingEvents(panel, () => ({}));
  await panel.listener({
    preventDefault() {},
    target: { closest: (selector) => (selector === "[data-today-secondary-tab]" ? tabs[1] : null) }
  });

  assert.equal(panels[0].hidden, true);
  assert.equal(panels[1].hidden, false);
  assert.equal(tabs[0].attrs["aria-selected"], "false");
  assert.equal(tabs[1].attrs["aria-selected"], "true");
  assert.equal(tabs[0].span.textContent, "展开");
  assert.equal(tabs[1].span.textContent, "收起");

  await panel.listener({
    preventDefault() {},
    target: { closest: (selector) => (selector === "[data-today-secondary-tab]" ? tabs[1] : null) }
  });

  assert.equal(panels[0].hidden, true);
  assert.equal(panels[1].hidden, true);
  assert.equal(tabs[0].attrs["aria-selected"], "false");
  assert.equal(tabs[1].attrs["aria-selected"], "false");
  assert.equal(tabs[0].span.textContent, "展开");
  assert.equal(tabs[1].span.textContent, "展开");
});

test("today organizing empty home makes demo import the primary first action", () => {
  const html = renderTodayOrganizingPanel({ isEmptyLibrary: true });

  assert.match(html, /第一次打开/);
  assert.ok(html.includes("导入 Demo"));
  assert.match(html, /先体验示例库/);
  assert.match(html, /导入后会提示结果，并刷新首页/);
  assert.match(html, /data-today-demo-status/);
  assert.match(html, /data-today-demo-progress/);
  assert.match(html, /role="progressbar"/);
  assert.ok(html.indexOf("导入 Demo") < html.indexOf("<article><strong>记录"));
  assert.doesNotMatch(html, /当前笔记库状态/);
  assert.doesNotMatch(html, /今日提醒/);
  assert.doesNotMatch(html, /导入后自动打开导览笔记/);
});

test("today organizing empty home shows startup preparation before demo import is ready", () => {
  const html = renderTodayOrganizingPanel({ isEmptyLibrary: true, startupPending: true });

  assert.match(html, /正在准备\.\.\./);
  assert.match(html, /正在启动本地服务，准备好后就能导入 Demo。/);
  assert.match(html, /data-today-action="seed-demo" disabled aria-busy="true"/);
  assert.match(html, /data-today-demo-progress/);
  assert.doesNotMatch(html, /data-today-demo-progress[^>]+hidden/);
});

test("today organizing demo import shows immediate busy feedback", async () => {
  let resolveImport;
  const importPromise = new Promise((resolve) => {
    resolveImport = resolve;
  });
  const calls = [];
  const hint = {
    textContent: "导入后会提示结果，并刷新首页。",
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
  };
  const progress = {
    hidden: true
  };
  const button = {
    disabled: false,
    textContent: "导入 Demo",
    attrs: { "data-today-action": "seed-demo" },
    dataset: {},
    getAttribute(name) {
      return this.attrs[name] || "";
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    }
  };
  const panel = {
    listener: null,
    addEventListener(type, handler) {
      if (type === "click") this.listener = handler;
    },
    querySelector(selector) {
      if (selector === "[data-today-demo-status]") return hint;
      if (selector === "[data-today-demo-progress]") return progress;
      return null;
    }
  };

  installTodayOrganizingEvents(panel, () => ({
    setStatus: (message, tone) => calls.push(["status", message, tone]),
    handleStateChange: async (reason, payload) => {
      calls.push(["state", reason, payload.source]);
      await importPromise;
    }
  }));

  const handling = panel.listener({
    preventDefault() {},
    target: {
      closest(selector) {
        return selector === "[data-today-action]" ? button : null;
      }
    }
  });

  assert.equal(button.disabled, true);
  assert.equal(button.attrs["aria-busy"], "true");
  assert.equal(button.textContent, "正在导入...");
  assert.equal(hint.textContent, "正在导入 Demo，请稍等，不要重复点击。");
  assert.equal(progress.hidden, false);
  assert.deepEqual(calls[0], ["status", "正在导入 Smart Notes Demo，完成后会刷新首页。", "busy"]);

  resolveImport();
  await handling;

  assert.equal(button.disabled, false);
  assert.equal(button.attrs["aria-busy"], undefined);
  assert.equal(button.textContent, "导入 Demo");
  assert.equal(hint.textContent, "导入后会提示结果，并刷新首页。");
  assert.equal(progress.hidden, true);
  assert.deepEqual(calls[1], ["state", "seed-smart-notes-demo", "today-empty-start"]);
});

test("today organizing demo import keeps a visible message when import does not complete", async () => {
  const hint = {
    textContent: "导入后会提示结果，并刷新首页。",
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
  };
  const progress = {
    hidden: true
  };
  const button = {
    disabled: false,
    textContent: "导入 Demo",
    attrs: { "data-today-action": "seed-demo" },
    dataset: {},
    getAttribute(name) {
      return this.attrs[name] || "";
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    }
  };
  const panel = {
    listener: null,
    addEventListener(type, handler) {
      if (type === "click") this.listener = handler;
    },
    querySelector(selector) {
      if (selector === "[data-today-demo-status]") return hint;
      if (selector === "[data-today-demo-progress]") return progress;
      return null;
    }
  };

  installTodayOrganizingEvents(panel, () => ({
    setStatus: () => {},
    handleStateChange: async () => false
  }));

  await panel.listener({
    preventDefault() {},
    target: {
      closest(selector) {
        return selector === "[data-today-action]" ? button : null;
      }
    }
  });

  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "导入 Demo");
  assert.equal(progress.hidden, true);
  assert.equal(hint.textContent, "导入没有完成。如果本地服务还在启动，请稍后再试。");
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
