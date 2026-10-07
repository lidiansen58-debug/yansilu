import { bindImportWorkspaceEventsForRuntime } from "./app-event-bindings.js";
import { createAppStartupRetryController } from "./app-startup-retry-controller.js";
import { createImportPreviewResumeController } from "./import-preview-resume-controller.js";

export async function bootstrapAppForRuntime(deps = {}) {
  const {
    state = {},
    importState = {},
    setUsingLocalFallbackData = () => {},
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
    bindImportWorkspaceEvents = bindImportWorkspaceEventsForRuntime,
    setStatus = () => {}
  } = deps;

  setUsingLocalFallbackData(false);
  state.appStartupPending = true;
  renderImportPageShell();
  const resumeImportPreview = createImportPreviewResumeController({ importState, getToolbarValues: currentImportToolbarValues,
    getVaultPath: deps.getVaultPath, readImportRecord: deps.fetchImportRecord, showImportResult, setStatus,
    checkpoint: deps.checkpointImportWorkspace, clearCache: deps.clearImportWorkspaceCache });
  const importToolbarActions = createImportToolbarActions({
    getToolbarValues: currentImportToolbarValues,
    getFallbackImportRecordId: () => importState.importRecordId,
    getActivePreview: () => activeImportPreviewContext(),
    selectionSummary,
    resolveDirectoryRootId: (directoryId) => rootBoxIdFromFolder(state, directoryId),
    previewImport,
    resumeImportPreview,
    confirmImport,
    onPreviewSuccess: async (preview, { values } = {}) => {
      importState.lastPreview = preview;
      importState.previewRequest = values || currentImportToolbarValues();
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
      importState.previewRequest = null;
      deps.clearImportWorkspaceCache?.();
      deps.checkpointImportWorkspace?.();
    },
    showImportResult,
    refreshImportedNotesView,
    setStatus
  });

  renderImportToolbar();
  bindImportWorkspaceEvents({ ...deps, importToolbarActions });
  state.retryStartupConnection = createAppStartupRetryController({ ...deps, state });
  await state.retryStartupConnection();
}
