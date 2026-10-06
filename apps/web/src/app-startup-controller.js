import { bindImportWorkspaceEventsForRuntime } from "./app-event-bindings.js";
import { initializeAppRouteForRuntime } from "./app-route-initializer.js";
import { openInitialStartupRouteForRuntime } from "./app-startup-seed.js";
import { initializeStartupConnection } from "./app-startup-connection.js";

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
  state.appStartupPending = true;
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
  let connecting = null;
  const connect = async () => {
    state.appStartupPending = true;
    state.appStartupError = "";
    deps.resetDesktopServiceStatusCache?.();
    renderAll();
    try {
      const connection = await initializeStartupConnection(deps, initializeAppRoute);
      state.appStartupPending = false;
      if (connection?.connected === false && !connection?.usingLocalFallbackData) {
        state.appStartupError = connection.error?.serviceStatus?.startupWaitTimedOut
          ? "本地服务准备超时，请重新连接。"
          : String(connection.error?.message || "本地服务尚未就绪，请重新连接。");
        renderAll();
        return false;
      }
      renderAll();
      await openInitialStartupRoute({
        ...deps,
        usingLocalFallbackData: getUsingLocalFallbackData()
      });
      return true;
    } catch (error) {
      state.appStartupPending = false;
      state.appStartupError = String(error?.message || error);
      setUsingLocalFallbackData(false);
      activateModule("today");
      renderAll();
      setStatus(`启动未完成：${state.appStartupError}。请点击重新连接。`, "bad", { force: true, holdMs: 10000, priority: 5 });
      return false;
    }
  };
  state.retryStartupConnection = () => {
    if (!connecting) connecting = connect().finally(() => { connecting = null; });
    return connecting;
  };
  if (!await state.retryStartupConnection()) return;
  if (updateController) {
    setTimeout(async () => {
      await updateController.refreshAppVersionInfo();
      await updateController.runAppUpdateCheck({ manual: false });
    }, 1200);
  }
}
