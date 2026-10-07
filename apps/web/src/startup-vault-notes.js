export async function loadStartupVaultNotes({ state = {}, syncNotesForDirectoryTree = async () => {} } = {}) {
  const roots = (state.folders || []).filter(folder => !folder.parentId).map(folder => folder.id);
  const ids = [...new Set([state.browserRootId, ...roots].filter(Boolean))];
  await Promise.all(ids.map(id => syncNotesForDirectoryTree(id)));
}
