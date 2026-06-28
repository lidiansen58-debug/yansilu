import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapContextMarkup
} from "../../apps/web/src/graph-visual-map-context.js";

function baseRuntimeState(overrides = {}) {
  const nodeMap = new Map([["n1", { id: "n1", title: "One" }]]);
  return {
    normalizedFocusedNoteId: "n1",
    layout: {
      nodes: [{ id: "n1", title: "One" }],
      edges: [],
      width: 960,
      height: 520,
      nodeMap,
      clusterMeta: [{ clusterKey: "c1" }]
    },
    zoom: { key: "fit" },
    compactRelationFilterStats: { totalCount: 2 },
    activeSelection: null,
    contextualSelectionEdges: [{ id: "edge-1" }],
    contextualNodeMap: nodeMap,
    focusContextAvailable: false,
    focusContextCollapsed: false,
    researchNavigatorCanOpen: true,
    expanded: false,
    readingLens: { key: "overview" },
    readingLensState: { active: false },
    zoomWidth: 960,
    zoomHeight: 520,
    ...overrides
  };
}

test("graph visual map context builds chrome-adjacent markup from runtime state", () => {
  const calls = [];
  const result = buildGraphVisualMapContextMarkup({
    runtimeState: baseRuntimeState(),
    relationType: "meaningful",
    relationFilterEdges: [{ id: "r1" }],
    graphState: { lastLoadedAt: "old" },
    topicCandidates: [{ id: "topic" }],
    bridgeGaps: [{ noteId: "bridge" }],
    clueSummary: { count: 1 },
    questionSpotSummary: { count: 2 },
    edges: [{ fromNoteId: "n1", toNoteId: "n2" }]
  }, {
    graphState: { lastLoadedAt: "loaded" },
    renderGraphRelationTypeFilter: (...args) => {
      calls.push(["filter", args[1], args[2], args[3]]);
      return "<filter />";
    },
    renderGraphThemeBoundary: (meta) => meta ? "<theme />" : "",
    renderGraphStarfield: (width, height, seed) => {
      calls.push(["star", width, height, seed]);
      return "<stars />";
    },
    renderGraphNebulaField: (_width, _height, seed) => `<nebula data-seed="${seed}" />`,
    renderGraphClusterGlow: (clusters) => `<cluster count="${clusters.length}" />`,
    renderGraphFocusContextPanel: () => "<focus />",
    renderGraphSelectionPanel: () => "",
    renderGraphResearchNavigatorPanel: ({ nodes, questionSummary }) => `<research nodes="${nodes.length}" questions="${questionSummary.count}" />`,
    renderGraphResearchNavigatorEntry: (open) => open ? "<entry />" : ""
  });

  assert.equal(result.compactRelationFilterMarkup, "<filter />");
  assert.equal(result.starfieldMarkup, "<stars />");
  assert.match(result.nebulaMarkup, /loaded:meaningful:fit/);
  assert.equal(result.clusterGlowMarkup, '<cluster count="1" />');
  assert.equal(result.researchNavigatorEntryMarkup, "<entry />");
  assert.equal(result.graphShellPreviewProps.researchNavigatorOpen, true);
  assert.deepEqual(calls[0], ["filter", "meaningful", true, { totalCount: 2 }]);
  assert.deepEqual(calls.find((call) => call[0] === "star"), ["star", 960, 520, "loaded:meaningful:fit"]);
});

test("graph visual map context sends theme selection to boundary meta and hides research entry behind selection", () => {
  const result = buildGraphVisualMapContextMarkup({
    runtimeState: baseRuntimeState({
      activeSelection: { kind: "theme", noteIds: ["n1"], title: "Theme" }
    }),
    relationType: "index",
    filterActive: false
  }, {
    graphState: { lastLoadedAt: "loaded" },
    renderGraphRelationTypeFilter: () => "<filter />",
    graphThemeBoundaryMeta: (input) => ({ title: input.title, count: input.noteIds.length }),
    renderGraphThemeBoundary: (meta) => `<theme title="${meta.title}" count="${meta.count}" />`,
    renderGraphStarfield: () => "",
    renderGraphNebulaField: () => "",
    renderGraphClusterGlow: () => "",
    renderGraphSelectionPanel: () => "<selection />",
    renderGraphResearchNavigatorPanel: () => "<research />",
    renderGraphResearchNavigatorEntry: (open) => open ? "<entry />" : ""
  });

  assert.equal(result.themeBoundaryMarkup, '<theme title="Theme" count="1" />');
  assert.equal(result.selectionContextMarkup, "<selection />");
  assert.equal(result.researchNavigatorEntryMarkup, "");
  assert.equal(result.graphShellPreviewProps.researchNavigatorOpen, false);
});

test("graph visual map context shows focus context only when available and expanded", () => {
  const expanded = buildGraphVisualMapContextMarkup({
    runtimeState: baseRuntimeState({
      focusContextAvailable: true,
      focusContextCollapsed: false
    }),
    edges: [{ id: "e1" }]
  }, {
    graphState: { lastLoadedAt: "loaded" },
    renderGraphFocusContextPanel: ({ focusedNoteId, edges }) => `<focus note="${focusedNoteId}" edges="${edges.length}" />`
  });
  const collapsed = buildGraphVisualMapContextMarkup({
    runtimeState: baseRuntimeState({
      focusContextAvailable: true,
      focusContextCollapsed: true
    })
  });

  assert.equal(expanded.focusContextMarkup, '<focus note="n1" edges="1" />');
  assert.equal(collapsed.focusContextMarkup, "");
}
);
