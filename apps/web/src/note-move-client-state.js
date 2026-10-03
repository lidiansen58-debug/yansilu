export function applyMovedNoteToClientState(state, noteId, directoryId, moved, { typeFromFolder, rootBoxIdFromFolder }) {
  const note = state.notes.find((item) => item.id === String(noteId || "").trim());
  const folderId = String(moved?.directoryId || directoryId || "").trim();
  if (!note || !folderId) return false;
  note.folderId = folderId;
  note.noteType = moved?.noteType || typeFromFolder(state, folderId);
  for (const key of ["thesis", "threeLineSummary", "startingQuestion", "viewpointHistory",
    "pendingViewpointRevision", "distillationStatus", "boundaryOrCounterpoint", "authorship",
    "originalityStatus", "originalitySimilarity", "thinkingStatus"]) {
    if (Object.hasOwn(moved || {}, key)) note[key] = moved[key];
  }
  if (moved?.status) note.status = moved.status;
  if (typeof moved?.fileRevision === "string") note.fileRevision = moved.fileRevision;
  if (typeof moved?.body === "string") {
    note.body = moved.body;
    note.bodyLoaded = true;
    for (const tab of state.tabs || []) {
      if (tab.noteId !== note.id || tab.dirty) continue;
      tab.body = moved.body;
      tab.savedBody = moved.body;
      if (typeof moved?.fileRevision === "string") tab.savedFileRevision = moved.fileRevision;
    }
  }
  note.markdownPath = moved?.markdownPath || note.markdownPath;
  note.updatedAt = moved?.updatedAt || new Date().toISOString();
  state.selectedFolderId = folderId;
  state.browserRootId = rootBoxIdFromFolder(state, folderId);
  state.selectedFileId = note.id;
  return true;
}
