export async function openInitialStartupRouteForRuntime(deps = {}) {
  const {
    windowRef = typeof window !== "undefined" ? window : undefined,
    state = {},
    usingLocalFallbackData = false,
    startupAutoOpenSuppressed = false,
    importSmartNotesProductThinkingDemo = async () => false,
    importYijingKnowledgeNetworkDemo = async () => false,
    importYijingRichAcceptanceDemo = async () => false,
    preferredLocalFallbackNote = () => null,
    rootBoxIdFromFolder = () => "",
    openNoteById = () => false,
    openStartupUntitledNote = async () => null,
    renderAll = () => {},
    setStatus = () => {}
  } = deps;
  const startupParams = new URLSearchParams(windowRef?.location?.search || "");
  const startupDemo = String(startupParams.get("demo") || "").trim().toLowerCase();
  const explicitNoteId = startupParams.get("note") || "";
  const initialNote = explicitNoteId ? state.notes?.find((note) => note.id === explicitNoteId) : null;
  const shouldSkipAutoOpen = () => startupAutoOpenSuppressed || Boolean(state.activeTabId || state.selectedFileId);
  const openedDemo =
    startupDemo === "smart-notes-product-thinking" || startupDemo === "smart-notes"
      ? await importSmartNotesProductThinkingDemo({ startup: true })
      : startupDemo === "yijing-rich" || startupDemo === "yijing"
        ? await (startupDemo === "yijing" ? importYijingKnowledgeNetworkDemo({ startup: true }) : importYijingRichAcceptanceDemo({ startup: true }))
        : false;
  if (openedDemo) {
    renderAll();
    return { route: "demo", startupDemo };
  }
  if (initialNote) {
    state.browserRootId = rootBoxIdFromFolder(state, initialNote.folderId);
    state.selectedFolderId = initialNote.folderId;
    openNoteById(explicitNoteId);
    return { route: "note", noteId: explicitNoteId };
  }
  if (usingLocalFallbackData) {
    const fallbackNote = preferredLocalFallbackNote();
    if (fallbackNote) {
      state.browserRootId = rootBoxIdFromFolder(state, fallbackNote.folderId);
      state.selectedFolderId = fallbackNote.folderId;
      openNoteById(fallbackNote.id, { preferTitleSelection: false });
      setStatus(`API 连接失败，已打开本地示例笔记：${fallbackNote.title || fallbackNote.id}`, "warn");
      return { route: "fallback_note", noteId: fallbackNote.id };
    }
    if (!shouldSkipAutoOpen()) {
      await openStartupUntitledNote();
      return { route: "untitled" };
    }
    return { route: "skipped" };
  }
  if (!shouldSkipAutoOpen()) {
    await openStartupUntitledNote();
    return { route: "untitled" };
  }
  return { route: "skipped" };
}
