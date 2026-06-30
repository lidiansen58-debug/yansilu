import {
  renderWritingProjectCardView
} from "./writing-workspace-view.js";

export function renderWritingNoteCardDom(deps = {}, note, { selected = false, action = "add", actionLabel = "加入相关笔记" } = {}) {
  const { escapeHtml, renderThinkingStatusBadge, writingNoteMeta, writingNoteExcerpt } = deps;
  const thinkingBadge = renderThinkingStatusBadge(note?.thinkingStatus, "thinking-status-badge writing-thinking-status");
  return `
    <article class="writing-note-card ${selected ? "selected" : ""}" data-writing-note-id="${escapeHtml(note.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(note.title || note.id)}</div>
          <div class="writing-note-meta">${escapeHtml(writingNoteMeta(note))}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-meta">${escapeHtml(writingNoteExcerpt(note))}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-action="${escapeHtml(action)}" data-writing-note-id="${escapeHtml(note.id)}">${escapeHtml(actionLabel)}</button>
        <button class="mini-btn" type="button" data-writing-action="open" data-writing-note-id="${escapeHtml(note.id)}">打开笔记</button>
      </div>
    </article>
  `;
}

export function renderWritingProjectCardDom(deps = {}, project) {
  const { escapeHtml, renderThinkingStatusBadge, writingProjectStatusLabel } = deps;
  return renderWritingProjectCardView(project, {
    escapeHtml,
    renderThinkingStatusBadge,
    writingProjectStatusLabel
  });
}
