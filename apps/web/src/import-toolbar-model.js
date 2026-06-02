import { importConnectorOptions as connectorOptions } from "./import-connector-labels.js";

export function importConnectorOptions() {
  return connectorOptions();
}

export function importConfirmButtonState({ selectedCount = 0, totalCount = 0, hasMatchingPreview = false } = {}) {
  if (!hasMatchingPreview) {
    return {
      disabled: false,
      label: "确认写入"
    };
  }

  return {
    disabled: totalCount > 0 && selectedCount === 0,
    label: `确认写入（${selectedCount}/${totalCount}）`
  };
}

export function importToolbarViewModel({
  connector = "markdown",
  directoryId = "",
  directoryOptions = [],
  path = "",
  payload = "",
  options = "",
  importRecordId = "",
  confirmButton = null
} = {}) {
  return {
    connector: String(connector || "markdown").trim() || "markdown",
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
        label: "确认写入"
      }
  };
}
