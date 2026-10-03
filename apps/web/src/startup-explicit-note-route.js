import { applyLoadedNoteToClientState } from "./loaded-note-client-state.js";

export async function openExplicitStartupNoteRoute(noteId, deps = {}) {
  if (!noteId) return null;
  const { state = {}, fetchNote = async () => null, mapNoteItem = item => item,
    rootBoxIdFromFolder = () => "", activateModule = () => {},
    openNoteById = () => false, setStatus = () => {} } = deps;
  const scope = state.noteMoveVaultScope;
  const isCurrent = () => state.noteMoveVaultScope === scope && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  const skipped = { route: "skipped" };
  if (!isCurrent()) return skipped;
  let note = state.notes?.find(item => item.id === noteId);
  if (!note) {
    try {
      const item = await fetchNote(noteId);
      if (!isCurrent()) return skipped;
      if (item) {
        state.notes ||= [];
        note = applyLoadedNoteToClientState(state, mapNoteItem(item));
      }
    } catch (error) {
      if (!isCurrent()) return skipped;
      activateModule("explorer");
      setStatus(`无法打开笔记：${String(error?.message || error)}`, "bad");
      return { route: "note_error", noteId };
    }
  }
  activateModule("explorer");
  if (!note) {
    setStatus("这条笔记已不存在，或不在当前笔记库中。", "warn");
    return { route: "missing_note", noteId };
  }
  state.browserRootId = rootBoxIdFromFolder(state, note.folderId);
  state.selectedFolderId = note.folderId;
  openNoteById(noteId);
  return { route: "note", noteId };
}
