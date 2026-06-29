export function createDirectoryOptionRuntime(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};

  function directoryPathLabel(directoryId) {
    return deps().directoryPathLabel(directoryId);
  }

  function permanentExportDirectories() {
    const current = deps();
    return current.state.folders
      .filter((folder) => folder?.id && current.isDirectoryUnderOriginalRoot(folder.id))
      .sort((a, b) => directoryPathLabel(a.id).localeCompare(directoryPathLabel(b.id), "zh-Hans-CN"));
  }

  function defaultPermanentDirectoryId() {
    const current = deps();
    const lastChosenPermanentDirectoryId = current.lastChosenPermanentDirectoryId();
    if (current.isDirectoryUnderOriginalRoot(current.state.selectedFolderId)) return current.state.selectedFolderId;
    if (current.isDirectoryUnderOriginalRoot(lastChosenPermanentDirectoryId)) return lastChosenPermanentDirectoryId;
    return permanentExportDirectories()[0]?.id || "";
  }

  function permanentDirectoryDialogOptions() {
    return permanentExportDirectories().map((folder) => ({
      id: folder.id,
      label: directoryPathLabel(folder.id),
      hint:
        folder.id === "dir_original_default"
          ? "会在永久笔记盒根目录创建，之后可以再移动整理。"
          : `会在这个目录创建，创建后直接打开继续编辑。`
    }));
  }

  function noteMoveDirectoryOptions(currentDirectoryId = "") {
    const current = deps();
    const currentFolder = current.folderById(current.state, currentDirectoryId);
    const rootId = currentFolder ? current.rootBoxIdFromFolder(current.state, currentFolder.id) : "";
    return current.state.folders
      .filter((folder) => folder?.id && !folder.hidden && folder.id !== currentDirectoryId && current.rootBoxIdFromFolder(current.state, folder.id) === rootId)
      .sort((a, b) => directoryPathLabel(a.id).localeCompare(directoryPathLabel(b.id), "zh-Hans-CN"))
      .map((folder) => ({
        id: folder.id,
        label: directoryPathLabel(folder.id),
        hint: `移动后会放到“${current.displayFolderName(folder)}”目录。`
      }));
  }

  function importTargetDirectories() {
    const current = deps();
    return current.state.folders
      .filter((folder) => folder?.id && !folder.hidden && ["dir_fleeting_default", "dir_literature_default", "dir_original_default"].includes(current.rootBoxIdFromFolder(current.state, folder.id)))
      .sort((a, b) => directoryPathLabel(a.id).localeCompare(directoryPathLabel(b.id), "zh-Hans-CN"));
  }

  function preferredImportDirectoryId(currentValue = "") {
    const current = deps();
    return current.preferredImportDirectoryIdFromOptions({
      currentValue,
      selectedFolderId: current.state.selectedFolderId,
      directoryOptions: importTargetDirectories(),
      rootIdForDirectory: (directoryId) => current.rootBoxIdFromFolder(current.state, directoryId)
    });
  }

  function confirmedImportTargetDirectoryId(result = {}, fallbackDirectoryId = "") {
    const targetDirectories = Array.isArray(result?.result?.targetDirectories) ? result.result.targetDirectories : [];
    if (targetDirectories.length === 1) return String(targetDirectories[0]?.directoryId || "").trim();
    if (targetDirectories.length > 1) {
      const fallback = String(fallbackDirectoryId || "").trim();
      if (targetDirectories.some((item) => String(item?.directoryId || "").trim() === fallback)) return fallback;
      return "";
    }
    return "";
  }

  function syncExportDirectoryOptions() {
    const current = deps();
    const select = current.$("exportDirectoryId");
    if (!select) return;
    const options = permanentExportDirectories();
    const currentValue = String(select.value || "").trim();
    const preferredValue =
      options.some((folder) => folder.id === currentValue)
        ? currentValue
        : options.some((folder) => folder.id === String(current.state.selectedFolderId || "").trim())
          ? String(current.state.selectedFolderId || "").trim()
          : options[0]?.id || "dir_original_default";

    select.innerHTML = options
      .map((folder) => `<option value="${current.escapeHtml(folder.id)}">${current.escapeHtml(directoryPathLabel(folder.id))}</option>`)
      .join("");
    if (!options.length) {
      select.innerHTML = `<option value="dir_original_default">永久笔记盒</option>`;
    }
    select.value = preferredValue;
    updateExportTargetHint();
  }

  function selectedExportDirectoryLabel() {
    const current = deps();
    const directoryId = String(current.$("exportDirectoryId")?.value || "").trim();
    if (!directoryId) return "";
    return directoryPathLabel(directoryId);
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

  return {
    confirmedImportTargetDirectoryId,
    defaultPermanentDirectoryId,
    importTargetDirectories,
    noteMoveDirectoryOptions,
    permanentDirectoryDialogOptions,
    permanentExportDirectories,
    preferredImportDirectoryId,
    selectedExportDirectoryLabel,
    syncExportDirectoryOptions,
    updateExportTargetHint
  };
}
