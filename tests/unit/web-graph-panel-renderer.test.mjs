import test from "node:test";
import assert from "node:assert/strict";

import {
  renderGraphPanelForRuntime
} from "../../apps/web/src/graph-panel-renderer.js";

function elementStub() {
  const classes = new Set();
  return {
    textContent: "",
    innerHTML: "",
    classes,
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      }
    }
  };
}

function readyPanelState(overrides = {}) {
  return {
    kind: "ready",
    summaryText: "3 条永久笔记，2 条关系",
    normalizedSelection: { kind: "node", nodeId: "n1" },
    backButtonHidden: false,
    showingFocusedNote: false,
    isolatedNotes: [{ noteId: "n3" }],
    graphRelationTargetNodeMap: new Map([["n1", { id: "n1" }]]),
    scopedNetworkEdges: [{ id: "e1" }],
    currentGraphQueueNoteId: "n3",
    isolatedQueueItems: [{ noteId: "n3" }],
    sectionOpen: {
      "bridge-gaps": true,
      "weak-relations": false,
      "review-queue": true,
      "ai-analysis": false
    },
    bridgeGaps: [{ id: "gap" }],
    edges: [{ id: "e1" }],
    scopedReviewQueue: { items: [{ id: "review" }] },
    scopedAllNodes: [{ id: "n1" }, { id: "n2" }],
    clueSummary: { count: 1 },
    questionSpotSummary: { count: 2 },
    thinkingItems: [{ id: "thinking" }],
    notices: [{ tone: "info", title: "notice" }],
    visualNodes: [{ id: "n1" }],
    focused: { edges: [{ id: "e1" }], focusedNoteId: "" },
    effectiveRelationType: "meaningful",
    focusedRelationTypeStats: null,
    topicCandidates: [],
    structureFallback: false,
    ...overrides
  };
}

test("graph panel renderer mounts loading, error, and empty states", () => {
  const summary = elementStub();
  const canvas = elementStub();

  assert.equal(renderGraphPanelForRuntime({
    summary,
    canvas,
    panelState: { kind: "loading", summaryText: "Loading", emptyMessage: "<loading>" }
  }), true);
  assert.equal(summary.textContent, "Loading");
  assert.match(canvas.innerHTML, /&lt;loading&gt;/);

  renderGraphPanelForRuntime({
    summary,
    canvas,
    panelState: { kind: "error", summaryText: "Error", error: "boom" }
  }, {
    renderGraphErrorState: (error) => `<section>${error}</section>`
  });
  assert.equal(summary.textContent, "Error");
  assert.equal(canvas.innerHTML, "<section>boom</section>");

  renderGraphPanelForRuntime({
    summary,
    canvas,
    panelState: { kind: "empty", summaryText: "Empty" }
  });
  assert.equal(summary.textContent, "Empty");
  assert.equal(canvas.innerHTML, `<div class="graph-empty"></div>`);
});

test("graph panel renderer composes full graph chrome and updates selection", () => {
  const summary = elementStub();
  const canvas = elementStub();
  const backButton = elementStub();
  const graphState = { isolatedQueueStripCollapsed: true };
  const calls = [];

  renderGraphPanelForRuntime({
    summary,
    canvas,
    backButton,
    panelState: readyPanelState()
  }, {
    graphState,
    renderGraphIsolatedQueue: (payload) => {
      calls.push(["queue", payload.limit, payload.queueItems.length]);
      return "<queue></queue>";
    },
    renderGraphIsolatedQueueStrip: (payload) => {
      calls.push(["queue-strip", payload.currentNoteId, payload.collapsed]);
      return "<queue-strip></queue-strip>";
    },
    renderGraphBridgeGapSection: (_items, options) => `<bridge open="${options.open}"></bridge>`,
    renderGraphWeakRelationClueSection: (_items, options) => `<weak open="${options.open}"></weak>`,
    renderRelationReviewQueueSection: (_queue, options) => `<review open="${options.open}"></review>`,
    renderGraphAiAnalysisCard: (options) => `<ai open="${options.open}" nodes="${options.nodes.length}"></ai>`,
    renderGraphWorkbenchEntryPills: (payload) => `<entry q="${payload.questionSummary.count}"></entry>`,
    renderGraphWorkbenchPanel: (payload) => `<workbench>${payload.clueSectionsMarkup}${payload.isolatedQueueMarkup}</workbench>`,
    renderGraphInlineNotice: (notice) => `<notice tone="${notice.tone}"></notice>`,
    renderGraphVisualMap: (payload) => {
      calls.push(["visual", payload.nodes.length, payload.edges.length, payload.workbenchPanelMarkup.includes("<bridge open=\"true\">")]);
      return `<visual>${payload.isolatedQueueStripMarkup}${payload.workbenchEntryMarkup}</visual>`;
    }
  });

  assert.equal(summary.textContent, "3 条永久笔记，2 条关系");
  assert.deepEqual(graphState.selection, { kind: "node", nodeId: "n1" });
  assert.equal(backButton.classes.has("hidden"), false);
  assert.match(canvas.innerHTML, /<notice tone="info">/);
  assert.match(canvas.innerHTML, /<queue-strip><\/queue-strip>/);
  assert.match(canvas.innerHTML, /<entry q="2"><\/entry>/);
  assert.deepEqual(calls, [
    ["queue", 6, 1],
    ["queue-strip", "n3", true],
    ["visual", 1, 1, true]
  ]);
});

test("graph panel renderer uses focused toolbar instead of workbench sections", () => {
  const canvas = elementStub();
  const backButton = elementStub();
  const calls = [];

  renderGraphPanelForRuntime({
    summary: elementStub(),
    canvas,
    backButton,
    panelState: readyPanelState({
      showingFocusedNote: true,
      backButtonHidden: true,
      focused: { focusedNoteId: "n1", edges: [{ id: "e1" }] },
      effectiveRelationType: "supports",
      focusedRelationTypeStats: { supports: 1 }
    })
  }, {
    graphState: {},
    renderGraphIsolatedQueue: () => calls.push("queue"),
    renderGraphWorkbenchPanel: () => calls.push("workbench"),
    renderGraphRelationTypeFilter: (edges, selected, compact, stats) => {
      calls.push(["filter", edges.length, selected, compact, stats]);
      return "<filter></filter>";
    },
    renderGraphVisualMap: (payload) => {
      calls.push(["visual", payload.filterActive, payload.focusedNoteId, payload.toolbarMarkup.includes("<filter>")]);
      return "<visual></visual>";
    }
  });

  assert.equal(backButton.classes.has("hidden"), true);
  assert.deepEqual(calls, [
    ["filter", 1, "supports", false, { supports: 1 }],
    ["visual", true, "n1", true]
  ]);
});
