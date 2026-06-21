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
  const viewpointLabel = !thesis ? "瑙傜偣锛氬緟鎻愮函" : summary.length < 3 ? "瑙傜偣锛氬緟鍘嬬缉" : confirmed ? "瑙傜偣锛氬凡纭" : "瑙傜偣锛氬緟纭";
  const relationSummaryLabel =
    relationState === "error"
      ? "鍏宠仈锛氳鍙栧け璐?"
      : relationState === "loading"
        ? "鍏宠仈锛氳鍙栦腑"
        : relationCount > 0
          ? `鍏宠仈锛?{relationCount} 鏉?`
          : "鍏宠仈锛氬緟寤虹珛";
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
      ? "姝ｅ湪璇诲彇杩欐潯绗旇鐨勬寮忓叧绯汇€傝鍙栧畬鎴愬悗鍙互缁х画琛ュ叧绯汇€?"
      : explicitRelationCount > 0
        ? `宸叉湁 ${explicitRelationCount} 鏉℃寮忓叧绯汇€傚彲浠ョ户缁ˉ鏇村叧閿殑杩炴帴锛屾垨杩涘叆鍐欎綔鍑嗗銆?`
        : wikilinkCount || tagRelatedCount
          ? "鐜板湪鍙湁姝ｆ枃閾炬帴鎴栧悓鏍囩鎺ヨ繎锛岃繕涓嶆槸姝ｅ紡鍏崇郴銆傝閫変竴鏉℃渶鍏抽敭鐨勮繛鎺ュ苟鍐欐竻鐞嗙敱銆?"
          : "杩樻病鏈夋寮忓叧绯汇€傝鍏堝叧鑱斾竴鏉＄湡姝ｇ浉鍏崇殑姘镐箙绗旇锛屽苟鍐欐竻涓轰粈涔堢浉鍏炽€?";
  return {
    ...assistState,
    relationText,
    primaryLabel: analysis ? "鏁寸悊鍏崇郴" : "AI 鎺ㄨ崘",
    manualLabel: "鎵嬪姩鎼滅储"
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
        <strong>鍏宠仈</strong>
        <p>${escapeHtml(assist.relationText)}</p>
      </div>
      ${
        analysis
          ? `<div class="permanent-workspace-ai-note">AI 宸叉壘鍒?${escapeHtml(String(assist.relationCandidates))} 涓€欓€夛紝${escapeHtml(assist.storedArtifactCount ? `${assist.storedArtifactCount} 鏉″緟浣犵‘璁?` : "娌℃湁鑷姩淇濆瓨鍏崇郴")}銆?</div>`
          : ""
      }
      <div class="semantic-relation-actions">
        <button class="mini-btn primary" type="button" data-permanent-relation-action="open" data-permanent-relation-mode="ai">${escapeHtml(assist.primaryLabel)}</button>
        <button class="mini-btn" type="button" data-permanent-relation-action="open" data-permanent-relation-mode="manual">${escapeHtml(assist.manualLabel)}</button>
      </div>
    </section>
  `;
}
