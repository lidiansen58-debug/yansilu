export function applyLoadedNoteToClientState(state, loaded, { refreshLoaded = false } = {}) {
  const existing = state.notes.find(note => note.id === loaded.id);
  const tabs = (state.tabs || []).filter(tab => tab.noteId === loaded.id);
  // A background read must not replace a note that the user has already loaded or edited.
  if (existing && ((!refreshLoaded && existing.bodyLoaded) || tabs.some(tab => tab.dirty))) return existing;
  state.notes = [loaded, ...state.notes.filter(note => note.id !== loaded.id)];
  for (const tab of tabs) {
    tab.body = loaded.body;
    tab.savedBody = loaded.body;
    tab.savedFileRevision = loaded.fileRevision;
    tab.title = loaded.title;
    tab.savedTitle = loaded.title;
  }
  return loaded;
}
