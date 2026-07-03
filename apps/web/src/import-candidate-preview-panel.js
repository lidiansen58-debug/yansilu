import {
  candidateBadge,
  candidateGroups,
  candidateIdsByOriginalityStatus,
  candidateMeta,
  candidatePreviewItems,
  candidateReasonText,
  candidateTone,
  isConfirmableCandidate,
  confirmableCandidateIds,
  riskyCandidateIds,
  safeCandidateIds
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
    conflicted: "文件冲突跳过"
  };
  return labels[String(reason || "").trim()] || "可选择目标";
}

function renderExcludedCandidateSummary(candidatePreview, options = {}) {
  const selectedIds = options.selectedIds instanceof Set ? options.selectedIds : new Set();
  const excludedItems = candidatePreviewItems(candidatePreview).filter((item) => !selectedIds.has(String(item.id || "")));
  if (!excludedItems.length) return "";
  return `
    <div class="candidate-summary candidate-summary-warn">
      <div class="candidate-summary-title">未写入内容</div>
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

function filterLabel(key, count) {
  const labels = {
    blocked: "阻断",
    warning: "警告",
    risky: "风险",
    safe: "安全",
    confirmable: "可确认",
    excluded: "未写入"
  };
  return `${labels[key] || key} ${Number(count || 0)}`;
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
    { key: "conflicted", label: "文件冲突跳过", count: conflictedSkipped }
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
      ${candidatePreview && unselected > 0 ? `<span class="toolbar-note">可查看未写入内容</span>` : ""}
    </div>
  `;
}

