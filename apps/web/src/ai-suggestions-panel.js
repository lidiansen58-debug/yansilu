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
  traceMissingTargetCopy,
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

function readableTypeLabel(value = "") {
  const clean = String(value || "").trim();
  const labels = {
    permanent_note: "永久笔记",
    literature_note: "文献笔记",
    fleeting_note: "临时笔记",
    project_note: "项目笔记"
  };
  return labels[clean] || "笔记";
}

function readableOriginLabel(value = "") {
  const clean = String(value || "").trim();
  const labels = {
    ai_generated: "AI 整理",
    system_rule: "整理规则",
    permanent_note_distillation: "笔记提炼",
    note_field: "笔记字段"
  };
  return labels[clean] || "自动整理";
}

function suggestionTargetNoteId(item = {}, display = null) {
  return String(
    display?.targetNoteId ||
    item.target?.title ||
    item.target?.name ||
    item.target?.id ||
    ""
  ).trim();
}

function suggestionField(item = {}, display = null) {
  return String(display?.targetField || item.target?.field || "").trim();
}

function suggestionTitle(item = {}, display = null) {
  const noteId = suggestionTargetNoteId(item, display);
  const fieldLabel = readableFieldLabel(suggestionField(item, display));
  return noteId ? `${noteId} · ${fieldLabel}` : fieldLabel;
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

function renderItem(item = {}, selectedId = "") {
  const active = String(item.id || "") === String(selectedId || "");
  const fieldLabel = readableFieldLabel(item.target?.field);
  const typeLabel = readableTypeLabel(item.target?.type);
  return `
    <button
      class="ai-inbox-item ${active ? "is-active" : ""}"
      type="button"
      data-ai-suggestion-id="${attr(item.id)}"
    >
      <span class="ai-inbox-item-head">
        <strong>${escapeHtml(suggestionTitle(item))}</strong>
        ${badge(readableStatusLabel(item.status), aiSuggestionStatusTone(item.status))}
      </span>
      <span class="ai-inbox-item-summary">${escapeHtml(readableContent(item.content))}</span>
      <span class="ai-inbox-item-meta">
        <span>${escapeHtml(typeLabel)}</span>
        <span>写入：${escapeHtml(fieldLabel)}</span>
        <span>来自：${escapeHtml(readableOriginLabel(item.origin))}</span>
      </span>
    </button>
  `;
}

function renderList(state = {}) {
  const items = Array.isArray(state.items) ? state.items : [];
  if (state.loading) return `<div class="scheduled-task-empty">正在加载待处理...</div>`;
  if (state.error) return `<div class="scheduled-task-empty is-bad">待处理加载失败：${escapeHtml(state.error)}</div>`;
  if (!items.length) return `<div class="scheduled-task-empty">${state.compact ? "现在没有待处理。" : "没有符合筛选条件的待处理。"}</div>`;
  return `<div class="ai-inbox-list">${items.map((item) => renderItem(item, state.selectedSuggestionId)).join("")}</div>`;
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

function renderTopActions(item = {}, actionLoading = false, display = null) {
  const targetNoteId = suggestionTargetNoteId(item, display);
  return `
    <div class="ai-suggestion-action-row">
      <button
        class="mini-btn"
        type="button"
        data-ai-suggestion-open-note="${attr(targetNoteId)}"
        ${targetNoteId && !actionLoading ? "" : "disabled"}
      >
        打开笔记
      </button>
      ${renderActions(item, actionLoading)}
    </div>
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

function renderContentEditor(item = {}, actionLoading = false) {
  const status = String(item.status || "").trim();
  if (status !== "adopted_as_draft" && status !== "edited") return "";
  return `
    <section class="ai-inbox-detail-section">
      <h3>草稿内容</h3>
      <textarea id="aiSuggestionContentEditor" rows="8" placeholder="可以直接改这段文字。" ${actionLoading ? "disabled" : ""}>${escapeHtml(readableContent(item.content))}</textarea>
    </section>
  `;
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
  const placeholder = placeholderText ? `<div class="scheduled-task-empty">这条建议缺少完整来源，处理前请先确认内容可靠。</div>` : "";
  const targetNoteId = suggestionTargetNoteId(item, display);
  const targetField = suggestionField(item, display);
  const status = display.status || String(item.status || "").trim();
  const targetHint = targetNoteId
    ? ""
    : `<div class="scheduled-task-empty">${escapeHtml(traceMissingTargetCopy())}</div>`;
  const sourceText = display.sourceNoteIds.join(", ") || display.primarySourceNoteId || targetNoteId || "未记录";
  return `
    <section class="ai-inbox-detail-section">
      <h3>放到哪里</h3>
      ${placeholder}
      <dl class="ai-inbox-kv">
        <dt>来源笔记</dt><dd>${escapeHtml(sourceText)}</dd>
        <dt>目标笔记</dt><dd>${escapeHtml(targetNoteId || "缺少目标笔记")}</dd>
        <dt>保存位置</dt><dd>${escapeHtml(readableFieldLabel(targetField))}</dd>
        <dt>当前状态</dt><dd>${escapeHtml(readableStatusHint(status))}</dd>
      </dl>
      ${targetHint}
    </section>
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
  return `
    <article class="ai-inbox-detail ${actionLoading || detailLoading ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">整理建议</div>
          <h2>${escapeHtml(suggestionTitle(item))}</h2>
          <p>${escapeHtml(readableStatusHint(item.status))}</p>
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
  const detail = suggestionDetailRecord(state.detail);
  const detailMatchesSelection = String(detail.item?.id || "").trim() && String(detail.item?.id || "").trim() === selectedSuggestionId;
  const item = (detailMatchesSelection ? detail.item : null) || selectedListItem || null;
  if (!item) {
    if (detailLoading) return `<div class="scheduled-task-empty">正在加载建议详情...</div>`;
    if (detailError) return `<div class="scheduled-task-empty is-bad">详情加载失败：${escapeHtml(detailError)}</div>`;
    return `<div class="scheduled-task-empty">选择一条待处理内容后，在这里查看建议内容和操作。</div>`;
  }
  const actionLoading = state.actionLoading && actionSuggestionId === String(item.id || "").trim();
  const actionError = actionSuggestionId === String(item.id || "").trim() ? state.actionError : "";
  const actionNoticeSuggestionId = String(state.actionNoticeSuggestionId || "").trim();
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
  return `
    <article class="ai-inbox-detail ${actionLoading ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">整理建议</div>
          <h2>${escapeHtml(suggestionTitle(item, display))}</h2>
          <p>${escapeHtml(`${readableTypeLabel(item.target?.type)} · ${readableStatusHint(displayStatus)}`)}</p>
        </div>
        ${badge(readableStatusLabel(displayStatus), aiSuggestionStatusTone(displayStatus))}
      </header>
      ${renderTopActions(displayItem, actionLoading, display)}
      <section class="ai-inbox-detail-section">
        <h3>建议内容</h3>
        <div class="ai-suggestion-content-text">${escapeHtml(readableContent(item.content))}</div>
      </section>
      ${renderTrace(activeDetail)}
      ${renderDraftEditingGuide(displayItem)}
      ${renderContentEditor(displayItem, actionLoading)}
      ${renderHistory(activeDetail)}
      ${renderActionError(actionError)}
      ${renderActionNotice(actionNotice, actionNoticeTone)}
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
