import { importConnectorOptions as connectorOptions } from "./import-connector-labels.js";

export function importConnectorOptions() {
  return connectorOptions();
}

export function importConfirmButtonState({ selectedCount = 0, totalCount = 0, hasMatchingPreview = false } = {}) {
  if (!hasMatchingPreview) {
    return {
      disabled: false,
      label: "确认导入"
    };
  }

  if (totalCount === 0) {
    return {
      disabled: true,
      label: "没有可导入候选"
    };
  }

  return {
    disabled: selectedCount === 0,
    label: `确认导入（${selectedCount}/${totalCount}）`
  };
}

export function preferredImportDirectoryIdFromOptions({
  currentValue = "",
  selectedFolderId = "",
  directoryOptions = [],
  rootIdForDirectory = () => ""
} = {}) {
  const options = Array.isArray(directoryOptions) ? directoryOptions : [];
  const cleanCurrentValue = String(currentValue || "").trim();
  if (options.some((folder) => folder.id === cleanCurrentValue)) return cleanCurrentValue;
  const cleanSelectedFolderId = String(selectedFolderId || "").trim();
  if (
    rootIdForDirectory(cleanSelectedFolderId) === "dir_original_default" &&
    options.some((folder) => folder.id === cleanSelectedFolderId)
  ) {
    return cleanSelectedFolderId;
  }
  return options.some((folder) => folder.id === "dir_original_default") ? "dir_original_default" : options[0]?.id || "";
}

export function importToolbarViewModel({
  connector = "obsidian",
  directoryId = "",
  directoryOptions = [],
  path = "",
  payload = "",
  options = "",
  importRecordId = "",
  confirmButton = null
} = {}) {
  return {
    connector: String(connector || "obsidian").trim() || "obsidian",
    directoryId: String(directoryId || "").trim(),
    directoryOptions: Array.isArray(directoryOptions) ? directoryOptions : [],
    path: String(path || ""),
    payload: String(payload || ""),
    options: String(options || ""),
    importRecordId: String(importRecordId || ""),
    confirmButton:
      confirmButton ||
      {
        disabled: false,
        label: "确认导入"
      }
  };
}
