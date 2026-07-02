import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphVisualMapAdjacencyMap,
  buildGraphVisualMapSelectionState
} from "../../apps/web/src/graph-visual-map-selection-state.js";

test("graph visual map selection state builds node neighborhoods from visible edges", () => {
  const adjacencyMap = buildGraphVisualMapAdjacencyMap([
    { fromNoteId: "a", toNoteId: "b" },
    { fromNoteId: "b", toNoteId: "c" },
    { fromNoteId: "", toNoteId: "ignored" }
  ]);
  const state = buildGraphVisualMapSelectionState({
    graphSelection: { kind: "node", nodeId: "b" },
    layoutNodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    layoutEdges: [{ fromNoteId: "a", toNoteId: "b" }],
    layoutNodeMap: new Map([["b", { id: "b" }]]),
    adjacencyMap
  });

  assert.deepEqual([...adjacencyMap.get("b")].sort(), ["a", "c"]);
  assert.equal(state.selectedNodeId, "b");
  assert.deepEqual([...state.selectedNodeNeighborhood].sort(), ["a", "b", "c"]);
  assert.equal(state.selectedIsolatedNodeId, "");
});

test("graph visual map selection state routes relation workflow nodes to isolated selection", () => {
  const selectionEdges = [{ fromNoteId: "a", toNoteId: "b" }];
  const selectionNodeMap = new Map([["a", { id: "a" }]]);
  const state = buildGraphVisualMapSelectionState({
    graphSelection: { kind: "node", nodeId: "a" },
    relationFilterEdges: [],
    selectionEdges,
    selectionNodeMap
  }, {
    graphNodeNeedsRelationWorkflow: (nodeId, edges, nodeMap) => {
      assert.equal(nodeId, "a");
      assert.equal(edges, selectionEdges);
      assert.deepEqual([...nodeMap.keys()].sort(), [...selectionNodeMap.keys()].sort());
      return true;
    }
  });

  assert.equal(state.selectionNodeNeedsRelationWorkflow, true);
  assert.equal(state.selectedNodeId, "");
  assert.equal(state.selectedIsolatedNodeId, "a");
});

test("graph visual map selection state derives edge theme and bridge highlights", () => {
  const edgeState = buildGraphVisualMapSelectionState({
    graphSelection: { kind: "edge", edgeKey: "edge-1" }
  });
  const themeState = buildGraphVisualMapSelectionState({
    graphSelection: { kind: "theme", noteIds: ["n1", "n2"] }
  });
  const bridgeState = buildGraphVisualMapSelectionState({
    graphSelection: { kind: "bridge", noteId: "n1", targetNoteId: "n2" }
  });

  assert.equal(edgeState.selectedEdgeKey, "edge-1");
  assert.equal(themeState.selectedThemeNoteIds.has("n1"), true);
  assert.equal(themeState.selectedThemeNoteIds.has("n2"), true);
  assert.deepEqual([...bridgeState.selectedBridgeNoteIds].sort(), ["n1", "n2"]);
});
