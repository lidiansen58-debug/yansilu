import { escapeHtml } from "./editor-render-utils.js";
import {
  permanentNoteStatusSummaryState,
  permanentRelationAssistState
} from "./permanent-note-sidebar-architecture.js";

export function renderPermanentNoteStatusSummary({
  note = {},
  relationState = "idle",
  relationCount = 0
} = {}) {
  const summaryState = permanentNoteStatusSummaryState({
    note,
    relationState,
    relationCount
  });
  const thesis = summaryState.viewpoint.thesis;
  const summary = summaryState.viewpoint.summary;
  const confirmed = summaryState.viewpoint.confirmed;
  const viewpointLabel = !thesis ? "观点：待提纯" : summary.length < 3 ? "观点：待压缩" : confirmed ? "观点：已确认" : "观点：待确认";
  const relationSummaryLabel =
    relationState === "error"
      ? "关联：读取失败"
      : relationState === "loading"
        ? "关联：读取中"
        : relationCount > 0
          ? `关联：${relationCount} 条`
          : "关联：待建立";
  return `
    <div class="inspector-summary inspector-summary-compact" data-inspector-status-summary>
      <span class="inspector-chip ${confirmed ? "is-success" : "is-warning"}">${escapeHtml(viewpointLabel)}</span>
      <span class="inspector-chip ${relationCount > 0 ? "is-success" : "is-warning"}">${escapeHtml(relationSummaryLabel)}</span>
    </div>
  `;
}

export function permanentNoteRelationAssistViewState({
  explicitRelationCount = 0,
  wikilinkCount = 0,
  tagRelatedCount = 0,
  analysis = null
} = {}) {
  const assistState = permanentRelationAssistState({
    explicitRelationCount,
    wikilinkCount,
    tagRelatedCount,
    analysis
  });
  const relationText =
    explicitRelationCount === null
      ? "正在读取关系。"
      : explicitRelationCount > 0
        ? `已有 ${explicitRelationCount} 条关系。`
        : wikilinkCount || tagRelatedCount
          ? "有线索，选一条保存为正式关系。"
          : "找一条真正相关的笔记。";
  return {
    ...assistState,
    relationText,
    primaryLabel: "AI推荐"
  };
}

export function renderPermanentNoteRelationAssistSection({
  note = {},
  explicitRelationCount = 0,
  wikilinkCount = 0,
  tagRelatedCount = 0,
  analysis = null
} = {}) {
  if (!note?.id) return "";
  const assist = permanentNoteRelationAssistViewState({
    explicitRelationCount,
    wikilinkCount,
    tagRelatedCount,
    analysis
  });
  return `
    <section class="permanent-workspace-card relation-assist-panel" data-note-relation-assist-section data-note-id="${escapeHtml(note.id)}">
      <div>
        <strong>关联笔记</strong>
        <p>${escapeHtml(assist.relationText)}</p>
      </div>
      ${
        analysis && assist.relationCandidates
          ? `<div class="permanent-workspace-ai-note">${escapeHtml(String(assist.relationCandidates))} 条建议</div>`
          : ""
      }
    </section>
  `;
}
