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
        <span>Status</span>
        <select id="aiSuggestionStatusFilter">
          ${aiSuggestionStatusOptions()
            .map((option) => `<option value="${attr(option.value)}" ${option.value === filters.status ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      </label>
      <label>
        <span>Target type</span>
        <input id="aiSuggestionTargetTypeFilter" value="${attr(filters.targetType)}" placeholder="permanent_note" />
      </label>
      <label>
        <span>Target id</span>
        <input id="aiSuggestionTargetIdFilter" value="${attr(filters.targetId)}" placeholder="pn_..." />
      </label>
      <label>
        <span>Scope</span>
        <input id="aiSuggestionScopeFilter" value="${attr(filters.scope)}" placeholder="note_field" />
      </label>
      <button class="mini-btn" id="btnAiSuggestionsApplyFilters" type="button">Apply</button>
      <button class="mini-btn" id="btnAiSuggestionsRefresh" type="button">Refresh</button>
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
  if (state.loading) return `<div class="scheduled-task-empty">Loading AI suggestions...</div>`;
  if (state.error) return `<div class="scheduled-task-empty is-bad">AI suggestions failed to load: ${escapeHtml(state.error)}</div>`;
  if (!items.length) return `<div class="scheduled-task-empty">No AI suggestions match these filters.</div>`;
  return `<div class="ai-inbox-list">${items.map((item) => renderItem(item, state.selectedSuggestionId)).join("")}</div>`;
}

function renderActions(item = {}, actionLoading = false) {
  const actions = aiSuggestionActionSet(item);
  if (!actions.length) return "";
  const labels = {
    adopted_as_draft: "Adopt as draft",
    edited: "Mark edited",
    rejected: "Reject",
    confirmed: "Confirm"
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
        <h3>Next step</h3>
        <p>Open the target note, edit the adopted draft in the note itself, then return here and mark the suggestion as edited.</p>
      </section>
    `;
  }
  if (status === "edited") {
    return `
      <section class="ai-inbox-detail-section">
        <h3>Ready to confirm</h3>
        <p>This suggestion has been marked as edited by a person. Confirm it only after the target note wording reflects the final user-owned judgment.</p>
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

function renderContentEditor(item = {}) {
  const status = String(item.status || "").trim();
  if (status !== "adopted_as_draft" && status !== "edited") return "";
  const content = typeof item.content === "string" ? item.content : JSON.stringify(item.content || {}, null, 2);
  return `
    <section class="ai-inbox-detail-section">
      <h3>Reviewed content</h3>
      <textarea id="aiSuggestionContentEditor" rows="8" placeholder="Update the reviewed draft content before marking it edited or confirmed.">${escapeHtml(content)}</textarea>
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
      <h3>Trace</h3>
      ${placeholder}
      <dl class="ai-inbox-kv">
        <dt>Source artifact</dt><dd>${escapeHtml(display.sourceArtifactId || "not recorded")}</dd>
        <dt>Source notes</dt><dd>${escapeHtml(sourceText)}</dd>
        <dt>Target note</dt><dd>${escapeHtml(targetNoteId || "missing target note")}</dd>
        <dt>Target field</dt><dd>${escapeHtml(targetField || "not recorded")}</dd>
        <dt>Status</dt><dd>${escapeHtml(status ? aiSuggestionStatusLabel(status) : "not recorded")}</dd>
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
      <h3>Linked artifact</h3>
      <dl class="ai-inbox-kv">
        <dt>Artifact</dt><dd>${escapeHtml(artifact.id || "unknown artifact")}</dd>
        <dt>Type</dt><dd>${escapeHtml(artifact.type || "unknown")}</dd>
        <dt>Status</dt><dd>${escapeHtml(artifact.status || "not recorded")}</dd>
        <dt>Title</dt><dd>${escapeHtml(artifact.title || "untitled artifact")}</dd>
        <dt>Field suggestion status</dt><dd>${escapeHtml(fieldSuggestionStatus || "not recorded")}</dd>
      </dl>
    </section>
  `;
}

function renderProvenance(detail = {}) {
  const item = detail.item || {};
  return `
    <section class="ai-inbox-detail-section">
      <h3>Provenance</h3>
      <dl class="ai-inbox-kv">
        <dt>Origin</dt><dd>${escapeHtml(item.provenance?.contentOrigin || item.origin || "ai_generated")}</dd>
        <dt>Human edited</dt><dd>${escapeHtml(item.provenance?.humanEdited ? "yes" : "no")}</dd>
        <dt>Human confirmed</dt><dd>${escapeHtml(item.provenance?.humanConfirmed ? "yes" : "no")}</dd>
        <dt>Source artifact</dt><dd>${escapeHtml(item.sourceArtifactId || detail.trace?.sourceArtifactId || "not recorded")}</dd>
      </dl>
    </section>
  `;
}

function renderHistory(detail = {}) {
  const reviewEvents = Array.isArray(detail.reviewEvents) ? detail.reviewEvents : [];
  if (reviewEvents.length) {
    return `
      <section class="ai-inbox-detail-section">
        <h3>Review history</h3>
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
                <p>${escapeHtml(`${event.metadata?.fromStatus || "unknown"} -> ${event.metadata?.toStatus || event.eventType || "unknown"}`)}</p>
                ${event.adoptionEventId ? `<p>${escapeHtml(`Review event: ${event.adoptionEventId}`)}</p>` : ""}
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
        <h3>Review history</h3>
        <div class="scheduled-task-empty">No review events recorded yet.</div>
      </section>
    `;
  }

  return `
    <section class="ai-inbox-detail-section">
      <h3>Review history</h3>
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
              <p>${escapeHtml(`${entry.fromStatus || "unknown"} -> ${entry.toStatus || entry.action || "unknown"}`)}</p>
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
  return `<div class="scheduled-task-empty is-bad">AI suggestion review failed: ${escapeHtml(text)}</div>`;
}

function renderDetail(state = {}) {
  if (state.detailLoading) return `<div class="scheduled-task-empty">Loading suggestion detail...</div>`;
  if (state.detailError) return `<div class="scheduled-task-empty is-bad">AI suggestion detail failed to load: ${escapeHtml(state.detailError)}</div>`;
  const selectedSuggestionId = String(state.selectedSuggestionId || "").trim();
  const selectedListItem = state.items?.find((entry) => String(entry.id || "") === selectedSuggestionId) || null;
  const detail = suggestionDetailRecord(state.detail);
  const detailMatchesSelection = String(detail.item?.id || "").trim() && String(detail.item?.id || "").trim() === selectedSuggestionId;
  const item = (detailMatchesSelection ? detail.item : null) || selectedListItem || null;
  if (!item) return `<div class="scheduled-task-empty">Pick a suggestion to inspect its target, content, and review history.</div>`;
  const activeDetail = detailMatchesSelection ? { ...detail, item } : { item };
  return `
    <article class="ai-inbox-detail">
      <header class="ai-inbox-detail-head">
        <div>
          <div class="ai-inbox-detail-kicker">AI Suggestion</div>
          <h2>${escapeHtml(aiSuggestionTargetLabel(item))}</h2>
          <p>${escapeHtml(item.scope || "scope")}</p>
        </div>
        ${badge(aiSuggestionStatusLabel(item.status), aiSuggestionStatusTone(item.status))}
      </header>
      <section class="ai-inbox-detail-section">
        <h3>Content</h3>
        <pre class="ai-inbox-json">${escapeHtml(typeof item.content === "string" ? item.content : JSON.stringify(item.content || {}, null, 2))}</pre>
      </section>
      ${renderTrace(activeDetail)}
      ${renderLinkedArtifact(activeDetail)}
      ${renderDraftEditingGuide(item)}
      ${renderContentEditor(item)}
      ${renderProvenance(activeDetail)}
      ${renderHistory(activeDetail)}
      ${renderActionError(state.actionError)}
      <div class="scheduled-task-actions">
        <button
          class="mini-btn"
          type="button"
          data-ai-suggestion-open-note="${attr(item.target?.id || "")}"
          ${item.target?.id ? "" : "disabled"}
        >
          Open target note
        </button>
      </div>
      ${renderActions(item, state.actionLoading)}
    </article>
  `;
}

export function renderAiSuggestionsPanel(state = {}) {
  const summary = aiSuggestionSummary({ items: state.items, total: state.total });
  return `
    <div class="scheduled-task-panel">
      <div class="scheduled-task-head">
        <div>
          <div class="settings-card-title">AI suggestions</div>
          <div class="settings-card-note">Review field-level and object-level AI suggestions before they become part of user-owned work.</div>
        </div>
        <div class="settings-stat-row">
          ${badge(`${summary.visible}/${summary.total} visible`, "muted")}
          ${badge(`${summary.counts.suggested || 0} suggested`, "warn")}
          ${badge(`${summary.counts.confirmed || 0} confirmed`, "ok")}
          ${summary.counts.rejected ? badge(`${summary.counts.rejected} rejected`, "muted") : ""}
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
