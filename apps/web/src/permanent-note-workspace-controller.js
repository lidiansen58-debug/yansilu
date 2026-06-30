import {
  permanentNoteViewpointState,
  permanentNoteWorkspaceArchitecture
} from "./permanent-note-sidebar-architecture.js";
import {
  normalizePermanentWorkspaceTab,
  renderPermanentNoteWorkspace,
  syncPermanentWorkspaceTabElements
} from "./permanent-note-workspace-view.js";

export class PermanentNoteWorkspaceController {
  constructor(host) {
    this.host = host;
    this.activeNoteId = "";
    this.activeWorkspaceTab = "";
  }

  reset(noteId = "") {
    this.activeNoteId = String(noteId || "").trim();
    this.activeWorkspaceTab = "";
  }

  currentTab(noteId = "") {
    const cleanNoteId = String(noteId || "").trim();
    if (cleanNoteId && cleanNoteId !== this.activeNoteId) return "";
    return this.activeWorkspaceTab;
  }

  workspaceElement() {
    return this.host?.els?.result?.querySelector?.("[data-permanent-note-workspace]") || null;
  }

  workspaceMatchesNote(noteId = "") {
    const workspace = this.workspaceElement();
    const cleanNoteId = String(noteId || "").trim();
    return Boolean(workspace && cleanNoteId && String(workspace.getAttribute?.("data-note-id") || "").trim() === cleanNoteId);
  }

  overviewFor(note, tab, overview = null) {
    if (overview) return overview;
    return this.host.buildMainPathOverviewV2({
      ...this.host.buildLocalRelationSignals(note, tab),
      relations: this.host.currentSemanticRelations,
      relationState: this.host.semanticRelationsState
    });
  }

  architectureFor(note, overview = {}) {
    return permanentNoteWorkspaceArchitecture({
      note,
      relationState: this.host.semanticRelationsState,
      explicitRelationCount: this.host.currentExplicitRelationCount(),
      thinExplicitRelationCount: overview.thinExplicitRelationCount,
      wikilinkCount: overview.wikilinkCount,
      tagRelatedCount: overview.tagRelatedCount
    });
  }

  tabMeta(note, architecture = null) {
    const relationState = this.host.semanticRelationsState;
    const explicitRelationCount = this.host.currentExplicitRelationCount();
    const viewpoint = architecture?.viewpoint || permanentNoteViewpointState(note);
    const thesis = viewpoint.thesis;
    const summary = viewpoint.summary;
    const confirmed = viewpoint.confirmed;
    return {
      relations: relationState === "error" ? "关系读取失败" : explicitRelationCount === null ? "正在读取" : explicitRelationCount > 0 ? `${explicitRelationCount} 条正式关系` : "还没有关系",
      viewpoint: !thesis ? "缺一句话观点" : summary.length < 3 ? "缺支撑理由" : confirmed ? "观点已确认" : "待确认",
      writing: confirmed && explicitRelationCount > 0 ? "可以进入写作" : "先补观点和关系"
    };
  }

  tabsFor(note, architecture = null) {
    const meta = this.tabMeta(note, architecture);
    return [
      {
        key: "relations",
        label: "整理关系",
        meta: meta.relations,
        description: "选择目标笔记，写清为什么相关。"
      },
      {
        key: "viewpoint",
        label: "提炼观点",
        meta: meta.viewpoint,
        description: "提炼观点、理由、边界、追问和写作主题。"
      },
      {
        key: "writing",
        label: "进入写作",
        meta: meta.writing,
        description: "把确认后的观点放进写作篮继续组织。"
      }
    ];
  }

  resolveActiveTab(note, architecture) {
    const noteId = String(note?.id || "").trim();
    if (!noteId) return normalizePermanentWorkspaceTab(architecture?.activeTab);
    if (this.activeNoteId !== noteId) {
      this.activeNoteId = noteId;
      this.activeWorkspaceTab = normalizePermanentWorkspaceTab(architecture?.activeTab);
      return this.activeWorkspaceTab;
    }
    if (!this.activeWorkspaceTab) this.activeWorkspaceTab = normalizePermanentWorkspaceTab(architecture?.activeTab);
    return normalizePermanentWorkspaceTab(this.activeWorkspaceTab);
  }

  renderDeferredWorkspace(note, tab) {
    if (!note?.id || !tab) return "";
    const overview = this.overviewFor(note, tab);
    const architecture = this.architectureFor(note, overview);
    const activeTab = this.resolveActiveTab(note, architecture);
    return renderPermanentNoteWorkspace({
      note,
      activeTab,
      tabs: this.tabsFor(note, architecture),
      mainPathHtml: this.host.renderPermanentNoteMainPathSectionV2(note, overview),
      viewpointHtml: this.host.renderPermanentNoteDistillationSection(note),
      relationsHtml: `
        ${this.host.renderPermanentNoteRelationAssistSection(note, overview)}
        ${this.host.renderInlineDraftRelationSection(note, tab)}
        ${this.host.renderCurrentRelationSection(note.id, {
          relations: this.host.currentSemanticRelations,
          relationState: this.host.semanticRelationsState
        })}
      `,
      writingHtml: this.host.renderPermanentNoteWritingPrepSection(note)
    });
  }

  refreshTabs(note, architecture = null) {
    if (!this.workspaceMatchesNote(note?.id)) return false;
    const workspace = this.workspaceElement();
    const meta = this.tabMeta(note, architecture);
    workspace.querySelectorAll?.("[data-permanent-workspace-tab]")?.forEach((button) => {
      const key = String(button.getAttribute?.("data-permanent-workspace-tab") || "").trim();
      const label = button.querySelector?.("small");
      if (label && Object.prototype.hasOwnProperty.call(meta, key)) label.textContent = meta[key];
    });
    return true;
  }

  refreshRelationAssist(note, overview = {}) {
    if (!this.workspaceMatchesNote(note?.id)) return false;
    const section = this.host.els.result?.querySelector?.("[data-note-relation-assist-section]");
    if (!section || section.getAttribute?.("data-note-id") !== note?.id) return false;
    section.outerHTML = this.host.renderPermanentNoteRelationAssistSection(note, overview);
    return true;
  }

  refreshWriting(note) {
    if (!this.workspaceMatchesNote(note?.id)) return false;
    const pane = this.workspaceElement()?.querySelector?.('[data-permanent-workspace-pane="writing"]');
    if (!pane) return false;
    pane.innerHTML = this.host.renderPermanentNoteWritingPrepSection(note);
    return true;
  }

  refreshSnapshot(note, tab = this.host.activeTab?.(), overview = null) {
    if (!note?.id || !tab || !this.workspaceMatchesNote(note.id)) return false;
    const nextOverview = this.overviewFor(note, tab, overview);
    const architecture = this.architectureFor(note, nextOverview);
    this.host.refreshMainPathSection(note, nextOverview);
    this.refreshRelationAssist(note, nextOverview);
    this.refreshTabs(note, architecture);
    this.refreshWriting(note);
    return true;
  }

  activateTab(tab = "viewpoint") {
    const cleanTab = normalizePermanentWorkspaceTab(tab);
    const workspace = this.workspaceElement();
    const noteId = String(workspace?.getAttribute?.("data-note-id") || this.activeNoteId || "").trim();
    this.activeNoteId = noteId;
    this.activeWorkspaceTab = cleanTab;
    return syncPermanentWorkspaceTabElements(workspace, cleanTab);
  }
}
