import {
  aiSuggestionActionSet,
  aiSuggestionStatusLabel,
  aiSuggestionStatusOptions,
  aiSuggestionStatusTone,
  aiSuggestionSummary,
  aiSuggestionTargetLabel,
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

function renderControls(state = {}) {
  const filters = normalizeAiSuggestionFilters(state.filters || {});
  return `
    <div class="scheduled-task-toolbar">
      <label>
        <span>状态</span>
        <select id="aiSuggestionStatusFilter">
          ${aiSuggestionStatusOptions()
            .map((option) => `<option value="${attr(option.value)}" ${option.value === filters.status ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      </label>
      <label>
        <span>目标类型</span>
        <input id="aiSuggestionTargetTypeFilter" value="${attr(filters.targetType)}" placeholder="permanent_note" />
      </label>
      <label>
        <span>目标 ID</span>
        <input id="aiSuggestionTargetIdFilter" value="${attr(filters.targetId)}" placeholder="pn_..." />
      </label>
      <label>
        <span>范围</span>
        <input id="aiSuggestionScopeFilter" value="${attr(filters.scope)}" placeholder="note_field" />
      </label>
      <button class="mini-btn" id="btnAiSuggestionsApplyFilters" type="button">应用筛选</button>
      <button class="mini-btn" id="btnAiSuggestionsRefresh" type="button">刷新</button>
    </div>
  `;
}

function renderItem(item = {}, selectedId = "") {
  const active = String(item.id || "") === String(selectedId || "");
  return `
    <button
      class="ai-inbox-item ${active ? "is-active" : ""}"
      type="button"
      data-ai-suggestion-id="${attr(item.id)}"
    >
      <span class="ai-inbox-item-head">
        <strong>${escapeHtml(aiSuggestionTargetLabel(item))}</strong>
        ${badge(aiSuggestionStatusLabel(item.status), aiSuggestionStatusTone(item.status))}
      </span>
      <span class="ai-inbox-item-summary">${escapeHtml(typeof item.content === "string" ? item.content : JSON.stringify(item.content || {}))}</span>
      <span class="ai-inbox-item-meta">
        <span>${escapeHtml(item.scope || "scope")}</span>
        <span>${escapeHtml(item.origin || "ai_generated")}</span>
      </span>
    </button>
  `;
}

function renderList(state = {}) {
  const items = Array.isArray(state.items) ? state.items : [];
  if (state.loading) return `<div class="scheduled-task-empty">正在加载 AI 建议...</div>`;
  if (state.error) return `<div class="scheduled-task-empty is-bad">AI 建议加载失败：${escapeHtml(state.error)}</div>`;
  if (!items.length) return `<div class="scheduled-task-empty">没有符合这些筛选条件的 AI 建议。</div>`;
  return `<div class="ai-inbox-list">${items.map((item) => renderItem(item, state.selectedSuggestionId)).join("")}</div>`;
}

function renderActions(item = {}, actionLoading = false) {
  const actions = aiSuggestionActionSet(item);
  if (!actions.length) return "";
  const labels = {
    adopted_as_draft: "采纳为草稿",
    edited: "标记为已编辑",
    rejected: "拒绝",
    confirmed: "确认"
  };
  return `
    <div class="scheduled-task-actions">
      ${actions.map((action) => `
        <button
          class="mini-btn ${action === "confirmed" ? "primary" : ""}"
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

function renderDraftEditingGuide(item = {}) {
  const status = String(item.status || "").trim();
  if (status === "adopted_as_draft") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>下一步</h3>
        <p>打开目标笔记，在笔记里直接编辑已采纳的草稿，然后回到这里把建议标记为“已编辑”。</p>
      </section>
    `;
  }
  if (status === "edited") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>可确认</h3>
        <p>这条建议已经被人工标记为“已编辑”。只有当目标笔记的表述已经反映最终由用户负责的判断时，才进行确认。</p>
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
  const content = typeof item.content === "string" ? item.content : JSON.stringify(item.content || {}, null, 2);
  return `
    <section class="ai-inbox-detail-section">
      <h3>审阅后内容</h3>
      <textarea id="aiSuggestionContentEditor" rows="8" placeholder="在标记为已编辑或确认之前，先更新这里的草稿内容。" ${actionLoading ? "disabled" : ""}>${escapeHtml(content)}</textarea>
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
  const placeholder = placeholderText ? `<div class="scheduled-task-empty">${escapeHtml(placeholderText)}</div>` : "";
  const targetNoteId = display.targetNoteId;
  const targetField = display.targetField;
  const status = display.status || String(item.status || "").trim();
  const targetHint = targetNoteId
    ? ""
      : `<div class="scheduled-task-empty">${escapeHtml(traceMissingTargetCopy())}</div>`;
  const sourceText = display.sourceNoteIds.join(", ") || display.primarySourceNoteId || "not recorded";
  return `
    <section class="ai-inbox-detail-section">
      <h3>来源链路</h3>
      ${placeholder}
      <dl class="ai-inbox-kv">
        <dt>来源对象</dt><dd>${escapeHtml(display.sourceArtifactId || "未记录")}</dd>
        <dt>来源笔记</dt><dd>${escapeHtml(sourceText)}</dd>
        <dt>目标笔记</dt><dd>${escapeHtml(targetNoteId || "缺少目标笔记")}</dd>
        <dt>目标字段</dt><dd>${escapeHtml(targetField || "未记录")}</dd>
        <dt>状态</dt><dd>${escapeHtml(status ? aiSuggestionStatusLabel(status) : "未记录")}</dd>
      </dl>
      ${targetHint}
    </section>
  `;
}

function renderLinkedArtifact(detail = {}) {
  const artifact = detail.linkedArtifact || null;
  if (!artifact) return "";
  const fieldSuggestionStatus = String(
    artifact.payload?.fieldSuggestion?.status ||
    artifact.payload?.field_suggestion?.status ||
    ""
  ).trim();
  return `
    <section class="ai-inbox-detail-section">
      <h3>关联对象</h3>
      <dl class="ai-inbox-kv">
        <dt>对象</dt><dd>${escapeHtml(artifact.id || "未知对象")}</dd>
        <dt>类型</dt><dd>${escapeHtml(artifact.type || "未知")}</dd>
        <dt>状态</dt><dd>${escapeHtml(artifact.status || "未记录")}</dd>
        <dt>标题</dt><dd>${escapeHtml(artifact.title || "未命名对象")}</dd>
        <dt>字段建议状态</dt><dd>${escapeHtml(fieldSuggestionStatus || "未记录")}</dd>
      </dl>
    </section>
  `;
}

function renderProvenance(detail = {}) {
  const item = detail.item || {};
  return `
    <section class="ai-inbox-detail-section">
      <h3>来源说明</h3>
      <dl class="ai-inbox-kv">
        <dt>来源</dt><dd>${escapeHtml(item.provenance?.contentOrigin || item.origin || "ai_generated")}</dd>
        <dt>人工编辑</dt><dd>${escapeHtml(item.provenance?.humanEdited ? "是" : "否")}</dd>
        <dt>人工确认</dt><dd>${escapeHtml(item.provenance?.humanConfirmed ? "是" : "否")}</dd>
        <dt>来源对象</dt><dd>${escapeHtml(item.sourceArtifactId || detail.trace?.sourceArtifactId || "未记录")}</dd>
      </dl>
    </section>
  `;
}

function renderHistory(detail = {}) {
  const reviewEvents = Array.isArray(detail.reviewEvents) ? detail.reviewEvents : [];
  if (reviewEvents.length) {
    return `
      <section class="ai-inbox-detail-section">
        <h3>审阅历史</h3>
        <div class="ai-inbox-decision-list">
          ${reviewEvents
            .slice()
            .reverse()
            .map((event) => `
              <div class="ai-inbox-decision">
                <div>
                  <strong>${escapeHtml(aiSuggestionStatusLabel(event.eventType || event.metadata?.toStatus))}</strong>
                  <span>${escapeHtml(formatDate(event.createdAt) || event.createdAt || "")}</span>
                </div>
                  <p>${escapeHtml(`${event.metadata?.fromStatus || "未知"} -> ${event.metadata?.toStatus || event.eventType || "未知"}`)}</p>
                ${event.adoptionEventId ? `<p>${escapeHtml(`审阅事件：${event.adoptionEventId}`)}</p>` : ""}
                ${event.comment ? `<p>${escapeHtml(event.comment)}</p>` : ""}
              </div>
            `)
            .join("")}
        </div>
      </section>
    `;
  }

  const history = Array.isArray(detail.item?.history) ? detail.item.history : [];
  if (!history.length) {
    return `
      <section class="ai-inbox-detail-section">
        <h3>审阅历史</h3>
        <div class="scheduled-task-empty">还没有审阅事件记录。</div>
      </section>
    `;
  }

  return `
    <section class="ai-inbox-detail-section">
        <h3>审阅历史</h3>
      <div class="ai-inbox-decision-list">
        ${history
          .slice()
          .reverse()
          .map((entry) => `
            <div class="ai-inbox-decision">
              <div>
                <strong>${escapeHtml(aiSuggestionStatusLabel(entry.toStatus || entry.action))}</strong>
                <span>${escapeHtml(formatDate(entry.createdAt) || entry.createdAt || "")}</span>
              </div>
              <p>${escapeHtml(`${entry.fromStatus || "未知"} -> ${entry.toStatus || entry.action || "未知"}`)}</p>
              ${entry.comment ? `<p>${escapeHtml(entry.comment)}</p>` : ""}
            </div>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderActionError(message = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  return `<div class="scheduled-task-empty is-bad">AI 建议审阅失败：${escapeHtml(text)}</div>`;
}

function renderActionNotice(message = "", tone = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  const cleanTone = String(tone || "").trim();
  return `<div class="scheduled-task-empty ${cleanTone ? `tone-${escapeHtml(cleanTone)}` : ""}" data-ai-suggestion-action-notice="true">${escapeHtml(text)}</div>`;
}

function renderLatestDetailState(detailLoading = false, detailError = "") {
  if (detailLoading) {
    return `<div class="ai-inbox-detail-muted">正在加载最新详情...</div>`;
  }
  const text = String(detailError || "").trim();
  if (!text) return "";
  return `<div class="scheduled-task-empty is-bad">AI 建议详情加载失败：${escapeHtml(text)}</div>`;
}

function renderReviewSafety(item = {}, detailLoading = false, detailError = "", actionLoading = false, actionError = "", actionNotice = "", actionNoticeTone = "") {
  return `
    <article class="ai-inbox-detail ${actionLoading || detailLoading ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">AI 建议</div>
          <h2>${escapeHtml(aiSuggestionTargetLabel(item))}</h2>
          <p>${escapeHtml(item.scope || "scope")}</p>
        </div>
        ${badge(aiSuggestionStatusLabel(item.status), aiSuggestionStatusTone(item.status))}
      </header>
      <section class="ai-inbox-detail-section">
        <h3>审阅安全</h3>
        <div class="ai-inbox-detail-muted">先加载最新详情，再执行审阅动作，避免决策和当前标准建议脱节。</div>
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
    if (detailError) return `<div class="scheduled-task-empty is-bad">AI 建议详情加载失败：${escapeHtml(detailError)}</div>`;
    return `<div class="scheduled-task-empty">选择一条建议后，可在这里查看它的目标、内容和审阅历史。</div>`;
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
  if (detailError) return `<div class="scheduled-task-empty is-bad">AI 建议详情加载失败：${escapeHtml(detailError)}</div>`;
  const activeDetail = detailMatchesSelection ? { ...detail, item } : { item };
  return `
    <article class="ai-inbox-detail ${actionLoading ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">AI 建议</div>
          <h2>${escapeHtml(aiSuggestionTargetLabel(item))}</h2>
          <p>${escapeHtml(item.scope || "scope")}</p>
        </div>
        ${badge(aiSuggestionStatusLabel(item.status), aiSuggestionStatusTone(item.status))}
      </header>
      <section class="ai-inbox-detail-section">
        <h3>内容</h3>
        <pre class="ai-inbox-json">${escapeHtml(typeof item.content === "string" ? item.content : JSON.stringify(item.content || {}, null, 2))}</pre>
      </section>
      ${renderTrace(activeDetail)}
      ${renderLinkedArtifact(activeDetail)}
      ${renderDraftEditingGuide(item)}
      ${renderContentEditor(item, actionLoading)}
      ${renderProvenance(activeDetail)}
      ${renderHistory(activeDetail)}
      ${renderActionError(actionError)}
      ${renderActionNotice(actionNotice, actionNoticeTone)}
      <div class="scheduled-task-actions">
        <button
          class="mini-btn"
          type="button"
          data-ai-suggestion-open-note="${attr(item.target?.id || "")}"
          ${item.target?.id && !actionLoading ? "" : "disabled"}
        >
          打开目标笔记
        </button>
      </div>
      ${renderActions(item, actionLoading)}
    </article>
  `;
}

export function renderAiSuggestionsPanel(state = {}) {
  const summary = aiSuggestionSummary({ items: state.items, total: state.total });
  return `
    <div class="scheduled-task-panel">
      <div class="scheduled-task-head">
        <div>
          <div class="settings-card-title">AI 建议</div>
          <div class="settings-card-note">在字段级和对象级 AI 建议真正进入用户自有成果之前，先在这里完成审阅。</div>
        </div>
        <div class="settings-stat-row">
          ${badge(`${summary.visible}/${summary.total} 可见`, "muted")}
          ${badge(`${summary.counts.suggested || 0} 待建议`, "warn")}
          ${badge(`${summary.counts.confirmed || 0} 已确认`, "ok")}
          ${summary.counts.rejected ? badge(`${summary.counts.rejected} 已拒绝`, "muted") : ""}
        </div>
      </div>
      ${renderControls(state)}
      <div class="ai-inbox-grid">
        <section class="ai-inbox-list-pane">${renderList(state)}</section>
        <section class="ai-inbox-detail-pane">${renderDetail(state)}</section>
      </div>
    </div>
  `;
}
