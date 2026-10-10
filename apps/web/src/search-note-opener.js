import { applyLoadedNoteToClientState } from "./loaded-note-client-state.js";

export function createSearchNoteOpener({ state, fetchNote, mapNoteItem, openNoteById, activateModule,
  unavailableMessage = "这条笔记已不可用，请刷新搜索结果" }) {
  return async (id, { isCurrent = () => true } = {}) => {
    const scope = state.noteMoveVaultScope ||= {};
    const current = () => isCurrent() && state.noteMoveVaultScope === scope &&
      !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
    if (!current()) return false;
    const existing = state.notes.find(note => note.id === id);
    const dirty = () => (state.tabs || []).some(tab => tab.noteId === id && tab.dirty);
    const snapshot = () => JSON.stringify({ note: state.notes.find(note => note.id === id),
      tabs: (state.tabs || []).filter(tab => tab.noteId === id) });
    const before = snapshot();
    if (!dirty() && !existing?.isLocalOnly) {
      const fetched = await fetchNote(id, { timeoutMs: 15000 });
      if (!current()) return false;
      if (!fetched) throw new Error(unavailableMessage);
      if (!dirty() && state.notes.find(note => note.id === id) === existing && snapshot() === before) {
        const mapped = mapNoteItem(fetched);
        applyLoadedNoteToClientState(state, mapped, { refreshLoaded: true });
      }
    }
    if (!current()) return false;
    if (!openNoteById(id)) throw new Error(unavailableMessage);
    activateModule("explorer");
    return true;
  };
}
