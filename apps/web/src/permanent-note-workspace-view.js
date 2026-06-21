import { escapeHtml } from "./editor-render-utils.js";

export const PERMANENT_NOTE_WORKSPACE_TABS = ["relations", "viewpoint", "writing"];

export function normalizePermanentWorkspaceTab(tab = "") {
  const cleanTab = String(tab || "").trim();
  return PERMANENT_NOTE_WORKSPACE_TABS.includes(cleanTab) ? cleanTab : "viewpoint";
}

export function syncPermanentWorkspaceTabElements(workspace, tab = "viewpoint") {
  if (!workspace) return false;
  const activeTab = normalizePermanentWorkspaceTab(tab);
  workspace.querySelectorAll?.("[data-permanent-workspace-tab]")?.forEach((button) => {
    const active = button.getAttribute("data-permanent-workspace-tab") === activeTab;
    button.classList?.toggle("is-active", active);
    button.setAttribute?.("aria-selected", active ? "true" : "false");
  });
  workspace.querySelectorAll?.("[data-permanent-workspace-pane]")?.forEach((pane) => {
    const active = pane.getAttribute("data-permanent-workspace-pane") === activeTab;
    pane.classList?.toggle("is-active", active);
    pane.hidden = !active;
  });
  return true;
}

export function renderPermanentWorkspaceTabs(tabs = [], activeTab = "viewpoint") {
  const selectedTab = normalizePermanentWorkspaceTab(activeTab);
  return `
    <div class="permanent-workspace-tabs" role="tablist" aria-label="永久笔记整理步骤">
      ${tabs
        .map(({ key, label, meta }) => {
          const active = key === selectedTab;
          return `<button class="permanent-workspace-tab ${active ? "is-active" : ""}" type="button" role="tab" aria-selected="${active ? "true" : "false"}" data-permanent-workspace-tab="${escapeHtml(key)}">
            <span>${escapeHtml(label)}</span>
            <small>${escapeHtml(meta)}</small>
          </button>`;
        })
        .join("")}
    </div>
  `;
}

export function renderPermanentWorkspacePane(key, activeTab, html = "") {
  const active = key === normalizePermanentWorkspaceTab(activeTab);
  return `
    <div class="permanent-workspace-pane ${active ? "is-active" : ""}" data-permanent-workspace-pane="${escapeHtml(key)}"${active ? "" : " hidden"}>
      ${html}
    </div>
  `;
}

export function renderPermanentNoteWorkspace({
  note = {},
  activeTab = "viewpoint",
  tabs = [],
  mainPathHtml = "",
  viewpointHtml = "",
  relationsHtml = "",
  writingHtml = ""
} = {}) {
  if (!note?.id) return "";
  const content = `
    ${mainPathHtml}
    ${renderPermanentWorkspaceTabs(tabs, activeTab)}
    ${renderPermanentWorkspacePane("viewpoint", activeTab, viewpointHtml)}
    ${renderPermanentWorkspacePane("relations", activeTab, relationsHtml)}
    ${renderPermanentWorkspacePane("writing", activeTab, writingHtml)}
  `.trim();
  if (!content) return "";
  return `
    <section class="inspector-deferred-workspace permanent-note-workspace" data-deferred-workspace data-permanent-note-workspace data-note-id="${escapeHtml(note.id)}">
      <div class="inspector-section-head permanent-workspace-head">
        <div>
          <div class="inspector-section-title">永久笔记整理</div>
          <div class="inspector-section-note">关联、观点提纯和写作准备分开处理；这里只给一个主动动作。</div>
        </div>
      </div>
      <div class="inspector-deferred-body">
        ${content}
      </div>
    </section>
  `;
}
