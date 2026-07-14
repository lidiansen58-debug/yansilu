import {
  aiSuggestionActionSet,
  aiSuggestionStatusLabel,
  aiSuggestionStatusOptions,
  aiSuggestionStatusTone,
  aiSuggestionSummary,
  normalizeAiSuggestionFilters
} from "./ai-suggestions-model.js";
import {
  traceDisplayState,
  tracePlaceholderCopy
} from "./ai-trace-display.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attr(value) {
  return escapeHtml(value ?? "");
}

function domIdPart(value = "") {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "_");
}

function badge(text = "", tone = "") {
  const cleanTone = String(tone || "").trim();
  return `<span class="settings-stat-badge ${cleanTone ? escapeHtml(cleanTone) : ""}">${escapeHtml(text)}</span>`;
}

function formatDate(value = "") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function readableFieldLabel(value = "") {
  const clean = String(value || "").trim();
  const labels = {
    thesis: "核心观点",
    three_line_summary: "三行摘要",
    threeLineSummary: "三行摘要",
    title: "标题",
    summary: "摘要",
    body: "正文",
    content: "正文",
    tags: "标签",
    relations: "关联"
  };
  return labels[clean] || (clean ? "笔记内容" : "保存位置");
}

function compactText(value = "", maxLength = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function suggestionTargetNoteId(item = {}, display = null) {
  return String(
    display?.targetNoteId ||
    item.target?.id ||
    ""
  ).trim();
}

function suggestionNoteTitle(item = {}, display = null) {
  return String(
    display?.targetTitle ||
    display?.targetName ||
    item.target?.title ||
    item.target?.noteTitle ||
    item.target?.note_title ||
    item.target?.name ||
    ""
  ).trim();
}

function suggestionField(item = {}, display = null) {
  return String(display?.targetField || item.target?.field || "").trim();
}

function suggestionWorkLabel(item = {}, display = null) {
  return `补${readableFieldLabel(suggestionField(item, display))}`;
}

function suggestionContentPreview(item = {}) {
  return compactText(readableContent(item.content), 100);
}

function suggestionDisplayTitle(item = {}, display = null) {
  return suggestionNoteTitle(item, display) || "未命名笔记";
}

function uniqueLabels(labels = []) {
  return [...new Set(labels.map((label) => String(label || "").trim()).filter(Boolean))];
}

function suggestionFieldLabel(item = {}, display = null) {
  return readableFieldLabel(suggestionField(item, display));
}

function suggestionMissingLabel(items = []) {
  const labels = uniqueLabels(items.map((item) => suggestionFieldLabel(item)));
  return labels.length ? `缺：${labels.join("、")}` : "缺：待确认内容";
}

function suggestionGroupKey(item = {}) {
  return suggestionTargetNoteId(item) || String(item.id || "").trim() || "unknown";
}

function groupedSuggestions(items = [], selectedId = "") {
  const groups = [];
  const groupByKey = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = suggestionGroupKey(item);
    if (!groupByKey.has(key)) {
      const group = { key, items: [] };
      groupByKey.set(key, group);
      groups.push(group);
    }
    groupByKey.get(key).items.push(item);
  }
  return groups.map((group) => ({
    ...group,
    active: group.items.some((item) => String(item.id || "") === String(selectedId || ""))
  }));
}

function selectedSuggestionGroup(items = [], selectedId = "") {
  return groupedSuggestions(items, selectedId).find((group) => group.active) || null;
}

function renderGroupPreview(items = []) {
  const previews = items
    .map((item) => {
      const preview = suggestionContentPreview(item);
      if (!preview) return "";
      return `${suggestionFieldLabel(item)}：${preview}`;
    })
    .filter(Boolean);
  return previews.length ? `AI 建议：${previews.join("；")}` : "AI 建议：暂无可预览内容";
}

function suggestionWithListContext(item = null, listItem = null) {
  if (!item) return listItem;
  if (!listItem) return item;
  const listTitle = String(listItem.target?.title || listItem.target?.name || "").trim();
  const itemTitle = String(item.target?.title || item.target?.name || "").trim();
  if (itemTitle || !listTitle) return item;
  return {
    ...item,
    target: {
      ...(item.target || {}),
      title: listTitle
    }
  };
}

function singleContentEntry(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const entries = Object.entries(content);
  return entries.length === 1 ? entries[0] : null;
}

