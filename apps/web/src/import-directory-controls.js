export function createImportDirectoryControls(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};

  function syncExportDirectoryOptions(preferredDirectoryId = "") {
    const current = deps();
    const select = current.$("exportDirectoryId");
    if (!select) return;
    const options = current.permanentExportDirectories();
    const currentValue = String(preferredDirectoryId || select.value || "").trim();
    const preferredValue = options.some(folder => folder.id === currentValue)
      ? currentValue
      : options.some(folder => folder.id === String(current.state.selectedFolderId || "").trim())
        ? String(current.state.selectedFolderId || "").trim()
        : options[0]?.id || "dir_original_default";
    select.innerHTML = options
      .map(folder => `<option value="${current.escapeHtml(folder.id)}">${current.escapeHtml(current.directoryPathLabel(folder.id))}</option>`)
      .join("");
    if (!options.length) select.innerHTML = '<option value="dir_original_default">永久笔记盒</option>';
    select.value = preferredValue;
    updateExportTargetHint();
  }

  function syncImportDirectoryOptions() {
    const current = deps();
    const select = current.$("importDirectoryId");
    if (!select) return;
    const selected = current.preferredImportDirectoryId(String(select.value || "").trim());
    const markup = current.importTargetDirectories()
      .map(folder => `<option value="${current.escapeHtml(folder.id)}">${current.escapeHtml(current.directoryPathLabel(folder.id))}</option>`)
      .join("");
    if (select.innerHTML !== markup) select.innerHTML = markup;
    select.value = selected;
  }

  function selectedExportDirectoryLabel() {
    const current = deps();
    const directoryId = String(current.$("exportDirectoryId")?.value || "").trim();
    return directoryId ? current.directoryPathLabel(directoryId) : "";
  }

  function updateExportTargetHint() {
    const current = deps();
    const hint = current.$("exportTargetHint");
    if (!hint) return;
    const targetPath = String(current.$("exportTargetPath")?.value || "").trim();
    const directoryLabel = selectedExportDirectoryLabel() || "永久笔记盒";
    hint.textContent = targetPath
      ? `将从 ${directoryLabel} 导出，写入 ${targetPath}。`
      : `将从 ${directoryLabel} 导出。首次导出时再选择保存位置。`;
  }

  return { selectedExportDirectoryLabel, syncExportDirectoryOptions, syncImportDirectoryOptions, updateExportTargetHint };
}
