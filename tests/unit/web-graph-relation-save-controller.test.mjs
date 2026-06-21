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

function baseController({
  graphState = {
    item: {
      nodes: [
        { id: "source", title: "源笔记" },
        { id: "target", title: "目标笔记" }
      ]
    },
    selection: { kind: "isolated", noteId: "source" }
  },
  createNoteRelation = async () => ({ id: "rel-1", created: true }),
  refreshDirectoryGraph = async () => {},
  renderGraphPanel = () => {},
  setStatus = () => {},
  clearIsolatedRelationDraft = () => {},
  openRelationFormInSelection = () => {}
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
    openRelationFormInSelection
  });
}

test("graph relation save controller refreshes graph and keeps isolated completion selected after saving", async () => {
  const graphState = {
    item: {
      nodes: [
        { id: "source", title: "源笔记" },
        { id: "target", title: "目标笔记" }
      ]
    },
    selection: { kind: "isolated", noteId: "source" },
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
    refreshDirectoryGraph: async () => {
      calls.push(["refresh", { ...graphState.selection }]);
    },
    renderGraphPanel: () => {
      calls.push(["render", { ...graphState.selection }]);
    },
    setStatus: (text, cls) => {
      calls.push(["status", text, cls]);
    },
    clearIsolatedRelationDraft: (noteId) => {
      calls.push(["clearDraft", noteId]);
      delete graphState.isolatedRelationDraftByNoteId[noteId];
    }
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: " source ",
    targetNoteId: " target ",
    relationType: " Supports ",
    rationale: "源笔记能支持目标笔记，因为它补足了关键依据。",
    insightQuestion: "如何继续？",
    button: createButton()
  });

  assert.equal(saved, true);
  assert.deepEqual(savedPayload, {
    noteId: "source",
    payload: {
      toNoteId: "target",
      relationType: "supports",
      rationale: "源笔记能支持目标笔记，因为它补足了关键依据。",
      insightQuestion: "如何继续？",
      createdBy: "user",
      status: "confirmed"
    }
  });
  assert.deepEqual(graphState.selection, { kind: "isolatedComplete", noteId: "source" });
  assert.equal(graphState.isolatedRelationDraftByNoteId.source, undefined);
  assert.deepEqual(graphState.isolatedRelationSaveResultByNoteId.source, {
    targetNoteId: "target",
    targetTitle: "目标笔记",
    relationType: "supports",
    relationLabel: "支持",
    created: true,
    savedAt: graphState.isolatedRelationSaveResultByNoteId.source.savedAt
  });
  assert.deepEqual(calls.map((call) => call[0]), ["clearDraft", "refresh", "render", "status"]);
  assert.deepEqual(calls[1][1], { kind: "isolatedComplete", noteId: "source" });
  assert.deepEqual(calls[2][1], { kind: "isolatedComplete", noteId: "source" });
  assert.deepEqual(calls[3].slice(1), ["关系已保存，当前笔记已接入关系网", "ok"]);
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
    rationale: "源笔记能支持目标笔记，因为它补足了关键依据。",
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
    openRelationFormInSelection: (targetButton) => {
      calls.push(["openForm", targetButton === button]);
    },
    setStatus: (text, cls) => {
      calls.push(["status", text, cls]);
    }
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
  const graphState = {
    item: { nodes: [{ id: "source", title: "源笔记" }, { id: "target", title: "目标笔记" }] },
    selection: { kind: "relationForm", returnTo: "isolated", noteId: "source" }
  };
  const controller = baseController({
    graphState,
    createNoteRelation: async () => ({ id: "rel-1", created: false }),
    setStatus: (text, cls) => statuses.push([text, cls])
  });

  const saved = await controller.saveConfirmedRelation({
    noteId: "source",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "源笔记能支持目标笔记，因为它补足了关键依据。"
  });

  assert.equal(saved, true);
  assert.equal(graphState.isolatedRelationSaveResultByNoteId.source.created, false);
  assert.deepEqual(graphState.selection, { kind: "isolatedComplete", noteId: "source" });
  assert.deepEqual(statuses, [["这条关系已经存在，已保留在当前处理结果", "ok"]]);
});
