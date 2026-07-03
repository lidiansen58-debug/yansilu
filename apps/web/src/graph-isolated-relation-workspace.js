import { graphIsolatedJoinNetworkFormModel } from "./graph-isolated-relation-form.js";
import { graphDirectNetworkEdgesForNote } from "./graph-relation-state-query.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function graphIsolatedDirectRelationEdges(noteId = "", edges = [], { relationStatusCountsAsNetworkEdge = () => true } = {}) {
  return graphDirectNetworkEdgesForNote(noteId, edges, { relationStatusCountsAsNetworkEdge });
}

export function graphIsolatedJoinNetworkWorkspaceModel(
  noteId = "",
  {
    nodeMap = new Map(),
    edges = [],
    preferredTargetNoteId = "",
    preferredRelationType = "",
    preferredRationale = "",
    relationDraft = null,
    aiCandidates = null,
    manualTargets = null,
    loading = false,
    hasAnalysis = false
  } = {},
  {
    aiCandidatesForNote = () => [],
    manualTargetsForNote = () => [],
    aiAnalysisPayload = () => null,
    relationDraftForNote = () => ({}),
    relationStatusCountsAsNetworkEdge = () => true,
    workflowTabKey = (value) => String(value || "").trim().toLowerCase() || "ai",
    activeTabForNote = () => "ai",
    reversibleRelationTypes = new Set(),
    nodeTitle = (_nodeMap, id, fallback = "") => fallback || id
  } = {}
) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return null;
  const safeAiCandidates = Array.isArray(aiCandidates)
    ? aiCandidates
    : aiCandidatesForNote(cleanNoteId, { nodeMap, edges, limit: 3 });
  const safeManualTargets = Array.isArray(manualTargets)
    ? manualTargets
    : manualTargetsForNote(cleanNoteId, { nodeMap, edges, limit: 500 });
  const payload = aiAnalysisPayload() || {};
  const resolvedHasAnalysis = Boolean(hasAnalysis || payload.analysisMode || payload.relationCandidates || payload.bridgeCandidates);
  const safeRelationDraft = relationDraft && typeof relationDraft === "object" ? relationDraft : relationDraftForNote(cleanNoteId) || {};
  const formModel = graphIsolatedJoinNetworkFormModel(
    cleanNoteId,
    {
      nodeMap,
      preferredTargetNoteId,
      preferredRelationType,
      preferredRationale,
      relationDraft: safeRelationDraft,
      aiCandidates: safeAiCandidates,
      manualTargets: safeManualTargets,
      loading,
      hasAnalysis: resolvedHasAnalysis
    },
    {
      workflowTabKey,
      activeTabForNote,
      reversibleRelationTypes,
      nodeTitle
    }
  );
  return {
    cleanNoteId,
    aiCandidates: safeAiCandidates,
    manualTargets: safeManualTargets,
    relationDraft: safeRelationDraft,
    loading: Boolean(loading),
    hasAnalysis: resolvedHasAnalysis,
    directEdges: graphIsolatedDirectRelationEdges(cleanNoteId, edges, { relationStatusCountsAsNetworkEdge }),
    ...formModel
  };
}

