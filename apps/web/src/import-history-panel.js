import {
  filterImportHistoryItems,
  formatImportTimestamp,
  importHistoryActions,
  importHistoryConnectorLabel,
  importHistorySummary,
  importStatusLabel,
  importStatusTone
} from "./import-history-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderImportHistoryItem(record, activeImportRecordId) {
  const recordId = String(record.importRecordId || "").trim();
  const status = String(record.status || record.state || "").trim();
  const actions = importHistoryActions(record).slice(0, 2);

  return `
    <div class="import-history-item ${recordId && recordId === activeImportRecordId ? "is-active" : ""}" data-import-history-id="${escapeHtml(recordId)}">
      <div class="import-history-item-head compact">
        <strong>${escapeHtml(importHistoryConnectorLabel(record.connector || "import"))}</strong>
        <span class="import-history-badge tone-${escapeHtml(importStatusTone(status))}">${escapeHtml(importStatusLabel(status))}</span>
      </div>
      <div class="import-history-item-meta">
        <span>${escapeHtml(importHistorySummary(record))}</span>
        <span>${escapeHtml(formatImportTimestamp(record.updatedAt || record.createdAt))}</span>
      </div>
      <div class="import-history-actions">
        ${actions
          .map(
            (item) => `
              <button class="mini-btn import-history-action" type="button" data-import-history-action="${escapeHtml(item.action)}" data-import-history-id="${escapeHtml(recordId)}">
                ${escapeHtml(item.label)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

export function renderImportHistoryPanel({
  items = [],
  total = 0,
  loading = false,
  activeImportRecordId = "",
  filters = {}
} = {}) {
  const allItems = Array.isArray(items) ? items : [];
  if (loading) return `<div class="import-history-empty">正在读取导入记录...</div>`;
  if (!allItems.length) return `<div class="import-history-empty">还没有导入记录。</div>`;

  const filteredItems = filterImportHistoryItems(allItems, filters);
  if (!filteredItems.length) return `<div class="import-history-empty">当前筛选下没有导入记录。</div>`;

  const visibleItems = filteredItems.slice(0, 6);
  const summaryText = total > visibleItems.length ? `显示 ${visibleItems.length} / ${total}` : `显示 ${visibleItems.length}`;
  return `
    <div class="import-history-list compact">
      ${visibleItems.map((record) => renderImportHistoryItem(record, String(activeImportRecordId || "").trim())).join("")}
    </div>
    <div class="toolbar-note">${escapeHtml(summaryText)}</div>
  `;
}
