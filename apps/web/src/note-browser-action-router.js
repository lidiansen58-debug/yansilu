export function noteBrowserActionReason(reason = "") {
  return String(reason || "").trim().toLowerCase();
}

export function graphAssociateNoteRoute({ noteId = "", source = "", module = "", needsRelationWorkflow = true } = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return { kind: "invalid", handled: false };
  const graphMode = String(module || "").trim() === "graph";
  if (!graphMode) {
    return {
      kind: "open-note-relations",
      handled: true,
      noteId: cleanNoteId,
      source: source || "explorer-browser"
    };
  }
  if (source === "graph-context-menu" && !needsRelationWorkflow) {
    return {
      kind: "graph-open-relation-form",
      handled: true,
      noteId: cleanNoteId,
      relationType: "associated_with"
    };
  }
  return {
    kind: "graph-open-isolated-workflow",
    handled: true,
    noteId: cleanNoteId,
    activeTab: "candidates"
  };
}

export function noteBrowserStateChangeRoute(reason = "", payload = {}, context = {}) {
  const cleanReason = noteBrowserActionReason(reason);
  if (cleanReason === "select-folder") {
    return {
      kind: "select-folder",
      graphMode: context.module === "graph",
      syncDirectory: true,
      refreshGraph: context.module === "graph",
      expandCurrentEditorNotePath: context.module !== "graph"
    };
  }
  if (cleanReason === "graph-associate-note") {
    return graphAssociateNoteRoute({
      noteId: payload.noteId,
      source: payload.source,
      module: context.module,
      needsRelationWorkflow: context.needsRelationWorkflow
    });
  }
  if (cleanReason === "open-note-relations") {
    const noteId = String(payload.noteId || "").trim();
    return {
      kind: noteId ? "open-note-relations" : "invalid",
      handled: Boolean(noteId),
      noteId,
      source: payload.source || "explorer-browser"
    };
  }
  if (cleanReason === "save-note") {
    return {
      kind: "save-note",
      syncExplorerBeforeRender: true,
      renderAfterSync: true
    };
  }
  if (cleanReason === "note-move") {
    return {
      kind: "note-move",
      remoteWhenAvailable: true,
      updateClientState: true
    };
  }
  if (cleanReason === "note-delete") {
    return {
      kind: "note-delete",
      remoteWhenAvailable: true,
      updateClientState: true
    };
  }
  return { kind: cleanReason || "unknown", handled: false };
}

export function noteMainPathRoute({ action = "", mode = "" } = {}) {
  const cleanAction = String(action || "").trim().toLowerCase();
  const cleanMode = String(mode || "").trim().toLowerCase();
  if (cleanAction === "graph") return { kind: "graph", refreshGraph: true };
  if (cleanAction !== "writing") return { kind: "unknown", handled: false };
  if (cleanMode === "distillation") return { kind: "writing-distillation", openExplorer: true, focusDistillation: true };
  if (cleanMode === "requirements") return { kind: "writing-requirements", openWriting: true };
  if (cleanMode === "project") return { kind: "writing-project", openWriting: true, createProjectWhenNeeded: true };
  return { kind: "writing-basket", openWriting: true };
}

export function noteDeleteKeyRoute({ module = "", selectedFileId = "", activeTabNoteId = "" } = {}) {
  if (String(module || "").trim() !== "explorer") return { kind: "ignored", handled: false };
  const noteId = String(selectedFileId || activeTabNoteId || "").trim();
  if (!noteId) return { kind: "ignored", handled: false };
  return {
    kind: "delete-note",
    handled: true,
    noteId
  };
}

export function graphFollowupActionRoute(action = "") {
  const cleanAction = String(action || "").trim().toLowerCase();
  if (cleanAction === "writing") return { kind: "writing", handled: true };
  if (!cleanAction) return { kind: "invalid", handled: false };
  if (cleanAction === "strengthen" || cleanAction === "repair" || cleanAction === "review") {
    return { kind: "edit-relation", handled: true, action: cleanAction };
  }
  if (cleanAction === "isolate-keep" || cleanAction === "isolate-hold") {
    return { kind: "boundary-draft", handled: true, action: cleanAction };
  }
  return { kind: "open-relation-workspace", handled: true, action: cleanAction };
}
