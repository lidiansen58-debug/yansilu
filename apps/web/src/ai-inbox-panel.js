import {
  aiInboxActionLabel,
  aiInboxCounts,
  aiInboxEvaluationMetrics,
  aiInboxStatusLabel,
  aiInboxStatusTone,
  aiInboxSummary,
  aiInboxTypeLabel,
  aiInboxTypeOptions,
  aiInboxViewOptions,
  fieldSuggestionSummary,
  isNoteToNoteLinkSuggestion,
  latestFeedbackFlags,
  linkSuggestionSummary,
  notePromotionSummary,
  normalizeAiInboxFilters,
  selectedAiInboxItem
} from "./ai-inbox-model.js";
import {
  aiSuggestionActionSet,
  aiSuggestionStatusLabel,
  aiSuggestionStatusTone
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

function renderBadge(text = "", tone = "") {
  const cleanTone = String(tone || "").trim();
  return `<span class="ai-inbox-badge ${cleanTone ? `tone-${escapeHtml(cleanTone)}` : ""}">${escapeHtml(text)}</span>`;
}

function artifactPayload(value = {}) {
  return value?.payload && typeof value.payload === "object" ? value.payload : {};
}

function endpointTitle(endpoint = {}, fallback = "") {
  return String(endpoint?.title || endpoint?.name || endpoint?.label || endpoint?.id || fallback || "").trim();
}

function isInternalIdentifier(value = "") {
  const text = String(value || "").trim();
  return /^[A-Z]+-[A-Z0-9_-]{8,}$/.test(text) || /^[a-z0-9]+(?:[_-][a-z0-9]+){2,}$/.test(text);
}

function displayNoteName(value = "", fallback = "这条笔记") {
  const text = String(value || "").trim();
  if (!text || isInternalIdentifier(text)) return fallback;
  return text;
}

function readableAiText(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .replace(/\bField suggestion trace priority\b/gi, "观点草稿建议")
    .replace(/\bField suggestion placeholder\b/gi, "观点草稿建议")
    .replace(/\bField suggestion trace\b/gi, "观点草稿建议")
    .replace(/\bField suggestion confirm\b/gi, "观点草稿建议")
    .replace(/\bField suggestion notice\b/gi, "观点草稿建议")
    .replace(/\bField suggestion error\b/gi, "观点草稿建议")
    .replace(/\bField suggestion loading\b/gi, "观点草稿建议")
    .replace(/\bPERM-[A-Z0-9_-]+\b/g, "这条笔记")
    .replace(/\bsource_trace_missing\b/g, "缺少来源线索")
    .replace(/\btraceable_sources\b/g, "缺少来源线索")
    .replace(/\bmissing_relations\b/g, "缺少关联")
    .replace(/\breview_missing_relations\b/g, "检查缺少的关联")
    .replace(/\breview_graph_bridge\b/g, "检查可能的连接")
    .replace(/\bcandidate\b/gi, "建议");
}

function graphReviewEndpointPair(value = {}) {
  const payload = artifactPayload(value);
  const from = payload.from || {};
  const to = payload.to || {};
  const sourceTitle = String(payload.sourceTitle || payload.source_title || endpointTitle(from)).trim();
  const targetTitle = String(payload.targetTitle || payload.target_title || endpointTitle(to)).trim();
  const sourceKind = String(from.kind || from.type || "note").trim().toLowerCase();
  const targetKind = String(to.kind || to.type || "note").trim().toLowerCase();
  return {
    sourceTitle,
    targetTitle,
    sourceKind,
    targetKind,
    sourceId: String(from.id || payload.fromNoteId || payload.from_note_id || "").trim(),
    targetId: String(to.id || payload.toNoteId || payload.to_note_id || "").trim()
  };
}

function isInternalGraphTitle(title = "") {
  return ["Graph bridge candidate", "Isolated permanent note"].includes(String(title || "").trim());
}

function aiInboxReadableTitle(value = {}) {
  const type = String(value.type || "").trim();
  const title = String(value.title || "").trim();
  const summary = String(value.summary || "").trim();
  const pair = graphReviewEndpointPair(value);
  if (type === "BridgeCard") {
    if (pair.sourceTitle && pair.targetTitle) return `《${pair.sourceTitle}》可能可以关联到《${pair.targetTitle}》`;
    return summary ? `缺少连接：${summary}` : "有一条缺失连接待确认";
  }
  if (type === "QuestionCard" && (isInternalGraphTitle(title) || String(artifactPayload(value).suggestedAction || artifactPayload(value).suggested_action || "").includes("missing_relations"))) {
    const noteTitle = String(artifactPayload(value).noteTitle || artifactPayload(value).note_title || summary || title || "").trim();
    return noteTitle ? `《${noteTitle}》还没有进入关系网` : "有一条永久笔记还没有进入关系网";
  }
  if (type === "LinkSuggestion" && (pair.sourceTitle || pair.targetTitle)) {
    return `《${displayNoteName(pair.sourceTitle || pair.sourceId, "来源笔记")}》可能可以关联到《${displayNoteName(pair.targetTitle || pair.targetId, "目标笔记")}》`;
  }
  if (isInternalGraphTitle(title)) return summary || aiInboxTypeLabel(type);
  const readableTitle = readableAiText(title);
  if (readableTitle && !isInternalIdentifier(readableTitle)) return readableTitle.replace(/候选/g, "建议");
  if (type === "PrincipleCheck") return "有一条笔记建议待确认";
  return aiInboxTypeLabel(type) || "未命名建议";
}

function aiInboxReadableSummary(value = {}) {
  const type = String(value.type || "").trim();
  const payload = artifactPayload(value);
  const summary = String(value.summary || "").trim();
  if (type === "BridgeCard") {
    return summary || "两条笔记可能需要一条能说清理由的连接。";
  }
  if (type === "QuestionCard" && String(payload.suggestedAction || payload.suggested_action || "").includes("missing_relations")) {
    return "这条永久笔记还没有关联，先判断是否需要接入图谱。";
  }
  if (type === "LinkSuggestion") {
    return readableAiText(summary || payload.rationale) || "发现一条可能关系，确认后才会写入图谱。";
  }
  return readableAiText(summary) || "打开右侧查看来源、理由和可执行动作。";
}

function isGraphReviewArtifact(value = {}) {
  const type = String(value.type || "").trim();
  const payload = artifactPayload(value);
  const action = String(payload.suggestedAction || payload.suggested_action || "").trim();
  return type === "BridgeCard" || type === "LinkSuggestion" || action === "review_missing_relations" || action === "review_graph_bridge";
}

function viewLabel(value = "") {
  const option = aiInboxViewOptions().find((item) => item.value === String(value || "").trim());
  return option?.label || value || "当前视图";
}

function renderWorkflowGuide() {
  return `
    <section class="ai-inbox-principle" aria-label="AI 建议处理原则">
      <strong>确认后才会写入</strong>
      <span>没有把握就忽略。</span>
    </section>
  `;
}

function renderViewTabs(filters = {}, counts = {}) {
  const normalizedFilters = normalizeAiInboxFilters(filters);
  const normalizedCounts = aiInboxCounts(counts);
  return `
    <div class="ai-inbox-tabs" role="tablist" aria-label="AI 建议视图">
      ${aiInboxViewOptions()
        .map((view) => {
          const active = view.value === normalizedFilters.view;
          return `
            <button
              class="ai-inbox-tab ${active ? "is-active" : ""}"
              type="button"
              data-ai-inbox-view="${attr(view.value)}"
              aria-selected="${active ? "true" : "false"}"
            >
              <span>${escapeHtml(view.label)}</span>
              <strong>${escapeHtml(normalizedCounts[view.value] ?? 0)}</strong>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFilters(filters = {}, counts = {}) {
  const normalizedFilters = normalizeAiInboxFilters(filters);
  return `
    <section class="ai-inbox-controls">
      <div class="ai-inbox-section-title">
        <strong>筛选</strong>
      </div>
      <div class="ai-inbox-filter-row">
        <label>
          <span>建议类型</span>
          <select id="aiInboxTypeFilter">
            ${aiInboxTypeOptions()
              .map((option) => `<option value="${attr(option.value)}" ${option.value === normalizedFilters.type ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>只看一条笔记</span>
          <input id="aiInboxSourceNoteFilter" value="${attr(normalizedFilters.sourceNoteId)}" placeholder="可留空" />
        </label>
        <button class="mini-btn" id="btnAiInboxApplyFilters" type="button">应用筛选</button>
        <button class="mini-btn" id="btnAiInboxRefresh" type="button">刷新</button>
      </div>
    </section>
  `;
}

function renderItem(item = {}, selectedArtifactId = "") {
  const active = String(item.artifactId || "") === String(selectedArtifactId || "");
  const tone = aiInboxStatusTone(item.status);
  const updated = formatDate(item.updatedAt || item.createdAt);
  const feedback = latestFeedbackFlags(item);
  const title = aiInboxReadableTitle(item);
  const summary = aiInboxReadableSummary(item);
  const feedbackLabels = [
    feedback.useful ? "有用" : "",
    feedback.noisy ? "噪音" : "",
    feedback.wrong ? "错误" : "",
    feedback.alreadyKnown ? "已知" : "",
    feedback.privacyConcern ? "隐私" : ""
  ].filter(Boolean);

  return `
    <button
      class="ai-inbox-item ${active ? "is-active" : ""}"
      type="button"
      data-ai-inbox-artifact-id="${attr(item.artifactId)}"
    >
      <span class="ai-inbox-item-head">
        <strong>${escapeHtml(title)}</strong>
        ${renderBadge(aiInboxStatusLabel(item.status), tone)}
      </span>
      <span class="ai-inbox-item-summary">${escapeHtml(summary)}</span>
      <span class="ai-inbox-item-meta">
        <span>${escapeHtml(aiInboxTypeLabel(item.type))}</span>
        ${updated ? `<span>${escapeHtml(updated)}</span>` : ""}
      </span>
      ${
        feedbackLabels.length
          ? `<span class="ai-inbox-feedback-row">${feedbackLabels.map((label) => renderBadge(label, "muted")).join("")}</span>`
          : ""
      }
    </button>
  `;
}

function renderList(state = {}) {
  const items = Array.isArray(state.items) ? state.items : [];
  if (state.loading) {
    return `<div class="ai-inbox-empty">正在读取 AI 建议...</div>`;
  }
  if (state.error) {
    return `<div class="ai-inbox-empty is-bad">AI 建议加载失败：${escapeHtml(state.error)}</div>`;
  }
  if (!items.length) {
    return `<div class="ai-inbox-empty">当前筛选下没有待处理建议。你可以刷新，或运行一次“发现相关笔记”/“提醒我回看”/“发现可写主题”后再回来处理。</div>`;
  }
  return `<div class="ai-inbox-list">${items.map((item) => renderItem(item, state.selectedArtifactId)).join("")}</div>`;
}

function renderEvaluationSummary(state = {}) {
  if (state.evaluationLoading) {
    return `<section class="ai-inbox-evaluation-summary"><div class="ai-inbox-detail-muted">正在统计处理情况...</div></section>`;
  }
  if (state.evaluationError) {
    return `<section class="ai-inbox-evaluation-summary is-bad"><div class="ai-inbox-detail-muted">处理统计加载失败：${escapeHtml(state.evaluationError)}</div></section>`;
  }
  const summary = state.evaluationSummary || null;
  if (!summary) {
    return "";
  }
  if (Number(summary.artifacts?.withDecision || summary.decisions?.total || 0) <= 0) return "";
  const metrics = aiInboxEvaluationMetrics(summary);
  const filter = summary.filter || {};
  const scope = [
    filter.view ? viewLabel(filter.view) : "",
    filter.type ? aiInboxTypeLabel(filter.type) : "",
    filter.sourceNoteId ? `来源 ${filter.sourceNoteId}` : ""
  ].filter(Boolean).join(" / ") || "全部建议";
  return `
    <details class="ai-inbox-evaluation-summary">
      <summary>
        <div>
          <h3>处理质量</h3>
          <p>${escapeHtml(scope)}</p>
        </div>
        ${renderBadge(`${summary.artifacts?.withDecision || 0} 条已处理`, "muted")}
      </summary>
      <div class="ai-inbox-metric-grid">
        ${metrics
          .map(
            (metric) => `
              <div class="ai-inbox-metric ${metric.tone ? `tone-${attr(metric.tone)}` : ""}">
                <strong>${escapeHtml(metric.value)}</strong>
                <span>${escapeHtml(metric.label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </details>
  `;
}

function renderSourceNotes(noteIds = [], actionLoading = false) {
  const ids = Array.isArray(noteIds) ? noteIds.filter(Boolean) : [];
  if (!ids.length) return `<div class="ai-inbox-detail-muted">这条建议没有记录来源笔记，处理前需要谨慎。</div>`;
  return `
    <div class="ai-inbox-source-list">
      ${ids
        .map(
          (noteId, index) => `
            <button class="mini-btn is-ghost" type="button" data-ai-inbox-open-note="${attr(noteId)}" ${actionLoading ? "disabled" : ""}>打开来源笔记 ${index + 1}</button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPayloadPreview(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    const value = typeof payload === "string" ? payload : JSON.stringify(payload);
    return value ? `<pre class="ai-inbox-json">${escapeHtml(value)}</pre>` : "";
  }
  const entries = Object.entries(payload)
    .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 8);
  if (!entries.length) return `<pre class="ai-inbox-json">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
  return `
    <dl class="ai-inbox-kv">
      ${entries
        .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value === null ? "null" : String(value))}</dd>`)
        .join("")}
    </dl>
  `;
}

function renderSuggestionTrace(detail = {}, actionLoading = false) {
  const suggestion = detail.suggestion || null;
  const artifact = detail.artifact || null;
  const payload = artifact?.payload && typeof artifact.payload === "object" ? artifact.payload : {};
  const display = traceDisplayState({
    trace: detail.trace,
    target: suggestion?.target,
    sourceArtifactId: suggestion?.sourceArtifactId,
    sourceNoteIds: artifact?.sources?.noteIds,
    status: suggestion?.status
  });
  const suggestionId = suggestion?.id || detail.trace?.suggestionId || "";
  const targetNoteId = display.targetNoteId;
  const targetField = display.targetField;
  const status = display.status;
  const hasLinkedSuggestionContext =
    Boolean(suggestion) ||
    Boolean(detail.trace && Object.keys(detail.trace).length) ||
    Boolean(payload.fieldSuggestionId || payload.field_suggestion_id || payload.fieldSuggestion || payload.field_suggestion);
  if (!hasLinkedSuggestionContext) return "";
  const placeholderText = tracePlaceholderCopy({
    suggestionId,
    sourceArtifactId: display.sourceArtifactId,
    targetNoteId
  });
  const tracePlaceholder = placeholderText
    ? `<div class="ai-inbox-detail-muted">${escapeHtml(placeholderText)}</div>`
    : "";
  const targetHint = targetNoteId
    ? ""
    : `<div class="ai-inbox-detail-muted">${escapeHtml(traceMissingTargetCopy())}</div>`;
  const sourceText = display.sourceNoteIds.join(", ") || display.primarySourceNoteId || "not recorded";
  return `
    <section class="ai-inbox-detail-section">
      <h3>Suggestion trace</h3>
      ${tracePlaceholder}
      <dl class="ai-inbox-kv">
        <dt>Suggestion</dt><dd>${escapeHtml(suggestionId || "not linked")}</dd>
        <dt>来源建议</dt><dd>${escapeHtml(display.sourceArtifactId || "未记录")}</dd>
        <dt>目标笔记</dt><dd>${escapeHtml(targetNoteId || "缺少目标笔记")}</dd>
        <dt>目标字段</dt><dd>${escapeHtml(targetField || "未记录")}</dd>
        <dt>状态</dt><dd>${escapeHtml(status ? aiSuggestionStatusLabel(status) : "未记录")}</dd>
        <dt>来源笔记</dt><dd>${escapeHtml(sourceText)}</dd>
      </dl>
      ${targetHint}
      <div class="ai-inbox-actions">
        <button class="mini-btn" type="button" data-ai-inbox-open-note="${attr(targetNoteId)}" ${targetNoteId && !actionLoading ? "" : "disabled"}>
          打开目标笔记
        </button>
      </div>
    </section>
  `;
}

function renderSuggestionDraftEditingGuide(detail = {}) {
  const suggestion = detail.suggestion || null;
  const status = String(suggestion?.status || "").trim();
  if (status === "adopted_as_draft") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>下一步</h3>
        <p>打开目标笔记，确认草稿内容后再标记为已编辑。</p>
      </section>
    `;
  }
  if (status === "edited") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>等待确认</h3>
        <p>确认前请先检查目标笔记里的内容是否已经表达清楚。</p>
      </section>
    `;
  }
  return "";
}

function renderReviewedSuggestionContent(detail = {}, actionLoading = false) {
  const suggestion = detail.suggestion || null;
  const status = String(suggestion?.status || "").trim();
  if (!suggestion || !["adopted_as_draft", "edited", "confirmed"].includes(status)) return "";
  const content = typeof suggestion.content === "string" ? suggestion.content : JSON.stringify(suggestion.content || {}, null, 2);
  if (status === "adopted_as_draft" || status === "edited") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>已整理内容</h3>
        <textarea id="aiInboxSuggestionContentEditor" rows="8" placeholder="确认前可在这里调整内容。" ${actionLoading ? "disabled" : ""}>${escapeHtml(content)}</textarea>
      </section>
    `;
  }
  return `
    <section class="ai-inbox-detail-section">
      <h3>已整理内容</h3>
      <pre class="ai-inbox-json">${escapeHtml(content)}</pre>
    </section>
  `;
}

function renderSuggestionProvenance(detail = {}) {
  const suggestion = detail.suggestion || null;
  if (!suggestion) return "";
  return `
    <section class="ai-inbox-detail-section">
      <h3>确认信息</h3>
      <dl class="ai-inbox-kv">
        <dt>内容来源</dt><dd>${escapeHtml(suggestion.provenance?.contentOrigin || suggestion.origin ? "AI 建议" : "未记录")}</dd>
        <dt>人工编辑</dt><dd>${escapeHtml(suggestion.provenance?.humanEdited ? "是" : "否")}</dd>
        <dt>人工确认</dt><dd>${escapeHtml(suggestion.provenance?.humanConfirmed ? "是" : "否")}</dd>
        <dt>状态</dt><dd>${renderBadge(aiSuggestionStatusLabel(suggestion.status), aiSuggestionStatusTone(suggestion.status))}</dd>
      </dl>
    </section>
  `;
}

function renderSuggestionHistory(detail = {}) {
  const suggestion = detail.suggestion || null;
  const events = Array.isArray(detail.suggestionReviewEvents) ? detail.suggestionReviewEvents : [];
  if (!suggestion && !events.length) return "";
  if (!events.length) {
    return `
      <section class="ai-inbox-detail-section">
      <h3>处理历史</h3>
      <div class="ai-inbox-detail-muted">还没有处理记录。</div>
      </section>
    `;
  }
  return `
    <section class="ai-inbox-detail-section">
      <h3>处理历史</h3>
      <div class="ai-inbox-decision-list">
        ${events
          .slice()
          .reverse()
          .map((event) => `
            <div class="ai-inbox-decision">
              <div>
                <strong>${escapeHtml(aiSuggestionStatusLabel(event.eventType || event.metadata?.toStatus))}</strong>
                <span>${escapeHtml(formatDate(event.createdAt) || event.createdAt || "")}</span>
              </div>
              <p>${escapeHtml(`${aiSuggestionStatusLabel(event.metadata?.fromStatus || "") || "未记录"} -> ${aiSuggestionStatusLabel(event.metadata?.toStatus || event.eventType || "") || "未记录"}`)}</p>
              ${event.comment ? `<p>${escapeHtml(event.comment)}</p>` : ""}
            </div>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderSuggestionReviewActions(detail = {}, actionLoading = false) {
  const suggestion = detail.suggestion || null;
  if (!suggestion) return "";
  const suggestionId = String(suggestion.id || "").trim();
  const artifact = detail.artifact || null;
  const adoptableFieldSuggestion = fieldSuggestionSummary(artifact);
  const actions = aiSuggestionActionSet(suggestion).filter((action) => {
    if (action === "adopted_as_draft") return adoptableFieldSuggestion.canAdopt;
    return true;
  });
  if (!actions.length) return "";
  const labels = {
    adopted_as_draft: "写入草稿",
    edited: "标记已编辑",
    rejected: "忽略",
    confirmed: "确认"
  };
  return `
    <div class="ai-inbox-action-card">
      <div>
        <h3>处理关联建议</h3>
        <p>只有点击确认按钮后才会写入。</p>
      </div>
      <div class="ai-inbox-actions">
        ${actions
          .map(
            (action) => `
              <button
                class="mini-btn ${action === "confirmed" ? "primary" : ""}"
                type="button"
                data-ai-inbox-suggestion-status="${attr(action)}"
                data-ai-inbox-suggestion-id="${attr(suggestionId)}"
                ${actionLoading ? "disabled" : ""}
              >
                ${escapeHtml(labels[action] || action)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderActionError(message = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  return `<div class="ai-inbox-empty is-bad">建议处理失败：${escapeHtml(text)}</div>`;
}

function renderActionNotice(message = "", tone = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  const cleanTone = String(tone || "").trim();
  return `<div class="ai-inbox-detail-muted ${cleanTone ? `tone-${escapeHtml(cleanTone)}` : ""}" data-ai-inbox-action-notice="true">${escapeHtml(text)}</div>`;
}
function renderLatestDetailState(detailLoading = false, detailError = "") {
  if (detailLoading) {
    return `<div class="ai-inbox-detail-muted">正在读取最新详情...</div>`;
  }
  const text = String(detailError || "").trim();
  if (!text) return "";
  return `<div class="ai-inbox-empty is-bad">详情读取失败：${escapeHtml(text)}</div>`;
}
function renderFeedbackControls(actionLoading = false) {
  return `
    <div class="ai-inbox-feedback-controls">
      <label><input type="checkbox" data-ai-inbox-feedback="useful" ${actionLoading ? "disabled" : ""} /> 有用</label>
      <label><input type="checkbox" data-ai-inbox-feedback="noisy" ${actionLoading ? "disabled" : ""} /> 噪音</label>
      <label><input type="checkbox" data-ai-inbox-feedback="wrong" ${actionLoading ? "disabled" : ""} /> 错误</label>
      <label><input type="checkbox" data-ai-inbox-feedback="alreadyKnown" ${actionLoading ? "disabled" : ""} /> 已知</label>
      <label><input type="checkbox" data-ai-inbox-feedback="privacyConcern" ${actionLoading ? "disabled" : ""} /> 隐私风险</label>
    </div>
  `;
}

function renderReviewActions(item = {}, actionLoading = false) {
  if (!item.artifactId) return "";
  if (String(item.status || "").trim() !== "pending_review") {
    return `
      <div class="ai-inbox-action-card is-muted">
        <div>
          <h3>处理这条建议</h3>
          <p>这条建议已经处理过；如需修改，请回到对应笔记或重新生成建议。</p>
        </div>
      </div>
    `;
  }
  return `
    <div class="ai-inbox-action-card">
      <div>
        <h3>处理这条建议</h3>
        <p>这里先记录判断；只有下面的“建立关系”或“生成草稿”按钮会真正改动笔记数据。</p>
      </div>
      ${renderFeedbackControls(actionLoading)}
      <textarea id="aiInboxDecisionComment" placeholder="可选：写下为什么采纳、忽略或归档" ${actionLoading ? "disabled" : ""}></textarea>
      <div class="ai-inbox-actions">
        ${["accepted", "ignored", "archived"]
          .map(
            (decision) => `
              <button class="mini-btn ${decision === "accepted" ? "primary" : ""}" type="button" data-ai-inbox-decision="${attr(decision)}" ${actionLoading ? "disabled" : ""}>
                ${escapeHtml(aiInboxActionLabel(decision))}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function aiInboxSummaryMatchesCurrentDetail(state = {}, item = {}) {
  const summaryArtifactId = String(state.aiSummaryArtifactId || "").trim();
  const itemArtifactId = String(item.artifactId || "").trim();
  if (!itemArtifactId || summaryArtifactId !== itemArtifactId) return false;
  const summarySuggestionId = String(state.aiSummarySuggestionId || "").trim();
  if (!summarySuggestionId) return true;
  const detailArtifactId = String(state.detail?.item?.artifactId || state.detail?.artifact?.id || "").trim();
  if (detailArtifactId !== itemArtifactId) return false;
  const detailSuggestionId = String(state.detail?.suggestion?.id || "").trim();
  return Boolean(detailSuggestionId) && detailSuggestionId === summarySuggestionId;
}

function renderAiSummary(state = {}, item = {}, actionLoading = false) {
  if (!item.artifactId) return "";
  const summaryMatchesItem = aiInboxSummaryMatchesCurrentDetail(state, item);
  const loading = state.aiSummaryLoading === true && summaryMatchesItem;
  const meta = summaryMatchesItem ? String(state.aiSummaryMeta || "").trim() : "";
  const error = summaryMatchesItem ? String(state.aiSummaryError || "").trim() : "";
  const summary = summaryMatchesItem ? String(state.aiSummary || "").trim() : "";
  return `
    <div class="ai-inbox-action-card ${loading || actionLoading ? "is-busy" : ""}">
      <div>
        <h3>AI 摘要（本地优先）</h3>
        <p>快速总结这条建议，方便你判断是否处理。</p>
      </div>
      <div class="ai-inbox-actions">
        <button class="mini-btn primary" id="btnAiInboxSummarize" type="button" ${loading || actionLoading ? "disabled" : ""}>
          ${loading ? "运行中..." : "生成摘要"}
        </button>
        <span class="ai-inbox-detail-muted">${escapeHtml(meta || (error ? "失败" : "未生成"))}</span>
      </div>
      ${error ? `<div class="ai-inbox-detail-muted" style="color:#b42318;">${escapeHtml(error)}</div>` : ""}
      ${summary ? `<pre class="ai-inbox-json">${escapeHtml(summary)}</pre>` : `<div class="ai-inbox-detail-muted">（空）</div>`}
    </div>
  `;
}

function renderRecommendedSummaryAction(state = {}, item = {}, actionLoading = false) {
  const summaryMatchesItem = aiInboxSummaryMatchesCurrentDetail(state, item);
  if (!summaryMatchesItem) return "";
  const action = String(state.aiSummaryRecommendedAction || "").trim();
  const labels = {
    accept_link: "建立关系",
    adopt_field_suggestion: "写入草稿",
    promote_note: "生成草稿笔记",
    ignore: "忽略",
    needs_more_context: "稍后处理"
  };
  const titles = {
    accept_link: "建议建立关系",
    adopt_field_suggestion: "建议写入草稿",
    promote_note: "建议生成草稿笔记",
    ignore: "建议忽略",
    needs_more_context: "需要更多上下文"
  };
  if (!labels[action]) return "";
  return `
    <div class="ai-inbox-action-card">
      <div>
        <h3>${escapeHtml(titles[action])}</h3>
        <p>确认后才会执行。</p>
      </div>
      <button class="mini-btn primary" type="button" data-ai-inbox-recommended-action="${attr(action)}" ${actionLoading ? "disabled" : ""}>
        ${escapeHtml(labels[action])}
      </button>
    </div>
  `;
}

function renderLinkSuggestionAction(artifact = {}, actionLoading = false) {
  if (!artifact || artifact.type !== "LinkSuggestion") return "";
  const link = linkSuggestionSummary(artifact);
  const relationText = link.relationType ? `关系类型：${link.relationType}` : "选择后再确认关系类型";
  return `
    <div class="ai-inbox-action-card ${link.canAccept ? "" : "is-muted"}">
      <div>
        <h3>可落地为笔记关系</h3>
        <p>${escapeHtml(relationText)}</p>
      </div>
      <div class="ai-inbox-detail-muted">${escapeHtml(readableAiText(link.rationale) || "这条建议没有写明为什么相关，建议先忽略或补充说明。")}</div>
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-accept-link="${attr(artifact.id)}"
        ${link.canAccept && !actionLoading ? "" : "disabled"}
      >
        建立为笔记关系
      </button>
      ${link.canAccept ? "" : `<div class="ai-inbox-detail-muted">只有“笔记到笔记”的关联建议才能进入图谱关系。</div>`}
    </div>
  `;
}

function renderNotePromotionAction(artifact = {}, actionLoading = false) {
  const promotion = notePromotionSummary(artifact);
  if (!promotion.artifactType || !["QuestionCard", "ReflectionPrompt"].includes(promotion.artifactType)) return "";
  return `
    <div class="ai-inbox-action-card ${promotion.canPromote ? "" : "is-muted"}">
      <div>
        <h3>可生成草稿笔记</h3>
        <p>${escapeHtml(promotion.suggestedTitle || "从这条建议生成一条可继续编辑的草稿。")}</p>
      </div>
      ${
        promotion.promotedNoteId
          ? `<div class="ai-inbox-detail-muted">已经生成一条草稿笔记。</div>`
          : `<div class="ai-inbox-detail-muted">会生成一条随笔草稿。你需要再改写确认，不能直接当作自己的原创判断。</div>`
      }
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-promote-note="${attr(artifact.id)}"
        ${promotion.canPromote && !actionLoading ? "" : "disabled"}
      >
        生成草稿笔记
      </button>
    </div>
  `;
}

function renderFieldSuggestionAction(artifact = {}, actionLoading = false) {
  const suggestion = fieldSuggestionSummary(artifact);
  if (!suggestion.field) return "";
  return `
    <div class="ai-inbox-action-card ${suggestion.canAdopt ? "" : "is-muted"}">
      <div>
        <h3>可采纳为观点草稿</h3>
        <p>${escapeHtml(suggestion.fieldLabel || "字段建议")}</p>
      </div>
      ${
        suggestion.adopted
          ? `<div class="ai-inbox-detail-muted">这条字段建议已经采纳为草稿。整理到正文仍需要你手动完成。</div>`
          : `<div class="ai-inbox-detail-muted">${escapeHtml(readableAiText(suggestion.value) || "没有可采纳内容。")}</div>`
      }
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-adopt-field="${attr(artifact.id)}"
        data-ai-inbox-suggestion-id="${attr(String(suggestion.id || "").trim())}"
        ${suggestion.canAdopt && !actionLoading ? "" : "disabled"}
      >
        写入草稿
      </button>
    </div>
  `;
}

function renderGraphReviewBrief(artifact = {}, item = {}, actionLoading = false) {
  const active = artifact || item || {};
  if (!isGraphReviewArtifact(active)) return "";
  const type = String(active.type || item.type || "").trim();
  const payload = artifactPayload(active);
  const pair = graphReviewEndpointPair(active);
  const isolatedNoteTitle = String(payload.noteTitle || payload.note_title || active.summary || item.summary || "").trim();
  const relationType = String(payload.relationType || payload.relation_type || "").trim();
  const reason = String(payload.aiRationale || payload.ai_rationale || payload.rationale || active.summary || item.summary || "").trim();
  const reviewQuestion = String(payload.reviewQuestion || payload.review_question || "").trim();
  const isIsolated = type === "QuestionCard" && String(payload.suggestedAction || payload.suggested_action || "").includes("missing_relations");
  const link = type === "LinkSuggestion" ? linkSuggestionSummary(active) : null;
  const title = isIsolated
    ? `待关联笔记：${displayNoteName(isolatedNoteTitle || payload.noteId || payload.note_id, "未命名笔记")}`
    : aiInboxReadableTitle(active);
  const primaryText = type === "LinkSuggestion"
    ? "建立为笔记关系"
    : isIsolated
      ? "处理关联"
      : "去图谱确认连接";
  return `
    <section class="ai-inbox-review-brief" aria-label="建议处理重点">
      <div class="ai-inbox-review-brief-head">
        <div>
          <span>${escapeHtml(isIsolated ? "待关联笔记" : type === "BridgeCard" ? "缺少连接" : "可能关联")}</span>
          <strong>${escapeHtml(title)}</strong>
        </div>
        ${renderBadge(aiInboxStatusLabel(active.status || item.status), aiInboxStatusTone(active.status || item.status))}
      </div>
      ${
        !isIsolated && (pair.sourceTitle || pair.targetTitle)
          ? `<div class="ai-inbox-review-pair">
              <span>${escapeHtml(displayNoteName(pair.sourceTitle || pair.sourceId, "来源笔记"))}</span>
              <strong>${escapeHtml(relationType ? aiInboxTypeLabel(type) : "可能相关")}</strong>
              <span>${escapeHtml(displayNoteName(pair.targetTitle || pair.targetId, "目标笔记"))}</span>
            </div>`
          : ""
      }
      <div class="ai-inbox-review-main">
        <strong>${escapeHtml(isIsolated ? "为什么提醒" : "推荐理由")}</strong>
        <p>${escapeHtml(readableAiText(reason) || (isIsolated ? "这条永久笔记还没有关联，需要处理关联。" : "这条建议还没有足够明确的理由，建议谨慎处理。"))}</p>
      </div>
      ${
        reviewQuestion
          ? `<div class="ai-inbox-review-main is-muted"><strong>确认问题</strong><p>${escapeHtml(reviewQuestion)}</p></div>`
          : ""
      }
      ${
        link && !link.canAccept
          ? `<div class="ai-inbox-detail-muted">这条建议不是“笔记到笔记”的关系，不能直接写入图谱。可以打开相关笔记，手工整理成关联。</div>`
          : ""
      }
      <div class="ai-inbox-actions">
        ${
          type === "LinkSuggestion"
            ? `<button class="mini-btn primary" type="button" data-ai-inbox-accept-link="${attr(active.id || item.artifactId)}" ${link?.canAccept && !actionLoading ? "" : "disabled"}>${escapeHtml(primaryText)}</button>`
            : ""
        }
        ${
          !isIsolated && pair.sourceId && pair.sourceKind === "note"
            ? `<button class="mini-btn" type="button" data-ai-inbox-open-note="${attr(pair.sourceId)}" ${actionLoading ? "disabled" : ""}>打开来源笔记</button>`
            : ""
        }
        ${
          !isIsolated && pair.targetId && pair.targetKind === "note"
            ? `<button class="mini-btn" type="button" data-ai-inbox-open-note="${attr(pair.targetId)}" ${actionLoading ? "disabled" : ""}>打开目标笔记</button>`
            : ""
        }
        ${
          isIsolated
            ? `<button class="mini-btn primary" type="button" data-ai-inbox-open-note="${attr(payload.noteId || payload.note_id || item.primarySourceNoteId || "")}" ${actionLoading ? "disabled" : ""}>${escapeHtml(primaryText)}</button>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderTechnicalDetails(activeArtifact = {}, item = {}, activeDetail = {}) {
  const payload = artifactPayload(activeArtifact);
  const provenance = activeArtifact.provenance || {};
  const trace = activeDetail?.trace && typeof activeDetail.trace === "object" ? activeDetail.trace : null;
  const body = typeof activeArtifact.body === "string" ? activeArtifact.body : JSON.stringify(activeArtifact.body || "", null, 2);
  return `
    <details class="ai-inbox-technical-details">
      <summary>查看技术信息</summary>
      <section class="ai-inbox-detail-section">
        <h3>运行信息</h3>
        <dl class="ai-inbox-kv">
          <dt>任务</dt><dd>${escapeHtml(activeArtifact.agentRunId || item.agentRunId || "未记录")}</dd>
          <dt>上下文包</dt><dd>${escapeHtml(activeArtifact.contextPackId || item.contextPackId || "未记录")}</dd>
          <dt>处理方式</dt><dd>${escapeHtml(activeArtifact.privacy?.mode === "local_only" || item.privacyMode === "local_only" ? "仅本机处理" : "按当前设置处理")}</dd>
        </dl>
      </section>
      <section class="ai-inbox-detail-section">
        <h3>建议正文</h3>
        ${body ? `<pre class="ai-inbox-json">${escapeHtml(body)}</pre>` : `<div class="ai-inbox-detail-muted">没有正文。</div>`}
      </section>
      <section class="ai-inbox-detail-section">
        <h3>结构化字段</h3>
        ${renderPayloadPreview(payload)}
      </section>
      ${
        trace && Object.keys(trace).length
          ? `<section class="ai-inbox-detail-section">
              <h3>建议定位</h3>
              <dl class="ai-inbox-kv">
                <dt>目标笔记</dt><dd>${escapeHtml(trace.targetNoteId || "未记录")}</dd>
                <dt>目标字段</dt><dd>${escapeHtml(trace.targetField || "未记录")}</dd>
                <dt>来源建议</dt><dd>${escapeHtml(trace.sourceArtifactId || "未记录")}</dd>
              </dl>
            </section>`
          : ""
      }
      ${
        provenance && Object.keys(provenance).length
          ? `<section class="ai-inbox-detail-section"><h3>原始运行信息</h3><pre class="ai-inbox-json">${escapeHtml(JSON.stringify(provenance, null, 2))}</pre></section>`
          : ""
      }
    </details>
  `;
}

function renderDecisions(decisions = []) {
  const items = Array.isArray(decisions) ? decisions : [];
  if (!items.length) return `<div class="ai-inbox-detail-muted">还没有处理记录。</div>`;
  return `
    <div class="ai-inbox-decision-list">
      ${items
        .slice()
        .reverse()
        .map((decision) => {
          const feedback = latestFeedbackFlags({ latestDecision: decision });
          const labels = [
            feedback.useful ? "有用" : "",
            feedback.noisy ? "噪音" : "",
            feedback.wrong ? "错误" : "",
            feedback.alreadyKnown ? "已知" : "",
            feedback.privacyConcern ? "隐私" : ""
          ].filter(Boolean);
          return `
            <div class="ai-inbox-decision">
              <div>
                <strong>${escapeHtml(aiInboxStatusLabel(decision.decision))}</strong>
                <span>${escapeHtml(formatDate(decision.createdAt) || decision.createdAt || "")}</span>
              </div>
              ${decision.comment ? `<p>${escapeHtml(decision.comment)}</p>` : ""}
              ${labels.length ? `<div>${labels.map((label) => renderBadge(label, "muted")).join("")}</div>` : ""}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDetailRefreshGate(item = {}, detailLoading = false, detailError = "", actionLoading = false, actionError = "", actionNotice = "", actionNoticeTone = "") {
  if (!item?.artifactId) return "";
  return `
    <article class="ai-inbox-detail ${actionLoading || detailLoading ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">${escapeHtml(aiInboxTypeLabel(item.type))}</div>
          <h2>${escapeHtml(aiInboxReadableTitle(item))}</h2>
          <p>${escapeHtml(aiInboxReadableSummary(item) || "正在加载这条建议的最新详情。")}</p>
        </div>
        ${renderBadge(aiInboxStatusLabel(item.status), aiInboxStatusTone(item.status))}
      </header>
      <section class="ai-inbox-detail-section">
        <h3>正在读取详情</h3>
        <div class="ai-inbox-detail-muted">详情读取完成后再处理，避免使用过期建议。</div>
      </section>
      ${renderLatestDetailState(detailLoading, detailError)}
      ${renderActionError(actionError)}
      ${renderActionNotice(actionNotice, actionNoticeTone)}
    </article>
  `;
}

function renderDetail(state = {}) {
  const detail = state.detail || {};
  const selectedArtifactId = String(state.selectedArtifactId || "").trim();
  const selectedListItem = selectedAiInboxItem(state.items, state.selectedArtifactId) || {};
  const loadedDetailArtifactId = String(detail.item?.artifactId || detail.artifact?.id || "").trim();
  const detailArtifactId = String(state.detailArtifactId || loadedDetailArtifactId).trim();
  const detailLoading = state.detailLoading && detailArtifactId === selectedArtifactId;
  const detailError = detailArtifactId === selectedArtifactId ? state.detailError : "";
  const detailMatchesSelection = Boolean(loadedDetailArtifactId) && loadedDetailArtifactId === selectedArtifactId;
  const activeDetail = detailMatchesSelection ? detail : {};
  const item = activeDetail.item || selectedListItem || {};
  const artifact = activeDetail.artifact || null;
  const currentSuggestionId = String(activeDetail.suggestion?.id || "").trim();
  const actionArtifactId = String(state.actionArtifactId || "").trim();
  const actionSuggestionId = String(state.actionSuggestionId || "").trim();
  const actionError =
    actionArtifactId &&
    actionArtifactId === String(item.artifactId || artifact?.id || "").trim() &&
    (!actionSuggestionId || actionSuggestionId === currentSuggestionId)
      ? state.actionError
      : "";
  const actionNoticeArtifactId = String(state.actionNoticeArtifactId || "").trim();
  const actionNoticeSuggestionId = String(state.actionNoticeSuggestionId || "").trim();
  const actionNotice =
    actionNoticeArtifactId &&
    actionNoticeArtifactId === String(item.artifactId || artifact?.id || "").trim() &&
    (!actionNoticeSuggestionId || actionNoticeSuggestionId === currentSuggestionId)
      ? state.actionNotice
      : "";
  const actionNoticeTone = actionNotice ? state.actionNoticeTone : "";
  const currentOrSelectedSuggestionId = String(currentSuggestionId || item.suggestionId || "").trim();
  const actionLoading =
    state.actionLoading === true &&
    actionArtifactId === String(item.artifactId || artifact?.id || "").trim() &&
    (!actionSuggestionId || !currentOrSelectedSuggestionId || actionSuggestionId === currentOrSelectedSuggestionId);
  if ((item.artifactId || artifact) && !detailMatchesSelection) {
    return renderDetailRefreshGate(item, detailLoading, detailError, actionLoading, actionError, actionNotice, actionNoticeTone);
  }

  if (detailLoading) {
    return `<div class="ai-inbox-empty">正在读取建议详情...</div>`;
  }
  if (detailError) {
    return `<div class="ai-inbox-empty is-bad">建议详情加载失败：${escapeHtml(detailError)}</div>`;
  }
  if (!item.artifactId && !artifact) {
    return `<div class="ai-inbox-empty">从左侧选择一条建议，右侧会显示来源、理由、可执行动作和处理记录。</div>`;
  }
  if (!detailMatchesSelection) {
    return renderDetailRefreshGate(item, detailLoading, detailError, actionLoading, actionError, actionNotice, actionNoticeTone);
  }

  const activeArtifact = artifact || item;
  const sourceNoteIds = activeArtifact.sources?.noteIds || item.sourceNoteIds || [];
  const graphReview = isGraphReviewArtifact(activeArtifact);
  const artifactActionBusy =
    state.actionLoading === true &&
    actionArtifactId === String(item.artifactId || activeArtifact?.id || "").trim();
  const suggestionActionBusy =
    artifactActionBusy &&
    (!actionSuggestionId || actionSuggestionId === currentSuggestionId);

  return `
    <article class="ai-inbox-detail ${suggestionActionBusy ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">${escapeHtml(aiInboxTypeLabel(activeArtifact.type || item.type))}</div>
          <h2>${escapeHtml(aiInboxReadableTitle(activeArtifact.id ? activeArtifact : item))}</h2>
          <p>${escapeHtml(aiInboxReadableSummary(activeArtifact.id ? activeArtifact : item))}</p>
        </div>
        ${renderBadge(aiInboxStatusLabel(activeArtifact.status || item.status), aiInboxStatusTone(activeArtifact.status || item.status))}
      </header>

      ${renderGraphReviewBrief(activeArtifact, item, artifactActionBusy)}
      ${
        graphReview
          ? ""
          : `<section class="ai-inbox-detail-section">
              <h3>来源笔记</h3>
              ${renderSourceNotes(sourceNoteIds, artifactActionBusy)}
            </section>`
      }

      ${graphReview ? "" : renderLinkSuggestionAction(activeArtifact, artifactActionBusy)}
      ${renderNotePromotionAction(activeArtifact, artifactActionBusy)}
      ${renderFieldSuggestionAction(activeArtifact, suggestionActionBusy)}
      ${renderSuggestionReviewActions(activeDetail, suggestionActionBusy)}
      ${renderActionError(actionError)}
      ${renderActionNotice(actionNotice, actionNoticeTone)}
      ${graphReview ? "" : renderAiSummary(state, item, artifactActionBusy)}
      ${graphReview ? "" : renderRecommendedSummaryAction(state, item, artifactActionBusy)}
      ${renderReviewActions(item, artifactActionBusy)}

      <section class="ai-inbox-detail-section">
        <h3>处理记录</h3>
        ${renderDecisions(activeArtifact.userDecisions || [])}
      </section>

      ${renderTechnicalDetails(activeArtifact, item, activeDetail)}
    </article>
  `;
}

export function renderAiInboxPanel(state = {}) {
  const filters = normalizeAiInboxFilters(state.filters || {});
  const summary = aiInboxSummary({ items: state.items, counts: state.counts, filters });
  return `
    <div class="ai-inbox-shell">
      <header class="ai-inbox-topline">
        <div>
          <div class="import-card-kicker">待确认建议</div>
          <strong>${escapeHtml(viewLabel(summary.view))} · ${escapeHtml(summary.visible)} 条</strong>
          <p>确认后才会写入笔记、关系或主题。</p>
        </div>
        <div class="ai-inbox-top-actions">
          ${state.actionLoading ? renderBadge("正在处理", "warn") : renderBadge("需人工确认", "ok")}
        </div>
      </header>
      <section class="ai-inbox-view-strip" aria-label="按处理状态切换 AI 建议">
        ${renderViewTabs(filters, summary.counts)}
      </section>
      <section class="ai-inbox-helper-row">
        ${renderWorkflowGuide()}
        ${renderFilters(filters, summary.counts)}
      </section>
      <main class="ai-inbox-grid">
        <section class="ai-inbox-list-pane">
          <div class="ai-inbox-section-title">
            <strong>${escapeHtml(viewLabel(summary.view))}</strong>
            <span>点一条查看来源和理由。</span>
          </div>
          ${renderList({ ...state, filters })}
        </section>
        <section class="ai-inbox-detail-pane">
          ${renderEvaluationSummary({ ...state, filters })}
          ${renderDetail({ ...state, filters })}
        </section>
      </main>
    </div>
  `;
}

export { isNoteToNoteLinkSuggestion };
