export function normalizeImportWorkspaceTab(tab = "import") {
  return String(tab || "").trim().toLowerCase() === "export" ? "export" : "import";
}

export function createImportWorkspaceShellController({
  getElement = () => null,
  importState = {},
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
    const values = currentToolbarValues();
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
    el.innerHTML = renderImportPageMount({
      toolbar: currentToolbarValues(),
      activeTab: importState.activeTab,
      result: importState.lastResultPayload
        ? {
            data: importState.lastResultPayload,
            raw: JSON.stringify(importState.lastResultPayload, null, 2)
          }
        : null
    });
    mountExportCardIntoImportShell();
    syncTabs();
  }

  function setTab(tab = "import") {
    importState.activeTab = normalizeImportWorkspaceTab(tab);
    syncTabs();
  }

  return {
    currentToolbarValues,
    normalizeTab: normalizeImportWorkspaceTab,
    renderPage,
    renderToolbar,
    setTab,
    syncTabs
  };
}
