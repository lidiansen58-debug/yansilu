import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphRelationSaveController
} from "../../apps/web/src/graph-relation-save-controller.js";

const confirmableRelationTypes = new Set(["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"]);

function createButton(attrs = {}) {
  return {
    disabled: false,
    textContent: "保存关系",
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
        { id: "source", title: "源笔记" },
        { id: "target", title: "目标笔记" }
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
  openRelationFormInSelection = () => {},
  nextIsolatedSelectionAfterSave = () => null
} = {}) {
  return createGraphRelationSaveController({
    graphState,
    getNotes: () => [
      { id: "source", title: "源笔记" },
      { id: "target", title: "目标笔记" }
    ],
    confirmableRelationTypes,
    rationaleIsActionable: (value = "") => String(value || "").trim().length > 8,
    createNoteRelation,
    refreshDirectoryGraph,
    renderGraphPanel,
    setStatus,
    graphNodeTitle: (nodeMap, id, fallback) => nodeMap.get(id)?.title || fallback,
    relationTypeLabel: (type) => ({ supports: "支持", bridges: "桥接" })[type] || type,
    clearIsolatedRelationDraft,
    openGraphSelection,
    openRelationFormInSelection,
    nextIsolatedSelectionAfterSave
  });
}

test("graph relation save controller refreshes graph and keeps isolated completion selected after saving", async () => {
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
    renderGraphPanel: () => calls.push(["render", { ...graphState.selection }]),
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
    rationale: "源笔记能够支持目标笔记，因为它补足了关键依据。",
    insightQuestion: "如何继续？",
    button: createButton()
  });

  assert.equal(saved, true);
  assert.deepEqual(savedPayload, {
    noteId: "source",
    payload: {
      toNoteId: "target",
      relationType: "supports",
      rationale: "源笔记能够支持目标笔记，因为它补足了关键依据。",
      insightQuestion: "如何继续？",
      createdBy: "user",
      status: "confirmed"
    }
  });
  assert.equal(graphState.selection.kind, "isolatedComplete");
  assert.equal(graphState.selection.noteId, "source");
  assert.equal(graphState.selection.saveResult.targetTitle, "目标笔记");
  assert.equal(graphState.isolatedRelationDraftByNoteId.source, undefined);
  assert.equal(graphState.isolatedRelationSaveResultByNoteId.source.relationLabel, "支持");
  assert.deepEqual(calls.map((call) => call[0]), ["clearDraft", "refresh", "render", "status"]);
  assert.equal(calls[1][1].kind, "isolatedComplete");
  assert.equal(calls[2][1].kind, "isolatedComplete");
  assert.deepEqual(calls[3].slice(1), ["关系已保存，当前笔记已退出未关联状态。", "ok"]);
});

test("graph relation save controller opens the next isolated note after saving", async () => {
  const graphState = graphStateFixture();
  const calls = [];
  const controller = baseController({
    graphState,
    refreshDirectoryGraph: async () => calls.push(["refresh", { ...graphState.selection }]),
    nextIsolatedSelectionAfterSave: (savedNoteId) => {
      calls.push(["next", savedNoteId]);
      return { kind: "isolated", noteId: "next", isolatedKey: "next", title: "下一条笔记", source: "after-save" };
    },
    openGraphSelection: (selection) => {
      calls.push(["open", selection]);
      graphState.selection = selection;
    },
    setStatus: (text, cls) => calls.push(["status", text, cls])
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "源笔记能够支持目标笔记，因为它补足了关键依据。"
  });

  assert.equal(saved, true);
  assert.deepEqual(graphState.selection, { kind: "relationForm", noteId: "next", isolatedKey: "next", title: "下一条笔记", source: "after-save", returnTo: "isolated" });
  assert.deepEqual(calls.map((call) => call[0]), ["refresh", "next", "open", "status"]);
  assert.equal(calls[0][1].kind, "isolatedComplete");
  assert.deepEqual(calls[1], ["next", "source"]);
  assert.deepEqual(calls[3].slice(1), ["关系已保存，当前笔记已退出未关联状态；已进入下一条。", "ok"]);
});

test("graph relation save controller can reopen the graph selection through the unified entry", async () => {
  const graphState = graphStateFixture();
  const calls = [];
  const controller = baseController({
    graphState,
    refreshDirectoryGraph: async () => calls.push(["refresh"]),
    openGraphSelection: (selection) => {
      calls.push(["open", selection]);
      graphState.selection = selection;
    }
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "源笔记能够支持目标笔记，因为它补足了关键依据。",
    button: createButton()
  });

  assert.equal(saved, true);
  assert.equal(calls[1][0], "open");
  assert.equal(calls[1][1].kind, "isolatedComplete");
  assert.equal(calls[1][1].saveResult.targetTitle, "目标笔记");
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
    rationale: "源笔记能够支持目标笔记，因为它补足了关键依据。",
    button
  });

  assert.equal(saved, false);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "保存关系");
  assert.deepEqual(statuses, [["保存关系失败：network down", "bad"]]);
});

test("graph relation save controller opens the relation form when a candidate has no usable rationale", async () => {
  const calls = [];
  const button = createButton({
    "data-open-note": "source",
    "data-graph-target-note": "target",
    "data-graph-relation-type": "bridges",
    "data-graph-rationale-draft": "太短",
    "data-graph-insight-question-draft": "下一步？"
  });
  const controller = baseController({
    openRelationFormInSelection: (targetButton) => calls.push(["openForm", targetButton === button]),
    setStatus: (text, cls) => calls.push(["status", text, cls])
  });

  const saved = await controller.saveCandidateRelation(button);

  assert.equal(saved, false);
  assert.deepEqual(calls, [
    ["openForm", true],
    ["status", "请先补一句“源笔记”和“目标笔记”为什么能建立桥接", "warn"]
  ]);
});

test("graph relation save controller records existing relations without leaving the isolated result flow", async () => {
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
    rationale: "源笔记能够支持目标笔记，因为它补足了关键依据。"
  });

  assert.equal(saved, true);
  assert.equal(graphState.isolatedRelationSaveResultByNoteId.source.created, false);
  assert.equal(graphState.selection.kind, "isolatedComplete");
  assert.equal(graphState.selection.saveResult.created, false);
  assert.deepEqual(statuses, [["这条关系已经存在，当前笔记已退出未关联状态。", "ok"]]);
});
