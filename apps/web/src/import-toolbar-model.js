import { importConnectorOptions as connectorOptions } from "./import-connector-labels.js";

export function importConnectorOptions() {
  return connectorOptions();
}

export function importConfirmButtonState({ selectedCount = 0, totalCount = 0, hasMatchingPreview = false } = {}) {
  if (!hasMatchingPreview) {
    return {
      disabled: false,
      label: "Confirm Import"
    };
  }

  return {
    disabled: totalCount > 0 && selectedCount === 0,
    label: `Confirm Import (${selectedCount}/${totalCount})`
  };
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
        label: "Confirm Import"
      }
  };
}
