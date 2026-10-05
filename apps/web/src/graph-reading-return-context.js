const PRESENTATION_KEYS = [
  "selection", "focusContextCollapsed", "workbenchPanelOpen", "workbenchPanelTab",
  "thinkingPanelOpen", "utilityDrawerOpen", "researchNavigatorHidden", "researchNavigatorTouched"
];

export function captureGraphReadingReturnContext(graphState, appState, vaultPath, noteId) {
  graphState.readingReturnContext = {
    vaultPath, noteId, folderId: appState.selectedFolderId,
    focusedNoteId: appState.selectedFileId || null,
    presentation: Object.fromEntries(PRESENTATION_KEYS.map((key) => [key,
      key === "selection" && graphState.selection ? { ...graphState.selection } : graphState[key]
    ]))
  };
}

export function restoreGraphReadingReturnContext(graphState, appState, vaultPath) {
  const context = graphState.readingReturnContext;
  graphState.readingReturnContext = null;
  if (!context || context.vaultPath !== vaultPath || appState.module !== "explorer" ||
      appState.selectedFileId !== context.noteId) return false;
  appState.selectedFolderId = context.folderId;
  const focusedNoteId = context.focusedNoteId || null;
  appState.selectedFileId = focusedNoteId && Array.isArray(appState.notes) &&
    !appState.notes.some(note => note.id === focusedNoteId) ? null : focusedNoteId;
  Object.assign(graphState, context.presentation);
  return true;
}
