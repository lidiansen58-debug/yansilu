import { escapeHtml } from "./editor-render-utils.js";

export function renderPermanentNoteActionPanel(model = {}) {
  const noteId = String(model.noteId || "").trim();
  const primaryStep = model.primaryStep || {};
  if (!noteId || !primaryStep.action) return "";
  const focusAttr = primaryStep.focusTarget
    ? ` data-note-main-route-focus="${escapeHtml(primaryStep.focusTarget)}"`
    : "";
  const routeModeAttr = primaryStep.routeMode
    ? ` data-note-main-route-mode="${escapeHtml(primaryStep.routeMode)}"`
    : "";
  return `
      <section class="inspector-section permanent-workspace-current" data-note-main-path-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">建议先做</div>
            <div class="inspector-section-note">${escapeHtml(model.noteSummary || "")}</div>
          </div>
        </div>
        <div class="main-path-next-card" data-main-path-next-action="${escapeHtml(primaryStep.action)}">
          <div>
            <span>${escapeHtml(primaryStep.label || "")}</span>
            <strong>${escapeHtml(model.nextStep || "")}</strong>
            <p>${escapeHtml(primaryStep.hint || model.noteSummary || "")}</p>
          </div>
          <button class="mini-btn primary" type="button" data-note-main-route-action="${escapeHtml(primaryStep.action)}"${focusAttr}${routeModeAttr}>${escapeHtml(primaryStep.actionLabel || "")}</button>
        </div>
      </section>
    `;
}
