import test from "node:test";
import assert from "node:assert/strict";
import {
  graphSelectionDispatcherKind,
  renderGraphSelectionByKind,
  renderGraphSelectionPanelViaDispatcher
} from "../../apps/web/src/graph-selection-dispatcher.js";

function recordingRenderers(calls) {
  return {
    renderClusterPanel: (context) => {
      calls.push(["cluster", context]);
      return "cluster-panel";
    },
    renderThemePanel: (context) => {
      calls.push(["theme", context]);
      return "theme-panel";
    },
    renderIsolatedPanel: (context) => {
      calls.push(["isolated", context]);
      return "isolated-panel";
    },
    renderIsolatedCompletePanel: (context) => {
      calls.push(["isolatedComplete", context]);
      return "isolated-complete-panel";
    },
    renderRelationFormPanel: (context) => {
      calls.push(["relationForm", context]);
      return "relation-form-panel";
    },
    renderBridgePanel: (context) => {
      calls.push(["bridge", context]);
      return "bridge-panel";
    },
    renderNodePanel: (context) => {
      calls.push(["node", context]);
      return "node-panel";
    },
    renderEdgePanel: (context) => {
      calls.push(["edge", context]);
      return "edge-panel";
    }
  };
}

test("graph selection dispatcher routes every visible selection kind to its panel renderer", () => {
  const cases = [
    ["cluster", "cluster-panel"],
    ["theme", "theme-panel"],
    ["isolated", "isolated-panel"],
    ["isolatedComplete", "isolated-complete-panel"],
    ["relationForm", "relation-form-panel"],
    ["bridge", "bridge-panel"],
    ["node", "node-panel"],
    ["edge", "edge-panel"]
  ];
  for (const [kind, expected] of cases) {
    const calls = [];
    const nodeMap = new Map([["note-a", { id: "note-a" }]]);
    const result = renderGraphSelectionByKind({
      selection: { kind, nodeId: "note-a", edgeKey: "edge-a", clusterKey: "cluster-a" },
      nodeMap,
      edges: [{ id: "edge-a" }],
      topicCandidates: [{ id: "theme-a" }],
      isolatedNotes: [{ id: "isolated-a" }],
      bridgeGaps: [{ id: "bridge-a" }],
      clusterMeta: [{ clusterKey: "cluster-a" }]
    }, recordingRenderers(calls));

    assert.equal(result, expected);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], kind);
    assert.equal(calls[0][1].selection.kind, kind);
  }
});

test("graph selection dispatcher normalizes visible selections before rendering", () => {
  const calls = [];
  const nodeMap = new Map([["note-a", { id: "note-a" }]]);
  const result = renderGraphSelectionPanelViaDispatcher({
    selection: { kind: "node", nodeId: "stale" },
    nodeMap,
    edges: [],
    topicCandidates: [],
    isolatedNotes: [],
    bridgeGaps: [],
    clusterMeta: []
  }, recordingRenderers(calls), {
    normalizeSelection: (selection, context) => {
      assert.deepEqual(context.nodes, [{ id: "note-a" }]);
      assert.equal(selection.nodeId, "stale");
      return { kind: "node", nodeId: "note-a" };
    }
  });

  assert.equal(result, "node-panel");
  assert.equal(calls[0][1].selection.nodeId, "note-a");
});

test("graph selection dispatcher returns empty output for unknown or hidden selections", () => {
  assert.equal(graphSelectionDispatcherKind({ kind: " node " }), "node");
  assert.equal(renderGraphSelectionByKind({ selection: null }, recordingRenderers([])), "");
  assert.equal(renderGraphSelectionByKind({ selection: { kind: "unknown" } }, recordingRenderers([])), "");
  assert.equal(renderGraphSelectionPanelViaDispatcher(
    { selection: { kind: "node", nodeId: "missing" } },
    recordingRenderers([]),
    { normalizeSelection: () => null }
  ), "");
});