function readableContent(content) {
  if (typeof content === "string") return content;
  const single = singleContentEntry(content);
  if (single) {
    const value = single[1];
    return Array.isArray(value) ? value.join("\n") : String(value ?? "");
  }
  if (content && typeof content === "object") {
    const values = Object.values(content)
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    if (values.length) return values.join("\n");
  }
  return "这条建议没有可预览的内容。";
}

function readableStatusLabel(status = "") {
  const clean = String(status || "").trim();
  const labels = {
    all: "全部",
    suggested: "待确认",
    adopted_as_draft: "已存草稿",
    edited: "已修改",
    confirmed: "已确认",
    rejected: "已忽略"
  };
  return labels[clean] || aiSuggestionStatusLabel(clean);
}

function readableStatusHint(status = "") {
  const clean = String(status || "").trim();
  const hints = {
    suggested: "先看内容，满意就保存为草稿；不需要就忽略。",
    adopted_as_draft: "草稿已放进笔记，改完后点“我已改好”。",
    edited: "已经改过，可以确认写入。",
    confirmed: "已经处理完成。",
    rejected: "已经忽略。"
  };
  return hints[clean] || "先确认内容，再决定是否写入笔记。";
}

function renderControls(state = {}) {
  const filters = normalizeAiSuggestionFilters(state.filters || {});
  const className = state.compact ? "scheduled-task-toolbar is-compact" : "scheduled-task-toolbar";
  return `
    <div class="${className}">
      <label>
        <span>状态</span>
        <select id="aiSuggestionStatusFilter">
          ${aiSuggestionStatusOptions()
            .map((option) => `<option value="${attr(option.value)}" ${option.value === filters.status ? "selected" : ""}>${escapeHtml(readableStatusLabel(option.value))}</option>`)
            .join("")}
        </select>
      </label>
      <button class="mini-btn" id="btnAiSuggestionsApplyFilters" type="button">筛选</button>
      <button class="mini-btn" id="btnAiSuggestionsRefresh" type="button">刷新</button>
    </div>
  `;
}

function renderItem(group = {}) {
  const items = Array.isArray(group.items) ? group.items : [];
  const item = items[0] || {};
  return `
    <button
      class="ai-inbox-item ${group.active ? "is-active" : ""}"
      type="button"
      data-ai-suggestion-id="${attr(item.id)}"
    >
      <span class="ai-inbox-item-head">
        <strong>${escapeHtml(suggestionDisplayTitle(item))}</strong>
        ${badge(readableStatusLabel(item.status), aiSuggestionStatusTone(item.status))}
      </span>
      <span class="ai-inbox-item-meta">${escapeHtml(suggestionMissingLabel(items))}</span>
      <span class="ai-inbox-item-summary">${escapeHtml(renderGroupPreview(items))}</span>
      <span class="ai-inbox-item-meta">
        <span>查看处理</span>
      </span>
    </button>
  `;
}

function renderList(state = {}) {
  const items = Array.isArray(state.items) ? state.items : [];
  if (state.loading) return `<div class="scheduled-task-empty">正在加载待处理...</div>`;
  if (state.error) return `<div class="scheduled-task-empty is-bad">待处理加载失败：${escapeHtml(state.error)}</div>`;
  if (!items.length) return `<div class="scheduled-task-empty">${state.compact ? "现在没有待处理。" : "没有符合筛选条件的待处理。"}</div>`;
  return `<div class="ai-inbox-list">${groupedSuggestions(items, state.selectedSuggestionId).map((group) => renderItem(group)).join("")}</div>`;
}

