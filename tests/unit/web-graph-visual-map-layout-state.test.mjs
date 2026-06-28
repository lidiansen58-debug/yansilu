import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphVisualMapLayoutState
} from "../../apps/web/src/graph-visual-map-layout-state.js";

test("graph visual map layout state derives layout visible edges and focused connections", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const edges = [
    { id: "e1", fromNoteId: "a", toNoteId: "b", relationType: "supports" },
    { id: "e2", fromNoteId: "b", toNoteId: "c", relationType: "conflicts" },
    { id: "e3", fromNoteId: "c", toNoteId: "a", relationType: "hidden" }
  ];
  const state = buildGraphVisualMapLayoutState({
    nodes,
    edges,
    filterActive: true,
    focusedNoteId: " b "
  }, {
    graphBuildVisualLayout: (layoutNodes, layoutEdges, options) => ({
      nodes: layoutNodes,
      edges: layoutEdges,
      width: 1000,
      height: 600,
      nodeMap: new Map(layoutNodes.map((node) => [node.id, node])),
      clusterMeta: [{ id: "cluster-1" }],
      options
    }),
    graphEdgePath: (edge) => edge.id === "e3" ? "" : `M ${edge.fromNoteId} ${edge.toNoteId}`,
    graphRelationVisual: (type) => ({ key: type })
  });

  assert.equal(state.normalizedFocusedNoteId, "b");
  assert.equal(state.layout.width, 1000);
  assert.deepEqual(state.layout.options, { focusedNoteId: "b" });
  assert.deepEqual([...state.adjacencyMap.get("b")].sort(), ["a", "c"]);
  assert.deepEqual(state.visibleEdges.map((item) => item.edge.id), ["e1", "e2"]);
  assert.deepEqual(state.visibleEdges.map((item) => item.connectsFocus), [true, true]);
  assert.equal(state.visibleEdges[0].visual.key, "supports");
  assert.equal(state.denseDirectoryMode, false);
});

test("graph visual map layout state derives density and structure fallback stats", () => {
  const nodes = Array.from({ length: 121 }, (_, index) => ({ id: `n${index}` }));
  const edges = [{ id: "e1", fromNoteId: "n1", toNoteId: "n2" }];
  const state = buildGraphVisualMapLayoutState({
    nodes,
    edges,
    relationFilterEdges: [{ id: "all-1" }, { id: "all-2" }],
    filterActive: false,
    structureFallback: true
  }, {
    graphBuildVisualLayout: (layoutNodes) => ({
      nodes: layoutNodes,
      edges,
      width: 960,
      height: 520,
      nodeMap: new Map(layoutNodes.map((node) => [node.id, node])),
      clusterMeta: []
    }),
    graphDenseGalaxyMode: ({ nodes: layoutNodes, filterActive }) => layoutNodes.length > 120 && !filterActive,
    shouldShowGraphDensityHint: ({ dense, filterActive }) => dense && !filterActive
  });

  assert.equal(state.denseDirectoryMode, true);
  assert.equal(state.denseGalaxyMode, true);
  assert.equal(state.showDensityHint, true);
  assert.deepEqual(state.compactRelationFilterStats, {
    structureFallback: true,
    totalCount: 2,
    meaningfulCount: 1,
    indexCount: 0
  });
});
