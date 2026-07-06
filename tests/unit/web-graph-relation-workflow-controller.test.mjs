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

test("relation workflow route opens isolated organizing from queue actions", () => {
  const route = graphRelationWorkflowIsolatedSelectionFromAction(action({
    "data-graph-select-isolated": "iso-key",
    "data-graph-isolated-note": "note-a"
  }));

  assert.equal(route.ok, true);
  assert.equal(route.workflowTab, "manual");
  assert.deepEqual(route.selection, { kind: "relationForm", returnTo: "isolated", isolatedKey: "iso-key", noteId: "note-a" });
});

test("relation workflow route opens relation form and remembers isolated return", () => {
  const route = graphRelationWorkflowFormSelectionFromAction(
    action({
      "data-graph-relation-source": "note-a",
      "data-graph-target-note": "note-b",
      "data-graph-relation-type": " Bridges ",
      "data-graph-rationale-draft": "已有推荐理由。"
    }),
    { currentSelection: { kind: "isolated", noteId: "note-a" } }
  );

  assert.equal(route.ok, true);
  assert.equal(route.workflowTab, "manual");
  assert.equal(route.statusText, "已在当前建联流程中带入目标笔记");
  assert.deepEqual({ ...route.selection, entryRoute: undefined }, {
    kind: "relationForm",
    noteId: "note-a",
    targetNoteId: "note-b",
    relationType: "bridges",
    rationale: "已有推荐理由。",
    returnTo: "isolated",
    entryRoute: undefined
  });
  assert.equal(route.selection.entryRoute.source, "graph-node");
  assert.equal(route.selection.entryRoute.returnTo, "graph");
});

test("relation workflow route preserves isolated return from an active relation form", () => {
  const route = graphRelationWorkflowFormSelectionFromAction(
    action({
      "data-graph-relation-source": "note-a",
      "data-graph-target-note": "note-b"
    }),
    { currentSelection: { kind: "relationForm", noteId: "note-a", returnTo: "isolated" } }
  );

  assert.equal(route.ok, true);
  assert.equal(route.selection.returnTo, "isolated");
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
  assert.deepEqual(graphNormalizeRelationWorkflowSelection(
    { kind: "relationForm", noteId: "note-a", targetNoteId: "note-b", relationType: "Same_Topic", rationale: "Because", returnTo: "Isolated" },
    { nodes }
  ), {
    kind: "relationForm",
    noteId: "note-a",
    targetNoteId: "note-b",
    relationType: "same_topic",
    rationale: "Because",
    returnTo: "isolated",
    entryRoute: null
  });
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

test("relation workflow controller mutates graph state only through route methods", () => {
  const graphState = { selection: { kind: "isolated", noteId: "note-a" } };
  const calls = [];
  const controller = createGraphRelationWorkflowController({
    graphState,
    setWorkflowActiveTab: (noteId, tab) => calls.push(["tab", noteId, tab]),
    openGraphSelection: (selection) => {
      graphState.selection = selection;
      calls.push(["open", selection]);
    },
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (text, cls) => calls.push(["status", text, cls])
  });

  assert.equal(controller.openRelationFormFromAction(action({
    "data-open-note": "note-a",
    "data-graph-target-note": "note-b"
  })), true);

  assert.deepEqual({ ...graphState.selection, entryRoute: undefined }, {
    kind: "relationForm",
    noteId: "note-a",
    targetNoteId: "note-b",
    relationType: "associated_with",
    rationale: "",
    returnTo: "isolated",
    entryRoute: undefined
  });
  assert.deepEqual(calls.map((call) => call[0]), ["tab", "open", "status"]);
});

test("relation workflow controller opens isolated flows through the graph selection hook", () => {
  const graphState = { selection: { kind: "node", nodeId: "old" } };
  const calls = [];
  const controller = createGraphRelationWorkflowController({
    graphState,
    setWorkflowActiveTab: (noteId, tab) => calls.push(["tab", noteId, tab]),
    openGraphSelection: (selection) => {
      graphState.selection = selection;
      calls.push(["open", selection]);
    },
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (text, cls) => calls.push(["status", text, cls])
  });

  assert.equal(controller.openIsolatedFromAction({ noteId: "note-a" }), true);
  assert.deepEqual(graphState.selection, { kind: "relationForm", returnTo: "isolated", noteId: "note-a" });
  assert.deepEqual(calls.map((call) => call[0]), ["tab", "open", "status"]);
});
