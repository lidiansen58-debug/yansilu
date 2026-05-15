import {
  formatImportTimestamp,
  importHistoryAlertBadges,
  importHistoryConnectorLabel,
  importHistoryQueueProgressText,
  importHistoryRiskHint,
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

function recordTimeValue(record = {}) {
  const time = new Date(record.updatedAt || record.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function latestImportHistoryItem(items = []) {
  return (
    [...(Array.isArray(items) ? items : [])]
      .filter((item) => item && typeof item === "object")
      .sort((left, right) => recordTimeValue(right) - recordTimeValue(left))[0] || null
  );
}

function summaryActions(record = {}) {
  const status = String(record.status || record.state || "").trim();
  const remaining = Number(record.literatureBatchProgress?.remaining || 0);
  const ready = Number(record.literatureBatchProgress?.ready || 0);
  const total = Number(record.literatureBatchProgress?.total || 0);
  if (status === "preview") return [{ action: "load", label: "继续查看候选" }];
  if (status === "completed" && remaining > 0) {
    return [
      { action: "resume-literature-queue", label: "继续待转述" },
      { action: "open-literature-queue", label: "打开文献队列" }
    ];
  }
  if (status === "completed" && remaining === 0 && ready > 0) {
    return [
      { action: "promote-literature-batch", label: "转去永久笔记整理" },
      { action: "open-literature-queue", label: "打开文献队列" }
    ];
  }
  if (status === "completed") {
    return total > 0 ? [{ action: "open-literature-queue", label: "查看文献队列" }] : [{ action: "load", label: "查看结果" }];
  }
  return [{ action: "load", label: "查看记录" }];
}

export function importHistoryRecentSummaryModel({ items = [], loading = false } = {}) {
  if (loading) {
    return {
      title: "最近导入",
      subtitle: "正在同步历史记录",
      detail: "刷新完成后会显示最近一次导入的状态、风险和下一步入口。",
      tone: "neutral",
      badges: [],
      actions: []
    };
  }

  const record = latestImportHistoryItem(items);
  if (!record) {
    return {
      title: "最近导入",
      subtitle: "暂无记录",
      detail: "先预览一次 Markdown 或 Obsidian 导入，这里会显示最近记录和恢复入口。",
      tone: "neutral",
      badges: [],
      actions: []
    };
  }

  const recordId = String(record.importRecordId || "").trim();
  const status = String(record.status || record.state || "").trim();
  const queueText = importHistoryQueueProgressText(record.literatureBatchProgress);
  const riskHint = importHistoryRiskHint(record);
  const detail = riskHint || queueText || importHistorySummary(record);
  const badges = importHistoryAlertBadges(record);
  const badgeTone = badges.some((item) => item.tone === "bad") ? "bad" : badges.some((item) => item.tone === "warn") ? "warn" : importStatusTone(status);

  return {
    recordId,
    title: `${importHistoryConnectorLabel(record.connector)} · ${importStatusLabel(status)}`,
    subtitle: `${recordId || "未记录 ID"} · ${formatImportTimestamp(record.updatedAt || record.createdAt)}`,
    detail,
    tone: badgeTone,
    badges,
    actions: summaryActions(record)
  };
}

export function renderImportHistoryRecentSummary(input = {}) {
  const model = importHistoryRecentSummaryModel(input);
  return `
    <div class="import-history-summary tone-${escapeHtml(model.tone || "neutral")}"${model.recordId ? ` data-import-history-id="${escapeHtml(model.recordId)}"` : ""}>
      <div class="import-history-summary-main">
        <div>
          <div class="import-history-summary-kicker">最近导入</div>
          <strong>${escapeHtml(model.title)}</strong>
          <div class="import-history-summary-subtitle">${escapeHtml(model.subtitle)}</div>
        </div>
        ${
          model.badges?.length
            ? `<div class="import-history-badge-row">${model.badges
                .map((item) => `<span class="import-history-badge tone-${escapeHtml(item.tone)}">${escapeHtml(item.text)}</span>`)
                .join("")}</div>`
            : ""
        }
      </div>
      <div class="import-history-summary-detail">${escapeHtml(model.detail)}</div>
      ${
        model.actions?.length && model.recordId
          ? `<div class="import-history-summary-actions">${model.actions
              .map(
                (item) =>
                  `<button class="mini-btn import-history-action" type="button" data-import-history-action="${escapeHtml(item.action)}" data-import-history-id="${escapeHtml(model.recordId)}">${escapeHtml(item.label)}</button>`
              )
              .join("")}</div>`
          : ""
      }
    </div>
  `;
}