export function renderCandidatePreview(candidatePreview, options = {}) {
  const groups = candidateGroups(candidatePreview);
  if (!groups.length) return "";

  const interactive = Boolean(options.interactive);
  const summary = options.summary || { selectedIds: new Set(), selectedCount: 0, totalCount: 0, excludedCount: 0 };
  const total = candidatePreview.total || {};
  const originalityGuard = options.originalityGuard || null;
  const focusReason = String(options.focusReason || "").trim();
  const focusCandidateIds = new Set((options.focusCandidateIds || []).map((item) => String(item || "").trim()).filter(Boolean));
  const skipReasonMap = options.skipReasonMap || {};
  const hasFocus = !interactive && focusCandidateIds.size > 0;
  const blockedCount = candidateIdsByOriginalityStatus(candidatePreview, "blocked").length;
  const warningCount = candidateIdsByOriginalityStatus(candidatePreview, "warning").length;
  const riskyCount = riskyCandidateIds(candidatePreview).length;
  const safeCount = safeCandidateIds(candidatePreview).length;
  const confirmableCount = confirmableCandidateIds(candidatePreview, originalityGuard).length;
  const excludedCount = summary.excludedCount;
  const selectedIdSet = summary.selectedIds instanceof Set ? summary.selectedIds : new Set();
  const previewFilter = interactive ? focusReason : "";
  const visibleCandidateCount = candidatePreviewItems(candidatePreview).length;

  function itemVisibleForFilter(item) {
    const candidateId = String(item.id || "");
    if (!previewFilter) return true;
    if (previewFilter === "blocked") return item.originalityStatus === "blocked";
    if (previewFilter === "warning") return item.originalityStatus === "warning";
    if (previewFilter === "risky") return item.originalityStatus === "warning" || item.originalityStatus === "blocked";
    if (previewFilter === "safe") return item.originalityStatus !== "blocked";
    if (previewFilter === "confirmable") return isConfirmableCandidate(item, originalityGuard);
    if (previewFilter === "excluded") return !selectedIdSet.has(candidateId);
    return true;
  }

  const truncatedNotice =
    interactive && candidatePreview.truncated
      ? `<div class="candidate-summary candidate-summary-warn">Showing ${escapeHtml(visibleCandidateCount)} visible candidates from a larger preview set. Confirm imports only the visible selected candidates.</div>`
      : "";

  return `
    <div class="result-candidates simple">
      <div class="result-candidates-toolbar">
        <div class="result-candidates-title">将导入：${escapeHtml(candidateTotalText(total))}</div>
        <div class="toolbar-note">已选 ${summary.selectedCount}/${summary.totalCount}</div>
      </div>
      ${truncatedNotice}
      ${
        interactive
          ? `<div class="result-candidates-toolbar">
              <div class="toolbar-actions">
                <button class="mini-btn" type="button" data-candidate-action="all">全选</button>
                <button class="mini-btn" type="button" data-candidate-action="none">清空</button>
                <button class="mini-btn" type="button" data-candidate-action="permanent">只选永久</button>
                ${confirmableCount < summary.totalCount ? `<button class="mini-btn" type="button" data-candidate-action="confirmable">只选可确认 ${escapeHtml(confirmableCount)}</button>` : ""}
                ${safeCount < summary.totalCount ? `<button class="mini-btn" type="button" data-candidate-action="safe">只选安全 ${escapeHtml(safeCount)}</button>` : ""}
                ${blockedCount > 0 ? `<button class="mini-btn" type="button" data-candidate-action="exclude-blocked">跳过阻断 ${escapeHtml(blockedCount)}</button>` : ""}
                ${warningCount > 0 ? `<button class="mini-btn" type="button" data-candidate-action="exclude-warning">跳过警告 ${escapeHtml(warningCount)}</button>` : ""}
                ${riskyCount > 0 ? `<button class="mini-btn" type="button" data-candidate-action="exclude-risky">跳过风险 ${escapeHtml(riskyCount)}</button>` : ""}
              </div>
            </div>`
          : ""
      }
      ${
        interactive
          ? `<div class="result-candidates-toolbar">
              <div class="toolbar-actions">
                ${blockedCount > 0 ? `<button class="mini-btn ${previewFilter === "blocked" ? "is-filter-active" : ""}" type="button" data-candidate-filter="blocked">${escapeHtml(filterLabel("blocked", blockedCount))}</button>` : ""}
                ${warningCount > 0 ? `<button class="mini-btn ${previewFilter === "warning" ? "is-filter-active" : ""}" type="button" data-candidate-filter="warning">${escapeHtml(filterLabel("warning", warningCount))}</button>` : ""}
                ${riskyCount > 0 ? `<button class="mini-btn ${previewFilter === "risky" ? "is-filter-active" : ""}" type="button" data-candidate-filter="risky">${escapeHtml(filterLabel("risky", riskyCount))}</button>` : ""}
                ${safeCount > 0 && safeCount < summary.totalCount ? `<button class="mini-btn ${previewFilter === "safe" ? "is-filter-active" : ""}" type="button" data-candidate-filter="safe">${escapeHtml(filterLabel("safe", safeCount))}</button>` : ""}
                ${confirmableCount > 0 && confirmableCount < summary.totalCount ? `<button class="mini-btn ${previewFilter === "confirmable" ? "is-filter-active" : ""}" type="button" data-candidate-filter="confirmable">${escapeHtml(filterLabel("confirmable", confirmableCount))}</button>` : ""}
                ${excludedCount > 0 ? `<button class="mini-btn ${previewFilter === "excluded" ? "is-filter-active" : ""}" type="button" data-candidate-filter="excluded">${escapeHtml(filterLabel("excluded", excludedCount))}</button>` : ""}
              </div>
            </div>`
          : ""
      }
      ${(options.showExcludedSummary || (interactive && excludedCount > 0)) ? renderExcludedCandidateSummary(candidatePreview, { selectedIds: summary.selectedIds }) : ""}
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
          })).filter(itemVisibleForFilter);
          if (!groupItems.length) return "";
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
                    const confirmable = isConfirmableCandidate(item, originalityGuard);
                    const focusClass = hasFocus ? (focusCandidateIds.has(candidateId) ? "is-focused" : "is-muted") : "";
                    const skipReason = skipReasonMap[candidateId] || null;
                    return `
                      <div class="candidate-item ${checked ? "selected" : "unselected"} ${focusClass} tone-${escapeHtml(tone)}" data-candidate-id="${escapeHtml(candidateId)}">
                        <label class="candidate-check">
                          ${
                            interactive
                              ? `<input class="candidate-checkbox" type="checkbox" data-candidate-id="${escapeHtml(candidateId)}" ${checked ? "checked" : ""} ${confirmable ? "" : "disabled"} />`
                              : ""
                          }
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
                                : !confirmable
                                  ? `<div class="candidate-inline-note">Originality guard requires override, so this item stays read-only in the simplified importer.</div>`
                                : !checked
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
