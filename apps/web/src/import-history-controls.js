import { importConnectorFilterOptions } from "./import-connector-labels.js";

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
  { value: "preview", label: "预览中" },
  { value: "completed", label: "已完成" },
  { value: "rolled_back", label: "已回滚" },
  { value: "cancelled", label: "已取消" }
];

const RISK_OPTIONS = [
  { value: "all", label: "全部风险" },
  { value: "warning", label: "有警告" },
  { value: "blocked", label: "有阻断" },
  { value: "modified", label: "回滚保留" }
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
  const hasActiveFilter = status !== "all" || connector !== "all" || risk !== "all";
  const activeFilterText = [
    STATUS_OPTIONS.find((option) => option.value === status)?.label || "全部状态",
    importConnectorFilterOptions().find((option) => option.value === connector)?.label || "全部连接器",
    RISK_OPTIONS.find((option) => option.value === risk)?.label || "全部风险"
  ].join(" / ");

  return `
    <details class="import-history-filter" id="importHistoryFilter"${hasActiveFilter ? " open" : ""}>
      <summary>
        <span>筛选历史</span>
        <small>${escapeHtml(activeFilterText)}</small>
      </summary>
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
            ${renderSelectOptions(importConnectorFilterOptions(), connector)}
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
    </details>
  `;
}
