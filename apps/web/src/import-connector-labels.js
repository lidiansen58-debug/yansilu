const CONNECTOR_OPTIONS = [
  { value: "obsidian", label: "Obsidian" }
];

export function importConnectorOptions() {
  return CONNECTOR_OPTIONS.map((option) => ({ ...option }));
}

export function importConnectorFilterOptions() {
  return [{ value: "all", label: "全部连接器" }, ...importConnectorOptions()];
}

export function importConnectorLabel(connector) {
  const value = String(connector || "").trim();
  const known = CONNECTOR_OPTIONS.find((option) => option.value === value)?.label;
  if (known) return known;
  if (!value) return "Import";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
