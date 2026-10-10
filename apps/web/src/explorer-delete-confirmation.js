const pendingDeletes = new WeakSet();

function snapshot(state, kind, id) {
  if (kind === "file") {
    const note = state.notes?.find(item => item.id === id);
    if (!note) return null;
    return JSON.stringify([
      note.title, note.folderId, note.markdownPath, note.fileRevision, note.body, note.updatedAt,
      (state.tabs || []).filter(tab => tab.noteId === id)
        .map(tab => [tab.id, tab.title, tab.body, tab.dirty]).sort()
    ]);
  }
  const folder = state.folders?.find(item => item.id === id);
  if (!folder) return null;
  return JSON.stringify([
    folder.name, folder.parentId, folder.fsPath, folder.isDefault,
    (state.folders || []).filter(item => item.parentId === id).map(item => item.id).sort(),
    (state.notes || []).filter(item => item.folderId === id).map(item => item.id).sort()
  ]);
}

export async function confirmExplorerDelete(host, target, confirmDialog = message => globalThis.confirm(message)) {
  if (pendingDeletes.has(host)) return false;
  const state = host.state;
  const scope = state?.noteMoveVaultScope;
  const isCurrent = () => host.state === state && state.noteMoveVaultScope === scope
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  if (!state || !isCurrent()) return false;
  const { kind, id } = target;
  if (kind !== "file" && kind !== "folder") return false;
  const before = snapshot(state, kind, id);
  if (before === null) return false;
  const item = (kind === "file" ? state.notes : state.folders).find(item => item.id === id);
  if (kind === "folder") {
    if (item.isDefault) { host.onStatus("默认根目录不可删除", "bad"); return false; }
    if (state.notes?.some(note => note.folderId === id) || state.folders?.some(folder => folder.parentId === id)) {
      host.onStatus("请先移走目录中的笔记和子目录，再删除空目录。", "warn");
      return false;
    }
  }
  const message = kind === "file"
    ? `确认删除笔记“${item.title}”吗？\n\n这会同时删除本地 Markdown 文件，且不可撤销。`
    : `确认删除空目录“${item.name}”吗？`;
  pendingDeletes.add(host);
  try {
    const approved = await confirmDialog(message);
    if (approved !== true || !isCurrent()) return false;
    if (snapshot(state, kind, id) !== before) {
      host.onStatus("内容或位置已变化，请核对后重新删除。", "warn");
      return false;
    }
    return await host.onStateChange(kind === "file" ? "note-delete" : "directory-delete", {
      [kind === "file" ? "noteId" : "directoryId"]: id,
      expectedVaultScope: scope
    });
  } catch (error) {
    if (isCurrent()) host.onStatus(`删除未完成：${String(error?.message || error)}`, "warn");
    return false;
  } finally {
    pendingDeletes.delete(host);
  }
}
