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
          <span>Type</span>
          <select id="aiInboxTypeFilter">
            ${aiInboxTypeOptions()
              .map((option) => `<option value="${attr(option.value)}" ${option.value === normalizedFilters.type ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>Source note</span>
          <input id="aiInboxSourceNoteFilter" value="${attr(normalizedFilters.sourceNoteId)}" placeholder="note id" />
        </label>
        <label>
          <span>Privacy</span>
          <select id="aiInboxPrivacyFilter">
            <option value="" ${normalizedFilters.privacyMode ? "" : "selected"}>Any</option>
            <option value="normal" ${normalizedFilters.privacyMode === "normal" ? "selected" : ""}>Normal</option>
            <option value="local_only" ${normalizedFilters.privacyMode === "local_only" ? "selected" : ""}>Local only</option>
          </select>
        </label>
        <button class="mini-btn" id="btnAiInboxApplyFilters" type="button">Apply</button>
        <button class="mini-btn" id="btnAiInboxRefresh" type="button">Refresh</button>
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
    return `<div class="ai-inbox-empty">Loading AI artifacts...</div>`;
  }
  if (state.error) {
    return `<div class="ai-inbox-empty is-bad">AI Inbox failed to load: ${escapeHtml(state.error)}</div>`;
  }
  if (!items.length) {
    return `<div class="ai-inbox-empty">No artifacts match this view.</div>`;
  }
  return `<div class="ai-inbox-list">${items.map((item) => renderItem(item, state.selectedArtifactId)).join("")}</div>`;
}

function renderEvaluationSummary(state = {}) {
  if (state.evaluationLoading) {
    return `<section class="ai-inbox-evaluation-summary"><div class="ai-inbox-detail-muted">Loading evaluation summary...</div></section>`;
  }
  if (state.evaluationError) {
    return `<section class="ai-inbox-evaluation-summary is-bad"><div class="ai-inbox-detail-muted">Evaluation summary failed: ${escapeHtml(state.evaluationError)}</div></section>`;
  }
  const summary = state.evaluationSummary || null;
  if (!summary) {
    return `<section class="ai-inbox-evaluation-summary"><div class="ai-inbox-detail-muted">No evaluation summary yet.</div></section>`;
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
          <h3>Evaluation</h3>
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
        <h3>Review</h3>
        <p>Record a review decision without changing notes or graph relations.</p>
      </div>
      ${renderFeedbackControls()}
      <textarea id="aiInboxDecisionComment" placeholder="Optional comment"></textarea>
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

function renderLinkSuggestionAction(artifact = {}) {
  if (!artifact || artifact.type !== "LinkSuggestion") return "";
  const link = linkSuggestionSummary(artifact);
  return `
    <div class="ai-inbox-action-card ${link.canAccept ? "" : "is-muted"}">
      <div>
        <h3>Link suggestion</h3>
        <p>${escapeHtml(link.fromNoteId || "unknown")} -> ${escapeHtml(link.toNoteId || "unknown")} / ${escapeHtml(link.relationType)}</p>
      </div>
      <div class="ai-inbox-detail-muted">${escapeHtml(link.rationale || "No rationale recorded.")}</div>
      <button
        class="mini-btn primary"
        type="button"
        data-ai-inbox-accept-link="${attr(artifact.id)}"
        ${link.canAccept ? "" : "disabled"}
      >
        Create note relation
      </button>
      ${link.canAccept ? "" : `<div class="ai-inbox-detail-muted">Only note-to-note LinkSuggestion artifacts can be promoted into graph relations.</div>`}
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
    return `<div class="ai-inbox-empty">Loading artifact detail...</div>`;
  }
  if (state.detailError) {
    return `<div class="ai-inbox-empty is-bad">Artifact detail failed to load: ${escapeHtml(state.detailError)}</div>`;
  }
  if (!item.artifactId && !artifact) {
    return `<div class="ai-inbox-empty">Select an artifact to review its sources, payload, and decisions.</div>`;
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
          <h3>Sources</h3>
          ${renderSourceNotes(sourceNoteIds)}
        </section>
        <section>
          <h3>Provenance</h3>
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
      ${renderReviewActions(item)}

      <section class="ai-inbox-detail-section">
        <h3>Artifact body</h3>
        ${body ? `<pre class="ai-inbox-json">${escapeHtml(body)}</pre>` : `<div class="ai-inbox-detail-muted">No body recorded.</div>`}
      </section>

      <section class="ai-inbox-detail-section">
        <h3>Payload</h3>
        ${renderPayloadPreview(activeArtifact.payload)}
      </section>

      <section class="ai-inbox-detail-section">
        <h3>Decisions</h3>
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
          <strong>${escapeHtml(summary.visible)} visible / ${escapeHtml(summary.viewCount)} in ${escapeHtml(summary.view)}</strong>
        </div>
        ${state.actionLoading ? renderBadge("Updating", "warn") : renderBadge("Reviewable artifacts", "ok")}
      </header>
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