export function renderGraphIsolatedJoinNetworkFlowHtml(
  noteId = "",
  {
    nodeMap = new Map(),
    edges = [],
    visibleEdgeCount = 0,
    preferredTargetNoteId = "",
    preferredRelationType = "",
    preferredRationale = "",
    heading = "这条永久笔记还没有进入关系网",
    helper = "先用 AI 推荐或手动搜索选择目标，再选关系类型，写一句理由后保存。",
    saveHint = "保存后这条笔记会退出未关联状态，并自动进入下一条。",
    relationDraft = null,
    aiCandidates = null,
    manualTargets = null,
    loading = false,
    hasAnalysis = false,
    isolatedFlow = true
  } = {},
  deps = {}
) {
  const {
    escapeHtml = defaultEscapeHtml,
    candidatePercent = () => 45,
    graphFullNoteById = () => null,
    noteTypeLabel = (value = "") => value || "永久笔记",
    graphNotePreviewText = (note = {}) => note.summary || note.title || "",
    graphNoteTags = (note = {}) => Array.isArray(note.tags) ? note.tags : [],
    relationFormTypeOptions = () => "",
    renderPreviewPanel = () => ""
  } = deps;
  const model = graphIsolatedJoinNetworkWorkspaceModel(
    noteId,
    {
      nodeMap,
      edges,
      preferredTargetNoteId,
      preferredRelationType,
      preferredRationale,
      relationDraft,
      aiCandidates,
      manualTargets,
      loading,
      hasAnalysis
    },
    deps
  );
  if (!model) return "";
  const {
    cleanNoteId,
    sourceTitle,
    activeMode,
    activeAiCandidate,
    activeAiTargetNoteId,
    selectedManualTargetNoteId,
    selectedManualTitle,
    manualSearchText,
    defaultRelationType,
    defaultRationale,
    defaultRationaleSource,
    previewTargetNoteId,
    hasActiveInsightQuestionDraft,
    draftInsightQuestion,
    aiCandidates: resolvedAiCandidates,
    manualTargets: resolvedManualTargets,
    directEdges,
    hasAnalysis: resolvedHasAnalysis,
    loading: resolvedLoading
  } = model;
  const reversibleRelationTypes = deps.reversibleRelationTypes || new Set();
  const aiOptions = resolvedAiCandidates.length
    ? resolvedAiCandidates
        .map((candidate, index) => {
          const targetId = String(candidate.counterpartNoteId || "").trim();
          if (!targetId || targetId === cleanNoteId) return "";
          const targetTitle = String(candidate.counterpartTitle || candidate.targetTitle || targetId).trim() || targetId;
          const percent = candidatePercent(candidate);
          const rawRelationType = String(candidate.relationType || "associated_with").trim().toLowerCase() || "associated_with";
          const actionSourceNoteId = String(candidate.actionSourceNoteId || candidate.sourceNoteId || "").trim();
          const relationType =
            !actionSourceNoteId || actionSourceNoteId === cleanNoteId || reversibleRelationTypes.has(rawRelationType)
              ? rawRelationType
              : "associated_with";
          const rationaleDraft = relationType === rawRelationType ? String(candidate.rationaleDraft || "").trim() : "";
          const previewNote = graphFullNoteById(targetId, nodeMap) || {};
          const selected = activeMode === "ai" ? targetId === activeAiTargetNoteId : index === 0;
          const reason = String(candidate.rationaleDraft || candidate.coarseReasons?.[0] || candidate.reason || "").trim();
          const optionLabel = reason
            ? `${targetTitle} - ${percent}% - ${reason}`
            : `${targetTitle} - ${percent}%`;
          return `<option value="${escapeHtml(targetId)}" data-graph-relation-type="${escapeHtml(relationType)}" data-graph-rationale-draft="${escapeHtml(rationaleDraft)}" data-graph-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft || "")}" data-graph-action-source-note="${escapeHtml(actionSourceNoteId)}" data-graph-action-target-note="${escapeHtml(candidate.actionTargetNoteId || candidate.targetNoteId || "")}" data-graph-preview-title="${escapeHtml(targetTitle)}" data-graph-preview-type="${escapeHtml(noteTypeLabel(previewNote.noteType))}" data-graph-preview-text="${escapeHtml(graphNotePreviewText(previewNote))}" data-graph-preview-tags="${escapeHtml(graphNoteTags(previewNote).slice(0, 5).join(","))}"${selected ? " selected" : ""}>${escapeHtml(optionLabel)}</option>`;
        })
        .filter(Boolean)
        .join("")
    : "";
  const visibleManualTargetLimit = 5;
  const manualOptions = resolvedManualTargets
    .map((target, index) => {
      const label = target.folder ? `${target.title} - ${target.folder}` : target.title;
      const previewNote = graphFullNoteById(target.id, nodeMap) || target;
      const selected = String(target.id || "").trim() === selectedManualTargetNoteId;
      const searchMatch = manualSearchText ? label.toLowerCase().includes(manualSearchText.toLowerCase()) : true;
      const visible = selected || (searchMatch && index < visibleManualTargetLimit);
      return `<button class="graph-manual-target${selected ? " is-selected" : ""}${visible ? "" : " is-hidden"}" type="button" data-graph-pick-manual-target="${escapeHtml(target.id)}" data-graph-manual-title="${escapeHtml(target.title)}" data-graph-manual-rationale="" data-graph-manual-search-text="${escapeHtml(label.toLowerCase())}" data-graph-preview-title="${escapeHtml(target.title)}" data-graph-preview-type="${escapeHtml(noteTypeLabel(previewNote.noteType))}" data-graph-preview-text="${escapeHtml(graphNotePreviewText(previewNote))}" data-graph-preview-tags="${escapeHtml(graphNoteTags(previewNote).slice(0, 5).join(","))}"${visible ? "" : " hidden"}><strong>${escapeHtml(target.title)}</strong>${target.folder ? `<small>${escapeHtml(target.folder)}</small>` : ""}</button>`;
    })
    .join("");
  const manualMoreOptions = resolvedManualTargets
    .slice(visibleManualTargetLimit)
    .map((target) => {
      const label = target.folder ? `${target.title} - ${target.folder}` : target.title;
      const previewNote = graphFullNoteById(target.id, nodeMap) || target;
      const selected = String(target.id || "").trim() === selectedManualTargetNoteId;
      return `<button class="graph-manual-target${selected ? " is-selected" : ""}" type="button" data-graph-pick-manual-target="${escapeHtml(target.id)}" data-graph-manual-title="${escapeHtml(target.title)}" data-graph-manual-rationale="" data-graph-manual-search-text="${escapeHtml(label.toLowerCase())}" data-graph-preview-title="${escapeHtml(target.title)}" data-graph-preview-type="${escapeHtml(noteTypeLabel(previewNote.noteType))}" data-graph-preview-text="${escapeHtml(graphNotePreviewText(previewNote))}" data-graph-preview-tags="${escapeHtml(graphNoteTags(previewNote).slice(0, 5).join(","))}"><strong>${escapeHtml(target.title)}</strong>${target.folder ? `<small>${escapeHtml(target.folder)}</small>` : ""}</button>`;
    })
    .join("");
  const hiddenManualCount = Math.max(0, resolvedManualTargets.length - visibleManualTargetLimit);
  const statusText = directEdges.length ? "已进入关系网" : visibleEdgeCount ? "当前图谱可见" : "还未进入关系网";
  const manualStatusText = selectedManualTitle
    ? `已选择：${selectedManualTitle}`
    : manualSearchText
      ? "继续选择一条搜索结果。"
    : "先搜索标题或关键词；完整列表已折叠，避免从大列表里盲选。";
  return `
    <section class="graph-isolated-join" aria-label="建立笔记关系">
      <div class="graph-isolated-join-head">
        <div>
          <strong>${escapeHtml(heading)}</strong>
          <p>${escapeHtml(helper)}</p>
        </div>
        <span>${escapeHtml(statusText)}</span>
      </div>
      <form class="graph-isolated-relation-form" data-graph-isolated-relation-form${isolatedFlow ? " data-graph-isolated-flow" : ""} data-source-note="${escapeHtml(cleanNoteId)}" data-source-title="${escapeHtml(sourceTitle)}">
        <div class="graph-isolated-mode-switch" role="tablist" aria-label="选择目标笔记方式">
          <button class="graph-isolated-workflow-tab${activeMode === "ai" ? " is-active" : ""}" type="button" role="tab" aria-selected="${activeMode === "ai"}" data-graph-isolated-tab="ai" data-graph-isolated-note="${escapeHtml(cleanNoteId)}">推荐目标</button>
          <button class="graph-isolated-workflow-tab${activeMode === "manual" ? " is-active" : ""}" type="button" role="tab" aria-selected="${activeMode === "manual"}" data-graph-isolated-tab="manual" data-graph-isolated-note="${escapeHtml(cleanNoteId)}">搜索目标</button>
        </div>
        <input type="hidden" data-graph-relation-source-mode value="${escapeHtml(activeMode)}">
        <div class="graph-isolated-target-panel"${activeMode === "ai" ? "" : " hidden"} data-graph-target-panel="ai">
          <label class="graph-isolated-field">
             <span>先看 3 个推荐目标</span>
             <select data-graph-ai-candidate-select data-graph-source-note="${escapeHtml(cleanNoteId)}"${resolvedAiCandidates.length ? "" : " disabled"}>
               ${aiOptions || `<option value="">暂时没有可靠推荐</option>`}
             </select>
           </label>
          <div class="graph-isolated-target-actions">
            <button class="graph-selection-action is-secondary" type="button" data-graph-ai-connect-note="${escapeHtml(cleanNoteId)}"${resolvedLoading ? " disabled" : ""}>${escapeHtml(resolvedLoading ? "正在查找" : resolvedAiCandidates.length ? "刷新推荐" : "查找推荐")}</button>
            <button class="graph-selection-action is-secondary" type="button" data-graph-isolated-tab="manual" data-graph-isolated-note="${escapeHtml(cleanNoteId)}">改用搜索</button>
          </div>
          <p class="graph-isolated-helper">${escapeHtml(resolvedAiCandidates.length ? "推荐优先来自当前图谱和本地规则；保存前仍要确认关系类型和理由。" : resolvedHasAnalysis ? "暂时没有足够可靠的推荐，可以改用搜索。" : "先查找推荐，或直接搜索你确定相关的笔记。")}</p>
        </div>
        <div class="graph-isolated-target-panel"${activeMode === "manual" ? "" : " hidden"} data-graph-target-panel="manual">
          <label class="graph-isolated-field">
            <span>搜索目标笔记</span>
            <input type="search" data-graph-manual-target-search autocomplete="off" placeholder="输入标题关键词，找到要关联的永久笔记" value="${escapeHtml(manualSearchText)}"${selectedManualTitle ? ` data-selected-title="${escapeHtml(selectedManualTitle)}"` : ""}>
            <input type="hidden" data-graph-manual-target-id value="${escapeHtml(selectedManualTargetNoteId)}">
          </label>
          <div class="graph-manual-target-list" data-graph-manual-target-list>
            ${manualOptions || `<span class="graph-isolated-helper">当前范围没有可关联的其他永久笔记。</span>`}
          </div>
          ${hiddenManualCount ? `<details class="graph-manual-target-more"><summary>查看完整候选列表（还有 ${escapeHtml(hiddenManualCount)} 条）</summary><p>继续输入关键词会优先缩小结果；完整列表只用于确认目标，不建议从头浏览。</p><div class="graph-manual-target-list">${manualMoreOptions}</div></details>` : ""}
          <p class="graph-isolated-helper" data-graph-manual-target-status>${escapeHtml(manualStatusText)}</p>
        </div>
        <div class="graph-isolated-form-grid">
          <label class="graph-isolated-field">
            <span>关系类型</span>
            <select data-graph-isolated-relation-type data-graph-default-relation-type="${escapeHtml(defaultRelationType)}">${relationFormTypeOptions(defaultRelationType)}</select>
          </label>
          <label class="graph-isolated-field">
            <span>关联理由</span>
            <textarea data-graph-isolated-rationale data-graph-rationale-source="${escapeHtml(defaultRationaleSource)}" rows="4" placeholder="写一句理由，例如：这条笔记为目标笔记提供例子、限制或反例。">${escapeHtml(defaultRationale)}</textarea>
          </label>
        </div>
        <input type="hidden" data-graph-isolated-insight-question value="${escapeHtml(hasActiveInsightQuestionDraft ? draftInsightQuestion : activeAiCandidate?.insightQuestionDraft || "")}">
        <div class="graph-isolated-form-error" data-graph-isolated-form-error></div>
        <div class="graph-isolated-form-actions">
          <button class="graph-selection-action is-primary" type="button" data-graph-isolated-relation-save>保存并处理下一条</button>
          <span>${escapeHtml(saveHint)}</span>
        </div>
      </form>
      ${renderPreviewPanel(cleanNoteId, { nodeMap, preferredTargetNoteId: previewTargetNoteId })}
    </section>
  `;
}
