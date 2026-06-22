import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAppShellStateChangeDeps
} from "../../apps/web/src/app-shell-state-change-deps.js";

test("app shell state change deps groups graph actions from host wiring", () => {
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
    refreshDirectoryGraph: async () => true,
    setStatus: () => {},
    renderAll: () => {},
    handleStateChange: async () => true
  };

  const deps = buildAppShellStateChangeDeps(host);

  assert.equal(deps.refreshGraph.graphState, host.graphState);
  assert.equal(deps.graphFocusNote.graphOriginalScopeDirectoryId, "original-root");
  assert.equal(deps.graphAssociateNote.graphRelationWorkflowController, host.graphRelationWorkflowController);
  assert.equal(deps.graphAssociateNote.graphAssociateNoteRoute, host.graphAssociateNoteRoute);
  assert.equal(deps.graphAssociateNote.openGraphSelection, host.openGraphSelection);
  assert.equal(deps.graphAssociateNote.handleStateChange, host.handleStateChange);
});

test("app shell state change deps groups note, distillation, and file actions", () => {
  const host = {
    state: { notes: [] },
    editor: { id: "editor" },
    createPrimaryOriginalNote: async () => ({}),
    createNoteInSelectedFolder: async () => ({}),
    createNote: async () => null,
    updateNote: async () => null,
    updatePermanentNoteDistillation: async () => null,
    confirmPermanentNoteDistillation: async () => null,
    moveNote: async () => null,
    moveNoteInClientState: () => {},
    deleteNote: async () => null,
    removeNoteFromClientState: () => {},
    updateDirectory: async () => null,
    deleteDirectory: async () => null,
    syncDirectoriesFromApi: async () => {},
    syncLoadedNotesForDirectories: async () => {},
    renderAll: () => {},
    renderDistillationPanel: () => {},
    setStatus: () => {}
  };

  const deps = buildAppShellStateChangeDeps(host);

  assert.equal(deps.createPrimaryNote.createPrimaryOriginalNote, host.createPrimaryOriginalNote);
  assert.equal(deps.createNoteInSelectedFolder.editor, host.editor);
  assert.equal(deps.recordOriginalFromNote.createNote, host.createNote);
  assert.equal(deps.saveNoteDistillation.updatePermanentNoteDistillation, host.updatePermanentNoteDistillation);
  assert.equal(deps.confirmNoteDistillation.confirmPermanentNoteDistillation, host.confirmPermanentNoteDistillation);
  assert.equal(deps.noteMove.moveNoteInClientState, host.moveNoteInClientState);
  assert.equal(deps.noteDelete.removeNoteFromClientState, host.removeNoteFromClientState);
  assert.equal(deps.directoryUpdate.syncLoadedNotesForDirectories, host.syncLoadedNotesForDirectories);
});

test("app shell state change deps groups AI inbox and writing route dependencies", () => {
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

  const deps = buildAppShellStateChangeDeps(host);

  assert.equal(deps.runNoteAiAnalysis.aiInboxState, host.aiInboxState);
  assert.equal(deps.runNoteAiAnalysis.analyzePermanentNote, host.analyzePermanentNote);
  assert.equal(deps.openNoteAiInbox.openAiInboxModule, host.openAiInboxModule);
  assert.equal(deps.openNoteMainRoute.windowRef, host.windowRef);
  assert.equal(deps.openNoteMainRoute.openWritingModule, host.openWritingModule);
  assert.equal(deps.openNoteMainRoute.continueWritingProjectEntry, host.continueWritingProjectEntry);
});
