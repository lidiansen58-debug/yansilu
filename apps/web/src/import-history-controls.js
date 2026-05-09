function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "preview", label: "preview" },
  { value: "completed", label: "completed" },
  { value: "rolled_back", label: "rolled_back" },
  { value: "cancelled", label: "cancelled" }
];

const CONNECTOR_OPTIONS = [
  { value: "all", label: "全部连接器" },
  { value: "markdown", label: "markdown" },
  { value: "obsidian", label: "obsidian" },
  { value: "zotero", label: "zotero" },
  { value: "readwise", label: "readwise" },
  { value: "notebooklm", label: "notebooklm" }
];

const RISK_OPTIONS = [
  { value: "all", label: "全部风险" },
  { value: "warning", label: "warning" },
  { value: "blocked", label: "blocked" },
  { value: "modified", label: "modified" }
];

function renderSelectOptions(options, selectedValue) {
  return options
    .map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
    .join("");
}

export function renderImportHistoryControls({ filters = {} } = {}) {
  const status = String(filters.status || "all").trim();
  const connector = String(filters.connector || "all").trim();
  const risk = String(filters.risk || "all").trim();

  return `
    <div class="import-history-controls">
      <label>
        <span>状态</span>
        <select id="importHistoryStatus">
          ${renderSelectOptions(STATUS_OPTIONS, status)}
        </select>
      </label>
      <label>
        <span>连接器</span>
        <select id="importHistoryConnector">
          ${renderSelectOptions(CONNECTOR_OPTIONS, connector)}
        </select>
      </label>
      <label>
        <span>风险</span>
        <select id="importHistoryRisk">
          ${renderSelectOptions(RISK_OPTIONS, risk)}
        </select>
      </label>
      <button class="mini-btn" id="btnImportHistoryRefresh" type="button">刷新历史</button>
    </div>
  `;
}
