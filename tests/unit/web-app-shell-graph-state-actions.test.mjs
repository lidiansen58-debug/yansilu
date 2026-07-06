import test from "node:test";
import assert from "node:assert/strict";

import {
  handleGraphAssociateNoteStateChange,
  handleRunNoteAiAnalysisStateChange
} from "../../apps/web/src/app-shell-graph-state-actions.js";

function statusRecorder() {
  const calls = [];
  return {
    calls,
    setStatus(message, tone) {
      calls.push({ message, tone });
    }
  };
}

test("graph state actions open the relation form directly in graph mode", async () => {
  const calls = [];
  const result = await handleGraphAssociateNoteStateChange({ noteId: "n1", source: "graph" }, {
    state: { module: "graph", selectedFolderId: "folder-1" },
    graphOriginalScopeDirectoryId: "original-root",
    explorer: {
      collapseDisconnectedGroup: (id, options) => calls.push(["collapse", id, options])
    },
    graphAssociateNoteRoute: (input) => {
      calls.push(["route", input]);
      return { kind: "graph-open-relation-form", noteId: input.noteId, relationType: "supports" };
    },
    graphNodeNeedsRelationWorkflowFromCurrentGraph: () => true,
    applyExplorerSelectionContext: (context) => calls.push(["context", context]),
    graphRelationWorkflowController: {
      openRelationFormFromAction: (payload) => calls.push(["relation-form", payload])
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ["route", { noteId: "n1", source: "graph", module: "graph", needsRelationWorkflow: true }],
    ["context", { noteId: "n1", syncSearch: false, expandFolder: true }],
    ["collapse", "folder-1", { auto: true }],
    ["collapse", "original-root", { auto: true }],
    ["relation-form", { noteId: "n1", relationType: "supports" }]
  ]);
});

test("graph state actions open isolated workflow when relation form is not needed", async () => {
  const status = statusRecorder();
  const calls = [];

  const result = await handleGraphAssociateNoteStateChange({ noteId: "n1" }, {
    state: { module: "graph", selectedFolderId: "folder-1" },
    graphAssociateNoteRoute: () => ({ kind: "graph-open-isolated", noteId: "n1", activeTab: "review" }),
    applyExplorerSelectionContext: () => {},
    setGraphIsolatedWorkflowActiveTab: (noteId, tab) => calls.push(["tab", noteId, tab]),
    openGraphSelection: (selection) => calls.push(["selection", selection]),
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ["tab", "n1", "ai"],
    ["selection", { kind: "relationForm", noteId: "n1", returnTo: "isolated" }]
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "已打开建联流程", tone: "ok" });
});

test("graph state actions open today organizer isolated note directly in the relation form", async () => {
  const status = statusRecorder();
  const calls = [];

  const result = await handleGraphAssociateNoteStateChange({ noteId: "n1", source: "today-organizing" }, {
    state: { module: "graph", selectedFolderId: "folder-1" },
    graphAssociateNoteRoute: () => ({ kind: "graph-open-isolated-workflow", noteId: "n1", activeTab: "ai" }),
    applyExplorerSelectionContext: (context) => calls.push(["context", context]),
    graphRelationWorkflowController: {
      openIsolatedFromAction: () => assert.fail("today organizer should not stop at isolated queue selection"),
      openRelationFormFromAction: () => assert.fail("today organizer should keep isolated return state")
    },
    setGraphIsolatedWorkflowActiveTab: (noteId, tab) => calls.push(["tab", noteId, tab]),
    openGraphSelection: (selection) => calls.push(["selection", selection]),
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ["context", { noteId: "n1", syncSearch: false, expandFolder: true }],
    ["tab", "n1", "manual"],
    ["selection", { kind: "relationForm", noteId: "n1", returnTo: "isolated" }]
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "已打开关联表单。选择一条相关笔记，写一句理由并保存。", tone: "ok" });
});

test("graph state actions route import result through the isolated relation flow", async () => {
  const status = statusRecorder();
  const calls = [];

  const result = await handleGraphAssociateNoteStateChange({ noteId: "n1", source: "import-result" }, {
    state: { module: "graph", selectedFolderId: "folder-1" },
    graphAssociateNoteRoute: () => ({ kind: "graph-open-isolated", noteId: "n1", activeTab: "ai" }),
    applyExplorerSelectionContext: () => {},
    graphRelationWorkflowController: {
      openIsolatedFromAction: (payload) => {
        calls.push(["isolated", payload]);
        return true;
      }
    },
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [["isolated", { noteId: "n1" }]]);
  assert.deepEqual(status.calls.at(-1), { message: "已打开建联流程。选择目标笔记，写一句理由并保存。", tone: "ok" });
});

test("graph state actions route non-graph associate actions through host state change", async () => {
  const calls = [];
  const result = await handleGraphAssociateNoteStateChange({ noteId: "n1", source: "browser" }, {
    state: { module: "explorer" },
    graphAssociateNoteRoute: () => ({ kind: "open-note-relations", noteId: "n1", source: "browser" }),
    applyExplorerSelectionContext: (context) => calls.push(["context", context]),
    handleStateChange: async (reason, payload) => {
      calls.push(["state", reason, payload]);
      return "opened";
    }
  });

  assert.equal(result, "opened");
  assert.deepEqual(calls, [
    ["context", { noteId: "n1", syncSearch: false, expandFolder: true }],
    ["state", "open-note-relations", { noteId: "n1", source: "browser" }]
  ]);
});

test("graph state actions run note AI analysis and open system messages for review artifacts", async () => {
  const status = statusRecorder();
  const aiInboxState = { filters: { kind: "all" }, detail: { id: "old" }, selectedArtifactId: "old" };
  const calls = [];
  const resultPayload = { reviewItems: { storedArtifactIds: ["a1", "a2"] } };

  const result = await handleRunNoteAiAnalysisStateChange({ noteId: "n1", relatedNoteIds: ["n2"] }, {
    state: { notes: [{ id: "n1", title: "Note One" }] },
    aiInboxState,
    analyzePermanentNote: async (noteId, payload) => {
      calls.push(["analyze", noteId, payload]);
      return resultPayload;
    },
    noteAnalysisSystemMessageForResult: (payload) => {
      calls.push(["message-payload", payload.noteTitle, payload.result]);
      return { id: "message-1" };
    },
    addSystemMessage: (message, options) => calls.push(["add-message", message, options]),
    normalizeAiInboxFilters: (filters) => ({ ...filters, normalized: true }),
    openSystemMessages: (options) => calls.push(["open-system", options]),
    setStatus: status.setStatus
  });

  assert.equal(result, resultPayload);
  assert.deepEqual(aiInboxState.filters, {
    kind: "all",
    view: "pending",
    sourceNoteId: "n1",
    normalized: true
  });
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.deepEqual(calls, [
    ["analyze", "n1", { relatedNoteIds: ["n2"], persistArtifacts: true }],
    ["message-payload", "Note One", resultPayload],
    ["add-message", { id: "message-1" }, { interrupt: true }],
    ["open-system", { latestOnly: true }]
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "已生成 2 条待审 AI 建议，已放入系统消息", tone: "ok" });
});

test("graph state actions keep AI artifacts in the current note when inbox opening is disabled", async () => {
  const status = statusRecorder();
  const calls = [];

  await handleRunNoteAiAnalysisStateChange({ noteId: "n1", openInbox: false, persistArtifacts: false }, {
    state: { notes: [] },
    aiInboxState: {},
    analyzePermanentNote: async (_noteId, payload) => {
      calls.push(["analyze", payload]);
      return { reviewItems: { artifacts: [{ id: "a1" }] } };
    },
    addSystemMessage: () => calls.push(["message"]),
    openSystemMessages: () => calls.push(["open-system"]),
    setStatus: status.setStatus
  });

  assert.deepEqual(calls, [
    ["analyze", { relatedNoteIds: [], persistArtifacts: false }]
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "已生成 1 条待审 AI 建议，可在当前笔记里处理", tone: "ok" });
});

test("graph state actions report no AI artifacts and analysis failures", async () => {
  const status = statusRecorder();
  const emptyResult = await handleRunNoteAiAnalysisStateChange({ noteId: "n1" }, {
    analyzePermanentNote: async () => ({ reviewItems: {} }),
    setStatus: status.setStatus
  });
  assert.deepEqual(emptyResult, { reviewItems: {} });
  assert.deepEqual(status.calls.at(-1), { message: "本地 AI 分析完成，暂时没有新的待审核建议", tone: "warn" });

  const failed = await handleRunNoteAiAnalysisStateChange({ noteId: "n1" }, {
    analyzePermanentNote: async () => {
      throw new Error("boom");
    },
    setStatus: status.setStatus
  });
  assert.equal(failed, false);
  assert.deepEqual(status.calls.at(-1), { message: "永久笔记 AI 分析失败：boom", tone: "bad" });
});
