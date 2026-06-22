import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAppShellAiWritingStateChangeDeps
} from "../../apps/web/src/app-shell-ai-writing-state-change-deps.js";
import {
  buildAppShellFileStateChangeDeps
} from "../../apps/web/src/app-shell-file-state-change-deps.js";
import {
  buildAppShellGraphStateChangeDeps
} from "../../apps/web/src/app-shell-graph-state-change-deps.js";
import {
  buildAppShellNoteStateChangeDeps
} from "../../apps/web/src/app-shell-note-state-change-deps.js";

test("app shell graph state-change deps keeps graph and navigation actions together", () => {
  const host = {
    GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID: "original-root",
    state: { module: "graph" },
    explorer: { id: "explorer" },
    graphState: { loading: false },
    graphRelationWorkflowController: { id: "workflow" },
    graphAssociateNoteRoute: () => ({ kind: "graph-open-isolated" }),
    graphNodeNeedsRelationWorkflowFromCurrentGraph: () => true,
    applyExplorerSelectionContext: () => {},
    setGraphIsolatedWorkflowActiveTab: () => {},
    openGraphSelection: () => {},
    openNoteRelationEditor: () => true,
    refreshDirectoryGraph: async () => true,
    setStatus: () => {},
    renderAll: () => {},
    handleStateChange: async () => true
  };

  const deps = buildAppShellGraphStateChangeDeps(host);

  assert.equal(deps.refreshGraph.graphState, host.graphState);
  assert.equal(deps.graphFocusNote.graphOriginalScopeDirectoryId, "original-root");
  assert.equal(deps.graphAssociateNote.graphRelationWorkflowController, host.graphRelationWorkflowController);
  assert.equal(deps.graphAssociateNote.openGraphSelection, host.openGraphSelection);
  assert.equal(deps.openNoteRelations.openNoteRelationEditor, host.openNoteRelationEditor);
  assert.equal("saveNote" in deps, false);
});

test("app shell note state-change deps keeps note creation distillation and save actions together", () => {
  const host = {
    state: { notes: [] },
    editor: { id: "editor" },
    createPrimaryOriginalNote: async () => ({}),
    createNoteInSelectedFolder: async () => ({}),
    createNote: async () => null,
    updateNote: async () => null,
    updatePermanentNoteDistillation: async () => null,
    confirmPermanentNoteDistillation: async () => null,
    mapNoteItem: (item) => item,
    renderAll: () => {},
    renderDistillationPanel: () => {},
    setStatus: () => {}
  };

  const deps = buildAppShellNoteStateChangeDeps(host);

  assert.equal(deps.createPrimaryNote.createPrimaryOriginalNote, host.createPrimaryOriginalNote);
  assert.equal(deps.createNoteInSelectedFolder.editor, host.editor);
  assert.equal(deps.recordOriginalFromNote.createNote, host.createNote);
  assert.equal(deps.saveNoteDistillation.updatePermanentNoteDistillation, host.updatePermanentNoteDistillation);
  assert.equal(deps.confirmNoteDistillation.confirmPermanentNoteDistillation, host.confirmPermanentNoteDistillation);
  assert.equal(deps.saveNote.updateNote, host.updateNote);
  assert.equal("directoryMove" in deps, false);
});

test("app shell AI writing state-change deps keeps inbox analysis and writing route actions together", () => {
  const host = {
    aiInboxState: { filters: {} },
    analyzePermanentNote: async () => null,
    noteAnalysisSystemMessageForResult: () => ({}),
    addSystemMessage: () => {},
    normalizeAiInboxFilters: (filters) => filters,
    openSystemMessages: () => {},
    activateModule: () => {},
    openAiInboxModule: async () => {},
    openWritingModule: async () => {},
    continueWritingEntry: async () => true,
    continueWritingProjectEntry: async () => true,
    createWritingProjectFromCurrentBasket: async () => true,
    noteMainPathWritingContinuationEntry: () => null,
    writingCenterContinuationStatusMessage: () => "",
    writingCenterContinuationFailureMessage: () => "",
    windowRef: { id: "window" },
    setStatus: () => {}
  };

  const deps = buildAppShellAiWritingStateChangeDeps(host);

  assert.equal(deps.runNoteAiAnalysis.aiInboxState, host.aiInboxState);
  assert.equal(deps.runNoteAiAnalysis.analyzePermanentNote, host.analyzePermanentNote);
  assert.equal(deps.openNoteAiInbox.openAiInboxModule, host.openAiInboxModule);
  assert.equal(deps.openNoteMainRoute.windowRef, host.windowRef);
  assert.equal(deps.openNoteMainRoute.openWritingModule, host.openWritingModule);
  assert.equal("graphAssociateNote" in deps, false);
});

test("app shell file state-change deps keeps note and directory filesystem actions together", () => {
  const host = {
    state: { directories: [] },
    moveNote: async () => null,
    moveNoteInClientState: () => {},
    deleteNote: async () => null,
    removeNoteFromClientState: () => {},
    updateDirectory: async () => null,
    deleteDirectory: async () => null,
    syncDirectoriesFromApi: async () => {},
    syncLoadedNotesForDirectories: async () => {},
    setStatus: () => {},
    renderAll: () => {}
  };

  const deps = buildAppShellFileStateChangeDeps(host);

  assert.equal(deps.noteMove.moveNoteInClientState, host.moveNoteInClientState);
  assert.equal(deps.noteDelete.removeNoteFromClientState, host.removeNoteFromClientState);
  assert.equal(deps.directoryUpdate.syncLoadedNotesForDirectories, host.syncLoadedNotesForDirectories);
  assert.equal(deps.directoryDelete.deleteDirectory, host.deleteDirectory);
  assert.equal("runNoteAiAnalysis" in deps, false);
});
