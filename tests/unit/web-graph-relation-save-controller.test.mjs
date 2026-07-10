import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphRelationSaveController
} from "../../apps/web/src/graph-relation-save-controller.js";

const confirmableRelationTypes = new Set([
  "supports",
  "contradicts",
  "qualifies",
  "bridges",
  "same_topic",
  "associated_with"
]);

function createButton(attrs = {}) {
  return {
    disabled: false,
    textContent: "Save relation",
    closest(selector) {
      return selector === ".graph-selection-panel.is-isolated" ? { matches: true } : null;
    },
    getAttribute(name) {
      return attrs[name] || "";
    }
  };
}

function graphStateFixture(selection = { kind: "isolated", noteId: "source" }) {
  return {
    item: {
      nodes: [
        { id: "source", title: "Source note" },
        { id: "target", title: "Target note" }
      ]
    },
    selection
  };
}

function baseController({
  graphState = graphStateFixture(),
  createNoteRelation = async () => ({ id: "rel-1", created: true }),
  refreshDirectoryGraph = async () => {},
  renderGraphPanel = () => {},
  setStatus = () => {},
  clearIsolatedRelationDraft = () => {},
  openGraphSelection = null,
  openRelationComposerFromGraphAction = () => {},
  nextIsolatedSelectionAfterSave = () => null,
  setGraphRelationTypeFilter = () => ""
} = {}) {
  return createGraphRelationSaveController({
    graphState,
    getNotes: () => [
      { id: "source", title: "Source note" },
      { id: "target", title: "Target note" }
    ],
    confirmableRelationTypes,
    rationaleIsActionable: (value = "") => String(value || "").trim().length > 8,
    createNoteRelation,
    refreshDirectoryGraph,
    renderGraphPanel,
    setStatus,
    graphNodeTitle: (nodeMap, id, fallback) => nodeMap.get(id)?.title || fallback,
    relationTypeLabel: (type) => ({ supports: "Supports", bridges: "Bridges" })[type] || type,
    clearIsolatedRelationDraft,
    openGraphSelection,
    openRelationComposerFromGraphAction,
    nextIsolatedSelectionAfterSave,
    setGraphRelationTypeFilter
  });
}

test("graph relation save controller refreshes graph and closes the relation overlay after saving", async () => {
  const graphState = {
    ...graphStateFixture(),
    isolatedRelationDraftByNoteId: { source: { rationale: "draft" } }
  };
  const calls = [];
  let savedPayload = null;
  const controller = baseController({
    graphState,
    createNoteRelation: async (noteId, payload) => {
      savedPayload = { noteId, payload };
      return { id: "rel-1", created: true };
    },
    refreshDirectoryGraph: async () => calls.push(["refresh", { ...graphState.selection }]),
    renderGraphPanel: () => calls.push(["render", graphState.selection ? { ...graphState.selection } : null]),
    setStatus: (text, cls) => calls.push(["status", text, cls]),
    clearIsolatedRelationDraft: (noteId) => {
      calls.push(["clearDraft", noteId]);
      delete graphState.isolatedRelationDraftByNoteId[noteId];
    }
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: " source ",
    targetNoteId: " target ",
    relationType: " Supports ",
    rationale: "The source note supports the target note with concrete evidence.",
    insightQuestion: "What follows?",
    button: createButton()
  });

  assert.equal(saved, true);
  assert.deepEqual(savedPayload, {
    noteId: "source",
    payload: {
      toNoteId: "target",
      relationType: "supports",
      rationale: "The source note supports the target note with concrete evidence.",
      insightQuestion: "What follows?",
      createdBy: "user",
      status: "confirmed"
    }
  });
  assert.equal(graphState.selection, null);
  assert.equal(graphState.isolatedRelationSaveResultByNoteId.source.targetNoteId, "target");
  assert.equal(graphState.isolatedRelationDraftByNoteId.source, undefined);
  assert.equal(graphState.isolatedRelationSaveResultByNoteId.source.relationLabel, "Supports");
  assert.deepEqual(calls.map((call) => call[0]), ["clearDraft", "refresh", "render", "status"]);
  assert.equal(calls[1][1].kind, "isolatedComplete");
  assert.equal(calls[2][1], null);
  assert.equal(calls[3][2], "ok");
});

