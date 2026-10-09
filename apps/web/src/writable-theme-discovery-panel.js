import { writableThemeDiscoveryDraftView } from "./writable-theme-discovery-draft.js";

function cleanText(value = "") {
  return String(value || "").trim();
}

function fieldValue(value = "", escapeHtml = (item) => String(item ?? "")) {
  return escapeHtml(cleanText(value));
}

function renderSuggestionNote(item = {}, suggestionId = "", escapeHtml = (value) => String(value ?? "")) {
  const noteId = cleanText(item.noteId);
  const fieldId = `themeDiscoveryRationale-${escapeHtml(suggestionId)}-${escapeHtml(noteId)}`;
  return `
    <article class="writing-note-card" data-theme-discovery-note-id="${escapeHtml(noteId)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(item.shortLabel || "未命名笔记")}</div>
        </div>
      </div>
      <label class="writing-section-note" for="${fieldId}">为什么属于同一主题</label>
      <textarea
        id="${fieldId}"
        data-theme-discovery-field="item-rationale"
        data-theme-discovery-note-id="${escapeHtml(noteId)}"
        rows="2"
      >${fieldValue(item.rationale, escapeHtml)}</textarea>
    </article>
  `;
}

function renderExplanationList(label = "", items = [], escapeHtml = (value) => String(value ?? "")) {
  const cleanItems = (Array.isArray(items) ? items : []).map(cleanText).filter(Boolean);
  if (!cleanItems.length) return "";
  return `
    <div class="writing-summary">
      <strong>${escapeHtml(label)}</strong>
      <div>${cleanItems.map((item) => `<span class="inspector-chip">${escapeHtml(item)}</span>`).join(" ")}</div>
    </div>
  `;
}

function renderSuggestionCard(suggestion = {}, escapeHtml = (value) => String(value ?? "")) {
  const disabled = suggestion.canSave ? "" : " disabled";
  const explanation = suggestion.explanation || {};
  const fieldId = (name) => `themeDiscovery-${name}-${escapeHtml(suggestion.id)}`;
  const noteLabels = (suggestion.items || []).map((item) => item.shortLabel || "未命名笔记");
  return `
    <article class="writing-theme-detail-card" data-theme-discovery-suggestion-id="${escapeHtml(suggestion.id)}">
      <div class="writing-theme-detail-head">
        <div>
          <div class="writing-note-title">可写主题建议</div>
          <div class="writing-note-meta">${escapeHtml(String(suggestion.noteIds?.length || 0))} 条相关笔记</div>
        </div>
      </div>
      <div class="import-grid" style="margin-top:12px;">
        <label for="${fieldId("title")}">主题名称</label>
        <input id="${fieldId("title")}" data-theme-discovery-field="title" value="${fieldValue(suggestion.title, escapeHtml)}" />
        <label for="${fieldId("question")}">要回答的问题</label>
        <textarea id="${fieldId("question")}" data-theme-discovery-field="centralQuestion" rows="2">${fieldValue(suggestion.centralQuestion, escapeHtml)}</textarea>
        <label for="${fieldId("reason")}">这些笔记为什么有关</label>
        <textarea id="${fieldId("reason")}" data-theme-discovery-field="membershipReason" rows="3">${fieldValue(suggestion.membershipReason, escapeHtml)}</textarea>
      </div>
      <details class="writing-theme-explanation">
        <summary>查看推荐依据</summary>
        <p class="writing-section-note">${escapeHtml(suggestion.sourceLabel || "本地规则建议")}</p>
        ${renderExplanationList("关键笔记", explanation.keyNotes || noteLabels, escapeHtml)}
        ${renderExplanationList("共同信号", explanation.sharedSignals, escapeHtml)}
        <div class="writing-summary">
          <strong>还需补充</strong>
          <div>${escapeHtml(explanation.gap || "保存前先确认中心问题、关键笔记和每条归属理由。")}</div>
        </div>
      </details>
      <details class="writing-theme-notes">
        <summary>相关笔记（${escapeHtml(suggestion.items?.length || 0)}）</summary>
        <div class="writing-note-list">
          ${(suggestion.items || []).map((item) => renderSuggestionNote(item, suggestion.id, escapeHtml)).join("")}
        </div>
      </details>
      <p class="writing-section-note">${escapeHtml(explanation.confirmationSummary || "保存后加入主题库，可用于生成提纲。")}</p>
      <div class="writing-note-actions" style="margin-top:12px;">
        <button class="mini-btn primary" type="button" data-theme-discovery-action="save"${disabled}>保存主题</button>
        <button class="mini-btn is-ghost" type="button" data-theme-discovery-action="ignore">忽略建议</button>
      </div>
    </article>
  `;
}

export function renderWritableThemeDiscoveryPanelDom(deps = {}) {
  const {
    writingState = {},
    escapeHtml = (value) => String(value ?? "")
  } = deps;
  const suggestions = Array.isArray(writingState.themeDiscoverySuggestions) ? writingState.themeDiscoverySuggestions : [];
  if (writingState.themeDiscoveryLoading) {
    return `<div class="writing-empty">正在根据本地规则发现可写主题建议...</div>`;
  }
  if (!suggestions.length) {
    return `<div class="writing-empty">还没有可写主题建议。先让 3 条以上永久笔记共享关系、标签或相近问题，再刷新建议。</div>`;
  }
  return suggestions.map((suggestion) => renderSuggestionCard(writableThemeDiscoveryDraftView(suggestion), escapeHtml)).join("");
}
