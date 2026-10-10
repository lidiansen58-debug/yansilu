import { beginNoteMoveInteraction } from "./note-move-interaction-lock.js";
import { showNoteMoveRecovery, syncNoteMoveReadOnly, withMoveDeadline } from "./note-move-recovery.js";

export async function handleNoteMoveStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    editor = null,
    usingLocalFallbackData = false,
    moveNote = async () => null,
    checkNoteMove = null,
    fetchNote = async () => null,
    moveNoteInClientState = () => {},
    refreshDirectoryGraph = async () => {},
    setStatus = () => {},
    beginMoveInteraction = beginNoteMoveInteraction,
    showMoveRecovery = showNoteMoveRecovery,
    moveTimeoutMs = 15000,
    verifyTimeoutMs = 5000,
    renderAll = () => {}
  } = deps;
  if (state.pendingNoteMoveId || state.noteMoveVaultSwitching || state.noteMoveVaultUncertain) return false;
  if (state.unresolvedNoteMove) {
    setStatus("请先重新核查上次移动结果，不会重复移动笔记。", "warn", { notify: true });
    return false;
  }
  if ((state.tabs || []).some((tab) => tab.noteId === payload.noteId && tab.dirty)) {
    setStatus("这条笔记还有未保存的修改，请保存后再归类或移动。", "warn", { notify: true });
    return false;
  }
  let releaseInteraction = () => {};
  let clearRecovery = () => {};
  let confirmed = false;
  let moveOutcome;
  const operationId = globalThis.crypto.randomUUID();
  const operation = { operationId, context: {} };
  const isUncertain = error => ["request_timeout", "api_unavailable", "unknown_move_result", "NOTE_MOVE_RECOVERY_REQUIRED", "NOTE_MOVE_ALREADY_STARTED", "NOTE_MOVE_SERVICE_CHANGED"].includes(error?.code);
  const vaultScope = state.noteMoveVaultScope ||= {};
  const isCurrentScope = () => state.noteMoveVaultScope === vaultScope && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  const refreshGraph = () => {
    void withMoveDeadline(() => refreshDirectoryGraph(), 15000).catch(() => {});
  };
  const applyResult = (moved) => {
    if (!isCurrentScope()) return false;
    moveNoteInClientState(payload.noteId, payload.directoryId, moved);
    confirmed = true;
    state.unresolvedNoteMove = null;
    clearRecovery();
    state.noteMoveRecoveryCleanup = null;
    syncNoteMoveReadOnly(state);
    if ((state.tabs || []).find(tab => tab.id === state.activeTabId)?.noteId === payload.noteId) editor?.fillEditorFromTab?.();
    renderAll();
    return true;
  };
  const verifyResult = async () => {
    if (!isCurrentScope()) return false;
    let interrupted = moveOutcome?.error?.code === "NOTE_MOVE_SERVICE_CHANGED";
    if (checkNoteMove && moveOutcome?.error?.code !== "NOTE_MOVE_RECOVERY_REQUIRED" && (!moveOutcome?.error || isUncertain(moveOutcome.error))) {
      const status = await withMoveDeadline(() => checkNoteMove(payload.noteId, operationId, { timeoutMs: verifyTimeoutMs, context: operation.context }), verifyTimeoutMs);
      if (!isCurrentScope() || status?.state === "pending") return false;
      if (status?.state === "cancelled") moveOutcome = { error: { code: "NOTE_MOVE_CANCELLED", message: "本次移动未执行，已取消迟到的请求" } };
      if (status?.state === "failed" && status.error) moveOutcome = { error: status.error };
      interrupted ||= status?.state === "interrupted";
    }
    if (moveOutcome?.error && !isUncertain(moveOutcome.error)) {
      state.unresolvedNoteMove = null;
      clearRecovery();
      state.noteMoveRecoveryCleanup = null;
      syncNoteMoveReadOnly(state);
      setStatus(`移动失败：${String(moveOutcome.error.message || moveOutcome.error)}。可以继续编辑或重新移动。`, "bad", { notify: true });
      return "rejected";
    }
    if (moveOutcome?.error?.code === "NOTE_MOVE_RECOVERY_REQUIRED") setStatus(moveOutcome.error.message, "bad", { notify: true });
    const current = await withMoveDeadline(() => fetchNote(payload.noteId, { timeoutMs: verifyTimeoutMs }), verifyTimeoutMs);
    if (!isCurrentScope()) return false;
    if (interrupted && current?.id === payload.noteId && current?.directoryId && typeof current.body === "string") {
      return applyResult(current) ? (current.directoryId === payload.directoryId ? true : "restored") : false;
    }
    if (moveOutcome?.error?.code === "NOTE_MOVE_RECOVERY_REQUIRED") {
      const { originalDirectoryId, originalMarkdownPath } = moveOutcome.error.details || {};
      if (!originalDirectoryId || !originalMarkdownPath || current?.directoryId !== originalDirectoryId ||
        current?.markdownPath !== originalMarkdownPath || typeof current?.body !== "string") {
        setStatus(moveOutcome.error.message, "bad", { notify: true });
        return false;
      }
      return applyResult(current) ? "restored" : false;
    }
    if (current?.directoryId !== payload.directoryId || typeof current?.body !== "string") return false;
    return applyResult(current);
  };
  state.pendingNoteMoveId = payload.noteId;
  try {
    releaseInteraction = beginMoveInteraction();
    let moved = null;
    if (!usingLocalFallbackData) {
      try {
        moved = await withMoveDeadline(async () => {
          try { return await moveNote(payload.noteId, payload.directoryId, operation); }
          catch (error) { moveOutcome = { error }; throw error; }
        }, moveTimeoutMs);
        if (!moved) throw Object.assign(new Error("本地服务未返回移动结果"), { code: "unknown_move_result" });
      } catch (error) {
        if (!isCurrentScope()) return false;
        const uncertain = isUncertain(error);
        if (!uncertain) throw error;
        const verified = await verifyResult().catch(() => false);
        if (verified === "rejected") return false;
        if (verified) {
          setStatus(verified === "restored" ? "移动未完成，已确认恢复原位置，可以继续编辑。" : "已核实笔记移动成功", "ok", { notify: true });
          return true;
        }
        if (!isCurrentScope()) return false;
        state.unresolvedNoteMove = { noteId: payload.noteId, directoryId: payload.directoryId };
        syncNoteMoveReadOnly(state);
        clearRecovery = showMoveRecovery(async () => {
          const verified = await verifyResult();
          if (verified === "rejected") return true;
          if (!verified) return false;
          setStatus(verified === "restored" ? "移动未完成，已确认恢复原位置，可以继续编辑。" : "已核实笔记移动成功，可以继续编辑", "ok", { notify: true });
          refreshGraph();
          return true;
        });
        state.noteMoveRecoveryCleanup = clearRecovery;
        return false;
      }
    }
    if (!applyResult(moved)) return false;
    setStatus(usingLocalFallbackData ? "已在本地示例中移动笔记" : "已移动笔记并落盘", "ok", { notify: true });
  } catch (error) {
    setStatus(`移动失败：${String(error?.message || error)}`, "bad");
    return false;
  } finally {
    if (state.noteMoveVaultScope === vaultScope) state.pendingNoteMoveId = "";
    releaseInteraction();
    if (confirmed && isCurrentScope()) refreshGraph();
  }
  renderAll();
  return true;
}

