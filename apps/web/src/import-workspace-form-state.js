export function readImportToolbarValues(getElement, importState = {}) {
  return {
    connector: String(getElement("importConnector")?.value || "obsidian").trim(),
    directoryId: String(getElement("importDirectoryId")?.value || importState.directoryId || "").trim(),
    path: String(getElement("importPath")?.value || "").trim(),
    payload: String(getElement("importPayload")?.value || ""),
    options: String(getElement("importOptions")?.value || ""),
    importRecordId: String(getElement("importRecordId")?.value || importState.importRecordId || "").trim()
  };
}

export function syncImportWorkspaceTabs(getElement, activeTab, normalizeTab) {
  const mount = getElement("importPageMount");
  if (!mount) return;
  const selectedTab = normalizeTab(activeTab);
  mount.setAttribute("data-import-workspace-tab", selectedTab);
  mount.querySelectorAll("[data-import-workspace-tab]").forEach(button => {
    const isActive = normalizeTab(button.getAttribute("data-import-workspace-tab")) === selectedTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.setAttribute("tabindex", isActive ? "0" : "-1");
  });
  const importPanel = getElement("importToolbarMount");
  const exportPanel = getElement("exportCardMount");
  if (importPanel) importPanel.hidden = selectedTab !== "import";
  if (exportPanel) exportPanel.hidden = selectedTab !== "export";
}
