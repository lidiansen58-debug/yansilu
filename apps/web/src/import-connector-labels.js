const CONNECTOR_OPTIONS = [
  { value: "markdown", label: "Markdown" },
  { value: "obsidian", label: "Obsidian" },
  { value: "zotero", label: "Zotero" },
  { value: "readwise", label: "Readwise" },
  { value: "notebooklm", label: "NotebookLM" }
];

export function importConnectorOptions() {
  return CONNECTOR_OPTIONS.map((option) => ({ ...option }));
}

export function importConnectorFilterOptions() {
  return [{ value: "all", label: "全部连接器" }, ...importConnectorOptions()];
}

export function importConnectorLabel(connector) {
  const value = String(connector || "").trim();
  return CONNECTOR_OPTIONS.find((option) => option.value === value)?.label || value || "Import";
}
