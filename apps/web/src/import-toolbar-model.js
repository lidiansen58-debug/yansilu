const CONNECTOR_OPTIONS = [
  { value: "markdown", label: "markdown" },
  { value: "obsidian", label: "obsidian" },
  { value: "zotero", label: "zotero" },
  { value: "readwise", label: "readwise" },
  { value: "notebooklm", label: "notebooklm" }
];

export function importConnectorOptions() {
  return CONNECTOR_OPTIONS.map((option) => ({ ...option }));
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
  path = "",
  payload = "",
  options = "",
  importRecordId = "",
  confirmButton = null
} = {}) {
  return {
    connector: String(connector || "markdown").trim() || "markdown",
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
