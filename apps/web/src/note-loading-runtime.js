export function applyFetchedNoteBodyForRuntime(note = {}, full = {}, deps = {}) {
  const {
    normalizeOptionalNumber = (value) => value,
    normalizeAuthorshipItem = (value) => value,
    normalizeThinkingStatusItem = (value) => value
  } = deps;
  note.body = full.body || note.body;
  note.title = full.title || note.title;
  note.status = full.status || note.status;
  note.markdownPath = full.markdownPath || note.markdownPath;
  note.originalityStatus = full.originalityStatus || note.originalityStatus;
  note.originalitySimilarity = normalizeOptionalNumber(full.originalitySimilarity ?? note.originalitySimilarity);
  note.authorship = normalizeAuthorshipItem(full.authorship) || note.authorship;
  note.thesis = full.thesis || note.thesis || "";
  note.threeLineSummary = Array.isArray(full.threeLineSummary) ? full.threeLineSummary : note.threeLineSummary || [];
  note.distillationStatus = full.distillationStatus || note.distillationStatus || "";
  note.thinkingStatus = normalizeThinkingStatusItem(full.thinkingStatus) || note.thinkingStatus || null;
  note.boundaryOrCounterpoint = full.boundaryOrCounterpoint || note.boundaryOrCounterpoint || "";
  note.updatedAt = full.updatedAt || note.updatedAt;
  note.bodyLoaded = true;
  return note;
}

export async function ensureNoteBodyLoadedForRuntime(noteId, deps = {}) {
  const {
    state = {},
    fetchNote = async () => null,
    editor = {},
    normalizeOptionalNumber,
    normalizeAuthorshipItem,
    normalizeThinkingStatusItem
  } = deps;
  const notes = Array.isArray(state.notes) ? state.notes : [];
  const tabs = Array.isArray(state.tabs) ? state.tabs : [];
  const note = notes.find((item) => item.id === noteId);
  if (!note || note.bodyLoaded) return null;
  const expectedNoteBody = note.body;
  const expectedTab = tabs.find((item) => item.noteId === note.id);
  const expectedTabBody = expectedTab?.body;
  try {
    const full = await fetchNote(noteId);
    if (!full) return null;
    const currentTab = tabs.find((item) => item.noteId === note.id);
    if (currentTab?.dirty) {
      note.bodyLoaded = true;
      return note;
    }
    if ((currentTab && currentTab.body !== expectedTabBody) || note.body !== expectedNoteBody) {
      note.bodyLoaded = true;
      return note;
    }
    applyFetchedNoteBodyForRuntime(note, full, {
      normalizeOptionalNumber,
      normalizeAuthorshipItem,
      normalizeThinkingStatusItem
    });
    const tab = tabs.find((item) => item.noteId === note.id);
    if (tab) {
      tab.body = note.body;
      tab.title = note.title;
      tab.savedBody = note.body;
      tab.savedTitle = note.title;
      tab.dirty = false;
      editor.syncTabMetadataFromNote?.(note.id);
      if (state.activeTabId === tab.id) editor.fillEditorFromTab?.();
    }
    return note;
  } catch {
    return null;
  }
}
