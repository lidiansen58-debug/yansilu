import {
  aiSuggestionActionSet,
  aiSuggestionStatusLabel,
  aiSuggestionStatusOptions,
  aiSuggestionStatusTone,
  aiSuggestionSummary,
  aiSuggestionTargetLabel,
  normalizeAiSuggestionFilters
} from "./ai-suggestions-model.js";

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

function renderDetail(state = {}) {
  const item = state.detail || state.items?.find((entry) => String(entry.id || "") === String(state.selectedSuggestionId || "")) || null;
  if (!item) return `<div class="scheduled-task-empty">Pick a suggestion to inspect its target, content, and review history.</div>`;
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
      ${renderDraftEditingGuide(item)}
      ${renderContentEditor(item)}
      <section class="ai-inbox-detail-section">
        <h3>Provenance</h3>
        <pre class="ai-inbox-json">${escapeHtml(JSON.stringify(item.provenance || {}, null, 2))}</pre>
      </section>
      <section class="ai-inbox-detail-section">
        <h3>History</h3>
        <pre class="ai-inbox-json">${escapeHtml(JSON.stringify(item.history || [], null, 2))}</pre>
      </section>
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