test("graph relation save controller does not auto-open the next isolated note after saving", async () => {
  const graphState = graphStateFixture();
  const calls = [];
  const controller = baseController({
    graphState,
    refreshDirectoryGraph: async () => calls.push(["refresh", { ...graphState.selection }]),
    nextIsolatedSelectionAfterSave: (savedNoteId) => {
      calls.push(["next", savedNoteId]);
      return { kind: "isolated", noteId: "next", isolatedKey: "next", title: "Next note", source: "after-save" };
    },
    openGraphSelection: (selection) => {
      calls.push(["open", selection]);
      graphState.selection = selection;
    },
    renderGraphPanel: () => calls.push(["render", graphState.selection]),
    setStatus: (text, cls) => calls.push(["status", text, cls])
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "The source note supports the target note with concrete evidence."
  });

  assert.equal(saved, true);
  assert.equal(graphState.selection, null);
  assert.deepEqual(calls.map((call) => call[0]), ["refresh", "render", "status"]);
  assert.equal(calls[0][1].kind, "isolatedComplete");
  assert.equal(calls[1][1], null);
  assert.equal(calls[2][2], "ok");
});

test("graph relation save controller closes selection instead of reopening the graph selection", async () => {
  const graphState = graphStateFixture();
  const calls = [];
  const controller = baseController({
    graphState,
    refreshDirectoryGraph: async () => calls.push(["refresh"]),
    openGraphSelection: (selection) => {
      calls.push(["open", selection]);
      graphState.selection = selection;
    },
    renderGraphPanel: () => calls.push(["render", graphState.selection])
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "The source note supports the target note with concrete evidence.",
    button: createButton()
  });

  assert.equal(saved, true);
  assert.deepEqual(calls.map((call) => call[0]), ["refresh", "render"]);
  assert.equal(calls[1][1], null);
  assert.equal(graphState.selection, null);
});

test("graph relation save controller restores the save button after create failure", async () => {
  const statuses = [];
  const button = createButton();
  const controller = baseController({
    createNoteRelation: async () => {
      throw new Error("network down");
    },
    setStatus: (text, cls) => statuses.push([text, cls])
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "The source note supports the target note with concrete evidence.",
    button
  });

  assert.equal(saved, false);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Save relation");
  assert.equal(statuses[0][1], "bad");
  assert.match(statuses[0][0], /network down/);
});

test("graph relation save controller opens the shared composer when a candidate has no usable rationale", async () => {
  const calls = [];
  const button = createButton({
    "data-open-note": "source",
    "data-graph-target-note": "target",
    "data-graph-relation-type": "bridges",
    "data-graph-rationale-draft": "short",
    "data-graph-insight-question-draft": "Next?"
  });
  const controller = baseController({
    openRelationComposerFromGraphAction: (targetButton) => calls.push(["composer", targetButton === button]),
    setStatus: (text, cls) => calls.push(["status", text, cls])
  });

  const saved = await controller.saveCandidateRelation(button);

  assert.equal(saved, false);
  assert.deepEqual(calls.map((call) => call[0]), ["composer", "status"]);
  assert.equal(calls[0][1], true);
  assert.equal(calls[1][2], "warn");
});

test("graph relation save controller records existing relations and closes the isolated flow", async () => {
  const statuses = [];
  const graphState = graphStateFixture({ kind: "relationForm", returnTo: "isolated", noteId: "source" });
  const controller = baseController({
    graphState,
    createNoteRelation: async () => ({ id: "rel-1", created: false }),
    setStatus: (text, cls) => statuses.push([text, cls])
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "The source note supports the target note with concrete evidence."
  });

  assert.equal(saved, true);
  assert.equal(graphState.isolatedRelationSaveResultByNoteId.source.created, false);
  assert.equal(graphState.selection, null);
  assert.equal(statuses[0][1], "ok");
});

test("graph relation save controller switches ordinary relation saves to all relations", async () => {
  const calls = [];
  const controller = baseController({
    setGraphRelationTypeFilter: (value, options) => calls.push(["filter", value, options]),
    setStatus: (text, cls) => calls.push(["status", text, cls])
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "associated_with",
    rationale: "The source and target notes discuss the same user workflow."
  });

  assert.equal(saved, true);
  assert.deepEqual(calls[0], ["filter", "all", { source: "relation-save" }]);
  assert.deepEqual(calls.find((call) => call[0] === "filter" && call[2]?.afterRefresh), ["filter", "all", { source: "relation-save", afterRefresh: true }]);
  assert.equal(calls.at(-1)[2], "ok");
});
