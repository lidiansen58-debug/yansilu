import { graphIsolatedJoinNetworkFormModel } from "./graph-isolated-relation-form.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function graphIsolatedDirectRelationEdges(noteId = "", edges = [], { relationStatusCountsAsNetworkEdge = () => true } = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return [];
  return (Array.isArray(edges) ? edges : []).filter((edge) => {
    if (!relationStatusCountsAsNetworkEdge(edge?.status)) return false;
    return String(edge?.fromNoteId || "").trim() === cleanNoteId || String(edge?.toNoteId || "").trim() === cleanNoteId;
  });
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
    heading = "建立一条能说清理由的关系",
    helper = "先选目标笔记，再选关系类型并写下理由。保存后才会进入图谱。",
    saveHint = "保存后，这条笔记会退出“未关联”。",
    relationDraft = null,
    aiCandidates = null,
    manualTargets = null,
    loading = false,
    hasAnalysis = false
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
          return `<option value="${escapeHtml(targetId)}" data-graph-relation-type="${escapeHtml(relationType)}" data-graph-rationale-draft="${escapeHtml(rationaleDraft)}" data-graph-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft || "")}" data-graph-action-source-note="${escapeHtml(actionSourceNoteId)}" data-graph-action-target-note="${escapeHtml(candidate.actionTargetNoteId || candidate.targetNoteId || "")}" data-graph-preview-title="${escapeHtml(targetTitle)}" data-graph-preview-type="${escapeHtml(noteTypeLabel(previewNote.noteType))}" data-graph-preview-text="${escapeHtml(graphNotePreviewText(previewNote))}" data-graph-preview-tags="${escapeHtml(graphNoteTags(previewNote).slice(0, 5).join(","))}"${selected ? " selected" : ""}>${escapeHtml(`${targetTitle} · 相关性 ${percent}%`)}</option>`;
        })
        .filter(Boolean)
        .join("")
    : "";
  const manualOptions = resolvedManualTargets
    .map((target, index) => {
      const label = target.folder ? `${target.title} · ${target.folder}` : target.title;
      const previewNote = graphFullNoteById(target.id, nodeMap) || target;
      const selected = String(target.id || "").trim() === selectedManualTargetNoteId;
      const searchMatch = manualSearchText ? label.toLowerCase().includes(manualSearchText.toLowerCase()) : true;
      const visible = selected || (searchMatch && index < 8);
      const manualRationale = `我确认“${sourceTitle}”和“${target.title}”应该关联，因为：________。`;
      return `<button class="graph-manual-target${selected ? " is-selected" : ""}${visible ? "" : " is-hidden"}" type="button" data-graph-pick-manual-target="${escapeHtml(target.id)}" data-graph-manual-title="${escapeHtml(target.title)}" data-graph-manual-rationale="${escapeHtml(manualRationale)}" data-graph-manual-search-text="${escapeHtml(label.toLowerCase())}" data-graph-preview-title="${escapeHtml(target.title)}" data-graph-preview-type="${escapeHtml(noteTypeLabel(previewNote.noteType))}" data-graph-preview-text="${escapeHtml(graphNotePreviewText(previewNote))}" data-graph-preview-tags="${escapeHtml(graphNoteTags(previewNote).slice(0, 5).join(","))}"${visible ? "" : " hidden"}><strong>${escapeHtml(target.title)}</strong>${target.folder ? `<small>${escapeHtml(target.folder)}</small>` : ""}</button>`;
    })
    .join("");
  const statusText = directEdges.length ? "已有关系" : visibleEdgeCount ? "当前可见" : "未关联";
  const manualStatusText = selectedManualTitle
    ? `已选择：${selectedManualTitle}`
    : manualSearchText
      ? "继续选择一条搜索结果。"
      : "输入关键词，选择一条永久笔记。";
  return `
    <section class="graph-isolated-join" aria-label="建立笔记关系">
      <div class="graph-isolated-join-head">
        <div>
          <strong>${escapeHtml(heading)}</strong>
          <p>${escapeHtml(helper)}</p>
        </div>
        <span>${escapeHtml(statusText)}</span>
      </div>
      <form class="graph-isolated-relation-form" data-graph-isolated-relation-form data-source-note="${escapeHtml(cleanNoteId)}" data-source-title="${escapeHtml(sourceTitle)}">
        <div class="graph-isolated-mode-switch" role="tablist" aria-label="选择目标笔记方式">
          <button class="graph-isolated-workflow-tab${activeMode === "ai" ? " is-active" : ""}" type="button" role="tab" aria-selected="${activeMode === "ai"}" data-graph-isolated-tab="ai" data-graph-isolated-note="${escapeHtml(cleanNoteId)}">AI 推荐</button>
          <button class="graph-isolated-workflow-tab${activeMode === "manual" ? " is-active" : ""}" type="button" role="tab" aria-selected="${activeMode === "manual"}" data-graph-isolated-tab="manual" data-graph-isolated-note="${escapeHtml(cleanNoteId)}">手工搜索</button>
        </div>
        <input type="hidden" data-graph-relation-source-mode value="${escapeHtml(activeMode)}">
        <div class="graph-isolated-target-panel"${activeMode === "ai" ? "" : " hidden"} data-graph-target-panel="ai">
          <label class="graph-isolated-field">
            <span>AI 推荐目标</span>
            <select data-graph-ai-candidate-select data-graph-source-note="${escapeHtml(cleanNoteId)}"${resolvedAiCandidates.length ? "" : " disabled"}>
              ${aiOptions || `<option value="">暂无推荐目标</option>`}
            </select>
          </label>
          <button class="graph-selection-action is-secondary" type="button" data-graph-ai-connect-note="${escapeHtml(cleanNoteId)}"${resolvedLoading ? " disabled" : ""}>${escapeHtml(resolvedLoading ? "正在查找" : resolvedAiCandidates.length ? "重新查找推荐" : "查找推荐")}</button>
          ${!resolvedAiCandidates.length && resolvedHasAnalysis ? `<p class="graph-isolated-helper">当前没有清楚的 AI 推荐，可以切到手工搜索。</p>` : ""}
        </div>
        <div class="graph-isolated-target-panel"${activeMode === "manual" ? "" : " hidden"} data-graph-target-panel="manual">
          <label class="graph-isolated-field">
            <span>手工搜索目标</span>
            <input type="search" data-graph-manual-target-search autocomplete="off" placeholder="输入标题关键词" value="${escapeHtml(manualSearchText)}"${selectedManualTitle ? ` data-selected-title="${escapeHtml(selectedManualTitle)}"` : ""}>
            <input type="hidden" data-graph-manual-target-id value="${escapeHtml(selectedManualTargetNoteId)}">
          </label>
          <div class="graph-manual-target-list" data-graph-manual-target-list>
            ${manualOptions || `<span class="graph-isolated-helper">当前范围没有可关联的其他永久笔记。</span>`}
          </div>
          <p class="graph-isolated-helper" data-graph-manual-target-status>${escapeHtml(manualStatusText)}</p>
        </div>
        <div class="graph-isolated-form-grid">
          <label class="graph-isolated-field">
            <span>关系类型</span>
            <select data-graph-isolated-relation-type data-graph-default-relation-type="${escapeHtml(defaultRelationType)}">${relationFormTypeOptions(defaultRelationType)}</select>
          </label>
          <label class="graph-isolated-field">
            <span>关联理由</span>
            <textarea data-graph-isolated-rationale data-graph-rationale-source="${escapeHtml(defaultRationaleSource)}" rows="4" placeholder="写一句：为什么这两条笔记应该连在一起。">${escapeHtml(defaultRationale)}</textarea>
          </label>
        </div>
        <input type="hidden" data-graph-isolated-insight-question value="${escapeHtml(hasActiveInsightQuestionDraft ? draftInsightQuestion : activeAiCandidate?.insightQuestionDraft || "")}">
        <div class="graph-isolated-form-error" data-graph-isolated-form-error></div>
        <div class="graph-isolated-form-actions">
          <button class="graph-selection-action is-primary" type="button" data-graph-isolated-relation-save>保存关系</button>
          <span>${escapeHtml(saveHint)}</span>
        </div>
      </form>
      ${renderPreviewPanel(cleanNoteId, { nodeMap, preferredTargetNoteId: previewTargetNoteId })}
    </section>
  `;
}
