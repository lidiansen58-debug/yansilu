import { bindImportWorkspaceEventsForRuntime } from "./app-event-bindings.js";
import { initializeAppRouteForRuntime } from "./app-route-initializer.js";
import { openInitialStartupRouteForRuntime } from "./app-startup-seed.js";

export async function bootstrapAppForRuntime(deps = {}) {
  const {
    state = {},
    importState = {},
    setUsingLocalFallbackData = () => {},
    getUsingLocalFallbackData = () => false,
    renderImportPageShell = () => {},
    createImportToolbarActions = () => ({}),
    currentImportToolbarValues = () => ({}),
    activeImportPreviewContext = () => null,
    selectionSummary = () => ({}),
    rootBoxIdFromFolder = () => "",
    previewImport = async () => ({}),
    confirmImport = async () => ({}),
    defaultSelectedCandidateIds = () => [],
    setImportRecordId = () => {},
    showImportResult = () => {},
    syncImportSelection = () => {},
    confirmedImportTargetDirectoryId = () => "",
    preferredImportDirectoryId = (value) => value,
    folderById = () => null,
    syncNotesForDirectory = async () => {},
    refreshImportedNotesView = () => {},
    renderImportToolbar = () => {},
    hideImportOperationResultModal = () => {},
    bindImportWorkspaceEvents = bindImportWorkspaceEventsForRuntime,
    initializeAppRoute = initializeAppRouteForRuntime,
    openInitialStartupRoute = openInitialStartupRouteForRuntime,
    activateModule = () => {},
    renderAll = () => {},
    updateController = null,
    setStatus = () => {}
  } = deps;

  setUsingLocalFallbackData(false);
  renderImportPageShell();
  const importToolbarActions = createImportToolbarActions({
    getToolbarValues: currentImportToolbarValues,
    getFallbackImportRecordId: () => importState.importRecordId,
    getActivePreview: () => activeImportPreviewContext(),
    selectionSummary,
    resolveDirectoryRootId: (directoryId) => rootBoxIdFromFolder(state, directoryId),
    previewImport,
    confirmImport,
    onPreviewSuccess: async (preview) => {
      importState.lastPreview = preview;
      syncImportSelection(preview.importRecordId, preview.candidatePreview, preview.candidateSelection || null, {
        selectedIds: defaultSelectedCandidateIds(
          preview.candidatePreview,
          preview.candidateSelection || null,
          preview.originalityGuard || null
        )
      });
      setImportRecordId(preview.importRecordId);
      showImportResult({
        stage: "preview",
        importRecordId: preview.importRecordId,
        connector: preview.connector,
        status: preview.status,
        summary: preview.summary,
        candidatePreview: preview.candidatePreview,
        candidateSelection: preview.candidateSelection || null,
        warnings: preview.warnings,
        originalityGuard: preview.originalityGuard
      });
    },
    onConfirmSuccess: async ({ importRecordId, result, preview }) => {
      setImportRecordId(importRecordId);
      const targetDirectoryId = confirmedImportTargetDirectoryId(result, preferredImportDirectoryId(importState.directoryId));
      if (targetDirectoryId && folderById(state, targetDirectoryId)) {
        importState.directoryId = targetDirectoryId;
        state.selectedFolderId = targetDirectoryId;
        state.browserRootId = rootBoxIdFromFolder(state, targetDirectoryId);
        await syncNotesForDirectory(targetDirectoryId);
      }
      showImportResult({
        stage: "confirm",
        importRecordId,
        status: result.status,
        result: result.result,
        originalityGuard: result.originalityGuard,
        candidatePreview: preview?.candidatePreview || null
      });
      importState.lastPreview = null;
    },
    showImportResult,
    refreshImportedNotesView,
    setStatus
  });

  renderImportToolbar();
  bindImportWorkspaceEvents({ ...deps, importToolbarActions });
  try {
    await initializeAppRoute(deps);
    renderAll();
    await openInitialStartupRoute({
      ...deps,
      usingLocalFallbackData: getUsingLocalFallbackData()
    });
  } catch (error) {
    setUsingLocalFallbackData(false);
    activateModule("today");
    renderAll();
    setStatus(
      `\u7814\u601d\u5f55\u542f\u52a8\u6ca1\u6709\u5b8c\u6210\uff0c\u90e8\u5206\u6309\u94ae\u53ef\u80fd\u6682\u65f6\u4e0d\u53ef\u7528\u3002\u8bf7\u5148\u5173\u95ed\u6b63\u5728\u8fd0\u884c\u7684\u5176\u4ed6\u7814\u601d\u5f55\u7a97\u53e3\uff0c\u518d\u91cd\u65b0\u6253\u5f00\u3002${String(error?.message || error) ? ` \u8bca\u65ad\uff1a${String(error?.message || error)}` : ""}`,
      "bad",
      { force: true, holdMs: 10000, priority: 5 }
    );
  }
  if (updateController) {
    setTimeout(async () => {
      await updateController.refreshAppVersionInfo();
      await updateController.runAppUpdateCheck({ manual: false });
    }, 1200);
  }
}
