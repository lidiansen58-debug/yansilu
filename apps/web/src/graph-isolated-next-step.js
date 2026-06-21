import { graphDirectNetworkEdgesForNote as queryGraphDirectNetworkEdgesForNote } from "./graph-relation-state-query.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function graphDirectNetworkEdgesForNote(noteId = "", edges = [], { relationStatusCountsAsNetworkEdge = () => true } = {}) {
  return queryGraphDirectNetworkEdgesForNote(noteId, edges, { relationStatusCountsAsNetworkEdge });
}

export function renderGraphIsolatedNextStepActionsHtml(
  noteId = "",
  { isolatedNotes = [], nodeMap = new Map(), edges = [] } = {},
  {
    relationStatusCountsAsNetworkEdge = () => true,
    isolatedQueueItems = () => [],
    nextIsolatedQueueItem = () => null,
    themeCandidateNoteIdsForNode = () => [],
    suggestThemeIndexTitle = () => "",
    escapeHtml = defaultEscapeHtml
  } = {}
) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return "";
  const queueItems = isolatedQueueItems({ isolatedNotes, nodeMap, edges, currentNoteId: cleanNoteId, limit: 8 });
  const nextItem = nextIsolatedQueueItem(queueItems, cleanNoteId);
  const directEdges = graphDirectNetworkEdgesForNote(cleanNoteId, edges, { relationStatusCountsAsNetworkEdge });
  if (!directEdges.length) return "";
  const themeNoteIds = themeCandidateNoteIdsForNode(cleanNoteId, directEdges, []);
  const themeTitle = suggestThemeIndexTitle(themeNoteIds);
  const canCreateTheme = directEdges.length > 0 && themeNoteIds.length >= 3;
  const nextText = nextItem
    ? `下一条待关联笔记：${nextItem.title}`
    : "当前范围暂时没有下一条待关联笔记，可以回到这条笔记周边继续阅读。";
  return `
    <section class="graph-isolated-next-step" aria-label="保存关系后的下一步">
      <div>
        <strong>确认关系后继续</strong>
        <p>${escapeHtml(nextText)}</p>
      </div>
      <div class="graph-isolated-next-step-actions">
        ${
          nextItem
            ? `<button class="graph-selection-action is-primary is-queue" type="button" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">处理下一条</button>`
            : ""
        }
        <button class="graph-selection-action is-secondary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(themeNoteIds.join(","))}" data-graph-theme-title="${escapeHtml(themeTitle)}"${canCreateTheme ? "" : " disabled"}>整理成主题草稿</button>
      </div>
    </section>
  `;
}
