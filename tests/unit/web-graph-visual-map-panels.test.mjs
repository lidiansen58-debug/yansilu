import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapPanelMarkup
} from "../../apps/web/src/graph-visual-map-panels.js";

function runtime(overrides = {}) {
  const nodeMap = new Map([["n1", { id: "n1" }]]);
  return {
    normalizedFocusedNoteId: "n1",
    layout: {
      nodes: [{ id: "n1" }],
      nodeMap,
      clusterMeta: [{ id: "cluster-1" }]
    },
    activeSelection: null,
    contextualSelectionEdges: [{ id: "edge-1" }],
    contextualNodeMap: nodeMap,
    focusContextAvailable: true,
    focusContextCollapsed: false,
    researchNavigatorCanOpen: true,
    ...overrides
  };
}

test("graph visual map panels render focus selection and research slots", () => {
  const result = buildGraphVisualMapPanelMarkup({
    runtimeState: runtime(),
    questionSpotSummary: { count: 2 },
    topicCandidates: [{ id: "topic" }],
    isolatedNotes: [{ id: "iso" }],
    bridgeGaps: [{ id: "gap" }],
    clueSummary: { count: 1 },
    edges: [{ id: "edge" }]
  }, {
    renderGraphFocusContextPanel: ({ focusedNoteId, edges }) => `<focus note="${focusedNoteId}" edges="${edges.length}" />`,
    renderGraphSelectionPanel: ({ edges }) => `<selection edges="${edges.length}" />`,
    renderGraphResearchNavigatorPanel: ({ nodes, questionSummary }) => `<research nodes="${nodes.length}" questions="${questionSummary.count}" />`,
    renderGraphResearchNavigatorEntry: (open) => open ? "<entry />" : ""
  });

  assert.equal(result.focusContextMarkup, '<focus note="n1" edges="1" />');
  assert.equal(result.selectionContextMarkup, '<selection edges="1" />');
  assert.equal(result.researchNavigatorMarkup, '<research nodes="1" questions="2" />');
  assert.equal(result.researchNavigatorEntryMarkup, "");
});

test("graph visual map panels hide focus when collapsed and open research entry without selection", () => {
  const result = buildGraphVisualMapPanelMarkup({
    runtimeState: runtime({
      focusContextCollapsed: true
    })
  }, {
    renderGraphFocusContextPanel: () => "<focus />",
    renderGraphSelectionPanel: () => "",
    renderGraphResearchNavigatorEntry: (open) => open ? "<entry />" : ""
  });

  assert.equal(result.focusContextMarkup, "");
  assert.equal(result.selectionContextMarkup, "");
  assert.equal(result.researchNavigatorEntryMarkup, "<entry />");
});
