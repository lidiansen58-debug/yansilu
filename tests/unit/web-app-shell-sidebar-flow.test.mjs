import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExplorerSidebarFlowState,
  distillationSummaryForSidebarFlow,
  handleSidebarFlowAction,
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
    { id: "n2", thesis: "Claim", threeLineSummary: [] }
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
  assert.equal(state.metrics.length, 3);
  assert.ok(state.topGaps.length > 0);
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
});

test("sidebar flow runtime keeps note boxes free of walkthrough chrome", () => {
  const classes = [];
  const element = {
    innerHTML: "stale walkthrough",
    classList: { add: (name) => classes.push(["add", name]) }
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

  assert.equal(flow, null);
  assert.equal(element.innerHTML, "");
  assert.deepEqual(classes, [["add", "hidden"]]);
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
