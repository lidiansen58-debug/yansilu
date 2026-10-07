import { createImportWorkspaceRecovery } from "./import-workspace-recovery.js";
import { readImportToolbarValues, syncImportWorkspaceTabs } from "./import-workspace-form-state.js";
import { syncImportPreviewEntry } from "./import-preview-resume-model.js";

export function normalizeImportWorkspaceTab(tab = "import") {
  return String(tab || "").trim().toLowerCase() === "export" ? "export" : "import";
}

export function createImportWorkspaceShellController({
  getElement = () => null,
  importState = {},
  getVaultPath = () => "",
  getStorage = () => null,
  setStatus = () => {},
  renderImportPageMount,
  renderImportToolbarMount,
  preferredImportDirectoryId = (value) => value,
  activeImportPreviewContext = () => null,
  selectionSummary = () => ({ selectedCount: 0, totalCount: 0 }),
  importConfirmButtonState = () => ({ disabled: false, label: "确认导入" }),
  importTargetDirectories = () => [],
  directoryPathLabel = (directoryId) => directoryId,
  mountExportCardIntoImportShell = () => {},
  syncDirectoryOptions = () => {}
} = {}) {
  const recovery = createImportWorkspaceRecovery({ getVaultPath, getStorage, importState, setStatus });
  let mountedVault = null;
  function currentToolbarValues() {
    return readImportToolbarValues(getElement, importState);
  }

  function renderToolbar() {
    const el = getElement("importToolbarMount");
    if (!el) return;
    const values = recovery.restore() || currentToolbarValues();
    importState.directoryId = preferredImportDirectoryId(values.directoryId);
    const preview = activeImportPreviewContext();
    const hasMatchingPreview = Boolean(preview?.candidatePreview && preview.importRecordId === values.importRecordId);
    const summary = hasMatchingPreview
      ? selectionSummary(preview.candidatePreview, values.importRecordId, null, preview.candidateSelection || null)
      : { selectedCount: 0, totalCount: 0 };
    const confirmButton = importConfirmButtonState({
      hasMatchingPreview,
      selectedCount: summary.selectedCount,
      totalCount: summary.totalCount
    });

    el.innerHTML = renderImportToolbarMount({
      ...values,
      directoryId: importState.directoryId,
      directoryOptions: importTargetDirectories().map((folder) => ({
        value: folder.id,
        label: directoryPathLabel(folder.id)
      })),
      confirmButton
    });
    recovery.checkpoint(values);
    syncImportPreviewEntry(getElement, importState, values);
  }

  function syncTabs() {
    syncImportWorkspaceTabs(getElement, importState.activeTab, normalizeImportWorkspaceTab);
  }

  function renderPage({ preserveMounted = false } = {}) {
    const el = getElement("importPageMount");
    if (!el) return false;
    const vault = getVaultPath();
    // Background settings updates must not remount a live form or preview.
    if (preserveMounted && mountedVault === vault && el.querySelector?.("#importToolbarMount")) {
      syncDirectoryOptions();
      return false;
    }
    const exportValues = mountedVault === vault ? {
      directoryId: getElement("exportDirectoryId")?.value,
      targetPath: getElement("exportTargetPath")?.value
    } : null;
    const toolbar = recovery.restore() || currentToolbarValues();
    el.innerHTML = renderImportPageMount({
      toolbar,
      activeTab: importState.activeTab,
      resultVisible: importState.operationResultVisible === true,
      resultMode: importState.operationResultMode,
      exportResult: importState.lastExportResultPayload
        ? { data: importState.lastExportResultPayload, raw: JSON.stringify(importState.lastExportResultPayload, null, 2) } : null,
      result: importState.lastResultPayload
        ? {
            data: importState.lastResultPayload,
            raw: JSON.stringify(importState.lastResultPayload, null, 2)
          }
        : null
    });
    renderToolbar();
    mountExportCardIntoImportShell();
    const exportTarget = getElement("exportTargetPath");
    if (exportTarget) exportTarget.value = exportValues?.targetPath || "";
    syncDirectoryOptions({ exportDirectoryId: exportValues?.directoryId || "" });
    syncTabs();
    mountedVault = vault;
    return true;
  }

  function setTab(tab = "import") {
    importState.activeTab = normalizeImportWorkspaceTab(tab);
    syncTabs();
  }

  return {
    checkpoint: () => { const values = currentToolbarValues(); recovery.checkpoint(values); syncImportPreviewEntry(getElement, importState, values); },
    clearCache: recovery.clear,
    currentToolbarValues,
    normalizeTab: normalizeImportWorkspaceTab,
    renderPage,
    renderToolbar,
    setTab,
    syncTabs
  };
}
