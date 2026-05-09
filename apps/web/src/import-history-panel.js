import {
  filterImportHistoryItems,
  formatImportTimestamp,
  importHistoryActions,
  importHistoryAlertBadges,
  importHistoryDetailSummary,
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
  const actions = importHistoryActions(record);
  const badges = importHistoryAlertBadges(record);
  const details = importHistoryDetailSummary(record);

  return `
    <div class="import-history-item ${recordId && recordId === activeImportRecordId ? "is-active" : ""}" data-import-history-id="${escapeHtml(recordId)}">
      <div class="import-history-item-head">
        <strong>${escapeHtml(record.connector || "import")}</strong>
        <div class="import-history-badge-row">
          <span class="import-history-badge tone-${escapeHtml(importStatusTone(status))}">${escapeHtml(importStatusLabel(status))}</span>
          ${badges
            .map(
              (item) => `
                <span class="import-history-badge tone-${escapeHtml(item.tone)}">${escapeHtml(item.text)}</span>
              `
            )
            .join("")}
        </div>
      </div>
      <div class="import-history-item-id">${escapeHtml(recordId)}</div>
      <div class="import-history-item-meta">
        <span>${escapeHtml(importHistorySummary(record))}</span>
        <span>${escapeHtml(formatImportTimestamp(record.updatedAt || record.createdAt))}</span>
      </div>
      ${
        details.length
          ? `<div class="import-history-detail">
              ${details.map((item) => `<div class="import-history-detail-line">${escapeHtml(item)}</div>`).join("")}
            </div>`
          : ""
      }
      <div class="import-history-actions">
        ${actions
          .map(
            (item) => `
              <button class="mini-btn import-history-action" type="button" data-import-history-action="${escapeHtml(item.action)}" data-import-history-id="${escapeHtml(
                recordId
              )}">
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
  if (loading) {
    return `<div class="import-history-empty">正在读取导入历史…</div>`;
  }
  if (!allItems.length) {
    return `<div class="import-history-empty">还没有导入记录。先预览一次 Markdown/Obsidian 导入，这里就会出现历史。</div>`;
  }

  const filteredItems = filterImportHistoryItems(allItems, filters);
  if (!filteredItems.length) {
    return `
      <div class="import-history-empty">当前筛选条件下没有导入记录。试试切回“全部状态”或“全部连接器”。</div>
      <div class="toolbar-note">共 ${allItems.length} 条历史记录，当前过滤后为 0 条。</div>
    `;
  }

  return `
    <div class="import-history-list">
      ${filteredItems.map((record) => renderImportHistoryItem(record, String(activeImportRecordId || "").trim())).join("")}
    </div>
    <div class="toolbar-note">当前显示 ${filteredItems.length} 条${allItems.length !== filteredItems.length ? ` / 已加载 ${allItems.length} 条` : ""}${total > allItems.length ? ` / 共 ${total} 条` : ""}。</div>
  `;
}
