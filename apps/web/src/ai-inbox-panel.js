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

function viewLabel(value = "") {
  const option = aiInboxViewOptions().find((item) => item.value === String(value || "").trim());
  return option?.label || value || "当前视图";
}

function renderWorkflowGuide() {
  return `
    <section class="ai-inbox-guide" aria-label="AI 建议处理流程">
      <div class="ai-inbox-guide-item">
        <strong>1. 看建议</strong>
        <span>左侧是 AI 发现的关联、问题、冲突和写作线索。</span>
      </div>
      <div class="ai-inbox-guide-item">
        <strong>2. 查来源</strong>
        <span>右侧先看来源笔记和理由，确认它是不是有价值。</span>
      </div>
      <div class="ai-inbox-guide-item">
        <strong>3. 再落地</strong>
        <span>采纳后才会建立关系或生成草稿；忽略不会改动笔记。</span>
      </div>
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
      ${renderViewTabs(normalizedFilters, counts)}
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
          <span>来源笔记 ID</span>
          <input id="aiInboxSourceNoteFilter" value="${attr(normalizedFilters.sourceNoteId)}" placeholder="例如 note_..." />
        </label>
        <label>
          <span>运行范围</span>
          <select id="aiInboxPrivacyFilter">
            <option value="" ${normalizedFilters.privacyMode ? "" : "selected"}>不限</option>
            <option value="normal" ${normalizedFilters.privacyMode === "normal" ? "selected" : ""}>普通</option>
            <option value="local_only" ${normalizedFilters.privacyMode === "local_only" ? "selected" : ""}>仅本地</option>
          </select>
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
        <strong>${escapeHtml(item.title || item.artifactId || "未命名建议")}</strong>
        ${renderBadge(aiInboxStatusLabel(item.status), tone)}
      </span>
      <span class="ai-inbox-item-summary">${escapeHtml(item.summary || "没有摘要，打开右侧查看来源和字段。")}</span>
      <span class="ai-inbox-item-meta">
        <span>${escapeHtml(aiInboxTypeLabel(item.type))}</span>
        <span>${escapeHtml(item.privacyMode === "local_only" ? "仅本地" : "普通")}</span>
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
    return `<div class="ai-inbox-empty">当前筛选下没有待处理建议。你可以刷新，或运行一次关系扫描/反思任务后再回来处理。</div>`;
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
    return `<section class="ai-inbox-evaluation-summary"><div class="ai-inbox-detail-muted">还没有处理统计。开始采纳、忽略或归档建议后，这里会显示质量反馈。</div></section>`;
  }
  const metrics = aiInboxEvaluationMetrics(summary);
  const filter = summary.filter || {};
  const scope = [
    filter.view ? viewLabel(filter.view) : "",
    filter.type ? aiInboxTypeLabel(filter.type) : "",
    filter.sourceNoteId ? `来源 ${filter.sourceNoteId}` : "",
    filter.privacyMode ? (filter.privacyMode === "local_only" ? "仅本地" : filter.privacyMode) : ""
  ].filter(Boolean).join(" / ") || "全部建议";
  return `
    <section class="ai-inbox-evaluation-summary">
      <div class="ai-inbox-evaluation-head">
        <div>
          <h3>处理质量</h3>
          <p>${escapeHtml(scope)}</p>
        </div>
        ${renderBadge(`${summary.artifacts?.withDecision || 0} 条已处理`, "muted")}
      </div>
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
    </section>
  `;
}

function renderSourceNotes(noteIds = []) {
  const ids = Array.isArray(noteIds) ? noteIds.filter(Boolean) : [];
  if (!ids.length) return `<div class="ai-inbox-detail-muted">这条建议没有记录来源笔记，处理前需要谨慎。</div>`;
  return `
    <div class="ai-inbox-source-list">
      ${ids
        .map(
          (noteId) => `
            <button class="mini-btn is-ghost" type="button" data-ai-inbox-open-note="${attr(noteId)}">${escapeHtml(noteId)}</button>
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

function renderSuggestionTrace(detail = {}) {
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
        <dt>Source artifact</dt><dd>${escapeHtml(display.sourceArtifactId || "not recorded")}</dd>
        <dt>Target note</dt><dd>${escapeHtml(targetNoteId || "missing target note")}</dd>
        <dt>Target field</dt><dd>${escapeHtml(targetField || "not recorded")}</dd>
        <dt>Status</dt><dd>${escapeHtml(status ? aiSuggestionStatusLabel(status) : "not recorded")}</dd>
        <dt>Source notes</dt><dd>${escapeHtml(sourceText)}</dd>
      </dl>
      ${targetHint}
      <div class="ai-inbox-actions">
        <button class="mini-btn" type="button" data-ai-inbox-open-note="${attr(targetNoteId)}" ${targetNoteId ? "" : "disabled"}>
          Open target note
        </button>
      </div>
    </section>
  `;
}

function renderReviewedSuggestionContent(detail = {}) {
  const suggestion = detail.suggestion || null;
  const status = String(suggestion?.status || "").trim();
  if (!suggestion || !["adopted_as_draft", "edited", "confirmed"].includes(status)) return "";
  const content = typeof suggestion.content === "string" ? suggestion.content : JSON.stringify(suggestion.content || {}, null, 2);
  if (status === "adopted_as_draft" || status === "edited") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>Reviewed content</h3>
        <textarea id="aiInboxSuggestionContentEditor" rows="8" placeholder="Update the reviewed content before marking it edited or confirmed.">${escapeHtml(content)}</textarea>
      </section>
    `;
  }
  return `
    <section class="ai-inbox-detail-section">
      <h3>Reviewed content</h3>
      <pre class="ai-inbox-json">${escapeHtml(content)}</pre>
    </section>
  `;
}

function renderSuggestionProvenance(detail = {}) {
  const suggestion = detail.suggestion || null;
  if (!suggestion) return "";
  return `
    <section class="ai-inbox-detail-section">
      <h3>Suggestion provenance</h3>
      <dl class="ai-inbox-kv">
        <dt>Origin</dt><dd>${escapeHtml(suggestion.provenance?.contentOrigin || suggestion.origin || "ai_generated")}</dd>
        <dt>Human edited</dt><dd>${escapeHtml(suggestion.provenance?.humanEdited ? "yes" : "no")}</dd>
        <dt>Human confirmed</dt><dd>${escapeHtml(suggestion.provenance?.humanConfirmed ? "yes" : "no")}</dd>
        <dt>Status</dt><dd>${renderBadge(aiSuggestionStatusLabel(suggestion.status), aiSuggestionStatusTone(suggestion.status))}</dd>
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
        <h3>Suggestion history</h3>
        <div class="ai-inbox-detail-muted">No review events recorded yet.</div>
      </section>
    `;
  }
  return `
    <section class="ai-inbox-detail-section">
      <h3>Suggestion history</h3>
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
              <p>${escapeHtml(`${event.metadata?.fromStatus || "unknown"} -> ${event.metadata?.toStatus || event.eventType || "unknown"}`)}</p>
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
  const artifact = detail.artifact || null;
  const adoptableFieldSuggestion = fieldSuggestionSummary(artifact);
  const actions = aiSuggestionActionSet(suggestion).filter((action) => {
    if (action === "adopted_as_draft") return adoptableFieldSuggestion.canAdopt;
    return true;
  });
  if (!actions.length) return "";
  const labels = {
    adopted_as_draft: "Adopt as draft",
    edited: "Mark edited",
    rejected: "Reject",
    confirmed: "Confirm"
  };
  return `
    <div class="ai-inbox-action-card">
      <div>
        <h3>Suggestion review</h3>
        <p>Process the linked suggestion here without leaving AI inbox. Draft adoption still requires explicit user action before anything becomes confirmed.</p>
      </div>
      <div class="ai-inbox-actions">
        ${actions
          .map(
            (action) => `
              <button
                class="mini-btn ${action === "confirmed" ? "primary" : ""}"
                type="button"
                data-ai-inbox-suggestion-status="${attr(action)}"
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
  return `<div class="ai-inbox-empty is-bad">AI inbox review failed: ${escapeHtml(text)}</div>`;
}

function renderActionNotice(message = "", tone = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  const cleanTone = String(tone || "").trim();
  return `<div class="ai-inbox-detail-muted ${cleanTone ? `tone-${escapeHtml(cleanTone)}` : ""}" data-ai-inbox-action-notice="true">${escapeHtml(text)}</div>`;
}
function renderFeedbackControls() {
  return `
    <div class="ai-inbox-feedback-controls">
      <label><input type="checkbox" data-ai-inbox-feedback="useful" /> 有用</label>
      <label><input type="checkbox" data-ai-inbox-feedback="noisy" /> 噪音</label>
      <label><input type="checkbox" data-ai-inbox-feedback="wrong" /> 错误</label>
      <label><input type="checkbox" data-ai-inbox-feedback="alreadyKnown" /> 已知</label>
      <label><input type="checkbox" data-ai-inbox-feedback="privacyConcern" /> 隐私风险</label>
    </div>
  `;
}

function renderReviewActions(item = {}) {
  if (!item.artifactId) return "";
  return `
    <div class="ai-inbox-action-card">
      <div>
        <h3>处理这条建议</h3>
        <p>这里先记录判断；只有下面的“建立关系”或“生成草稿”按钮会真正改动笔记数据。</p>
      </div>
      ${renderFeedbackControls()}
      <textarea id="aiInboxDecisionComment" placeholder="可选：写下为什么采纳、忽略或归档"></textarea>
      <div class="ai-inbox-actions">
        ${["accepted", "ignored", "archived"]
          .map(
            (decision) => `
              <button class="mini-btn ${decision === "accepted" ? "primary" : ""}" type="button" data-ai-inbox-decision="${attr(decision)}">
                ${escapeHtml(aiInboxActionLabel(decision))}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function aiInboxSummaryMatchesCurrentItem(state = {}, item = {}) {
  const itemArtifactId = String(item.artifactId || "").trim();
  if (!itemArtifactId) return false;
  const summaryArtifactId = String(state.aiSummaryArtifactId || "").trim();
  if (!summaryArtifactId) return true;
  return summaryArtifactId === itemArtifactId;
}

function renderAiSummary(state = {}, item = {}) {
  if (!item.artifactId) return "";
  const summaryMatchesItem = aiInboxSummaryMatchesCurrentItem(state, item);
  const loading = state.aiSummaryLoading === true && summaryMatchesItem;
  const meta = summaryMatchesItem ? String(state.aiSummaryMeta || "").trim() : "";
  const error = summaryMatchesItem ? String(state.aiSummaryError || "").trim() : "";
  const summary = summaryMatchesItem ? String(state.aiSummary || "").trim() : "";
  return `
    <div class="ai-inbox-action-card ${loading ? "is-busy" : ""}">
      <div>
        <h3>AI 摘要（本地优先）</h3>
        <p>用当前模型路由快速总结这条建议，帮助你更快决策。</p>
      </div>
      <div class="ai-inbox-actions">
        <button class="mini-btn primary" id="btnAiInboxSummarize" type="button" ${loading ? "disabled" : ""}>
          ${loading ? "运行中..." : "生成摘要"}
        </button>
        <span class="ai-inbox-detail-muted">${escapeHtml(meta || (error ? "失败" : "未生成"))}</span>
      </div>
      ${error ? `<div class="ai-inbox-detail-muted" style="color:#b42318;">${escapeHtml(error)}</div>` : ""}
      ${summary ? `<pre class="ai-inbox-json">${escapeHtml(summary)}</pre>` : `<div class="ai-inbox-detail-muted">（空）</div>`}
    </div>
  `;
}

function renderRecommendedSummaryAction(state = {}, item = {}) {
  if (!aiInboxSummaryMatchesCurrentItem(state, item)) return "";
  const action = String(state.aiSummaryRecommendedAction || "").trim();
  const labels = {
    accept_link: "Apply: create relation",
    adopt_field_suggestion: "Apply: draft field",
    promote_note: "Apply: draft note",
    ignore: "Apply: ignore",
    needs_more_context: "Apply: needs context"
  };
  if (!labels[action]) return "";
  return `
    <div class="ai-inbox-action-card">
      <div>
        <h3>Recommended action</h3>
        <p>${escapeHtml(action)}</p>
      </div>
      <button class="mini-btn primary" type="button" data-ai-inbox-recommended-action="${attr(action)}">
        ${escapeHtml(labels[action])}
      </button>
    </div>
  `;
}

function renderLinkSuggestionAction(artifact = {}) {
  if (!artifact || artifact.type !== "LinkSuggestion") return "";
  const link = linkSuggestionSummary(artifact);
  return `
    <div class="ai-inbox-action-card ${link.canAccept ? "" : "is-muted"}">
      <div>
        <h3>可落地为笔记关系</h3>
        <p>${escapeHtml(link.fromNoteId || "未知来源")} -> ${escapeHtml(link.toNoteId || "未知目标")} / ${escapeHtml(link.relationType)}</p>
      </div>
      <div class="ai-inbox-detail-muted">${escapeHtml(link.rationale || "这条建议没有写明关联理由，建议先忽略或补充理由。")}</div>
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-accept-link="${attr(artifact.id)}"
        ${link.canAccept ? "" : "disabled"}
      >
        建立为笔记关系
      </button>
      ${link.canAccept ? "" : `<div class="ai-inbox-detail-muted">只有“笔记到笔记”的关联建议才能进入图谱关系。</div>`}
    </div>
  `;
}

function renderNotePromotionAction(artifact = {}) {
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
          ? `<div class="ai-inbox-detail-muted">已经生成笔记 ${escapeHtml(promotion.promotedNoteId)}。</div>`
          : `<div class="ai-inbox-detail-muted">会生成一条随笔草稿。你需要再改写确认，不能直接当作自己的原创判断。</div>`
      }
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-promote-note="${attr(artifact.id)}"
        ${promotion.canPromote ? "" : "disabled"}
      >
        生成草稿笔记
      </button>
    </div>
  `;
}

function renderFieldSuggestionAction(artifact = {}) {
  const suggestion = fieldSuggestionSummary(artifact);
  if (!suggestion.field) return "";
  return `
    <div class="ai-inbox-action-card ${suggestion.canAdopt ? "" : "is-muted"}">
      <div>
        <h3>可采纳为观点草稿</h3>
        <p>${escapeHtml(suggestion.fieldLabel || "字段建议")} / ${escapeHtml(suggestion.noteId || "未知笔记")}</p>
      </div>
      ${
        suggestion.adopted
          ? `<div class="ai-inbox-detail-muted">这条字段建议已经采纳为草稿。确认观点仍需要你手动完成。</div>`
          : `<div class="ai-inbox-detail-muted">${escapeHtml(suggestion.value || "没有可采纳内容。")}</div>`
      }
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-adopt-field="${attr(artifact.id)}"
        ${suggestion.canAdopt ? "" : "disabled"}
      >
        采纳为草稿字段
      </button>
    </div>
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

function renderDetailRefreshGate(item = {}) {
  if (!item?.artifactId) return "";
  return `
    <article class="ai-inbox-detail">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">${escapeHtml(aiInboxTypeLabel(item.type))}</div>
          <h2>${escapeHtml(item.title || item.artifactId || "未命名建议")}</h2>
          <p>${escapeHtml(item.summary || "正在加载这条建议的最新详情。")}</p>
        </div>
        ${renderBadge(aiInboxStatusLabel(item.status), aiInboxStatusTone(item.status))}
      </header>
      <section class="ai-inbox-detail-section">
        <h3>Review safety</h3>
        <div class="ai-inbox-detail-muted">Load the latest detail before running review actions so the decision stays aligned with the current canonical artifact.</div>
      </section>
    </article>
  `;
}

function renderDetail(state = {}) {
  const detail = state.detail || {};
  const selectedArtifactId = String(state.selectedArtifactId || "").trim();
  const selectedListItem = selectedAiInboxItem(state.items, state.selectedArtifactId) || {};
  const detailArtifactId = String(state.detailArtifactId || detail.item?.artifactId || detail.artifact?.id || "").trim();
  const detailLoading = state.detailLoading && detailArtifactId === selectedArtifactId;
  const detailError = detailArtifactId === selectedArtifactId ? state.detailError : "";
  const detailMatchesSelection = Boolean(detailArtifactId) && detailArtifactId === selectedArtifactId;
  const activeDetail = detailMatchesSelection ? detail : {};
  const item = activeDetail.item || selectedListItem || {};
  const artifact = activeDetail.artifact || null;
  const actionArtifactId = String(state.actionArtifactId || "").trim();
  const actionError =
    actionArtifactId &&
    actionArtifactId === String(item.artifactId || artifact?.id || "").trim()
      ? state.actionError
      : "";

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
    return renderDetailRefreshGate(item);
  }

  const activeArtifact = artifact || item;
  const sourceNoteIds = activeArtifact.sources?.noteIds || item.sourceNoteIds || [];
  const body = typeof activeArtifact.body === "string" ? activeArtifact.body : JSON.stringify(activeArtifact.body || "", null, 2);
  const confidence = activeArtifact.confidence || item.confidence || {};
  const model = activeArtifact.model || {};
  const provenance = activeArtifact.provenance || {};
  const actionDisabled = Boolean(state.actionLoading);

  return `
    <article class="ai-inbox-detail ${actionDisabled ? "is-busy" : ""}">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">${escapeHtml(aiInboxTypeLabel(activeArtifact.type || item.type))}</div>
          <h2>${escapeHtml(activeArtifact.title || item.title || "未命名建议")}</h2>
          <p>${escapeHtml(activeArtifact.summary || item.summary || "这条建议没有摘要，请重点查看来源和结构化字段。")}</p>
        </div>
        ${renderBadge(aiInboxStatusLabel(activeArtifact.status || item.status), aiInboxStatusTone(activeArtifact.status || item.status))}
      </header>

      <div class="ai-inbox-detail-grid">
        <section>
          <h3>来源笔记</h3>
          ${renderSourceNotes(sourceNoteIds)}
        </section>
        <section>
          <h3>运行来源</h3>
          <dl class="ai-inbox-kv">
            <dt>任务</dt><dd>${escapeHtml(activeArtifact.agentRunId || item.agentRunId || "未知")}</dd>
            <dt>上下文包</dt><dd>${escapeHtml(activeArtifact.contextPackId || item.contextPackId || "无")}</dd>
            <dt>范围</dt><dd>${escapeHtml(activeArtifact.privacy?.mode === "local_only" || item.privacyMode === "local_only" ? "仅本地" : activeArtifact.privacy?.mode || item.privacyMode || "普通")}</dd>
            <dt>模型</dt><dd>${escapeHtml(model.modelRef || model.logicalModelRef || model.providerId || "未记录")}</dd>
            <dt>可信度</dt><dd>${escapeHtml(confidence.label || confidence.score || "未记录")}</dd>
          </dl>
        </section>
      </div>

      ${renderLinkSuggestionAction(activeArtifact)}
      ${renderNotePromotionAction(activeArtifact)}
      ${renderFieldSuggestionAction(activeArtifact)}
      ${renderSuggestionTrace(activeDetail)}
      ${renderReviewedSuggestionContent(activeDetail)}
      ${renderSuggestionProvenance(activeDetail)}
      ${renderSuggestionHistory(activeDetail)}
      ${renderSuggestionReviewActions(activeDetail, actionDisabled)}
      ${renderActionError(actionError)}
      ${renderActionNotice(state.actionNotice, state.actionNoticeTone)}
      ${renderAiSummary(state, item)}
      ${renderRecommendedSummaryAction(state, item)}
      ${renderReviewActions(item)}

      <section class="ai-inbox-detail-section">
        <h3>建议正文</h3>
        ${body ? `<pre class="ai-inbox-json">${escapeHtml(body)}</pre>` : `<div class="ai-inbox-detail-muted">没有正文。</div>`}
      </section>

      <section class="ai-inbox-detail-section">
        <h3>结构化字段</h3>
        ${renderPayloadPreview(activeArtifact.payload)}
      </section>

      <section class="ai-inbox-detail-section">
        <h3>处理记录</h3>
        ${renderDecisions(activeArtifact.userDecisions || [])}
      </section>

      ${
        provenance && Object.keys(provenance).length
          ? `<section class="ai-inbox-detail-section"><h3>原始运行信息</h3><pre class="ai-inbox-json">${escapeHtml(JSON.stringify(provenance, null, 2))}</pre></section>`
          : ""
      }
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
          <div class="import-card-kicker">AI 建议待办</div>
          <strong>${escapeHtml(viewLabel(summary.view))}：当前显示 ${escapeHtml(summary.visible)} 条，共 ${escapeHtml(summary.viewCount)} 条</strong>
          <p>这里不是聊天窗口，而是“AI 给出的待确认建议”：关联、问题、冲突和写作线索都要经过你确认才会进入笔记或图谱。</p>
        </div>
        ${state.actionLoading ? renderBadge("正在处理", "warn") : renderBadge("需人工确认", "ok")}
      </header>
      ${renderWorkflowGuide()}
      ${renderFilters(filters, summary.counts)}
      ${renderEvaluationSummary({ ...state, filters })}
      <main class="ai-inbox-grid">
        <section class="ai-inbox-list-pane">
          ${renderList({ ...state, filters })}
        </section>
        <section class="ai-inbox-detail-pane">
          ${renderDetail({ ...state, filters })}
        </section>
      </main>
    </div>
  `;
}

export { isNoteToNoteLinkSuggestion };
