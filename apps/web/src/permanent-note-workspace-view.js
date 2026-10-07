import { escapeHtml } from "./editor-render-utils.js";

export function renderPermanentNoteWorkspace({
  note = {},
  activeTab = "viewpoint",
  viewpointHtml = "",
  relationsHtml = "",
  historyHtml = ""
} = {}) {
  if (!note?.id || (!viewpointHtml && !relationsHtml)) return "";
  const currentTab = ["relations", "history"].includes(activeTab) ? activeTab : "viewpoint";
  const prefix = `polish-${escapeHtml(note.id)}`;
  const tab = (key, label) => `
    <button
      class="permanent-note-workspace-tab ${currentTab === key ? "is-active" : ""}"
      type="button"
      role="tab"
      id="${prefix}-tab-${key}"
      aria-controls="${prefix}-pane-${key}"
      tabindex="${currentTab === key ? "0" : "-1"}"
      data-permanent-workspace-tab="${escapeHtml(key)}"
      aria-selected="${currentTab === key ? "true" : "false"}"
    >${escapeHtml(label)}</button>
  `;
  return `
    <section class="inspector-deferred-workspace permanent-note-workspace" data-deferred-workspace data-permanent-note-workspace data-note-id="${escapeHtml(note.id)}">
      <p class="note-workspace-context" data-permanent-workspace-context ${currentTab === "viewpoint" && viewpointHtml.includes('name="title"') ? "hidden" : ""}>${escapeHtml(note.title || "未命名笔记")}</p>
      <div class="permanent-note-workspace-tabs" role="tablist" aria-label="打磨笔记">
        ${tab("viewpoint", "当前观点")}
        ${tab("relations", "笔记关联")}
        ${tab("history", "形成过程")}
      </div>
      <div class="inspector-deferred-body">
        <div role="tabpanel" id="${prefix}-pane-viewpoint" aria-labelledby="${prefix}-tab-viewpoint" data-permanent-workspace-pane="viewpoint" ${currentTab === "viewpoint" ? "" : "hidden"}>
          ${viewpointHtml}
        </div>
        <div role="tabpanel" id="${prefix}-pane-relations" aria-labelledby="${prefix}-tab-relations" data-permanent-workspace-pane="relations" ${currentTab === "relations" ? "" : "hidden"}>
          ${relationsHtml}
        </div>
        <div role="tabpanel" id="${prefix}-pane-history" aria-labelledby="${prefix}-tab-history" data-permanent-workspace-pane="history" ${currentTab === "history" ? "" : "hidden"}>
          ${historyHtml}
        </div>
      </div>
    </section>
  `;
}
