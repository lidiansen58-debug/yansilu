import {
  renderPermanentNoteWorkspace
} from "./permanent-note-workspace-view.js";
import { renderPermanentNoteFormation } from "./permanent-note-formation-view.js";
import { captureWorkspaceFocus, restoreWorkspaceFocus } from "./note-workspace-focus.js";

export class PermanentNoteWorkspaceController {
  constructor(host) {
    this.host = host;
    this.activeNoteId = "";
    this.activeTab = "";
    this.resultRequestSerial = 0;
    this.host?.els?.relatedPanel?.addEventListener?.("keydown", (event) => {
      // Keep modal keys from also reaching application navigation handlers.
      event.stopPropagation();
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.host.toggleInspector(false);
        this.host.els.showRelated?.focus?.();
      } else if (event.key === "Tab") {
        const controls = [...this.host.els.relatedPanel.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')]
          .filter((el) => el.tabIndex >= 0 && el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
      }
    });
    this.host?.els?.result?.addEventListener?.("keydown", (event) => {
      const button = event.target.closest?.("[data-permanent-workspace-tab]");
      const workspace = this.workspaceElement();
      if (!button || !workspace?.contains(button)) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing) return;
      const buttons = [...workspace.querySelectorAll("[data-permanent-workspace-tab]")];
      const index = buttons.indexOf(button);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
        : event.key === "ArrowRight" ? (index + 1) % buttons.length
          : event.key === "ArrowLeft" ? (index + buttons.length - 1) % buttons.length : -1;
      if (next < 0) return;
      event.preventDefault();
      event.stopPropagation();
      this.activateTab(buttons[next].dataset.permanentWorkspaceTab);
      buttons[next].focus();
    });
  }

  reset(noteId = "") {
    this.invalidateResultRequests();
    this.activeNoteId = String(noteId || "").trim();
    this.activeTab = "";
  }

  currentTab() {
    return this.activeTab || "viewpoint";
  }

  focusWorkspace() {
    const panel = this.host?.els?.relatedPanel;
    const selected = panel?.querySelector('[data-permanent-workspace-tab][aria-selected="true"]');
    const target = selected?.getClientRects().length ? selected :
      [...(panel?.querySelectorAll("button:not(:disabled)") || [])].find(button => button.getClientRects().length);
    target?.focus();
  }

  workspaceElement() {
    return this.host?.els?.result?.querySelector?.("[data-permanent-note-workspace]") || null;
  }

  openResult(html) {
    this.invalidateResultRequests();
    this.host.setInspectorVisible(true);
    this.replaceResult(html);
    this.focusWorkspace();
  }

  invalidateResultRequests() {
    this.resultRequestSerial += 1;
  }

  beginResultRequest() {
    const serial = ++this.resultRequestSerial;
    const contextCurrent = this.host.previewContextGuard();
    return () => serial === this.resultRequestSerial && contextCurrent();
  }

  replaceResult(html) {
    const result = this.host?.els?.result;
    if (!result) return;
    const focused = captureWorkspaceFocus(result);
    const optionalDetailsOpen = result.querySelector?.(".viewpoint-optional-details")?.open === true;
    result.innerHTML = html;
    if (optionalDetailsOpen) {
      const details = result.querySelector?.(".viewpoint-optional-details");
      if (details) details.open = true;
    }
    restoreWorkspaceFocus(result, focused);
    if (focused && !result.contains(result.ownerDocument.activeElement)) this.focusWorkspace();
  }

  workspaceMatchesNote(noteId = "") {
    const workspace = this.workspaceElement();
    const cleanNoteId = String(noteId || "").trim();
    return Boolean(workspace && cleanNoteId && String(workspace.getAttribute?.("data-note-id") || "").trim() === cleanNoteId);
  }

  renderDeferredWorkspace(note, tab) {
    if (!note?.id || !tab) return "";
    if (this.activeNoteId !== String(note.id)) this.activeTab = "";
    this.activeNoteId = String(note.id || "").trim();
    if (!this.activeTab) {
      this.activeTab = "viewpoint";
    }
    return renderPermanentNoteWorkspace({
      note,
      activeTab: this.currentTab(),
      viewpointHtml: `
        ${this.host.renderPermanentNoteDistillationSection(note)}
      `,
      relationsHtml: `
        ${this.host.renderPermanentNoteRelationAssistSection(note)}
        ${this.host.renderCurrentRelationSection(note.id, {
          relations: this.host.currentSemanticRelations,
          relationState: this.host.semanticRelationsState
        })}
      `,
      historyHtml: renderPermanentNoteFormation(note, this.host.currentSemanticRelations, { notes: this.host.state?.notes || [] })
    });
  }

  refreshSnapshot(note, tab = this.host.activeTab?.(), overview = null) {
    if (!note?.id || !tab || !this.workspaceMatchesNote(note.id)) return false;
    const workspace = this.workspaceElement();
    if (workspace) this.replaceWorkspace(workspace, note, tab);
    return true;
  }

  replaceWorkspace(workspace, note, tab) {
    const focused = captureWorkspaceFocus(workspace);
    const optionalDetailsOpen = workspace.querySelector?.(".viewpoint-optional-details")?.open === true;
    workspace.outerHTML = this.renderDeferredWorkspace(note, tab);
    if (optionalDetailsOpen) {
      const details = this.workspaceElement()?.querySelector?.(".viewpoint-optional-details");
      if (details) details.open = true;
    }
    restoreWorkspaceFocus(this.workspaceElement(), focused);
  }

  activateTab(tab = "viewpoint") {
    this.invalidateResultRequests();
    const nextTab = ["relations", "history"].includes(tab) ? tab : "viewpoint";
    this.activeTab = nextTab;
    const note = this.host.activeNote?.();
    const activeEditorTab = this.host.activeTab?.();
    if (note?.id && activeEditorTab && this.workspaceMatchesNote(note.id)) {
      const workspace = this.workspaceElement();
      // Switch the mounted panes so unsaved fields, selection and open details survive.
      for (const button of workspace.querySelectorAll("[data-permanent-workspace-tab]")) {
        const selected = button.getAttribute("data-permanent-workspace-tab") === nextTab;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      }
      for (const pane of workspace.querySelectorAll("[data-permanent-workspace-pane]")) {
        pane.hidden = pane.getAttribute("data-permanent-workspace-pane") !== nextTab;
      }
    }
    return this.workspaceMatchesNote(this.activeNoteId);
  }
}
