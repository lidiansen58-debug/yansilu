const CONNECTOR_OPTIONS = [
  { value: "obsidian", label: "Obsidian 仓库" }
];

export function importConnectorOptions() {
  return CONNECTOR_OPTIONS.map((option) => ({ ...option }));
}

export function importConnectorFilterOptions() {
  return [{ value: "all", label: "全部来源" }, ...importConnectorOptions()];
}

export function importConnectorLabel(connector) {
  const value = String(connector || "").trim();
  const known = CONNECTOR_OPTIONS.find((option) => option.value === value)?.label;
  if (known) return known;
  if (!value) return "导入";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