export async function handleNoteDeleteStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    usingLocalFallbackData = false,
    deleteNote = async () => {},
    getVaultPath = () => "",
    removeNoteFromClientState = () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  const scope = state.noteMoveVaultScope;
  const vaultPath = getVaultPath();
  const isCurrent = () => state.noteMoveVaultScope === scope && getVaultPath() === vaultPath && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  if (!isCurrent() || (Object.hasOwn(payload, "expectedVaultScope") && payload.expectedVaultScope !== scope)) return false;
  if (state.unresolvedNoteMove && state.unresolvedNoteMove.noteId === payload.noteId) {
    setStatus("移动结果尚未确认，请先重新核查，此笔记暂不能删除。", "warn", { notify: true });
    return false;
  }
  try {
    if (!usingLocalFallbackData) {
      await deleteNote(payload.noteId, { expectedVaultPath: vaultPath });
    }
    if (!isCurrent()) return false;
    removeNoteFromClientState(payload.noteId);
    setStatus(usingLocalFallbackData ? "已从本地示例中删除笔记" : "已删除笔记并落盘", "ok");
  } catch (error) {
    if (!isCurrent()) return false;
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
    getVaultPath = () => "",
    setStatus = () => {},
    renderAll = () => {}
  } = deps;
  const scope = state.noteMoveVaultScope;
  const vaultPath = getVaultPath();
  const isCurrent = () => state.noteMoveVaultScope === scope && getVaultPath() === vaultPath && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  if (!isCurrent() || (Object.hasOwn(payload, "expectedVaultScope") && payload.expectedVaultScope !== scope)) return false;
  try {
    await deleteDirectory(payload.directoryId, { expectedVaultPath: vaultPath });
    if (!isCurrent()) return false;
    state.folders = (state.folders || []).filter((folder) => folder.id !== payload.directoryId);
    if (state.selectedFolderId === payload.directoryId) {
      state.selectedFolderId = state.browserRootId;
    }
    setStatus("目录已删除并落盘", "ok");
  } catch (error) {
    if (!isCurrent()) return false;
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
