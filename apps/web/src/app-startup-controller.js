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
  await initializeAppRoute(deps);
  renderAll();
  await openInitialStartupRoute({
    ...deps,
    usingLocalFallbackData: getUsingLocalFallbackData()
  });
  if (updateController) {
    setTimeout(async () => {
      await updateController.refreshAppVersionInfo();
      await updateController.runAppUpdateCheck({ manual: false });
    }, 1200);
  }
}
