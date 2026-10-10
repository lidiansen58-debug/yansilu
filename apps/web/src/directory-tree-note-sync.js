export async function syncDirectoryTreeNotes(rootDirectoryId, {
  state, descendantDirectoryIds, folderById, fetchDirectoryNotes, mapNoteItem, upsertNotesForDirectory,
  isCurrent = () => true
}) {
  const rootId = String(rootDirectoryId || "").trim();
  if (!rootId || state.noteMoveVaultSwitching || !isCurrent()) return false;
  const ids = descendantDirectoryIds(rootId).filter(id => folderById(state, id));
  if (!ids.length) return false;
  const scope = state.noteMoveVaultScope;
  const items = await fetchDirectoryNotes(rootId, { includeDescendants: true });
  if (scope !== state.noteMoveVaultScope || state.noteMoveVaultSwitching || !isCurrent()) return false;
  const grouped = new Map(ids.filter(id => folderById(state, id)).map(id => [id, []]));
  for (const item of items) {
    const note = mapNoteItem(item);
    grouped.get(note.folderId)?.push(note);
  }
  for (const [id, notes] of grouped) upsertNotesForDirectory(id, notes);
  return true;
}
