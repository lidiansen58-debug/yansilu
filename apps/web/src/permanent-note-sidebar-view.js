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
      ? "正在读取这条笔记的正式关系。读取完成后再保存新关系。"
      : explicitRelationCount > 0
        ? `已有 ${explicitRelationCount} 条正式关系。还可以继续补一条更关键的连接。`
        : wikilinkCount || tagRelatedCount
          ? "现在只有正文链接或同标签接近，还不是正式关系。请选择一条最关键的连接并写清理由。"
          : "还没有正式关系。请先关联一条真正相关的永久笔记，并写清为什么相关。";
  return {
    ...assistState,
    relationText,
    primaryLabel: analysis ? "查看 AI 推荐" : "AI 找关联",
    manualLabel: "手动搜索"
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
        <strong>建立一条正式关系</strong>
        <p>${escapeHtml(assist.relationText)}</p>
      </div>
      ${
        analysis && assist.relationCandidates
          ? `<div class="permanent-workspace-ai-note">AI 推荐了 ${escapeHtml(String(assist.relationCandidates))} 条可能关联。你选择并保存后才会建立关系。</div>`
          : ""
      }
      <div class="semantic-relation-actions">
        <button class="mini-btn primary" type="button" data-permanent-relation-action="open" data-permanent-relation-mode="ai">${escapeHtml(assist.primaryLabel)}</button>
        <button class="mini-btn" type="button" data-permanent-relation-action="open" data-permanent-relation-mode="manual">${escapeHtml(assist.manualLabel)}</button>
      </div>
    </section>
  `;
}
