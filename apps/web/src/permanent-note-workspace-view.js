import { escapeHtml } from "./editor-render-utils.js";

export function renderPermanentNoteWorkspace({
  note = {},
  viewpointHtml = ""
} = {}) {
  if (!note?.id || !viewpointHtml) return "";
  return `
    <section class="inspector-deferred-workspace permanent-note-workspace" data-deferred-workspace data-permanent-note-workspace data-note-id="${escapeHtml(note.id)}">
      <div class="inspector-deferred-body">
        ${viewpointHtml}
      </div>
    </section>
  `;
}
