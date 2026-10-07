import { switchVaultWithNoteMoveRecovery } from "./vault-switch-recovery.js";

export async function loadSettingsVaultSnapshot(state, { fetchDirectories, fetchDirectoryNotes, mapDirectoryItem, mapNoteItem }, { signal, isCurrent }) {
  const directories = await fetchDirectories(true, { signal });
  if (!isCurrent()) throw new Error("笔记库加载已失效");
  const folders = directories.map(mapDirectoryItem);
  const knownIds = new Set(folders.map(folder => folder.id));
  const rootIds = [...new Set(folders.filter(folder => !folder.parentId || !knownIds.has(folder.parentId)).map(folder => folder.id).filter(Boolean))];
  const batches = await Promise.all(rootIds.map(async id => {
    if (!isCurrent()) throw new Error("笔记库加载已失效");
    const notes = await fetchDirectoryNotes(id, { signal, includeDescendants: true });
    if (!isCurrent()) throw new Error("笔记库加载已失效");
    return notes;
  }));
  const items = batches.flat();
  const notes = items.map(item => mapNoteItem(item, { mappingState: { ...state, folders } }));
  return { folders, notes };
}

export function createSettingsVaultSwitcher({ state, settingsState, desktopCommands,
  loadNoteTemplateSettingsFromStorage, fetchDirectories, fetchDirectoryNotes, mapDirectoryItem, mapNoteItem,
  renderAll, setStatus }) {
  return vaultPath => switchVaultWithNoteMoveRecovery(state, () => desktopCommands.switchVault(vaultPath), {
    targetVaultPath: vaultPath,
    onRejected: error => setStatus(`切换笔记库失败：${String(error?.message || error)}`, "bad"),
    loadVault: (_vault, context) => loadSettingsVaultSnapshot(state, { fetchDirectories, fetchDirectoryNotes, mapDirectoryItem, mapNoteItem }, context),
    commitVault: (nextVault, snapshot) => {
      Object.assign(state, snapshot, { tabs: [], activeTabId: null, selectedFileId: null,
        browserRootId: "dir_original_default", selectedFolderId: "dir_original_default" });
      settingsState.vault = nextVault;
      loadNoteTemplateSettingsFromStorage();
      renderAll();
      setStatus(`已打开笔记库：${nextVault.vaultPath}`, "ok");
    }
  });
}
