import { uniqueStrings } from "./prototype-collection-utils.js";
import {
  relationWorkspaceDirectEdges,
  relationWorkspaceOtherEndpoint
} from "./relation-workspace-shared.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function graphOtherRelationEndpoint(edge = {}, noteId = "") {
  return relationWorkspaceOtherEndpoint(edge, noteId);
}

export function graphThemeCandidateNoteIdsForNode(noteId = "", directEdges = [], aiCandidates = []) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return [];
  const relatedIds = [
    cleanNoteId,
    ...(Array.isArray(directEdges) ? directEdges.map((edge) => graphOtherRelationEndpoint(edge, cleanNoteId)) : []),
    ...(Array.isArray(aiCandidates) ? aiCandidates.map((candidate) => candidate.counterpartNoteId || candidate.targetNoteId) : [])
  ];
  return uniqueStrings(relatedIds).slice(0, 10);
}

export function renderGraphRelationWorkspaceForNote(noteId = "", { nodeMap = new Map(), edges = [], title = "关联整理", deps = {} } = {}) {
  const {
    relationStatusCountsAsNetworkEdge = () => true,
    relationGroupCounts = () => ({}),
    nodeTitle = (_nodeMap, id, fallback = "") => String(fallback || id || "").trim(),
    suggestThemeIndexTitle = () => "",
    edgeSelectionKey = () => "",
    relationTypeLabel = (type) => String(type || "").trim(),
    renderSelectionMetrics = () => ""
  } = deps && typeof deps === "object" ? deps : {};
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return "";
  const directEdges = relationWorkspaceDirectEdges(cleanNoteId, edges, {
    edgeCounts: (edge) => relationStatusCountsAsNetworkEdge(edge?.status)
  });
  const counts = relationGroupCounts(directEdges);
  const themeNoteIds = graphThemeCandidateNoteIdsForNode(cleanNoteId, directEdges, []);
  const sourceTitle = nodeTitle(nodeMap, cleanNoteId, "当前笔记");
  const relationCards = directEdges.slice(0, 4);
  const themeTitle = suggestThemeIndexTitle(themeNoteIds);
  return `
    <section class="graph-relation-workspace" aria-label="已保存的关系">
      <div class="graph-relation-workspace-head">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span>这里只显示已经保存到图谱的关联。新的推荐关系在上方确认后才会进入这里。</span>
        </div>
        <small>${escapeHtml(String(directEdges.length))} 条关联</small>
      </div>
      ${
        relationCards.length
          ? `<section class="graph-relation-workspace-list" aria-label="现有关联">
              <strong>已保存关系</strong>
              ${relationCards
                .map((edge) => {
                  const edgeKey = edgeSelectionKey(edge);
                  const targetId = graphOtherRelationEndpoint(edge, cleanNoteId);
                  const targetTitle = nodeTitle(nodeMap, targetId, targetId || "关联笔记");
                  const relationType = String(edge?.relationType || "associated_with").trim().toLowerCase();
                  const rationale = String(edge?.rationale || "").trim();
                  return `
                    <button class="graph-relation-workspace-card" type="button" data-graph-select-edge="${escapeHtml(edgeKey)}" data-graph-select-edge-id="${escapeHtml(String(edge?.id || "").trim())}" data-graph-select-edge-from="${escapeHtml(String(edge?.fromNoteId || "").trim())}" data-graph-select-edge-to="${escapeHtml(String(edge?.toNoteId || "").trim())}" data-graph-select-edge-type="${escapeHtml(relationType)}">
                      <span>${escapeHtml(relationTypeLabel(relationType))}</span>
                      <strong>${escapeHtml(targetTitle)}</strong>
                      <small>${escapeHtml(rationale && rationale !== "markdown_wikilink" ? rationale : "还需要补一句为什么相关。")}</small>
                    </button>
                  `;
                })
                .join("")}
            </section>`
          : `<section class="graph-relation-workspace-empty">
              <strong>还没有关联</strong>
              <p>先从上方可选关系里保存一条真正成立的连接。</p>
            </section>`
      }
      <details class="graph-selection-details graph-relation-stats">
        <summary>已保存关系概览</summary>
        <div class="graph-selection-metrics" aria-label="关联整理概览">
          ${renderSelectionMetrics([
            { label: "支持", value: `${counts.support || 0} 条` },
            { label: "反方/边界", value: `${(counts.boundary || 0) + (counts.conflict || 0)} 条` },
            { label: "桥接", value: `${counts.bridge || 0} 条` },
            { label: "可整理", value: `${themeNoteIds.length} 条`, hint: "当前笔记加上相邻笔记" }
          ])}
        </div>
      </details>
      <section class="graph-theme-index-workspace" aria-label="主题整理">
        <div>
          <strong>保存为可写主题</strong>
          <p>${escapeHtml(themeNoteIds.length >= 3 ? `把“${sourceTitle}”和相邻 ${themeNoteIds.length - 1} 条笔记整理成可写主题：先写主题问题、关键永久笔记、每条为什么重要和下一步可以写什么。` : "先至少保存两条相关关系，再考虑整理成可写主题。")}</p>
        </div>
        <button class="graph-selection-action is-secondary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(themeNoteIds.join(","))}" data-graph-theme-title="${escapeHtml(themeTitle)}"${themeNoteIds.length >= 3 ? "" : " disabled"}>保存为可写主题</button>
      </section>
    </section>
  `;
}

export function renderGraphThemeIndexWorkspace(noteIds = [], { title = "可写主题推荐", relationCount = 0, tone = "", deps = {} } = {}) {
  const { suggestThemeIndexTitle = () => "" } = deps && typeof deps === "object" ? deps : {};
  const cleanNoteIds = uniqueStrings(noteIds);
  const cleanTitle = String(title || suggestThemeIndexTitle(cleanNoteIds)).trim() || suggestThemeIndexTitle(cleanNoteIds);
  const canCreate = cleanNoteIds.length >= 3;
  return `
    <section class="graph-theme-index-workspace is-${escapeHtml(String(tone || "candidate").trim() || "candidate")}" aria-label="主题整理">
      <div>
        <strong>保存为可写主题</strong>
        <p>${escapeHtml(canCreate ? `这会把 ${cleanNoteIds.length} 条相关笔记收成可写主题；保存主题问题、关键永久笔记、每条为什么重要和下一步可以写什么。` : "先至少凑齐 3 条相关永久笔记，再整理成可写主题。")}</p>
      </div>
      <button class="graph-selection-action is-primary is-theme" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(cleanNoteIds.join(","))}" data-graph-theme-title="${escapeHtml(cleanTitle)}"${canCreate ? "" : " disabled"}>保存为可写主题</button>
    </section>
  `;
}
