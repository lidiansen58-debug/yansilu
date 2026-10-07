import { captureGraphViewport } from "./graph-viewport-memory.js";

const PRESENTATION_KEYS = [
  "selection", "focusContextCollapsed", "workbenchPanelOpen", "workbenchPanelTab",
  "thinkingPanelOpen", "utilityDrawerOpen", "researchNavigatorHidden", "researchNavigatorTouched",
  "zoom", "expanded", "focusDepth", "focusContextMode", "filters", "readingLens", "thinkingFilter"
];

export function captureGraphReadingReturnContext(graphState, appState, vaultPath, noteId, root = globalThis.document) {
  graphState.readingReturnContext = {
    vaultPath, noteId, folderId: appState.selectedFolderId,
    focusedNoteId: appState.selectedFileId || null,
    viewport: captureGraphViewport(root),
    presentation: Object.fromEntries(PRESENTATION_KEYS.map((key) => [key,
      graphState[key] && typeof graphState[key] === "object" ? { ...graphState[key] } : graphState[key]
    ]))
  };
}

export function restoreGraphReadingReturnContext(graphState, appState, vaultPath) {
  const context = graphState.readingReturnContext;
  graphState.readingReturnContext = null;
  graphState.readingReturnViewport = null;
  if (!context || context.vaultPath !== vaultPath || appState.module !== "explorer" ||
      appState.selectedFileId !== context.noteId) return false;
  appState.selectedFolderId = context.folderId;
  const focusedNoteId = context.focusedNoteId || null;
  appState.selectedFileId = focusedNoteId && Array.isArray(appState.notes) &&
    !appState.notes.some(note => note.id === focusedNoteId) ? null : focusedNoteId;
  Object.assign(graphState, context.presentation);
  graphState.readingReturnViewport = context.viewport;
  return true;
}
