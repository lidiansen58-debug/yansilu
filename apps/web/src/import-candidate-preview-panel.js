import {
  candidateBadge,
  candidateFilterCounts,
  candidateGroups,
  candidateMeta,
  candidatePreviewItems,
  candidateReasonText,
  candidateTone,
  excludedCandidateItems,
  filterLabel,
  matchesCandidateFilter,
  resultFocusLabel
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
  return `${Number(total.sources || 0)} 来源卡片 / ${Number(total.literatureNotes || 0)} 文献笔记 / ${Number(total.permanentNotes || 0)} 永久笔记`;
}

function renderExcludedCandidateSummary(candidatePreview, options = {}) {
  const excludedItems = excludedCandidateItems(candidatePreview, options.selectedIds);
  if (!excludedItems.length) return "";
  return `
    <div class="candidate-summary candidate-summary-warn">
      <div class="candidate-summary-title">未写入候选</div>
      <div>以下 ${excludedItems.length} 个候选因为未勾选而没有写入本次导入：</div>
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
      ${excludedItems.length > 6 ? `<div class="toolbar-note">其余 ${excludedItems.length - 6} 项可在原始 JSON 或重新预览中查看。</div>` : ""}
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
  const total = unselected + originalitySkipped + conflictedSkipped;
  if (!total) return "";

  const focusReason = String(options.focusReason || "").trim();
  const rows = [
    {
      key: "unselected",
      tone: "neutral",
      label: "未勾选跳过",
      count: unselected,
      detail: "这些候选在确认前被取消勾选，因此本次没有写入。"
    },
    {
      key: "invalid",
      tone: "warning",
      label: "原创性跳过",
      count: originalitySkipped,
      detail: "通常是永久笔记在当前原创性策略下被判定为警告或无效，且不允许按草稿写入。"
    },
    {
      key: "conflicted",
      tone: "bad",
      label: "文件冲突跳过",
      count: conflictedSkipped,
      detail: "目标路径已有同名文件，系统保持非覆盖写入。"
    }
  ].filter((item) => item.count > 0);

  return `
    <div class="result-skip-breakdown">
      <div class="result-skip-breakdown-title">未写入原因</div>
      <div class="result-skip-breakdown-list">
        ${rows
          .map(
            (item) => `
              <button class="result-skip-item tone-${escapeHtml(item.tone)} ${focusReason === item.key ? "is-active" : ""}" type="button" data-skip-focus="${escapeHtml(
                item.key
              )}">
                <div class="result-skip-item-head">
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>${escapeHtml(item.count)}</span>
                </div>
                <div class="result-skip-item-detail">${escapeHtml(item.detail)}</div>
              </button>
            `
          )
          .join("")}
      </div>
      ${candidatePreview && unselected > 0 ? `<div class="toolbar-note">未勾选的候选明细见下方“未写入候选”。</div>` : ""}
    </div>
  `;
}

export function renderCandidatePreview(candidatePreview, options = {}) {
  const groups = candidateGroups(candidatePreview);
  if (!groups.length) return "";

  const interactive = Boolean(options.interactive);
  const summary = options.summary || { selectedIds: new Set(), selectedCount: 0, totalCount: 0, excludedCount: 0 };
  const filter = interactive ? String(options.previewFilter || "all") : "all";
  const filterCounts = candidateFilterCounts(candidatePreview, summary.selectedIds, options.originalityGuard || null);
  const focusReason = String(options.focusReason || "").trim();
  const focusCandidateIds = new Set((options.focusCandidateIds || []).map((item) => String(item || "").trim()).filter(Boolean));
  const skipReasonMap = options.skipReasonMap || {};
  const hasFocus = !interactive && focusCandidateIds.size > 0;
  const visibleFocusCount = hasFocus ? candidatePreviewItems(candidatePreview).filter((item) => focusCandidateIds.has(String(item.id || ""))).length : 0;
  const total = candidatePreview.total || {};
  const totalText = candidateTotalText(total);

  return `
    <div class="result-candidates">
      <div class="result-candidates-toolbar">
        <div class="result-candidates-title">候选预览：${escapeHtml(totalText)}${candidatePreview.truncated ? "（仅显示前几项）" : ""}</div>
        <div class="toolbar-note">已选 ${summary.selectedCount}/${summary.totalCount}${summary.excludedCount ? `，已排除 ${summary.excludedCount}` : ""}</div>
      </div>
      ${
        interactive
          ? `<div class="result-candidates-toolbar">
              <div class="toolbar-actions">
                <button class="mini-btn" type="button" data-candidate-action="all">全选</button>
                <button class="mini-btn" type="button" data-candidate-action="none">清空</button>
                <button class="mini-btn" type="button" data-candidate-action="confirmable">仅可确认项</button>
                <button class="mini-btn" type="button" data-candidate-action="safe">仅安全项</button>
                <button class="mini-btn" type="button" data-candidate-action="exclude-risky">排除风险项</button>
                <button class="mini-btn" type="button" data-candidate-action="exclude-warning">排除警告项</button>
                <button class="mini-btn" type="button" data-candidate-action="exclude-blocked">排除阻断项</button>
                <button class="mini-btn" type="button" data-candidate-action="permanent">仅永久笔记</button>
              </div>
              <div class="toolbar-note">确认写入会只处理当前勾选的候选。</div>
            </div>
            <div class="result-candidates-toolbar">
              <div class="toolbar-actions">
                <button class="mini-btn ${filter === "all" ? "is-filter-active" : ""}" type="button" data-candidate-filter="all">全部 ${filterCounts.all}</button>
                <button class="mini-btn ${filter === "confirmable" ? "is-filter-active" : ""}" type="button" data-candidate-filter="confirmable">可确认 ${filterCounts.confirmable}</button>
                <button class="mini-btn ${filter === "safe" ? "is-filter-active" : ""}" type="button" data-candidate-filter="safe">安全 ${filterCounts.safe}</button>
                <button class="mini-btn ${filter === "risky" ? "is-filter-active" : ""}" type="button" data-candidate-filter="risky">风险 ${filterCounts.risky}</button>
                <button class="mini-btn ${filter === "excluded" ? "is-filter-active" : ""}" type="button" data-candidate-filter="excluded">已排除 ${filterCounts.excluded}</button>
                <button class="mini-btn ${filter === "warning" ? "is-filter-active" : ""}" type="button" data-candidate-filter="warning">警告 ${filterCounts.warning}</button>
                <button class="mini-btn ${filter === "blocked" ? "is-filter-active" : ""}" type="button" data-candidate-filter="blocked">阻断 ${filterCounts.blocked}</button>
              </div>
              <div class="toolbar-note">当前视图：${escapeHtml(filterLabel(filter))}</div>
            </div>`
          : ""
      }
      ${summary.excludedCount ? `<div class="candidate-summary candidate-summary-warn">当前有 ${summary.excludedCount} 个候选被排除，确认时不会写入这些项。</div>` : ""}
      ${filter !== "all" && filterCounts[filter] === 0 ? `<div class="candidate-summary">当前没有匹配“${escapeHtml(filterLabel(filter))}”的候选。</div>` : ""}
      ${
        hasFocus
          ? `<div class="candidate-focus-banner">
              <div>
                <strong>当前聚焦：</strong>${escapeHtml(resultFocusLabel(focusReason))}${visibleFocusCount ? `（${visibleFocusCount} 项可见）` : "（当前预览中没有可见项）"}
              </div>
              <button class="mini-btn" type="button" data-clear-candidate-focus="1">查看全部</button>
            </div>`
          : ""
      }
      ${!interactive && options.showExcludedSummary ? renderExcludedCandidateSummary(candidatePreview, { selectedIds: summary.selectedIds }) : ""}
      ${groups
        .map((group) => {
          const groupItems = group.items.map((item) => ({
            ...item,
            candidateGroup: group.title
          }));
          const visibleItems = groupItems.filter((item) => matchesCandidateFilter(item, filter, summary.selectedIds, options.originalityGuard || null));
          if (!visibleItems.length) return "";
          return `
            <div class="candidate-group">
              <div class="candidate-group-title">${escapeHtml(candidateGroupLabel(group.title))}</div>
              <div class="candidate-list">
                ${visibleItems
                  .map((item) => {
                    const candidateId = String(item.id || "");
                    const checked = summary.selectedIds.has(candidateId);
                    const tone = candidateTone(item);
                    const focusClass = hasFocus ? (focusCandidateIds.has(candidateId) ? "is-focused" : "is-muted") : "";
                    const skipReason = skipReasonMap[candidateId] || null;
                    return `
                      <div class="candidate-item ${checked ? "selected" : "unselected"} ${focusClass} tone-${escapeHtml(tone)}" data-candidate-id="${escapeHtml(
                        candidateId
                      )}">
                        <label class="candidate-check">
                          ${interactive ? `<input class="candidate-checkbox" type="checkbox" data-candidate-id="${escapeHtml(candidateId)}" ${checked ? "checked" : ""} />` : ""}
                          <div class="candidate-check-body">
                            <div class="candidate-line">
                              <span class="candidate-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title || item.id)}</span>
                              <span class="candidate-badge candidate-badge-${escapeHtml(tone)}">${escapeHtml(candidateBadge(item))}</span>
                            </div>
                            <div class="candidate-meta" title="${escapeHtml(candidateMeta(item))}">${escapeHtml(candidateMeta(item))}</div>
                            ${item.excerpt ? `<div class="candidate-meta" title="${escapeHtml(item.excerpt)}">${escapeHtml(item.excerpt)}</div>` : ""}
                            ${candidateReasonBadges(item) ? `<div class="candidate-reasons">${candidateReasonBadges(item)}</div>` : ""}
                            ${
                              skipReason
                                ? `<div class="candidate-inline-note candidate-inline-note-${escapeHtml(skipReason.tone)}">${escapeHtml(skipReason.message)}</div>`
                                : !checked
                                  ? `<div class="candidate-inline-note">已排除：确认写入时会跳过这一项。</div>`
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
