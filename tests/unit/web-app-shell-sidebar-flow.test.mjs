import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExplorerSidebarFlowState,
  distillationSummaryForSidebarFlow,
  handleSidebarFlowAction,
  installSidebarFlowEventHandler,
  renderExplorerSidebarFlowForRuntime,
  renderExplorerSidebarFlowMarkup,
  sidebarFlowNoteHasNetworkSignal
} from "../../apps/web/src/app-shell-sidebar-flow.js";

function actionTarget(action) {
  return actionTargetWithNote(action, "");
}

function actionTargetWithNote(action, noteId = "") {
  return {
    closest: (selector) => selector === "[data-sidebar-flow-action]"
      ? {
          dataset: { sidebarFlowAction: action, sidebarFlowNoteId: noteId },
          getAttribute: (name) => name === "data-sidebar-flow-note-id" ? noteId : action
        }
      : null
  };
}

test("sidebar flow detects network and distillation gaps", () => {
  assert.equal(sidebarFlowNoteHasNetworkSignal({ body: "[[Note]]" }, {
    parseLinks: () => ["Note"],
    parseTags: () => []
  }), true);

  const summary = distillationSummaryForSidebarFlow([
    { id: "n1", thesis: "", threeLineSummary: [] },
    { id: "n2", thesis: "Claim", threeLineSummary: ["a", "b", "c"] }
  ], {
    distillationStatusOf: (note) => note.id === "n2" ? "confirmed" : "draft",
    noteHasBoundarySignal: (note) => note.id === "n2"
  });

  assert.equal(summary.pending, 1);
  assert.equal(summary.confirmed, 1);
  assert.equal(summary.writingReady, 1);
  assert.equal(summary.missingBoundary, 1);
});

test("sidebar flow state builds original-route progress and primary action", () => {
  const state = buildExplorerSidebarFlowState({
    rootId: "dir_original_default",
    currentNotes: [],
    originalNotes: [
      { id: "n1", thesis: "", threeLineSummary: [], body: "" },
      { id: "n2", thesis: "Claim", threeLineSummary: ["a", "b", "c"], body: "#tag" }
    ]
  }, {
    parseLinks: () => [],
    parseTags: (body) => body.includes("#") ? ["tag"] : [],
    noteHasGeneratedOriginal: () => false,
    distillationStatusOf: (note) => note.id === "n2" ? "confirmed" : "draft",
    noteHasBoundarySignal: (note) => note.id === "n2",
    isPermanentLikeNote: () => true
  });

  assert.equal(state.isOriginal, true);
  assert.equal(state.primaryAction, "continue-distillation");
  assert.match(state.note, /下一步/);
  assert.deepEqual(state.metrics.map((item) => item[1]), ["待提纯", "已确认观点", "可进入写作中心"]);
  assert.ok(state.topGaps.some((gap) => gap.includes("缺一句话判断")));
});

test("sidebar flow renders Smart Notes demo walkthrough when demo notes are present", () => {
  const state = buildExplorerSidebarFlowState({
    rootId: "dir_demo",
    selectedNoteId: "PN-SN-101",
    currentNotes: [
      { id: "GUIDE-SN-001" },
      { id: "PN-SN-001" },
      { id: "PN-SN-101" },
      { id: "IC-SN-001" },
      { id: "WP-SN-PM-001" }
    ],
    originalNotes: []
  });
  const markup = renderExplorerSidebarFlowMarkup(state);

  assert.equal(state.kind, "smart-notes-demo");
  assert.match(markup, /Smart Notes 五步 walkthrough/);
  assert.match(markup, /data-sidebar-flow-action="open-demo-note-relations"/);
  assert.match(markup, /data-sidebar-flow-action="open-demo-writing"/);
});

test("sidebar flow markup escapes text and renders original primary action", () => {
  const markup = renderExplorerSidebarFlowMarkup({
    isOriginal: true,
    title: "<Title>",
    note: "note",
    steps: [["Step", true]],
    metrics: [[2, "Count"]],
    topGaps: [],
    primaryAction: "open-writing"
  }, {
    escapeHtml: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  });

  assert.match(markup, /&lt;Title&gt;/);
  assert.match(markup, /data-sidebar-flow-action="open-writing"/);
  assert.match(markup, /进入写作中心/);
  assert.match(markup, /观点链路已清爽/);
});

