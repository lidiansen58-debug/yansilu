import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphVisualMapRuntimeState
} from "../../apps/web/src/graph-visual-map-runtime-state.js";

test("graph visual map runtime state derives layout zoom and active selection context", () => {
  const nodes = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C" }
  ];
  const edges = [
    { id: "e1", fromNoteId: "a", toNoteId: "b", relationType: "supports" },
    { id: "e2", fromNoteId: "b", toNoteId: "c", relationType: "bridges" }
  ];
  const state = buildGraphVisualMapRuntimeState({
    graphState: {
      zoom: "wide",
      selection: { kind: "node", nodeId: "b" },
      readingLens: "questions"
    },
    nodes,
    edges,
    relationFilterEdges: edges,
    relationType: "meaningful",
    bridgeGaps: [{ noteId: "a", targetNoteId: "c" }]
  }, {
    graphFocusDepthMeta: () => ({ key: "1", label: "1", note: "one hop" }),
    graphReadingModeMeta: () => ({ key: "argument", label: "Argument" }),
    graphViewModeForRelationType: () => "argument",
    graphBuildVisualLayout: (layoutNodes) => ({
      nodes: layoutNodes,
      width: 1000,
      height: 600,
      nodeMap: new Map(layoutNodes.map((node) => [node.id, node])),
      clusterMeta: []
    }),
    graphZoomOption: () => ({ key: "wide", scale: 1.5 }),
    graphReadingLensMeta: () => ({ key: "questions" }),
    graphEdgePath: (edge) => `M ${edge.fromNoteId} ${edge.toNoteId}`,
    graphRelationVisual: (type) => ({ key: type }),
    graphDenseGalaxyMode: () => false,
    shouldShowGraphDensityHint: () => false,
    normalizeGraphSelectionForVisibleItems: (selection) => ({ ...selection, normalized: true }),
    graphNodeNeedsRelationWorkflow: () => false,
    graphBuildReadingLensState: ({ lens, visibleEdges, bridgeGaps }) => ({
      active: true,
      lens,
      visibleEdgeCount: visibleEdges.length,
      bridgeGapCount: bridgeGaps.length
    }),
    zoomOptions: { fit: {}, wide: {}, close: {} }
  });

  assert.equal(state.zoomWidth, 1500);
  assert.equal(state.zoomHeight, 900);
  assert.equal(state.zoomIndex, 1);
  assert.equal(state.activeSelection.normalized, true);
  assert.equal(state.selectedNodeId, "b");
  assert.deepEqual([...state.selectedNodeNeighborhood].sort(), ["a", "b", "c"]);
  assert.equal(state.visibleEdges.length, 2);
  assert.equal(state.readingLensState.visibleEdgeCount, 2);
  assert.equal(state.readingLensState.bridgeGapCount, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(state, "legendGroups"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(state, "legendOpen"), false);
});

test("graph visual map runtime state handles dense navigator and relation workflow selection", () => {
  const nodeMap = new Map([["isolated", { id: "isolated" }]]);
  const state = buildGraphVisualMapRuntimeState({
    graphState: {
      selection: { kind: "node", nodeId: "isolated" },
      researchNavigatorTouched: false
    },
    nodes: [{ id: "isolated" }],
    edges: [],
    relationFilterEdges: [],
    selectionNodeMap: nodeMap,
    filterActive: false
  }, {
    graphBuildVisualLayout: (nodes) => ({ nodes, width: 960, height: 520, nodeMap, clusterMeta: [] }),
    graphZoomOption: () => ({ key: "fit", scale: 1 }),
    graphReadingLensMeta: () => ({ key: "overview" }),
    graphDenseGalaxyMode: () => true,
    shouldShowGraphDensityHint: () => true,
    normalizeGraphSelectionForVisibleItems: (selection) => selection,
    graphNodeNeedsRelationWorkflow: () => true,
    graphBuildReadingLensState: () => ({ active: false })
  });

  assert.equal(state.selectionNodeNeedsRelationWorkflow, true);
  assert.equal(state.selectedNodeId, "");
  assert.equal(state.selectedIsolatedNodeId, "isolated");
  assert.equal(state.showDensityHint, true);
  assert.equal(state.researchNavigatorAutoHidden, true);
  assert.equal(state.researchNavigatorHidden, true);
  assert.equal(state.researchNavigatorCanOpen, false);
  assert.equal(state.researchNavigatorOpen, false);
});

test("graph visual map runtime state opens navigator from explicit graph state", () => {
  const state = buildGraphVisualMapRuntimeState({
    graphState: {
      researchNavigatorTouched: true,
      researchNavigatorHidden: false,
      workbenchPanelOpen: false
    },
    nodes: [{ id: "a" }],
    edges: [],
    relationFilterEdges: []
  }, {
    graphBuildVisualLayout: (nodes) => ({ nodes, width: 960, height: 520, nodeMap: new Map(), clusterMeta: [] }),
    graphZoomOption: () => ({ key: "fit", scale: 1 }),
    graphReadingLensMeta: () => ({ key: "insight" }),
    graphDenseGalaxyMode: () => true,
    shouldShowGraphDensityHint: () => false,
    graphBuildReadingLensState: () => ({ active: false })
  });

  assert.equal(state.researchNavigatorCanOpen, true);
  assert.equal(state.researchNavigatorOpen, true);
});

test("graph visual map runtime state keeps explicit navigator open in dense maps", () => {
  const state = buildGraphVisualMapRuntimeState({
    graphState: {
      researchNavigatorTouched: true,
      researchNavigatorHidden: false,
      workbenchPanelOpen: false
    },
    nodes: Array.from({ length: 120 }, (_, index) => ({ id: `n-${index}` })),
    edges: [],
    relationFilterEdges: [],
    workbenchPanelMarkup: "<aside>stale workbench markup</aside>"
  }, {
    graphBuildVisualLayout: (nodes) => ({ nodes, width: 960, height: 520, nodeMap: new Map(), clusterMeta: [] }),
    graphZoomOption: () => ({ key: "fit", scale: 1 }),
    graphReadingLensMeta: () => ({ key: "insight" }),
    graphDenseGalaxyMode: () => true,
    shouldShowGraphDensityHint: () => false,
    graphBuildReadingLensState: () => ({ active: false })
  });

  assert.equal(state.researchNavigatorHidden, false);
  assert.equal(state.researchNavigatorCanOpen, false);
  assert.equal(state.researchNavigatorOpen, true);
});
