import {
  aiSuggestionActionSet,
  aiSuggestionStatusLabel,
  aiSuggestionStatusTone
} from "./ai-suggestions-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeFieldName(value = "") {
  const field = cleanText(value).replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`).replace(/^_+/, "");
  if (field === "three_line_summary" || field === "three_linesummary") return "three_line_summary";
  return field;
}

function fieldLabel(field = "") {
  const normalized = normalizeFieldName(field);
  if (normalized === "thesis") return "一句话判断";
  if (normalized === "three_line_summary") return "三句话压缩";
  if (normalized === "boundary_or_counterpoint") return "边界 / 反证";
  if (normalized === "relation_rationale") return "关系理由";
  if (normalized === "writing_move") return "写作动作";
  return normalized || "对象级建议";
}

function scopeLabel(scope = "") {
  const normalized = cleanText(scope);
  if (normalized === "note_field") return "字段建议";
  if (normalized === "note") return "整条笔记";
  if (normalized === "relation") return "关系建议";
  return normalized || "AI 建议";
}

function suggestionPreview(content, field = "") {
  if (typeof content === "string") return cleanText(content);
  if (!content || typeof content !== "object") return "";
  const normalizedField = normalizeFieldName(field);
  if (normalizedField === "three_line_summary") {
    const lines = Array.isArray(content.threeLineSummary || content.three_line_summary)
      ? (content.threeLineSummary || content.three_line_summary).map(cleanText).filter(Boolean)
      : [];
    return lines.join(" / ");
  }
  return cleanText(content[normalizedField] || content.thesis || content.boundaryOrCounterpoint || content.boundary_or_counterpoint);
}

function actionLabel(action = "") {
  const labels = {
    adopted_as_draft: "采纳为草稿",
    edited: "标记已编辑",
    confirmed: "确认建议",
    rejected: "忽略"
  };
  return labels[cleanText(action)] || cleanText(action);
}

export function noteSuggestionReviewContent(note = {}, suggestion = {}) {
  const field = normalizeFieldName(suggestion?.target?.field);
  if (field === "three_line_summary") {
    return {
      three_line_summary: Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.map(cleanText).filter(Boolean) : []
    };
  }
  if (field === "boundary_or_counterpoint") {
    return {
      boundary_or_counterpoint: cleanText(note?.boundaryOrCounterpoint)
    };
  }
  return {
    [field || "thesis"]: cleanText(note?.thesis)
  };
}

export function renderNoteEmbeddedAiWorkspace(state = {}) {
  const items = Array.isArray(state.items) ? state.items : [];
  if (state.loading) {
    return `<div class="related-empty">正在生成 AI 建议…</div>`;
  }
  if (state.error) {
    return `<div class="related-empty bad">AI 建议生成失败：${escapeHtml(state.error)}</div>`;
  }
  if (!items.length) {
    return `
      <div class="related-empty">
        还没有 AI 建议。
        <div class="semantic-relation-actions">
          <button class="mini-btn primary" type="button" data-note-ai-analysis>生成 AI 建议</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="semantic-relation-group">
      <div class="semantic-relation-group-head">
        <strong>AI 建议</strong>
        <span>${escapeHtml(Math.min(items.length, 3))}</span>
      </div>
      <div class="inspector-list">
        ${items
          .slice(0, 3)
          .map((item) => {
            const field = normalizeFieldName(item?.target?.field);
            const actions = aiSuggestionActionSet(item);
            const busy = String(state.actionSuggestionId || "").trim() === String(item.id || "").trim() && state.actionLoading === true;
            const notice = String(state.actionSuggestionId || "").trim() === String(item.id || "").trim() ? cleanText(state.actionNotice) : "";
            const error = String(state.actionSuggestionId || "").trim() === String(item.id || "").trim() ? cleanText(state.actionError) : "";
            return `
              <section class="related-item" data-note-ai-suggestion-id="${escapeHtml(item.id)}">
                <span class="related-item-title">${escapeHtml(fieldLabel(field))}</span>
                <span class="related-item-meta">
                  ${escapeHtml(scopeLabel(item.scope))}
                  <span class="ai-inbox-badge tone-${escapeHtml(aiSuggestionStatusTone(item.status) || "muted")}">${escapeHtml(aiSuggestionStatusLabel(item.status))}</span>
                </span>
                <span class="related-item-preview">${escapeHtml(suggestionPreview(item.content, field) || "这条建议还没有可展示的内容。")}</span>
                ${
                  notice
                    ? `<div class="related-empty ${escapeHtml(state.actionNoticeTone || "")}" data-note-ai-suggestion-notice="true">${escapeHtml(notice)}</div>`
                    : ""
                }
                ${error ? `<div class="related-empty bad">${escapeHtml(error)}</div>` : ""}
                <div class="semantic-relation-actions">
                  ${actions
                    .map(
                      (action) => `
                        <button
                          class="mini-btn ${action === "confirmed" ? "primary" : ""}"
                          type="button"
                          data-note-ai-suggestion-action="${escapeHtml(action)}"
                          data-note-ai-suggestion-id="${escapeHtml(item.id)}"
                          data-note-ai-suggestion-artifact-id="${escapeHtml(item.sourceArtifactId || "")}"
                          ${busy ? "disabled" : ""}
                        >
                          ${escapeHtml(actionLabel(action))}
                        </button>
                      `
                    )
                    .join("")}
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

export function renderNoteEmbeddedAiWorkspaceSection(note = {}, state = {}) {
  if (!note?.id) return "";
  return `
    <section class="permanent-workspace-card note-ai-check-panel" data-note-ai-check-section data-note-id="${escapeHtml(note.id)}">
      <div class="semantic-relation-group-head">
        <strong>AI 建议</strong>
      </div>
      <div data-note-embedded-ai-workspace data-note-id="${escapeHtml(note.id)}">
        ${renderNoteEmbeddedAiWorkspace(state)}
      </div>
    </section>
  `;
}
