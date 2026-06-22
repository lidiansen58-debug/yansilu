import test from "node:test";
import assert from "node:assert/strict";

import {
  handleGraphFocusNoteStateChange,
  handleOpenNoteAiInboxStateChange,
  handleOpenNoteRelationsStateChange,
  handleRefreshGraphStateChange,
  handleSelectFolderStateChange
} from "../../apps/web/src/app-shell-state-navigation-actions.js";

function statusRecorder() {
  const calls = [];
  return {
    calls,
    setStatus(message, tone) {
      calls.push({ message, tone });
    }
  };
}

test("navigation actions refresh graph and surface warning on failure", async () => {
  const status = statusRecorder();
  const result = await handleRefreshGraphStateChange({}, {
    graphState: { error: "offline" },
    refreshDirectoryGraph: async () => false,
    setStatus: status.setStatus
  });

  assert.equal(result, false);
  assert.deepEqual(status.calls.at(-1), {
    message: "图谱刷新失败：offline",
    tone: "warn"
  });
});

test("navigation actions select graph folders through explorer context and refresh graph", async () => {
  const state = {
    module: "graph",
    selectedFolderId: "d1",
    browserRootId: "root"
  };
  const calls = [];
  const explorer = {
    restoreAutoCollapsedDisconnectedGroups: () => calls.push("restore-collapsed"),
    render: () => calls.push("explorer-render"),
    expandCurrentEditorNotePathInRoot: () => calls.push("expand-editor-path")
  };

  const result = await handleSelectFolderStateChange({ folderId: "d2" }, {
    state,
    explorer,
    applyExplorerSelectionContext: (context) => calls.push(["context", context]),
    expandGraphBrowserTree: () => calls.push("expand-graph-tree"),
    syncNotesForDirectory: async (folderId) => calls.push(["sync-notes", folderId]),
    refreshDirectoryGraph: async () => calls.push("refresh-graph"),
    renderAll: () => calls.push("render-all")
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ["context", { folderId: "d2", clearSelectedFile: true, expandFolder: true }],
    ["context", { clearSelectedFile: true, expandFolder: false }],
    "restore-collapsed",
    "expand-graph-tree",
    "explorer-render",
    ["sync-notes", "d1"],
    "refresh-graph",
    "render-all"
  ]);
});

test("navigation actions focus graph notes and collapse disconnected groups", () => {
  const status = statusRecorder();
  const calls = [];

  const result = handleGraphFocusNoteStateChange({ noteId: "n1" }, {
    state: { module: "graph", selectedFolderId: "d1" },
    graphOriginalScopeDirectoryId: "original-root",
    explorer: {
      collapseDisconnectedGroup: (id, options) => calls.push(["collapse", id, options])
    },
    applyExplorerSelectionContext: (context) => calls.push(["context", context]),
    setStatus: status.setStatus,
    renderAll: () => calls.push("render-all")
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ["context", { noteId: "n1", syncSearch: false, expandFolder: true }],
    ["collapse", "d1", { auto: true }],
    ["collapse", "original-root", { auto: true }],
    "render-all"
  ]);
  assert.equal(status.calls.at(-1).tone, "ok");
});

test("navigation actions open note relation editor with source fallback", () => {
  const status = statusRecorder();
  const calls = [];

  const result = handleOpenNoteRelationsStateChange({ noteId: "n1" }, {
    openNoteRelationEditor: (noteId, options) => {
      calls.push([noteId, options]);
      return true;
    },
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [["n1", { source: "explorer-browser" }]]);
  assert.equal(status.calls.at(-1).tone, "ok");
});

test("navigation actions open AI inbox scoped to the current note", async () => {
  const status = statusRecorder();
  const aiInboxState = {
    filters: { view: "all", kind: "relation" },
    detail: { id: "old" },
    selectedArtifactId: "old-artifact"
  };
  const calls = [];

  const result = await handleOpenNoteAiInboxStateChange({ noteId: "n1" }, {
    aiInboxState,
    normalizeAiInboxFilters: (filters) => ({ ...filters, normalized: true }),
    activateModule: (moduleId) => calls.push(["activate", moduleId]),
    openAiInboxModule: async () => calls.push("open-inbox"),
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.deepEqual(aiInboxState.filters, {
    view: "pending",
    kind: "relation",
    sourceNoteId: "n1",
    normalized: true
  });
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.deepEqual(calls, [["activate", "aiInbox"], "open-inbox"]);
  assert.equal(status.calls.at(-1).tone, "ok");
});
