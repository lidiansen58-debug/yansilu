import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphVisualMapControlsInput,
  buildGraphVisualMapLayoutInput,
  buildGraphVisualMapRuntimeInputs,
  buildGraphVisualMapSelectionInput
} from "../../apps/web/src/graph-visual-map-runtime-input.js";

test("graph visual map layout input normalizes focus and boolean layout flags", () => {
  const input = buildGraphVisualMapLayoutInput({
    nodes: [{ id: "n1" }],
    edges: [{ id: "e1" }],
    relationFilterEdges: [{ id: "e2" }],
    filterActive: "yes",
    focusedNoteId: " n1 ",
    structureFallback: 1
  });

  assert.equal(input.focusedNoteId, "n1");
  assert.equal(input.filterActive, false);
  assert.equal(input.structureFallback, false);
  assert.deepEqual(input.nodes, [{ id: "n1" }]);
  assert.deepEqual(input.relationFilterEdges, [{ id: "e2" }]);
});

test("graph visual map selection input derives visible selection scope from layout state", () => {
  const nodeMap = new Map([["n1", { id: "n1" }]]);
  const adjacencyMap = new Map([["n1", new Set(["n2"])]]);
  const input = buildGraphVisualMapSelectionInput({
    graphState: { selection: { kind: "node", nodeId: "n1" } },
    layoutState: {
      layout: {
        nodes: [{ id: "n1" }],
        clusterMeta: [{ key: "cluster" }],
        nodeMap
      },
      adjacencyMap
    },
    edges: [{ id: "e1" }],
    relationFilterEdges: [{ id: "e2" }],
    bridgeGaps: [{ noteId: "n1", targetNoteId: "n2" }]
  });

  assert.deepEqual(input.graphSelection, { kind: "node", nodeId: "n1" });
  assert.deepEqual(input.layoutNodes, [{ id: "n1" }]);
  assert.deepEqual(input.layoutEdges, [{ id: "e1" }]);
  assert.equal(input.layoutNodeMap, nodeMap);
  assert.equal(input.adjacencyMap, adjacencyMap);
  assert.deepEqual(input.clusterMeta, [{ key: "cluster" }]);
});

test("graph visual map controls input carries toolbar and interaction state from layout state", () => {
  const input = buildGraphVisualMapControlsInput({
    graphState: {
      zoom: "wide",
      readingLens: "bridge",
      focusDepth: "2"
    },
    relationType: " index ",
    layoutState: {
      layout: { width: 100, height: 50, nodes: [{ id: "n1" }] },
      visibleEdges: [{ edge: { id: "e1" } }],
      normalizedFocusedNoteId: "n1",
      denseGalaxyMode: true
    },
    filterActive: true,
    workbenchPanelMarkup: "<panel></panel>"
  });

  assert.equal(input.graphState.zoom, "wide");
  assert.equal(input.graphState.readingLens, "bridge");
  assert.equal(input.relationType, "index");
  assert.equal(input.layout.width, 100);
  assert.deepEqual(input.visibleEdges, [{ edge: { id: "e1" } }]);
  assert.equal(input.normalizedFocusedNoteId, "n1");
  assert.equal(input.denseGalaxyMode, true);
  assert.equal(input.filterActive, true);
  assert.equal(input.workbenchPanelMarkup, "<panel></panel>");
});

test("graph visual map runtime inputs bundle layout selection and controls inputs", () => {
  const layoutState = {
    layout: { width: 100, height: 50, nodes: [{ id: "n1" }], nodeMap: new Map(), clusterMeta: [] },
    adjacencyMap: new Map(),
    visibleEdges: [],
    normalizedFocusedNoteId: "n1"
  };
  const input = buildGraphVisualMapRuntimeInputs({
    graphState: { selection: { kind: "node", nodeId: "n1" } },
    nodes: [{ id: "n1" }],
    edges: [],
    focusedNoteId: " n1 ",
    relationType: "meaningful",
    filterActive: true
  }, { layoutState });

  assert.equal(input.layoutInput.focusedNoteId, "n1");
  assert.deepEqual(input.selectionInput.graphSelection, { kind: "node", nodeId: "n1" });
  assert.equal(input.controlsInput.normalizedFocusedNoteId, "n1");
  assert.equal(input.controlsInput.filterActive, true);
});
