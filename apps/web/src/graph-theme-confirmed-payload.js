import { buildThemeIndexCreatePayload } from "./theme-index-entry-model.js";
import { graphRelationStatusCountsAsNetworkEdge } from "./graph-relation-state-query.js";
import { relationTypeLabel } from "./editor-relation-helpers.js";

export function buildGraphThemeConfirmedPayload({ directoryId, confirmation, noteById, edges = [] }) {
  const ids = [...new Set(confirmation.noteIds)];
  const idSet = new Set(ids);
  const actualEdges = edges.filter(edge => idSet.has(edge.fromNoteId) && idSet.has(edge.toNoteId) &&
    graphRelationStatusCountsAsNetworkEdge(edge.status));
  const payload = buildThemeIndexCreatePayload({ directoryId, noteIds: ids, title: confirmation.title, noteById });
  const question = String(confirmation.centralQuestion || "").trim();
  return {
    ...payload,
    centralQuestion: question,
    summary: question,
    thesis: "",
    threeLineSummary: [question, `相关笔记 ${ids.length} 条，组内已有 ${actualEdges.length} 条关系`, "下一步：用这些笔记整理提纲。"],
    items: payload.items.map(item => {
      const userRole = String(confirmation.roles?.[item.noteId] || "").trim();
      const evidence = actualEdges.filter(edge => edge.fromNoteId === item.noteId || edge.toNoteId === item.noteId)
        .map(edge => {
          const source = noteById(edge.fromNoteId)?.title || edge.fromNoteId;
          const target = noteById(edge.toNoteId)?.title || edge.toNoteId;
          const reason = String(edge.rationale || "").trim();
          return `${source} → ${relationTypeLabel(edge.relationType)} → ${target}${reason && reason !== "markdown_wikilink" ? `：${reason}` : ""}`;
        });
      return { ...item, rationale: userRole || evidence.join("\n") };
    })
  };
}
