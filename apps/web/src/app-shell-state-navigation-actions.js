export async function handleRefreshGraphStateChange(payload = {}, deps = {}) {
  const {
    graphState = {},
    refreshDirectoryGraph = async () => false,
    setStatus = () => {}
  } = deps;
  const refreshed = await refreshDirectoryGraph();
  setStatus(
    refreshed ? "永久笔记关系图谱已刷新" : `图谱刷新失败：${graphState.error || "请重试"}`,
    refreshed ? "ok" : "warn"
  );
  return refreshed;
}

export async function handleSelectFolderStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    explorer = null,
    applyExplorerSelectionContext = () => {},
    expandGraphBrowserTree = () => {},
    refreshDirectoryGraph = async () => false,
    syncNotesForDirectory = async () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;

  if (payload.folderId) {
    applyExplorerSelectionContext({
      folderId: String(payload.folderId || "").trim(),
      clearSelectedFile: true,
      expandFolder: true
    });
  }

  try {
    if (state.module === "graph") {
      applyExplorerSelectionContext({ clearSelectedFile: true, expandFolder: false });
      explorer?.restoreAutoCollapsedDisconnectedGroups?.();
      expandGraphBrowserTree();
      explorer?.render?.();
    }
    await syncNotesForDirectory(state.selectedFolderId);
    if (state.module !== "graph") explorer?.expandCurrentEditorNotePathInRoot?.(state.browserRootId);
    if (state.module === "graph") await refreshDirectoryGraph();
  } catch (error) {
    setStatus(`目录加载失败，保留本地数据：${String(error?.message || error)}`, "warn");
  }

  renderAll();
  return true;
}

export function handleGraphFocusNoteStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    explorer = null,
    graphOriginalScopeDirectoryId = "",
    applyExplorerSelectionContext = () => {},
    setStatus = () => {},
    renderAll = () => {}
  } = deps;

  if (payload.noteId) {
    applyExplorerSelectionContext({
      noteId: String(payload.noteId || "").trim(),
      syncSearch: false,
      expandFolder: true
    });
  }

  if (state.module === "graph") {
    explorer?.collapseDisconnectedGroup?.(state.selectedFolderId, { auto: true });
    explorer?.collapseDisconnectedGroup?.(graphOriginalScopeDirectoryId, { auto: true });
    renderAll();
    setStatus("已切换为这条永久笔记的关系视图", "ok");
    return true;
  }

  return undefined;
}

export function handleOpenNoteRelationsStateChange(payload = {}, deps = {}) {
  const {
    openNoteRelationEditor = () => false,
    setStatus = () => {}
  } = deps;
  const noteId = String(payload.noteId || "").trim();
  if (!noteId) return false;
  const opened = openNoteRelationEditor(noteId, { source: payload.source || "explorer-browser" });
  if (opened) {
    setStatus("已打开这条笔记的关联编辑区", "ok");
    return true;
  }
  setStatus("没有找到这条笔记，无法打开关联编辑区", "warn");
  return false;
}

export async function handleOpenNoteAiInboxStateChange(payload = {}, deps = {}) {
  const {
    aiInboxState = {},
    normalizeAiInboxFilters = (filters) => filters,
    activateModule = () => {},
    openAiInboxModule = async () => {},
    setStatus = () => {}
  } = deps;
  const noteId = String(payload.noteId || "").trim();
  if (!noteId) return false;
  aiInboxState.filters = normalizeAiInboxFilters({
    ...aiInboxState.filters,
    view: "pending",
    sourceNoteId: noteId
  });
  aiInboxState.detail = null;
  aiInboxState.selectedArtifactId = "";
  activateModule("aiInbox");
  await openAiInboxModule();
  setStatus("已打开当前笔记的 AI 建议", "ok");
  return true;
}
