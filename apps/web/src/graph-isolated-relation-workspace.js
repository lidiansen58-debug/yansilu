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
    heading = "关联",
    helper = "",
    saveHint = "保存后进入关系网。",
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
    relationFormTypeOptions = () => ""
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
    selectedManualTargetNoteId,
    selectedManualTitle,
    manualSearchText,
    defaultRelationType,
    defaultRationale,
    defaultRationaleSource,
    hasActiveInsightQuestionDraft,
    draftInsightQuestion,
    aiCandidates: resolvedAiCandidates,
    manualTargets: resolvedManualTargets,
    directEdges,
    hasAnalysis: resolvedHasAnalysis,
    loading: resolvedLoading
  } = model;
  const reversibleRelationTypes = deps.reversibleRelationTypes || new Set();
  const aiItems = resolvedAiCandidates.length
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
          const selected = targetId === selectedManualTargetNoteId;
          const reason = String(candidate.rationaleDraft || candidate.coarseReasons?.[0] || candidate.reason || "").trim();
          return `<button class="graph-manual-target${selected ? " is-selected" : ""}" type="button" data-graph-pick-manual-target="${escapeHtml(targetId)}" data-graph-manual-title="${escapeHtml(targetTitle)}" data-graph-manual-relation-type="${escapeHtml(relationType)}" data-graph-manual-rationale="${escapeHtml(rationaleDraft)}" data-graph-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft || "")}" data-graph-action-source-note="${escapeHtml(actionSourceNoteId)}" data-graph-action-target-note="${escapeHtml(candidate.actionTargetNoteId || candidate.targetNoteId || "")}" data-graph-preview-title="${escapeHtml(targetTitle)}" data-graph-preview-type="${escapeHtml(noteTypeLabel(previewNote.noteType))}" data-graph-preview-text="${escapeHtml(graphNotePreviewText(previewNote))}" data-graph-preview-tags="${escapeHtml(graphNoteTags(previewNote).slice(0, 5).join(","))}"><span>推荐 ${escapeHtml(`${percent}%`)}</span><strong>${escapeHtml(targetTitle)}</strong>${reason ? `<small>${escapeHtml(reason)}</small>` : ""}</button>`;
        })
        .filter(Boolean)
        .join("")
    : "";
  const visibleManualTargetLimit = 8;
  let visibleManualTargetCount = 0;
  const manualOptions = resolvedManualTargets
    .map((target, index) => {
      const label = target.folder ? `${target.title} - ${target.folder}` : target.title;
      const previewNote = graphFullNoteById(target.id, nodeMap) || target;
      const selected = String(target.id || "").trim() === selectedManualTargetNoteId;
      const searchMatch = manualSearchText ? label.toLowerCase().includes(manualSearchText.toLowerCase()) : false;
      const visible = selected || (searchMatch && visibleManualTargetCount < visibleManualTargetLimit);
      if (visible && searchMatch) visibleManualTargetCount += 1;
      return `<button class="graph-manual-target${selected ? " is-selected" : ""}${visible ? "" : " is-hidden"}" type="button" data-graph-pick-manual-target="${escapeHtml(target.id)}" data-graph-manual-title="${escapeHtml(target.title)}" data-graph-manual-rationale="" data-graph-manual-search-text="${escapeHtml(label.toLowerCase())}" data-graph-preview-title="${escapeHtml(target.title)}" data-graph-preview-type="${escapeHtml(noteTypeLabel(previewNote.noteType))}" data-graph-preview-text="${escapeHtml(graphNotePreviewText(previewNote))}" data-graph-preview-tags="${escapeHtml(graphNoteTags(previewNote).slice(0, 5).join(","))}"${visible ? "" : " hidden"}><strong>${escapeHtml(target.title)}</strong>${target.folder ? `<small>${escapeHtml(target.folder)}</small>` : ""}</button>`;
    })
    .join("");
  const manualStatusText = selectedManualTitle
    ? `已选择：${selectedManualTitle}`
    : manualSearchText
      ? "点一条结果。"
    : "输入关键词。";
  return `
    <section class="graph-isolated-join" aria-label="建立笔记关系">
      <div class="graph-isolated-join-grid">
        <div class="graph-isolated-join-main">
          <form class="graph-isolated-relation-form" data-graph-isolated-relation-form${isolatedFlow ? " data-graph-isolated-flow" : ""} data-source-note="${escapeHtml(cleanNoteId)}" data-source-title="${escapeHtml(sourceTitle)}">
            <input type="hidden" data-graph-relation-source-mode value="manual">
            <div class="graph-isolated-target-panel" data-graph-target-panel="manual">
              <label class="graph-isolated-field is-search-first graph-isolated-search-row">
                <span>找目标笔记</span>
                <input type="search" data-graph-manual-target-search autocomplete="off" autofocus placeholder="输入关键词，选择要关联的笔记" value="${escapeHtml(manualSearchText)}"${selectedManualTitle ? ` data-selected-title="${escapeHtml(selectedManualTitle)}"` : ""}>
                <button class="graph-relation-search-action" type="button" data-graph-isolated-relation-save>关联</button>
                <input type="hidden" data-graph-manual-target-id value="${escapeHtml(selectedManualTargetNoteId)}">
              </label>
              ${aiItems ? `
                <div class="graph-target-section" data-graph-target-results="recommendations"${manualSearchText || selectedManualTargetNoteId ? " hidden" : ""}>
                  <div class="graph-target-section-head">
                    <strong>推荐</strong>
                  </div>
                  <div class="graph-manual-target-list" data-graph-ai-candidate-list>
                    ${aiItems}
                  </div>
                </div>
              ` : ""}
              <div class="graph-target-section" data-graph-target-results="search"${!manualSearchText || selectedManualTargetNoteId ? " hidden" : ""}>
                <div class="graph-manual-target-list" data-graph-manual-target-list>
                  ${manualOptions}
                </div>
              </div>
            </div>
            <div class="graph-isolated-form-grid">
              <label class="graph-isolated-field">
                <span>关系类型</span>
                <select data-graph-isolated-relation-type data-graph-default-relation-type="${escapeHtml(defaultRelationType)}">${relationFormTypeOptions(defaultRelationType)}</select>
              </label>
              <label class="graph-isolated-field">
                <span>关联理由</span>
                <textarea data-graph-isolated-rationale data-graph-rationale-source="${escapeHtml(defaultRationaleSource)}" rows="4" placeholder="写一句话：当前笔记如何支持、限定、反驳、举例或桥接目标笔记。">${escapeHtml(defaultRationale)}</textarea>
              </label>
            </div>
            <input type="hidden" data-graph-isolated-insight-question value="${escapeHtml(hasActiveInsightQuestionDraft ? draftInsightQuestion : "")}">
            <div class="graph-isolated-form-error" data-graph-isolated-form-error></div>
          </form>
        </div>
      </div>
    </section>
  `;
}
