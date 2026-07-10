import {
  renderPermanentNoteWorkspace
} from "./permanent-note-workspace-view.js";

export class PermanentNoteWorkspaceController {
  constructor(host) {
    this.host = host;
    this.activeNoteId = "";
  }

  reset(noteId = "") {
    this.activeNoteId = String(noteId || "").trim();
  }

  currentTab() {
    return "viewpoint";
  }

  workspaceElement() {
    return this.host?.els?.result?.querySelector?.("[data-permanent-note-workspace]") || null;
  }

  workspaceMatchesNote(noteId = "") {
    const workspace = this.workspaceElement();
    const cleanNoteId = String(noteId || "").trim();
    return Boolean(workspace && cleanNoteId && String(workspace.getAttribute?.("data-note-id") || "").trim() === cleanNoteId);
  }

  renderDeferredWorkspace(note, tab) {
    if (!note?.id || !tab) return "";
    this.activeNoteId = String(note.id || "").trim();
    return renderPermanentNoteWorkspace({
      note,
      viewpointHtml: this.host.renderPermanentNoteDistillationSection(note)
    });
  }

  refreshSnapshot(note, tab = this.host.activeTab?.(), overview = null) {
    if (!note?.id || !tab || !this.workspaceMatchesNote(note.id)) return false;
    this.host.refreshMainPathSection?.(note, overview);
    return true;
  }

  activateTab() {
    return this.workspaceMatchesNote(this.activeNoteId);
  }
}