test("sidebar flow runtime renders into the provided element", () => {
  const classes = [];
  const element = {
    innerHTML: "",
    classList: { remove: (name) => classes.push(["remove", name]) }
  };
  const flow = renderExplorerSidebarFlowForRuntime({
    rootId: "dir_fleeting_default",
    element,
    currentNotes: [{ id: "f1" }],
    originalNotes: []
  }, {
    parseLinks: () => [],
    parseTags: () => [],
    noteHasGeneratedOriginal: () => false,
    distillationStatusOf: () => "draft",
    noteHasBoundarySignal: () => false,
    isPermanentLikeNote: () => false,
    escapeHtml: (value) => String(value)
  });

  assert.equal(flow.isOriginal, false);
  assert.match(element.innerHTML, /Material Route/);
  assert.match(element.innerHTML, /随笔是想法入口/);
  assert.deepEqual(classes, [["remove", "hidden"]]);
});

test("sidebar flow actions route to distillation writing and permanent creation", async () => {
  const calls = [];
  const state = {};
  const deps = {
    state,
    activateModule: (moduleName) => calls.push(["activate", moduleName]),
    openDistillationModule: async () => calls.push(["distillation"]),
    openWritingModule: async () => calls.push(["writing"]),
    handleStateChange: async (reason) => calls.push(["state", reason])
  };

  assert.equal(await handleSidebarFlowAction({ target: actionTarget("continue-distillation") }, deps), true);
  assert.equal(await handleSidebarFlowAction({ target: actionTarget("open-writing") }, deps), true);
  assert.equal(await handleSidebarFlowAction({ target: actionTarget("create-permanent") }, deps), true);

  assert.deepEqual(calls, [
    ["activate", "distillation"],
    ["distillation"],
    ["activate", "writing"],
    ["writing"],
    ["state", "create-note-in-selected-folder"]
  ]);
  assert.equal(state.browserRootId, "dir_original_default");
  assert.equal(state.selectedFolderId, "dir_original_default");
});

test("sidebar flow demo actions open notes, relations, writing, and review", async () => {
  const calls = [];
  const deps = {
    activateModule: (moduleName) => calls.push(["activate", moduleName]),
    openNoteById: (noteId, options) => calls.push(["open", noteId, options]),
    openWritingModule: async () => calls.push(["writing"]),
    handleStateChange: async (reason, payload) => calls.push(["state", reason, payload])
  };

  assert.equal(await handleSidebarFlowAction({ target: actionTargetWithNote("open-demo-note", "PN-SN-001") }, deps), true);
  assert.equal(await handleSidebarFlowAction({ target: actionTargetWithNote("open-demo-note-relations", "PN-SN-101") }, deps), true);
  assert.equal(await handleSidebarFlowAction({ target: actionTarget("open-demo-writing") }, deps), true);
  assert.equal(await handleSidebarFlowAction({ target: actionTarget("open-demo-review") }, deps), true);

  assert.deepEqual(calls, [
    ["activate", "explorer"],
    ["open", "PN-SN-001", { preferTitleSelection: false }],
    ["activate", "explorer"],
    ["open", "PN-SN-101", { preferTitleSelection: false }],
    ["state", "open-note-relations", { noteId: "PN-SN-101", source: "smart-notes-demo-walkthrough" }],
    ["activate", "writing"],
    ["writing"],
    ["activate", "today"]
  ]);
});

test("sidebar flow installer reads latest deps when clicked", async () => {
  const handlers = new Map();
  let version = "first";
  const calls = [];
  const registrations = installSidebarFlowEventHandler({
    $: (id) => id === "sidebarFlow" ? {
      addEventListener: (eventName, handler) => handlers.set(eventName, handler)
    } : null,
    depsProvider: () => ({
      activateModule: (moduleName) => calls.push(["activate", version, moduleName]),
      openWritingModule: async () => calls.push(["writing", version])
    })
  });

  assert.deepEqual(registrations.map((item) => item.installed), [true]);
  await handlers.get("click")({ target: actionTarget("open-writing") });
  version = "second";
  await handlers.get("click")({ target: actionTarget("open-writing") });

  assert.deepEqual(calls, [
    ["activate", "first", "writing"],
    ["writing", "first"],
    ["activate", "second", "writing"],
    ["writing", "second"]
  ]);
});
