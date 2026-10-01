import { persistImportWorkspace, restoreImportWorkspace } from "./import-workspace-recovery.js";

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
  mountExportCardIntoImportShell = () => {}
} = {}) {
  let loadedVault = "", restoredValues = null;
  function restore() {
    const vault = getVaultPath();
    if (!vault || vault === loadedVault) return null;
    if (loadedVault) {
      importState.importRecordId = "";
      importState.lastPreview = null;
      importState.lastResultPayload = null;
      importState.lastExportResultPayload = null;
      importState.operationResultVisible = false;
      importState.selectionImportRecordId = "";
      importState.selectedCandidateIds = new Set();
    }
    loadedVault = vault;
    try { restoredValues = restoreImportWorkspace(getStorage(), vault, importState); }
    catch { setStatus("本机导入恢复记录无法读取，请重新核对预览。", "warn"); restoredValues = null; }
    return restoredValues || { importRecordId: "", path: "", payload: "", options: "", directoryId: "dir_original_default" };
  }
  function checkpoint(values) {
    if (!getVaultPath()) return;
    try { persistImportWorkspace(getStorage(), getVaultPath(), importState, values); }
    catch { setStatus("导入页面的本机恢复记录保存失败，请勿刷新页面。", "warn"); }
  }
  function currentToolbarValues() {
    return {
      connector: String(getElement("importConnector")?.value || "obsidian").trim(),
      directoryId: String(getElement("importDirectoryId")?.value || importState.directoryId || "").trim(),
      path: String(getElement("importPath")?.value || "").trim(),
      payload: String(getElement("importPayload")?.value || ""),
      options: String(getElement("importOptions")?.value || ""),
      importRecordId: String(getElement("importRecordId")?.value || importState.importRecordId || "").trim()
    };
  }

  function renderToolbar() {
    const el = getElement("importToolbarMount");
    if (!el) return;
    const values = restore() || currentToolbarValues();
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
    checkpoint(values);
  }

  function syncTabs() {
    const mount = getElement("importPageMount");
    if (!mount) return;
    const activeTab = normalizeImportWorkspaceTab(importState.activeTab);
    mount.setAttribute("data-import-workspace-tab", activeTab);
    mount.querySelectorAll("[data-import-workspace-tab]").forEach((button) => {
      const buttonTab = normalizeImportWorkspaceTab(button.getAttribute("data-import-workspace-tab"));
      const isActive = buttonTab === activeTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
    const importPanel = getElement("importToolbarMount");
    const exportPanel = getElement("exportCardMount");
    if (importPanel) importPanel.hidden = activeTab !== "import";
    if (exportPanel) exportPanel.hidden = activeTab !== "export";
  }

  function renderPage() {
    const el = getElement("importPageMount");
    if (!el) return;
    const toolbar = restore() || currentToolbarValues();
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
    syncTabs();
  }

  function setTab(tab = "import") {
    importState.activeTab = normalizeImportWorkspaceTab(tab);
    syncTabs();
  }

  return {
    checkpoint: () => checkpoint(currentToolbarValues()),
    currentToolbarValues,
    normalizeTab: normalizeImportWorkspaceTab,
    renderPage,
    renderToolbar,
    setTab,
    syncTabs
  };
}
