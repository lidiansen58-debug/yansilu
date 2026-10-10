import { captureActionConfirmationContext } from "./action-confirmation-context.js";
import {
  SMART_NOTES_DEMO_GUIDE_DIRECTORY_ID, smartNotesDemoExistingFolder,
  smartNotesDemoImportedStatus, smartNotesDemoOpenedExistingGuideStatus,
  smartNotesDemoStartupNoteId, shouldRefreshHomeAfterSmartNotesDemoImport
} from "./smart-notes-demo-startup-note.js";

const RETRY_DELAYS_MS = [1000, 1500, 2000, 2500, 3000];

// Stage API data without touching the live folders, notes or editor.
async function stageDemoNotes(deps, result, isCurrent) {
  const items = await deps.fetchDirectories(true);
  if (!isCurrent()) return null;
  const folders = items.map(deps.mapDirectoryItem);
  const directoryId = String(result?.directoryId || result?.directory?.id || "").trim()
    || smartNotesDemoExistingFolder(folders)?.id;
  const ids = new Set([
    directoryId, ...(result.directoryIds || []), SMART_NOTES_DEMO_GUIDE_DIRECTORY_ID,
    "dir_yansilu_usage_notes", "dir_fleeting_default", "dir_literature_default"
  ].filter(id => folders.some(folder => folder.id === id)));
  // Descendants may contain additional demo notes beyond the returned directory list.
  for (const id of ids) {
    for (const folder of folders) if (folder.parentId === id) ids.add(folder.id);
  }
  const mappingState = { ...deps.state, folders };
  const groups = new Map();
  for (const id of ids) {
    const notes = await deps.fetchDirectoryNotes(id);
    if (!isCurrent()) return null;
    groups.set(id, notes.map(item => deps.mapNoteItem(item, { mappingState })));
  }
  return { folders, directoryId, groups };
}

export function createSmartNotesDemoImportController(getDeps) {
  let pending = false;
  const captureContext = () => captureActionConfirmationContext(getDeps, deps => JSON.stringify([
    deps.state.browserRootId, deps.state.selectedFolderId, deps.state.selectedFileId,
    deps.state.activeTabId, deps.editor?.getEditorValue?.(),
    (deps.state.tabs || []).map(tab => [tab.id, tab.noteId, tab.title, tab.body, tab.dirty])
  ]));

  async function seedWithStartupRetry(deps, payload, isCurrent) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      if (!isCurrent()) return null;
      try {
        deps.resetDesktopServiceStatusCache();
        return await deps.seedSmartNotesProductThinkingDemo(payload);
      } catch (error) {
        if (!isCurrent()) return null;
        const retryDelay = RETRY_DELAYS_MS[attempt];
        if (!["api_unavailable", "desktop_api_unavailable"].includes(String(error?.code || "").trim())
          || retryDelay === undefined) throw error;
        deps.setStatus("本地服务正在启动，正在自动重试导入 Demo...", "busy");
        await deps.waitForRetry(retryDelay);
      }
    }
  }

  function commitStage(deps, staged) {
    deps.state.folders = staged.folders;
    for (const [id, notes] of staged.groups) deps.upsertNotesForDirectory(id, notes);
    if (staged.directoryId) {
      deps.state.browserRootId = deps.rootBoxIdFromFolder(deps.state, staged.directoryId);
      deps.state.selectedFolderId = staged.directoryId;
    }
  }

  return async function importSmartNotesProductThinkingDemo(options = {}) {
    if (pending) return false;
    const deps = getDeps(), { state } = deps;
    let isCurrent = captureContext();
    if (!isCurrent()) return false;
    pending = true;
    const payload = { expectedVaultPath: deps.getVaultPath() || undefined };
    let imported = false;
    deps.setStatus("正在导入 Smart Notes Demo...", "");
    try {
      const result = await seedWithStartupRetry(deps, payload, isCurrent);
      if (!result) return false;
      imported = true;
      if (!isCurrent()) return true; // The original vault was imported; leave the new view alone.
      if (!String(result.directoryId || result.directory?.id || "").trim()) {
        throw new Error("Demo 导入结果缺少目录 ID");
      }
      const staged = await stageDemoNotes(deps, result, isCurrent);
      if (!staged || !isCurrent()) return true;
      commitStage(deps, staged);
      const firstNoteId = smartNotesDemoStartupNoteId({ result, notes: state.notes });
      const shouldRefreshHome = shouldRefreshHomeAfterSmartNotesDemoImport(options);
      const shouldOpenGuide = Boolean(firstNoteId) && (options.startup || !shouldRefreshHome);
      if (shouldOpenGuide) deps.activateModule("explorer");
      else if (shouldRefreshHome) deps.activateModule("today");
      deps.renderAll();
      if (shouldOpenGuide) {
        state.selectedFileId = firstNoteId;
        deps.openNoteById(firstNoteId, { preferTitleSelection: false });
        deps.editor?.resetEditorViewportToStart?.();
      }
      // Our own selection/navigation is now the baseline for background refreshes.
      isCurrent = captureContext();
      await deps.loadWritingThemeIndexes({ isCurrent });
      if (!isCurrent()) return true;
      await deps.refreshDirectoryGraph({ isCurrent });
      if (!isCurrent()) return true;
      const refreshedHome = shouldRefreshHome && !shouldOpenGuide;
      const importedStatus = smartNotesDemoImportedStatus(result, { openedGuide: shouldOpenGuide, refreshedHome });
      if (refreshedHome) {
        state.todayNoticeMessage = importedStatus;
        deps.renderAll();
      }
      deps.setStatus(importedStatus, "ok");
      return true;
    } catch (error) {
      if (!isCurrent()) return imported;
      if (options.startup) {
        if (!state.notes.length) {
          try {
            const staged = await stageDemoNotes(deps, {}, isCurrent);
            if (!staged || !isCurrent()) return imported;
            commitStage(deps, staged);
            isCurrent = captureContext();
          } catch {
            if (!isCurrent()) return imported;
          }
        }
        const fallbackNoteId = smartNotesDemoStartupNoteId({ result: {}, notes: state.notes });
        if (fallbackNoteId) {
          state.selectedFileId = fallbackNoteId;
          deps.activateModule("explorer");
          deps.openNoteById(fallbackNoteId, { preferTitleSelection: false });
          deps.editor?.resetEditorViewportToStart?.();
          deps.setStatus(smartNotesDemoOpenedExistingGuideStatus(), "ok");
          return true;
        }
      }
      deps.setStatus(`Smart Notes Demo 导入失败：${String(error?.message || error)}`, "bad");
      throw error;
    } finally { pending = false; }
  };
}
