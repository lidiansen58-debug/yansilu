import { escapeHtml } from "./editor-render-utils.js";
import { renderRelationPairPreview } from "./relation-pair-preview.js";
import { graphRelationStatusCountsAsNetworkEdge } from "./graph-relation-state-query.js";

export function renderGraphBridgeSelectionPanelView({ bridge = null, nodeMap = new Map(), edges = [] } = {}, deps = {}) {
  if (!bridge || !nodeMap.has(bridge.noteId) || (bridge.targetNoteId && !nodeMap.has(bridge.targetNoteId))) return "";
  const { renderGraphSelectionShell = () => "", graphFullNoteById = (id) => nodeMap.get(id), graphEdgeSelectionKey = (edge) => edge.id } = deps;
  const note = graphFullNoteById(bridge.noteId, nodeMap) || nodeMap.get(bridge.noteId);
  const target = bridge.targetNoteId ? graphFullNoteById(bridge.targetNoteId, nodeMap) || nodeMap.get(bridge.targetNoteId) : null;
  const existing = edges.find((edge) => graphRelationStatusCountsAsNetworkEdge(edge.status) &&
    ((edge.fromNoteId === note.id && edge.toNoteId === target?.id) || (edge.toNoteId === note.id && edge.fromNoteId === target?.id)));
  const bodyLink = existing?.rationale === "markdown_wikilink";
  const detail = existing
    ? "两条笔记已有关系；先阅读内容，检查是否需要补充。"
    : target
      ? "两条笔记尚无直接关系；先对照内容，也可以保持不关联。"
      : "没有明确的目标笔记；可以寻找相关观点，也可以保持独立。";
  return renderGraphSelectionShell({
    className: "is-bridge",
    ariaLabel: "对照笔记详情",
    kicker: "对照笔记",
    title: note.title || note.id,
    meta: target ? `对照「${target.title || target.id}」` : "寻找相关观点",
    closeLabel: "收起对照笔记",
    roleLabel: existing ? "已有关系" : "尚未确认关联",
    roleDetail: detail,
    body: `${renderRelationPairPreview({ note, target, existing, relationType: existing?.relationType, showDirection: Boolean(existing) })}
      ${existing ? `<section class="graph-selection-reason"><small>已有关系的说明</small><p>${escapeHtml(bodyLink ? "关联上下文在来源正文中。" : existing.rationale || "未填写单独说明；可以阅读双方正文。")}</p></section>` : ""}`,
    actions: `${existing
      ? `<button class="graph-selection-action is-primary" type="button" data-graph-select-edge="${escapeHtml(graphEdgeSelectionKey(existing))}">查看已有关系</button>`
      : `<button class="graph-selection-action is-primary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(note.id)}"${target ? ` data-graph-target-note="${escapeHtml(target.id)}"` : ""}>${target ? "判断是否关联" : "寻找相关笔记"}</button>`}
      <button class="graph-selection-action is-quiet" type="button" data-open-note="${escapeHtml(note.id)}">阅读笔记</button>
      ${target ? `<button class="graph-selection-action is-quiet" type="button" data-open-note="${escapeHtml(target.id)}">阅读另一条笔记</button>` : ""}`
  });
}