function renderActions(item = {}, actionLoading = false) {
  const actions = aiSuggestionActionSet(item);
  if (!actions.length) return "";
  const labels = {
    adopted_as_draft: "保存为草稿",
    edited: "我已改好",
    rejected: "忽略",
    confirmed: "确认写入"
  };
  return `
    <div class="scheduled-task-actions ai-suggestion-primary-actions">
      ${actions.map((action) => `
        <button
          class="mini-btn ${action === "adopted_as_draft" || action === "confirmed" ? "primary" : ""}"
          type="button"
          data-ai-suggestion-status="${attr(action)}"
          data-ai-suggestion-id="${attr(item.id)}"
          ${actionLoading ? "disabled" : ""}
        >
          ${escapeHtml(labels[action] || action)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderOpenNoteButton(item = {}, actionLoading = false, display = null) {
  const targetNoteId = suggestionTargetNoteId(item, display);
  return `
    <button
      class="mini-btn"
      type="button"
      data-ai-suggestion-open-note="${attr(targetNoteId)}"
      ${targetNoteId && !actionLoading ? "" : "disabled"}
    >
      打开笔记
    </button>
  `;
}

function renderSuggestionEditor(item = {}, actionLoading = false, useLegacyId = false) {
  const status = String(item.status || "").trim();
  if (status !== "adopted_as_draft" && status !== "edited") return "";
  const id = useLegacyId ? "aiSuggestionContentEditor" : `aiSuggestionContentEditor-${domIdPart(item.id)}`;
  return `
    <textarea
      id="${attr(id)}"
      data-ai-suggestion-content-editor="${attr(item.id)}"
      rows="8"
      placeholder="可以直接改这段文字。"
      ${actionLoading ? "disabled" : ""}
    >${escapeHtml(readableContent(item.content))}</textarea>
  `;
}

function renderSuggestionBlock(item = {}, options = {}) {
  const {
    actionLoading = false,
    actionError = "",
    actionNotice = "",
    actionNoticeTone = "",
    display = null,
    selected = false,
    useLegacyEditorId = false
  } = options;
  const displayStatus = display?.status || String(item.status || "").trim();
  const displayItem = { ...item, status: displayStatus };
  const editor = selected ? renderSuggestionEditor(displayItem, actionLoading, useLegacyEditorId) : "";
  return `
    <section class="ai-inbox-detail-section">
      <h3>${escapeHtml(suggestionFieldLabel(item, display))}</h3>
      ${editor || `<div class="ai-suggestion-content-text">${escapeHtml(readableContent(item.content))}</div>`}
      ${selected ? renderActions(displayItem, actionLoading) : `
        <div class="scheduled-task-actions ai-suggestion-primary-actions">
          <button class="mini-btn" type="button" data-ai-suggestion-id="${attr(item.id)}">处理这项</button>
        </div>
      `}
      ${renderActionError(actionError)}
      ${renderActionNotice(actionNotice, actionNoticeTone)}
    </section>
  `;
}

function renderDraftEditingGuide(item = {}) {
  const status = String(item.status || "").trim();
  if (status === "adopted_as_draft") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>下一步</h3>
        <p>草稿已经放进笔记。打开笔记改到满意后，回到这里点“我已改好”。</p>
      </section>
    `;
  }
  if (status === "edited") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>可以确认</h3>
        <p>确认前再看一眼内容。确认后，这条整理就算完成。</p>
      </section>
    `;
  }
  return "";
}

function suggestionDetailRecord(detail = null) {
  const item = detail?.item && typeof detail.item === "object" && !Array.isArray(detail.item)
    ? detail.item
    : detail && typeof detail === "object" && !Array.isArray(detail)
      ? detail
      : null;
  return {
    item,
    trace: detail?.trace || null,
    reviewEvents: Array.isArray(detail?.reviewEvents) ? detail.reviewEvents : [],
    latestReviewEvent: detail?.latestReviewEvent || null,
    linkedArtifact: detail?.linkedArtifact || null
  };
}

function renderTrace(detail = {}) {
  const item = detail.item || {};
  const display = traceDisplayState({
    trace: detail.trace,
    target: item.target,
    sourceArtifactId: item.sourceArtifactId || item.source_artifact_id,
    linkedArtifactId: detail.linkedArtifact?.id,
    status: item.status
  });
  const placeholderText = tracePlaceholderCopy({
    suggestionId: item.id,
    sourceArtifactId: display.sourceArtifactId,
    targetNoteId: display.targetNoteId
  });
  const targetNoteId = suggestionTargetNoteId(item, display);
  if (targetNoteId && !placeholderText) return "";
  const missingTarget = targetNoteId ? "" : "这条整理暂时找不到要打开的笔记。";
  const missingSource = placeholderText ? "这条整理缺少完整来源，处理前请先确认内容可靠。" : "";
  const message = missingTarget || missingSource;
  if (!message) return "";
  return `
    <div class="scheduled-task-empty">${escapeHtml(message)}</div>
  `;
}

function renderHistory(detail = {}) {
  const reviewEvents = Array.isArray(detail.reviewEvents) ? detail.reviewEvents : [];
  const history = reviewEvents.length ? reviewEvents : Array.isArray(detail.item?.history) ? detail.item.history : [];
  if (!history.length) return "";

  return `
    <section class="ai-inbox-detail-section">
      <h3>处理记录</h3>
      <div class="ai-inbox-decision-list">
        ${history
          .slice()
          .reverse()
          .map((entry) => {
            const status = entry.eventType || entry.metadata?.toStatus || entry.toStatus || entry.action;
            return `
              <div class="ai-inbox-decision">
                <div>
                  <strong>${escapeHtml(readableStatusLabel(status))}</strong>
                  <span>${escapeHtml(formatDate(entry.createdAt) || entry.createdAt || "")}</span>
                </div>
                ${entry.comment ? `<p>${escapeHtml(entry.comment)}</p>` : ""}
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderActionError(message = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  return `<div class="scheduled-task-empty is-bad">处理失败：${escapeHtml(text)}</div>`;
}

function renderActionNotice(message = "", tone = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  const cleanTone = String(tone || "").trim();
  return `<div class="scheduled-task-empty ${cleanTone ? `tone-${escapeHtml(cleanTone)}` : ""}" data-ai-suggestion-action-notice="true">${escapeHtml(text)}</div>`;
}

function renderLatestDetailState(detailLoading = false, detailError = "") {
  if (detailLoading) {
    return `<div class="ai-inbox-detail-muted">正在加载最新内容...</div>`;
  }
  const text = String(detailError || "").trim();
  if (!text) return "";
  return `<div class="scheduled-task-empty is-bad">详情加载失败：${escapeHtml(text)}</div>`;
}

function renderReviewSafety(item = {}, detailLoading = false, detailError = "", actionLoading = false, actionError = "", actionNotice = "", actionNoticeTone = "") {
  const workLabel = suggestionWorkLabel(item);
  const preview = suggestionContentPreview(item);
  return `
    <article class="ai-inbox-detail ${actionLoading || detailLoading ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">整理建议</div>
          <h2>${escapeHtml(suggestionDisplayTitle(item))}</h2>
          <p>${escapeHtml(`${workLabel} · ${preview ? `AI 建议：${preview}` : "先读取详情再处理"}`)}</p>
        </div>
        ${badge(readableStatusLabel(item.status), aiSuggestionStatusTone(item.status))}
      </header>
      <section class="ai-inbox-detail-section">
        <h3>正在确认</h3>
        <div class="ai-inbox-detail-muted">先读取最新内容，再处理这条建议，避免把过期内容写进笔记。</div>
      </section>
      ${renderLatestDetailState(detailLoading, detailError)}
      ${renderActionError(actionError)}
      ${renderActionNotice(actionNotice, actionNoticeTone)}
    </article>
  `;
}

function renderDetail(state = {}) {
  const selectedSuggestionId = String(state.selectedSuggestionId || "").trim();
  const detailSuggestionId = String(state.detailSuggestionId || "").trim();
  const detailLoading = state.detailLoading && detailSuggestionId === selectedSuggestionId;
  const detailError = detailSuggestionId === selectedSuggestionId ? state.detailError : "";
  const actionSuggestionId = String(state.actionSuggestionId || "").trim();
  const selectedListItem = state.items?.find((entry) => String(entry.id || "") === selectedSuggestionId) || null;
  const selectedGroup = selectedSuggestionGroup(state.items, selectedSuggestionId);
  const detail = suggestionDetailRecord(state.detail);
  const detailMatchesSelection = String(detail.item?.id || "").trim() && String(detail.item?.id || "").trim() === selectedSuggestionId;
  const item = detailMatchesSelection ? suggestionWithListContext(detail.item, selectedListItem) : selectedListItem;
  if (!item) {
    if (detailLoading) return `<div class="scheduled-task-empty">正在加载建议详情...</div>`;
    if (detailError) return `<div class="scheduled-task-empty is-bad">详情加载失败：${escapeHtml(detailError)}</div>`;
    return `<div class="scheduled-task-empty">选择一条待处理内容后，在这里查看建议内容和操作。</div>`;
  }
  const groupItems = (selectedGroup?.items || [item]).map((entry) => String(entry.id || "") === String(item.id || "") ? item : entry);
  const actionLoading = state.actionLoading && groupItems.some((entry) => actionSuggestionId === String(entry.id || "").trim());
  const actionNoticeSuggestionId = String(state.actionNoticeSuggestionId || "").trim();
  const actionError = actionSuggestionId === String(item.id || "").trim() ? state.actionError : "";
  const actionNotice = actionNoticeSuggestionId === String(item.id || "").trim() ? state.actionNotice : "";
  const actionNoticeTone = actionNotice ? state.actionNoticeTone : "";
  if (selectedListItem && !detailMatchesSelection) {
    return renderReviewSafety(selectedListItem, detailLoading, detailError, actionLoading, actionError, actionNotice, actionNoticeTone);
  }
  if (detailLoading) return `<div class="scheduled-task-empty">正在加载建议详情...</div>`;
  if (detailError) return `<div class="scheduled-task-empty is-bad">详情加载失败：${escapeHtml(detailError)}</div>`;
  const activeDetail = detailMatchesSelection ? { ...detail, item } : { item };
  const display = traceDisplayState({
    trace: activeDetail.trace,
    target: item.target,
    sourceArtifactId: item.sourceArtifactId || item.source_artifact_id,
    linkedArtifactId: activeDetail.linkedArtifact?.id,
    status: item.status
  });
  const displayStatus = display.status || String(item.status || "").trim();
  const displayItem = { ...item, status: displayStatus };
  const displayGroupItems = groupItems.map((entry) => String(entry.id || "") === String(item.id || "") ? displayItem : entry);
  return `
    <article class="ai-inbox-detail ${actionLoading ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">整理建议</div>
          <h2>${escapeHtml(suggestionDisplayTitle(item, display))}</h2>
          <p>${escapeHtml(suggestionMissingLabel(displayGroupItems))}</p>
        </div>
        <div class="ai-suggestion-detail-tools">
          ${badge(readableStatusLabel(displayStatus), aiSuggestionStatusTone(displayStatus))}
          ${renderOpenNoteButton(displayItem, actionLoading, display)}
        </div>
      </header>
      ${displayGroupItems.map((entry) => {
        const entryId = String(entry.id || "").trim();
        const isSelectedEntry = entryId === String(item.id || "").trim();
        const entryActionNotice = actionNoticeSuggestionId === entryId ? state.actionNotice : "";
        return renderSuggestionBlock(entry, {
          actionLoading: state.actionLoading && actionSuggestionId === entryId,
          actionError: actionSuggestionId === entryId ? state.actionError : "",
          actionNotice: entryActionNotice,
          actionNoticeTone: entryActionNotice ? state.actionNoticeTone : "",
          display: isSelectedEntry ? display : null,
          selected: isSelectedEntry,
          useLegacyEditorId: isSelectedEntry
        });
      }).join("")}
      ${renderTrace(activeDetail)}
      ${renderDraftEditingGuide(displayItem)}
      ${renderHistory(activeDetail)}
    </article>
  `;
}

export function renderAiSuggestionsPanel(state = {}) {
  const summary = aiSuggestionSummary({ items: state.items, total: state.total });
  const items = Array.isArray(state.items) ? state.items : [];
  const filters = normalizeAiSuggestionFilters(state.filters || {});
  const hasActiveFilters = filters.status !== "all";
  const emptyCompact = state.compact && !state.loading && !state.error && !items.length;
  return `
    <div class="scheduled-task-panel ${state.compact ? "is-compact" : ""}">
      ${state.compact ? "" : `
        <div class="scheduled-task-head">
          <div>
            <div class="settings-card-title">待处理</div>
            <div class="settings-card-note">先看建议内容，满意再保存到笔记；不需要的直接忽略。</div>
          </div>
          <div class="settings-stat-row">
            ${badge(`${summary.visible}/${summary.total} 条`, "muted")}
            ${badge(`${summary.counts.suggested || 0} 待确认`, "warn")}
            ${badge(`${summary.counts.confirmed || 0} 已确认`, "ok")}
            ${summary.counts.rejected ? badge(`${summary.counts.rejected} 已忽略`, "muted") : ""}
          </div>
        </div>
      `}
      ${emptyCompact && !hasActiveFilters ? "" : renderControls(state)}
      ${emptyCompact
        ? renderList(state)
        : `
          <div class="ai-inbox-grid">
            <section class="ai-inbox-list-pane">${renderList(state)}</section>
            ${items.length || state.selectedSuggestionId || state.detailLoading || state.detailError
              ? `<section class="ai-inbox-detail-pane">${renderDetail(state)}</section>`
              : ""}
          </div>
        `}
    </div>
  `;
}
