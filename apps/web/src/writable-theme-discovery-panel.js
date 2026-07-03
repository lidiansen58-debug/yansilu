function cleanText(value = "") {
  return String(value || "").trim();
}

function fieldValue(value = "", escapeHtml = (item) => String(item ?? "")) {
  return escapeHtml(cleanText(value));
}

function renderSuggestionNote(item = {}, escapeHtml = (value) => String(value ?? "")) {
  const noteId = cleanText(item.noteId);
  return `
    <article class="writing-note-card" data-theme-discovery-note-id="${escapeHtml(noteId)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(item.shortLabel || noteId)}</div>
          <div class="writing-note-meta">${escapeHtml(noteId)}</div>
        </div>
      </div>
      <label class="writing-section-note" for="themeDiscoveryRationale-${escapeHtml(noteId)}">为什么属于同一主题</label>
      <textarea
        id="themeDiscoveryRationale-${escapeHtml(noteId)}"
        data-theme-discovery-field="item-rationale"
        data-theme-discovery-note-id="${escapeHtml(noteId)}"
        rows="2"
      >${fieldValue(item.rationale, escapeHtml)}</textarea>
    </article>
  `;
}

function renderSuggestionCard(suggestion = {}, escapeHtml = (value) => String(value ?? "")) {
  const disabled = suggestion.canSave ? "" : " disabled";
  return `
    <article class="writing-theme-detail-card" data-theme-discovery-suggestion-id="${escapeHtml(suggestion.id)}">
      <div class="writing-theme-detail-head">
        <div>
          <div class="writing-note-title">可写主题建议</div>
          <div class="writing-note-meta">${escapeHtml(suggestion.sourceLabel || "本地规则建议")} · ${escapeHtml(String(suggestion.noteIds?.length || 0))} 条关键笔记</div>
        </div>
      </div>
      <div class="import-grid" style="margin-top:12px;">
        <label>建议主题名称</label>
        <input data-theme-discovery-field="title" value="${fieldValue(suggestion.title, escapeHtml)}" />
        <label>中心问题建议</label>
        <textarea data-theme-discovery-field="centralQuestion" rows="2">${fieldValue(suggestion.centralQuestion, escapeHtml)}</textarea>
        <label>为什么这些笔记属于同一主题</label>
        <textarea data-theme-discovery-field="membershipReason" rows="3">${fieldValue(suggestion.membershipReason, escapeHtml)}</textarea>
      </div>
      <div class="writing-summary" style="margin-top:12px;">
        这些内容只是建议。忽略不会改动笔记；保存前可以编辑名称、中心问题和每条笔记的理由。
      </div>
      <div class="writing-note-list" style="margin-top:12px;">
        ${(suggestion.items || []).map((item) => renderSuggestionNote(item, escapeHtml)).join("")}
      </div>
      <div class="writing-note-actions" style="margin-top:12px;">
        <button class="mini-btn primary" type="button" data-theme-discovery-action="save"${disabled}>确认并保存为可写主题</button>
        <button class="mini-btn" type="button" data-theme-discovery-action="ignore">忽略这条建议</button>
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
  return suggestions.map((suggestion) => renderSuggestionCard(suggestion, escapeHtml)).join("");
}
