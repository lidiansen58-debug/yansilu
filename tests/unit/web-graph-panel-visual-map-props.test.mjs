import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphPanelVisualMapProps,
  renderGraphPanelFocusedToolbar
} from "../../apps/web/src/graph-panel-visual-map-props.js";

function panelState(overrides = {}) {
  return {
    visualNodes: [{ id: "n1" }],
    edges: [{ id: "e1" }],
    scopedNetworkEdges: [{ id: "network-edge" }],
    graphRelationTargetNodeMap: new Map([["n1", { id: "n1" }]]),
    showingFocusedNote: false,
    focused: { focusedNoteId: "", edges: [{ id: "focused-edge" }] },
    effectiveRelationType: "meaningful",
    questionSpotSummary: { count: 2 },
    topicCandidates: [{ id: "topic" }],
    isolatedNotes: [{ noteId: "n3" }],
    bridgeGaps: [{ id: "gap" }],
    clueSummary: { count: 1 },
    structureFallback: false,
    ...overrides
  };
}

test("graph panel visual map props carries panel state and composed markup into visual map args", () => {
  const nodeMap = new Map([["n1", { id: "n1" }]]);
  const props = buildGraphPanelVisualMapProps(panelState({
    graphRelationTargetNodeMap: nodeMap,
    showingFocusedNote: true,
    focused: { focusedNoteId: "n1", edges: [{ id: "focus-edge" }] },
    effectiveRelationType: "supports",
    structureFallback: true
  }), {
    workbenchPanelMarkup: "<workbench></workbench>",
    workbenchEntryMarkup: "<entry></entry>",
    isolatedQueueStripMarkup: "<queue-strip></queue-strip>",
    toolbarMarkup: "<toolbar></toolbar>"
  });

  assert.deepEqual(props.nodes, [{ id: "n1" }]);
  assert.deepEqual(props.relationFilterEdges, [{ id: "focus-edge" }]);
  assert.equal(props.selectionNodeMap, nodeMap);
  assert.equal(props.filterActive, true);
  assert.equal(props.focusedNoteId, "n1");
  assert.equal(props.relationType, "supports");
  assert.equal(props.workbenchPanelMarkup, "<workbench></workbench>");
  assert.equal(props.toolbarMarkup, "<toolbar></toolbar>");
  assert.equal(props.structureFallback, true);
});

test("graph panel focused toolbar renders only for focused graph slices", () => {
  const calls = [];

  assert.equal(renderGraphPanelFocusedToolbar(panelState(), {
    renderGraphRelationTypeFilter: () => {
      throw new Error("should not render filter outside focused note");
    }
  }), "");

  const markup = renderGraphPanelFocusedToolbar(panelState({
    showingFocusedNote: true,
    focused: { focusedNoteId: "n1", edges: [{ id: "e1" }, { id: "e2" }] },
    effectiveRelationType: "supports",
    focusedRelationTypeStats: { supports: 2 }
  }), {
    renderGraphRelationTypeFilter: (edges, selected, compact, stats) => {
      calls.push([edges.length, selected, compact, stats]);
      return "<filter></filter>";
    }
  });

  assert.match(markup, /graph-canvas-toolbar/);
  assert.match(markup, /<filter><\/filter>/);
  assert.deepEqual(calls, [[2, "supports", false, { supports: 2 }]]);
});
