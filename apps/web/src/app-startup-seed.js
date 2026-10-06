import {
  runConfirmedSmartNotesDemoImport
} from "./smart-notes-demo-import-flow.js";
import { openExplicitStartupNoteRoute } from "./startup-explicit-note-route.js";
export async function openInitialStartupRouteForRuntime(deps = {}) {
  const {
    windowRef = typeof window !== "undefined" ? window : undefined,
    state = {},
    usingLocalFallbackData = false,
    startupAutoOpenSuppressed = false,
    getStartupAutoOpenSuppressed = () => startupAutoOpenSuppressed,
    confirm = null,
    importSmartNotesProductThinkingDemo = async () => false,
    preferredLocalFallbackNote = () => null,
    rootBoxIdFromFolder = () => "",
    openNoteById = () => false,
    openStartupUntitledNote = async () => null,
    activateModule = () => {},
    renderAll = () => {},
    setStatus = () => {}
  } = deps;
  const startupParams = new URLSearchParams(windowRef?.location?.search || "");
  const startupDemo = String(startupParams.get("demo") || "").trim().toLowerCase();
  const explicitNoteId = startupParams.get("note") || "";
  const shouldSkipAutoOpen = () => getStartupAutoOpenSuppressed() === true || Boolean(state.activeTabId || state.selectedFileId);
  const openedDemo =
    startupDemo === "smart-notes-product-thinking" || startupDemo === "smart-notes"
      ? await runConfirmedSmartNotesDemoImport({ startup: true }, {
          confirm,
          importSmartNotesDemo: importSmartNotesProductThinkingDemo,
          setStatus
        })
      : false;
  if (openedDemo) {
    renderAll();
    return { route: "demo", startupDemo };
  }
  const explicitRoute = await openExplicitStartupNoteRoute(explicitNoteId, deps);
  if (explicitRoute) return explicitRoute;
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
    activateModule("today");
    return { route: "today" };
  }
  return { route: "skipped" };
}
