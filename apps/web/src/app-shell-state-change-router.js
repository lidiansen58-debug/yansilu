import {
  handleConfirmNoteDistillationStateChange,
  handleSaveNoteDistillationStateChange
} from "./app-shell-distillation-state-actions.js";
import {
  handleGraphAssociateNoteStateChange,
  handleRunNoteAiAnalysisStateChange
} from "./app-shell-graph-state-actions.js";
import {
  handleDirectoryDeleteStateChange,
  handleDirectoryMoveStateChange,
  handleDirectoryUpdateStateChange,
  handleNoteDeleteStateChange,
  handleNoteMoveStateChange
} from "./app-shell-state-file-actions.js";
import {
  handleCreateNoteInSelectedFolderStateChange,
  handleCreatePrimaryNoteStateChange,
  handleRecordOriginalFromNoteStateChange
} from "./app-shell-state-note-creation-actions.js";
import {
  handleSaveNoteStateChange
} from "./app-shell-save-note-state-actions.js";
import {
  handleOpenNoteMainRouteStateChange
} from "./app-shell-note-main-route-actions.js";
import {
  handleGraphFocusNoteStateChange,
  handleOpenNoteAiInboxStateChange,
  handleOpenNoteRelationsStateChange,
  handleRefreshGraphStateChange,
  handleSelectFolderStateChange
} from "./app-shell-state-navigation-actions.js";
import {
  runConfirmedSmartNotesDemoImport
} from "./smart-notes-demo-import-flow.js";

export async function routeAppShellStateChange(reason, payload = {}, deps = {}) {
  if (reason === "refresh-graph") {
    return handleRefreshGraphStateChange(payload, deps.refreshGraph);
  }

  if (reason === "create-primary-note") {
    return handleCreatePrimaryNoteStateChange(payload, deps.createPrimaryNote);
  }

  if (reason === "create-note-in-selected-folder") {
    return handleCreateNoteInSelectedFolderStateChange(payload, deps.createNoteInSelectedFolder);
  }

  if (reason === "open-import") {
    deps.openImportModule?.(payload);
    return true;
  }

  if (reason === "seed-smart-notes-demo") {
    return runConfirmedSmartNotesDemoImport(payload, {
      confirm: deps.confirm,
      importSmartNotesDemo: deps.importSmartNotesDemo,
      setStatus: deps.setStatus
    });
  }

  if (reason === "record-original-from-note" || reason === "create-original-from-literature") {
    return handleRecordOriginalFromNoteStateChange(payload, deps.recordOriginalFromNote);
  }

  if (reason === "select-folder") {
    return handleSelectFolderStateChange(payload, deps.selectFolder);
  }

  if (reason === "graph-focus-note") {
    return handleGraphFocusNoteStateChange(payload, deps.graphFocusNote);
  }

  if (reason === "graph-associate-note") {
    return handleGraphAssociateNoteStateChange(payload, deps.graphAssociateNote);
  }

  if (reason === "open-note-relations") {
    return handleOpenNoteRelationsStateChange(payload, deps.openNoteRelations);
  }

  if (reason === "run-note-ai-analysis") {
    return handleRunNoteAiAnalysisStateChange(payload, deps.runNoteAiAnalysis);
  }

  if (reason === "open-note-ai-inbox") {
    return handleOpenNoteAiInboxStateChange(payload, deps.openNoteAiInbox);
  }

  if (reason === "open-note-main-route") {
    return handleOpenNoteMainRouteStateChange(payload, deps.openNoteMainRoute);
  }

  if (reason === "save-note-distillation") {
    return handleSaveNoteDistillationStateChange(payload, deps.saveNoteDistillation);
  }

  if (reason === "confirm-note-distillation") {
    return handleConfirmNoteDistillationStateChange(payload, deps.confirmNoteDistillation);
  }

  if (reason === "save-note") {
    return handleSaveNoteStateChange(payload, deps.saveNote);
  }

  if (reason === "note-move") {
    return handleNoteMoveStateChange(payload, deps.noteMove);
  }

  if (reason === "note-delete") {
    return handleNoteDeleteStateChange(payload, deps.noteDelete);
  }

  if (reason === "directory-update") {
    return handleDirectoryUpdateStateChange(payload, deps.directoryUpdate);
  }

  if (reason === "directory-delete") {
    return handleDirectoryDeleteStateChange(payload, deps.directoryDelete);
  }

  if (reason === "directory-move") {
    return handleDirectoryMoveStateChange(payload, deps.directoryMove);
  }

  if (reason === "switch-tab" || reason === "folder-context-action" || reason === "file-context-action" || reason === "list-context-action") {
    if (reason === "switch-tab") deps.syncExplorerContextToActiveTab?.();
    deps.renderAll?.();
    return undefined;
  }

  return undefined;
}
