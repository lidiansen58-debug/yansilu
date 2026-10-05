import { escapeHtml } from "./editor-render-utils.js";

export class PermanentNoteAssociationFollowup {
  constructor() {
    this.scope = "";
    this.serial = 0;
    this.byNoteId = new Map();
  }

  syncScope(scope = "") {
    const nextScope = String(scope || "");
    if (nextScope !== this.scope) {
      this.byNoteId.clear();
      this.scope = nextScope;
    }
  }

  clear() {
    this.byNoteId.clear();
  }

  offer(note, scope = "") {
    this.syncScope(scope);
    const noteId = String(note?.id || "").trim();
    const thesis = String(note?.thesis || "").trim();
    if (!noteId || !thesis || note?.distillationStatus !== "confirmed") return false;
    const previous = this.byNoteId.get(noteId);
    if (previous?.thesis === thesis) return previous.pending;
    this.byNoteId.set(noteId, { thesis, pending: true, token: `association-next-${++this.serial}` });
    return true;
  }

  current(note, scope = "") {
    this.syncScope(scope);
    const entry = this.byNoteId.get(String(note?.id || "").trim());
    return entry?.pending && entry.thesis === String(note?.thesis || "").trim() && note?.distillationStatus === "confirmed"
      ? entry : null;
  }

  dismiss(note, scope = "", token = "") {
    const entry = this.current(note, scope);
    if (!entry || entry.token !== token) return false;
    entry.pending = false;
    return true;
  }
}

export function renderPermanentNoteAssociationFollowup(note, entry) {
  if (!entry) return "";
  const action = (key, label, className = "") => `<button class="mini-btn ${className}" type="button" data-note-association-next="${key}" data-note-id="${escapeHtml(note.id)}" data-association-next-token="${escapeHtml(entry.token)}">${label}</button>`;
  return `
    <section class="inspector-section semantic-relations-section" data-note-distillation-section data-note-id="${escapeHtml(note.id)}">
      <div class="semantic-relation-form note-association-followup" data-note-association-followup>
        <strong>观点已保存</strong>
        <p class="note-association-saved-thesis">${escapeHtml(entry.thesis)}</p>
        <p class="note-association-next-question">哪条已有笔记能支持、反驳或补充这个观点？</p>
        <div class="semantic-relation-actions">
          ${action("associate", "关联一条笔记", "primary")}
          ${action("skip", "先不关联")}
        </div>
        ${action("edit", "继续修改观点", "is-ghost")}
      </div>
    </section>`;
}
