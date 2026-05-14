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
  isNoteToNoteLinkSuggestion,
  latestFeedbackFlags,
  linkSuggestionSummary,
  notePromotionSummary,
  normalizeAiInboxFilters,
  selectedAiInboxItem
} from "./ai-inbox-model.js";

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

function renderFlowStep(index, title, note, active = false) {
  return `
    <div class="ai-inbox-flow-step ${active ? "is-active" : ""}">
      <span>${escapeHtml(index)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function renderFlowGuide(filters = {}) {
  const view = normalizeAiInboxFilters(filters).view;
  return `
    <section class="ai-inbox-flow" aria-label="AI inbox review flow">
      ${renderFlowStep("1", "先看建议", "读摘要和来源，不急着采纳", view === "pending")}
      ${renderFlowStep("2", "决定去向", "建关系、转草稿，或忽略归档", view === "reviewed")}
      ${renderFlowStep("3", "复盘质量", "标记有用、噪音、错误和隐私风险", view === "archived" || view === "all")}
    </section>
  `;
}

function renderViewTabs(filters = {}, counts = {}) {
  const normalizedFilters = normalizeAiInboxFilters(filters);
  const normalizedCounts = aiInboxCounts(counts);
  return `
    <div class="ai-inbox-tabs" role="tablist" aria-label="AI inbox views">
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
          <span>来源笔记</span>
          <input id="aiInboxSourceNoteFilter" value="${attr(normalizedFilters.sourceNoteId)}" placeholder="note id，可留空" />
        </label>
        <label>
          <span>隐私范围</span>
          <select id="aiInboxPrivacyFilter">
            <option value="" ${normalizedFilters.privacyMode ? "" : "selected"}>全部</option>
            <option value="normal" ${normalizedFilters.privacyMode === "normal" ? "selected" : ""}>普通</option>
            <option value="local_only" ${normalizedFilters.privacyMode === "local_only" ? "selected" : ""}>仅本地</option>
          </select>
        </label>
        <button class="mini-btn primary" id="btnAiInboxApplyFilters" type="button">筛选</button>
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
    feedback.useful ? "useful" : "",
    feedback.noisy ? "noisy" : "",
    feedback.wrong ? "wrong" : "",
    feedback.alreadyKnown ? "known" : "",
    feedback.privacyConcern ? "privacy" : ""
  ].filter(Boolean);

  return `
    <button
      class="ai-inbox-item ${active ? "is-active" : ""}"
      type="button"
      data-ai-inbox-artifact-id="${attr(item.artifactId)}"
    >
      <span class="ai-inbox-item-head">
        <strong>${escapeHtml(item.title || item.artifactId || "Untitled artifact")}</strong>
        ${renderBadge(aiInboxStatusLabel(item.status), tone)}
      </span>
      <span class="ai-inbox-item-summary">${escapeHtml(item.summary || "No summary")}</span>
      <span class="ai-inbox-item-meta">
        <span>${escapeHtml(aiInboxTypeLabel(item.type))}</span>
        <span>${escapeHtml(item.privacyMode || "normal")}</span>
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
    return `<div class="ai-inbox-empty">正在读取 AI 建议... <span class="ai-inbox-compat">Loading AI artifacts</span></div>`;
  }
  if (state.error) {
    return `<div class="ai-inbox-empty is-bad">AI 建议箱加载失败：${escapeHtml(state.error)}</div>`;
  }
  if (!items.length) {
    return `<div class="ai-inbox-empty">当前视图没有匹配建议。<span class="ai-inbox-compat">No artifacts match this view</span></div>`;
  }
  return `<div class="ai-inbox-list">${items.map((item) => renderItem(item, state.selectedArtifactId)).join("")}</div>`;
}

function renderEvaluationSummary(state = {}) {
  if (state.evaluationLoading) {
    return `<section class="ai-inbox-evaluation-summary"><div class="ai-inbox-detail-muted">正在读取复盘指标... <span class="ai-inbox-compat">Loading evaluation summary</span></div></section>`;
  }
  if (state.evaluationError) {
    return `<section class="ai-inbox-evaluation-summary is-bad"><div class="ai-inbox-detail-muted">复盘指标加载失败：${escapeHtml(state.evaluationError)} <span class="ai-inbox-compat">Evaluation summary failed: ${escapeHtml(state.evaluationError)}</span></div></section>`;
  }
  const summary = state.evaluationSummary || null;
  if (!summary) {
    return `<section class="ai-inbox-evaluation-summary"><div class="ai-inbox-detail-muted">还没有复盘指标；处理几条建议后会显示有用率和噪音信号。</div></section>`;
  }
  const metrics = aiInboxEvaluationMetrics(summary);
  const filter = summary.filter || {};
  const scope = [
    filter.view ? `${filter.view} view` : "",
    filter.type ? filter.type : "",
    filter.sourceNoteId ? `source ${filter.sourceNoteId}` : "",
    filter.privacyMode ? filter.privacyMode : ""
  ].filter(Boolean).join(" / ") || "all artifacts";
  return `
    <section class="ai-inbox-evaluation-summary">
      <div class="ai-inbox-evaluation-head">
        <div>
          <h3>复盘 / Evaluation</h3>
          <p>${escapeHtml(scope)}</p>
        </div>
        ${renderBadge(`${summary.artifacts?.withDecision || 0} reviewed`, "muted")}
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
  if (!ids.length) return `<div class="ai-inbox-detail-muted">No source notes recorded.</div>`;
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

