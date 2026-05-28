import {
  candidateBadge,
  candidateGroups,
  candidateMeta,
  candidatePreviewItems,
  candidateReasonText,
  candidateTone
} from "./import-candidate-preview-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function candidateReasonBadges(item = {}) {
  const reasons = Array.isArray(item.reasons) ? item.reasons : [];
  return reasons
    .slice(0, 2)
    .map(
      (reason) =>
        `<span class="candidate-reason candidate-reason-${escapeHtml(candidateTone(item))}">${escapeHtml(candidateReasonText(reason))}</span>`
    )
    .join("");
}

function candidateGroupLabel(groupTitle = "") {
  const labels = {
    Source: "来源卡片",
    LiteratureNote: "文献笔记",
    PermanentNote: "永久笔记"
  };
  return labels[String(groupTitle || "").trim()] || String(groupTitle || "");
}

function candidateTotalText(total = {}) {
  return `${Number(total.sources || 0)} 来源 / ${Number(total.literatureNotes || 0)} 文献 / ${Number(total.permanentNotes || 0)} 永久`;
}

function resultFocusLabel(reason = "") {
  const labels = {
    unselected: "未勾选跳过",
    invalid: "警告跳过",
    conflicted: "冲突跳过"
  };
  return labels[String(reason || "").trim()] || "候选项";
}

function renderExcludedCandidateSummary(candidatePreview, options = {}) {
  const selectedIds = options.selectedIds instanceof Set ? options.selectedIds : new Set();
  const excludedItems = candidatePreviewItems(candidatePreview).filter((item) => !selectedIds.has(String(item.id || "")));
  if (!excludedItems.length) return "";
  return `
    <div class="candidate-summary candidate-summary-warn">
      <div class="candidate-summary-title">未写入候选</div>
      <div class="candidate-summary-list">
        ${excludedItems
          .slice(0, 6)
          .map(
            (item) => `
              <div class="candidate-summary-item">
                <strong>${escapeHtml(item.title || item.id)}</strong>
                <span>${escapeHtml(candidateGroupLabel(item.candidateGroup))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

export function renderConfirmSkipBreakdown(payload = {}, candidatePreview = null, options = {}) {
  if (String(payload.stage || "") !== "confirm") return "";
  const selection = payload.result?.selection || null;
  const skipped = payload.result?.skipped || {};
  const unselected = Math.max(0, Number(selection?.totalCandidates || 0) - Number(selection?.selectedCandidates || 0));
  const originalitySkipped = Math.max(0, Number(skipped.invalid || 0));
  const conflictedSkipped = Math.max(0, Number(skipped.conflicted || 0));
  const rows = [
    { key: "unselected", label: "未勾选跳过", count: unselected },
    { key: "invalid", label: "警告跳过", count: originalitySkipped },
    { key: "conflicted", label: "冲突跳过", count: conflictedSkipped }
  ].filter((item) => item.count > 0);
  if (!rows.length) return "";

  return `
    <div class="result-skip-breakdown simple">
      ${rows
        .map(
          (item) => `
            <button class="result-skip-item ${options.focusReason === item.key ? "is-active" : ""}" type="button" data-skip-focus="${escapeHtml(item.key)}">
              ${escapeHtml(item.label)} ${escapeHtml(item.count)}
            </button>
          `
        )
        .join("")}
      ${candidatePreview && unselected > 0 ? `<span class="toolbar-note">可查看未写入候选</span>` : ""}
    </div>
  `;
}

export function renderCandidatePreview(candidatePreview, options = {}) {
  const groups = candidateGroups(candidatePreview);
  if (!groups.length) return "";

  const interactive = Boolean(options.interactive);
  const summary = options.summary || { selectedIds: new Set(), selectedCount: 0, totalCount: 0, excludedCount: 0 };
  const total = candidatePreview.total || {};
  const focusReason = String(options.focusReason || "").trim();
  const focusCandidateIds = new Set((options.focusCandidateIds || []).map((item) => String(item || "").trim()).filter(Boolean));
  const skipReasonMap = options.skipReasonMap || {};
  const hasFocus = !interactive && focusCandidateIds.size > 0;

  return `
    <div class="result-candidates simple">
      <div class="result-candidates-toolbar">
        <div class="result-candidates-title">将导入：${escapeHtml(candidateTotalText(total))}</div>
        <div class="toolbar-note">已选 ${summary.selectedCount}/${summary.totalCount}</div>
      </div>
      ${
        interactive
          ? `<div class="result-candidates-toolbar">
              <div class="toolbar-actions">
                <button class="mini-btn" type="button" data-candidate-action="all">全选</button>
                <button class="mini-btn" type="button" data-candidate-action="none">清空</button>
                <button class="mini-btn" type="button" data-candidate-action="permanent">只选永久</button>
              </div>
            </div>`
          : ""
      }
      ${!interactive && options.showExcludedSummary ? renderExcludedCandidateSummary(candidatePreview, { selectedIds: summary.selectedIds }) : ""}
      ${
        hasFocus
          ? `<div class="candidate-focus-banner">
              <div><strong>当前聚焦：</strong>${escapeHtml(resultFocusLabel(focusReason))}</div>
              <button class="mini-btn" type="button" data-clear-candidate-focus="1">查看全部</button>
            </div>`
          : ""
      }
      ${groups
        .map((group) => {
          const groupItems = group.items.map((item) => ({
            ...item,
            candidateGroup: group.title
          }));
          return `
            <div class="candidate-group">
              <div class="candidate-group-title">${escapeHtml(candidateGroupLabel(group.title))}</div>
              <div class="candidate-list">
                ${groupItems
                  .slice(0, interactive ? 8 : 6)
                  .map((item) => {
                    const candidateId = String(item.id || "");
                    const checked = summary.selectedIds.has(candidateId);
                    const tone = candidateTone(item);
                    const focusClass = hasFocus ? (focusCandidateIds.has(candidateId) ? "is-focused" : "is-muted") : "";
                    const skipReason = skipReasonMap[candidateId] || null;
                    return `
                      <div class="candidate-item ${checked ? "selected" : "unselected"} ${focusClass} tone-${escapeHtml(tone)}" data-candidate-id="${escapeHtml(candidateId)}">
                        <label class="candidate-check">
                          ${interactive ? `<input class="candidate-checkbox" type="checkbox" data-candidate-id="${escapeHtml(candidateId)}" ${checked ? "checked" : ""} />` : ""}
                          <div class="candidate-check-body">
                            <div class="candidate-line">
                              <span class="candidate-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title || item.id)}</span>
                              <span class="candidate-badge candidate-badge-${escapeHtml(tone)}">${escapeHtml(candidateBadge(item))}</span>
                            </div>
                            <div class="candidate-meta" title="${escapeHtml(candidateMeta(item))}">${escapeHtml(candidateMeta(item))}</div>
                            ${candidateReasonBadges(item) ? `<div class="candidate-reasons">${candidateReasonBadges(item)}</div>` : ""}
                            ${
                              skipReason
                                ? `<div class="candidate-inline-note">${escapeHtml(skipReason.message)}</div>`
                                : !interactive && !checked
                                  ? `<div class="candidate-inline-note">确认前取消勾选。</div>`
                                  : ""
                            }
                          </div>
                        </label>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}
