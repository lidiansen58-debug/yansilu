import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphRelationWorkflowController,
  graphNormalizeRelationWorkflowSelection,
  graphRelationWorkflowFormSelectionFromAction,
  graphRelationWorkflowIsolatedSelectionFromAction,
  graphRelationWorkflowRouteAfterAiConnect
} from "../../apps/web/src/graph-relation-workflow-controller.js";

function action(attrs = {}) {
  return {
    getAttribute(name) {
      return attrs[name] || "";
    }
  };
}

test("legacy isolated relation workflow no longer creates graph relationForm selections", () => {
  const route = graphRelationWorkflowIsolatedSelectionFromAction(action({
    "data-graph-select-isolated": "iso-key",
    "data-graph-isolated-note": "note-a"
  }));

  assert.equal(route.ok, false);
  assert.equal(route.reason, "legacy_relation_form_removed");
  assert.equal(route.noteId, "note-a");
  assert.equal(route.isolatedKey, "iso-key");
  assert.equal(route.selection, undefined);
});

test("legacy relation form route no longer creates graph relationForm selections", () => {
  const route = graphRelationWorkflowFormSelectionFromAction(
    action({
      "data-graph-relation-source": "note-a",
      "data-graph-target-note": "note-b"
    }),
    { currentSelection: { kind: "isolated", noteId: "note-a" } }
  );

  assert.equal(route.ok, false);
  assert.equal(route.reason, "legacy_relation_form_removed");
  assert.equal(route.noteId, "note-a");
  assert.equal(route.selection, undefined);
});

test("relation workflow route keeps isolated selection after AI connect when note is still unconnected", () => {
  const route = graphRelationWorkflowRouteAfterAiConnect({
    noteId: "note-a",
    previousSelection: null,
    edges: [{ fromNoteId: "other", toNoteId: "target", status: "confirmed" }]
  });

  assert.equal(route.graphSelectionKind, "isolated");
  assert.deepEqual(route.selection, { kind: "isolated", noteId: "note-a" });
});

test("relation workflow route uses node selection after AI connect for connected notes", () => {
  const route = graphRelationWorkflowRouteAfterAiConnect({
    noteId: "note-a",
    previousSelection: { kind: "node", nodeId: "note-a" },
    edges: [{ fromNoteId: "note-a", toNoteId: "target", status: "confirmed" }]
  });

  assert.equal(route.graphSelectionKind, "node");
  assert.deepEqual(route.selection, { kind: "node", nodeId: "note-a" });
});

test("relation workflow normalizes overlay selections against visible nodes", () => {
  const nodes = [{ id: "note-a" }, { id: "note-b" }];
  const resolveIsolatedSelection = () => ({
    isolatedKey: "iso-key",
    isolatedIndex: 2,
    noteId: "note-a",
    title: "Note A"
  });

  assert.deepEqual(graphNormalizeRelationWorkflowSelection(
    { kind: "isolated", noteId: "note-a" },
    { nodes, isolatedNotes: [{ noteId: "note-a" }], resolveIsolatedSelection }
  ), {
    kind: "isolated",
    isolatedKey: "iso-key",
    isolatedIndex: 2,
    noteId: "note-a",
    title: "Note A"
  });
  assert.equal(graphNormalizeRelationWorkflowSelection(
    { kind: "relationForm", noteId: "note-a", targetNoteId: "note-b", relationType: "Same_Topic", rationale: "Because", returnTo: "Isolated" },
    { nodes }
  ), null);
  assert.equal(graphNormalizeRelationWorkflowSelection({ kind: "isolatedComplete", noteId: "missing" }, { nodes }), null);
  assert.deepEqual(graphNormalizeRelationWorkflowSelection(
    { kind: "isolatedComplete", noteId: "note-a", saveResult: { targetTitle: "Note B" } },
    { nodes }
  ), {
    kind: "isolatedComplete",
    noteId: "note-a",
    saveResult: { targetTitle: "Note B" }
  });
});

test("relation workflow controller only exposes non-entry graph return helpers", () => {
  const graphState = { selection: { kind: "node", nodeId: "old" } };
  const controller = createGraphRelationWorkflowController({
    graphState
  });

  assert.equal("openIsolatedFromAction" in controller, false);
  assert.equal(typeof controller.startAiConnectForNote, "function");
  assert.equal(typeof controller.applyAiConnectRoute, "function");
  assert.deepEqual(graphState.selection, { kind: "node", nodeId: "old" });
});
