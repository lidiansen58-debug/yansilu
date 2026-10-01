export function hasIndependentGraphRelationComposer(appState = {}, draft = {}) {
  if (appState.module !== "graph" || draft.open !== true || draft.entryRoute?.returnTo !== "graph") return false;
  const sourceId = String(draft.sourceNoteId || draft.noteId || "").trim();
  return Boolean(sourceId && appState.notes?.some(note => note.id === sourceId));
}