function renderFeedbackControls() {
  return `
    <div class="ai-inbox-feedback-controls">
      <label><input type="checkbox" data-ai-inbox-feedback="useful" /> Useful</label>
      <label><input type="checkbox" data-ai-inbox-feedback="noisy" /> Noisy</label>
      <label><input type="checkbox" data-ai-inbox-feedback="wrong" /> Wrong</label>
      <label><input type="checkbox" data-ai-inbox-feedback="alreadyKnown" /> Already known</label>
      <label><input type="checkbox" data-ai-inbox-feedback="privacyConcern" /> Privacy concern</label>
    </div>
  `;
}

function renderReviewActions(item = {}) {
  if (!item.artifactId) return "";
  return `
    <div class="ai-inbox-action-card">
      <div>
        <h3>审阅决定 / Review</h3>
        <p>只记录你的判断，不会直接改笔记或图谱。</p>
      </div>
      ${renderFeedbackControls()}
      <textarea id="aiInboxDecisionComment" placeholder="可选：为什么有用、为什么忽略，或哪里需要回避"></textarea>
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

function renderAiSummary(state = {}, item = {}) {
  if (!item.artifactId) return "";
  const loading = state.aiSummaryLoading === true;
  const meta = String(state.aiSummaryMeta || "").trim();
  const error = String(state.aiSummaryError || "").trim();
  const summary = String(state.aiSummary || "").trim();
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

function renderLinkSuggestionAction(artifact = {}) {
  if (!artifact || artifact.type !== "LinkSuggestion") return "";
  const link = linkSuggestionSummary(artifact);
  return `
    <div class="ai-inbox-action-card ${link.canAccept ? "" : "is-muted"}">
      <div>
        <h3>关系建议</h3>
        <p>${escapeHtml(link.fromNoteId || "unknown")} -> ${escapeHtml(link.toNoteId || "unknown")} / ${escapeHtml(link.relationType)}</p>
      </div>
      <div class="ai-inbox-detail-muted">${escapeHtml(link.rationale || "No rationale recorded.")}</div>
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-accept-link="${attr(artifact.id)}"
        ${link.canAccept ? "" : "disabled"}
      >
        建立关系 / Create note relation
      </button>
      ${link.canAccept ? "" : `<div class="ai-inbox-detail-muted">只有“笔记到笔记”的 LinkSuggestion 才能进入图谱。<span class="ai-inbox-compat">Only note-to-note LinkSuggestion artifacts</span></div>`}
    </div>
  `;
}

function renderNotePromotionAction(artifact = {}) {
  const promotion = notePromotionSummary(artifact);
  if (!promotion.artifactType || !["QuestionCard", "ReflectionPrompt"].includes(promotion.artifactType)) return "";
  return `
    <div class="ai-inbox-action-card ${promotion.canPromote ? "" : "is-muted"}">
      <div>
        <h3>转成草稿 / Draft note</h3>
        <p>${escapeHtml(promotion.suggestedTitle || "Create a reviewable draft note from this artifact.")}</p>
      </div>
      ${
        promotion.promotedNoteId
          ? `<div class="ai-inbox-detail-muted">已转成笔记 ${escapeHtml(promotion.promotedNoteId)}。<span class="ai-inbox-compat">Already promoted to note ${escapeHtml(promotion.promotedNoteId)}</span></div>`
          : `<div class="ai-inbox-detail-muted">生成一条待改写草稿；确认后再纳入自己的判断。</div>`
      }
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-promote-note="${attr(artifact.id)}"
        ${promotion.canPromote ? "" : "disabled"}
      >
        创建草稿 / Create draft note
      </button>
    </div>
  `;
}

function renderDecisions(decisions = []) {
  const items = Array.isArray(decisions) ? decisions : [];
  if (!items.length) return `<div class="ai-inbox-detail-muted">No decisions yet.</div>`;
  return `
    <div class="ai-inbox-decision-list">
      ${items
        .slice()
        .reverse()
        .map((decision) => {
          const feedback = latestFeedbackFlags({ latestDecision: decision });
          const labels = [
            feedback.useful ? "useful" : "",
            feedback.noisy ? "noisy" : "",
            feedback.wrong ? "wrong" : "",
            feedback.alreadyKnown ? "known" : "",
            feedback.privacyConcern ? "privacy" : ""
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

function renderDetail(state = {}) {
  const detail = state.detail || {};
  const item = detail.item || selectedAiInboxItem(state.items, state.selectedArtifactId) || {};
  const artifact = detail.artifact || null;

  if (state.detailLoading) {
    return `<div class="ai-inbox-empty">正在读取建议详情...</div>`;
  }
  if (state.detailError) {
    return `<div class="ai-inbox-empty is-bad">建议详情加载失败：${escapeHtml(state.detailError)}</div>`;
  }
  if (!item.artifactId && !artifact) {
    return `<div class="ai-inbox-empty">从左侧选择一条建议，右侧会显示来源、去向和可执行动作。</div>`;
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
          <h2>${escapeHtml(activeArtifact.title || item.title || "Untitled artifact")}</h2>
          <p>${escapeHtml(activeArtifact.summary || item.summary || "No summary recorded.")}</p>
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
            <dt>Run</dt><dd>${escapeHtml(activeArtifact.agentRunId || item.agentRunId || "unknown")}</dd>
            <dt>Context pack</dt><dd>${escapeHtml(activeArtifact.contextPackId || item.contextPackId || "none")}</dd>
            <dt>Privacy</dt><dd>${escapeHtml(activeArtifact.privacy?.mode || item.privacyMode || "normal")}</dd>
            <dt>Model</dt><dd>${escapeHtml(model.modelRef || model.logicalModelRef || model.providerId || "not recorded")}</dd>
            <dt>Confidence</dt><dd>${escapeHtml(confidence.label || confidence.score || "not recorded")}</dd>
          </dl>
        </section>
      </div>

      ${renderLinkSuggestionAction(activeArtifact)}
      ${renderNotePromotionAction(activeArtifact)}
      ${renderAiSummary(state, item)}
      ${renderReviewActions(item)}

      <section class="ai-inbox-detail-section">
        <h3>建议正文</h3>
        ${body ? `<pre class="ai-inbox-json">${escapeHtml(body)}</pre>` : `<div class="ai-inbox-detail-muted">No body recorded.</div>`}
      </section>

      <section class="ai-inbox-detail-section">
        <h3>结构化数据</h3>
        ${renderPayloadPreview(activeArtifact.payload)}
      </section>

      <section class="ai-inbox-detail-section">
        <h3>处理记录</h3>
        ${renderDecisions(activeArtifact.userDecisions || [])}
      </section>

      ${
        provenance && Object.keys(provenance).length
          ? `<section class="ai-inbox-detail-section"><h3>Raw provenance</h3><pre class="ai-inbox-json">${escapeHtml(JSON.stringify(provenance, null, 2))}</pre></section>`
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
          <div class="import-card-kicker">AI Inbox</div>
          <strong>AI 建议箱：${escapeHtml(summary.visible)} 条可见 / ${escapeHtml(summary.viewCount)} 条 ${escapeHtml(summary.view)} view</strong>
          <p>先审阅，再决定是否进入图谱或草稿；AI 产物默认只作为候选。</p>
        </div>
        ${state.actionLoading ? renderBadge("Updating", "warn") : renderBadge("Reviewable artifacts", "ok")}
      </header>
      ${renderFlowGuide(filters)}
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
