export async function handleNoteMoveStateChange(payload = {}, deps = {}) {
  const {
    usingLocalFallbackData = false,
    moveNote = async () => null,
    moveNoteInClientState = () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  try {
    let moved = null;
    if (!usingLocalFallbackData) {
      moved = await moveNote(payload.noteId, payload.directoryId);
    }
    moveNoteInClientState(payload.noteId, payload.directoryId, moved);
    setStatus(usingLocalFallbackData ? "已在本地示例中移动笔记" : "已移动笔记并落盘", "ok");
  } catch (error) {
    setStatus(`移动失败：${String(error?.message || error)}`, "bad");
  }
  renderAll();
  return true;
}

export async function handleNoteDeleteStateChange(payload = {}, deps = {}) {
  const {
    usingLocalFallbackData = false,
    deleteNote = async () => {},
    removeNoteFromClientState = () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  try {
    if (!usingLocalFallbackData) {
      await deleteNote(payload.noteId);
    }
    removeNoteFromClientState(payload.noteId);
    setStatus(usingLocalFallbackData ? "已从本地示例中删除笔记" : "已删除笔记并落盘", "ok");
  } catch (error) {
    setStatus(`删除失败：${String(error?.message || error)}`, "bad");
  }
  renderAll();
  return true;
}

export async function handleDirectoryUpdateStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    descendantDirectoryIds = () => [],
    renamedDirectoryFsPath = () => "",
    rootBoxIdFromFolder = () => "",
    updateDirectory = async () => null,
    syncDirectoriesFromApi = async () => {},
    syncLoadedNotesForDirectories = async () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  const subtreeIds = descendantDirectoryIds(payload.directoryId);
  const currentFolder = (state.folders || []).find((item) => item.id === payload.directoryId);
  try {
    const patch = { ...(payload.patch || {}) };
    if (patch.title && !patch.fsPath) {
      const nextFsPath = renamedDirectoryFsPath(currentFolder, patch.title);
      if (nextFsPath) patch.fsPath = nextFsPath;
    }
    const updated = await updateDirectory(payload.directoryId, patch);
    await syncDirectoriesFromApi();
    await syncLoadedNotesForDirectories(subtreeIds);
    const folder = (state.folders || []).find((item) => item.id === payload.directoryId);
    if (folder && updated) state.browserRootId = rootBoxIdFromFolder(state, folder.id);
    setStatus("目录已更新并落盘", "ok");
  } catch (error) {
    setStatus(`目录更新失败：${String(error?.message || error)}`, "bad");
  }
  renderAll();
  return true;
}

export async function handleCreateDirectoryFromDialog(payload = {}, deps = {}) {
  const {
    state = {},
    folderById = () => null,
    joinFsPath = (basePath, name) => name || basePath || "",
    createDirectory = async () => null,
    mapDirectoryItem = (item) => item,
    rootBoxIdFromFolder = () => "",
    explorer = null,
    dialog = null,
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  const name = String(payload.name || "").trim();
  if (!name) {
    setStatus("Please enter a directory name", "bad");
    return false;
  }
  const parentId = String(payload.parentId || "").trim();
  const parentFolder = folderById(state, parentId);
  const resolvedPath = String(payload.fsPath || "").trim() || joinFsPath(parentFolder?.fsPath || "", name);
  try {
    const created = await createDirectory({
      title: name,
      parentDirectoryId: parentId || null,
      directoryType: "custom",
      fsPath: resolvedPath,
      maxNotes: Number(payload.maxCards || 0) > 0 ? Number(payload.maxCards || 0) : 500
    });
    if (!created) throw new Error("Create directory failed");
    const folder = mapDirectoryItem(created);
    state.folders = [...(state.folders || []), folder];
    state.selectedFolderId = folder.id;
    state.selectedFileId = null;
    state.browserRootId = rootBoxIdFromFolder(state, folder.id);
    explorer?.expandFolderPath?.(folder.id);
    dialog?.hide?.();
    setStatus(`Directory "${name}" created at ${resolvedPath}`, "ok");
    renderAll();
    return folder;
  } catch (error) {
    setStatus(`Create directory failed: ${String(error?.message || error)}`, "bad");
    return false;
  }
}

export async function handleDirectoryDeleteStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    deleteDirectory = async () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  try {
    await deleteDirectory(payload.directoryId);
    state.folders = (state.folders || []).filter((folder) => folder.id !== payload.directoryId);
    if (state.selectedFolderId === payload.directoryId) {
      state.selectedFolderId = state.browserRootId;
    }
    setStatus("目录已删除并落盘", "ok");
  } catch (error) {
    setStatus(`目录删除失败：${String(error?.message || error)}`, "bad");
  }
  renderAll();
  return true;
}

export async function handleDirectoryMoveStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    descendantDirectoryIds = () => [],
    folderById = () => null,
    movedDirectoryFsPath = () => "",
    rootBoxIdFromFolder = () => "",
    updateDirectory = async () => null,
    syncDirectoriesFromApi = async () => {},
    syncLoadedNotesForDirectories = async () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  const subtreeIds = descendantDirectoryIds(payload.directoryId);
  const folder = (state.folders || []).find((item) => item.id === payload.directoryId);
  const targetParent = folderById(state, payload.parentDirectoryId);
  try {
    const patch = { parentDirectoryId: payload.parentDirectoryId };
    const nextFsPath = movedDirectoryFsPath(folder, targetParent);
    if (nextFsPath) patch.fsPath = nextFsPath;
    const updated = await updateDirectory(payload.directoryId, patch);
    await syncDirectoriesFromApi();
    await syncLoadedNotesForDirectories(subtreeIds);
    if (updated) {
      state.selectedFolderId = payload.directoryId;
      state.browserRootId = rootBoxIdFromFolder(state, payload.directoryId);
    }
    setStatus("目录层级已更新并落盘", "ok");
  } catch (error) {
    setStatus(`目录移动失败：${String(error?.message || error)}`, "bad");
  }
  renderAll();
  return true;
}
