import {
  renderWritingProjectCardView
} from "./writing-workspace-view.js";

export function renderWritingNoteCardDom(deps = {}, note, { selected = false, action = "add", actionLabel = "加入相关笔记", usageText = "" } = {}) {
  const { escapeHtml, renderThinkingStatusBadge, writingNoteMeta, writingNoteExcerpt } = deps;
  const thinkingBadge = renderThinkingStatusBadge(note?.thinkingStatus, "thinking-status-badge writing-thinking-status");
  const excerpt = String(writingNoteExcerpt(note) || "").trim();
  return `
    <article class="writing-note-card ${selected ? "selected" : ""}" data-writing-note-id="${escapeHtml(note.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(note.title || note.id)}</div>
          <div class="writing-note-meta">${escapeHtml(writingNoteMeta(note))}</div>
        </div>
        ${thinkingBadge}
      </div>
      ${excerpt ? `<div class="writing-note-meta">${escapeHtml(excerpt)}</div>` : ""}
      ${usageText ? `<div class="writing-note-meta">${escapeHtml(usageText)}</div>` : ""}
      <div class="writing-note-actions">
        ${action === "open" ? "" : `<button class="mini-btn" type="button" data-writing-action="${escapeHtml(action)}" data-writing-note-id="${escapeHtml(note.id)}">${escapeHtml(actionLabel)}</button>`}
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
