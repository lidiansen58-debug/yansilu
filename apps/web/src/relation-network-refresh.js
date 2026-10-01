const requestsByHost = new WeakMap();

export async function refreshRelationNetworkStatusesForHost(host, noteIds = [], { fetchNoteRelations, fetchNote } = {}) {
  const ids = [...new Set(noteIds.map(id => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return;
  const scope = host.vaultScope?.();
  let requests = requestsByHost.get(host);
  if (!requests) { requests = new Map(); requestsByHost.set(host, requests); }
  let thinkingStatusChanged = false;
  await Promise.all(ids.map(async noteId => {
    const request = {};
    requests.set(noteId, request);
    const [relationsResult, noteResult] = await Promise.allSettled([
      fetchNoteRelations(noteId), fetchNote(noteId)
    ]);
    if (host.vaultScope?.() !== scope || requests.get(noteId) !== request) return;
    if (relationsResult.status === "fulfilled" && relationsResult.value) {
      host.applyRelationNetworkStatusesFromRelations(noteId, relationsResult.value);
    }
    const refreshedNote = noteResult.status === "fulfilled" ? noteResult.value : null;
    const note = host.state.notes.find(item => item.id === noteId);
    if (note && refreshedNote && Object.prototype.hasOwnProperty.call(refreshedNote, "thinkingStatus")) {
      const previousStatus = JSON.stringify(note.thinkingStatus || null);
      note.thinkingStatus = refreshedNote.thinkingStatus || null;
      if (JSON.stringify(note.thinkingStatus) !== previousStatus) thinkingStatusChanged = true;
    }
  }));
  if (host.vaultScope?.() === scope && thinkingStatusChanged) {
    host.renderThinkingStatus();
    host.renderAll?.();
  }
}
