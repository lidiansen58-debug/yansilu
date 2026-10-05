import { escapeHtml } from "./editor-render-utils.js";
import { graphNotePreviewTextForLocalRelation } from "./graph-local-relations.js";
import { relationTypeLabel } from "./editor-relation-helpers.js";

function preview(note = {}) {
  if (note.bodyLoaded === false && !note.thesis && !note.summary) return "";
  return note.thesis || note.summary || note.body || note.markdown
    ? graphNotePreviewTextForLocalRelation(note)
    : "";
}

export function renderRelationPairPreview({ note = {}, target = null, existing = null, relationType = "associated_with", showDirection = true } = {}) {
  if (!target) return "";
  const fromId = String(existing?.fromNoteId || existing?.from_note_id || note.id || "").trim();
  const incoming = fromId === target.id;
  const source = incoming ? target : note;
  const destination = incoming ? note : target;
  return `<section class="relation-pair-preview" data-relation-pair-preview tabindex="-1" aria-label="关联的两条笔记">
    <div class="relation-pair-note">
      <strong>${escapeHtml(source.title || source.id)}</strong>
      ${preview(source) ? `<p>${escapeHtml(preview(source))}</p>` : ""}
    </div>
    ${showDirection ? `<div class="relation-pair-direction" aria-label="关系方向">${escapeHtml(source.title || source.id)} &rarr; <span data-relation-pair-type>${escapeHtml(relationTypeLabel(relationType))}</span> &rarr; ${escapeHtml(destination.title || destination.id)}</div>` : ""}
    <div class="relation-pair-note">
      <strong>${escapeHtml(destination.title || destination.id)}</strong>
      ${preview(destination) ? `<p>${escapeHtml(preview(destination))}</p>` : ""}
    </div>
  </section>`;
}
