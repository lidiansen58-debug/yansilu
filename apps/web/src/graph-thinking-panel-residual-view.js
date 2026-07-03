export function createGraphThinkingPanelResidualView(deps = {}) {
  const {
    GRAPH_CONFIRMABLE_RELATION_TYPES,
    GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES,
    computeGraphDirectNetworkEdgeCount,
    computeGraphManualRelationTargetsForNote,
    computeGraphThemeCandidateNoteIdsForNode,
    buildGraphWorkspaceRenderDeps,
    renderGraphRelationWorkspaceMarkup,
    renderGraphThemeIndexWorkspaceMarkup,
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationGroupCounts,
    graphNodeTitle,
    suggestedThemeIndexTitle,
    graphEdgeSelectionKey,
    graphRelationTypeLabel,
    renderGraphSelectionMetrics,
    escapeHtml,
    noteTypeLabel,
    graphState,
    state,
    graphAiRelationCandidatesForNote,
    graphAiAnalysisPayload,
    graphFullNoteById,
    graphNotePreviewText,
    graphNoteTags,
    graphRelationRationaleIsActionable,
    graphRelationSaveResultForNote,
    graphAiConfidenceLabel,
    graphPotentialRelationNeedsConfirmation,
    graphCandidateEvidenceText,
    renderGraphCandidateReviewRows,
    graphBlockedAiRelationPairKeysForNote,
    graphMergeRelationCandidatesForDisplay,
    graphLocalRelationCandidatesForNote,
    renderGraphAiConnectCandidates,
    graphRelationFormTypeOptions,
    renderGraphIsolatedPreviewPanel,
    renderGraphIsolatedJoinNetworkFlowHtml,
    renderGraphIsolatedNextStepActionsHtml,
    clearGraphIsolatedRelationDraftForState,
    createGraphRelationSaveController,
    createGraphRelationWorkflowController,
    createGraphIsolatedRelationController,
    createGraphIsolatedWorkflowShellRenderer,
    createGraphIsolatedDecisionController,
    createNoteRelation,
    refreshDirectoryGraph,
    renderGraphPanel,
    setStatus,
    openGraphSelection,
    openNote,
    saveNote,
    graphComputedIsolatedNotesForGraph,
    graphIsolatedQueueItemsForGraph,
    graphMarkIsolatedNodesForGraph,
    computeGraphNextIsolatedQueueItem,
    computeGraphNoteIdFromIsolatedItem,
    renderGraphIsolatedQueueHtml,
    renderGraphIsolatedQueueStripHtml,
    writeStoredText,
    document,
    $,
    renderGraphClusterSelectionPanelView,
    computeGraphUniqueClusterMeta,
    computeGraphClusterResearchMeta,
    computeGraphResearchNavigatorState,
    renderGraphResearchNavigatorPanelView,
    createGraphSelectionPanelRenderer,
    renderGraphThemeSelectionPanel,
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow,
    graphNodeRoleMeta,
    graphNodeInsightMeta,
    renderGraphNodeInsightPanel,
    renderGraphRelationWorkspaceForNote,
    renderGraphPromptDetails,
    renderGraphSelectionShell,
    graphRelationGroupMeta,
    graphEdgeReviewMeta,
    graphEdgeAdjustmentPlan,
    graphFocusCardActionMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    renderRelationReviewQueueSectionView,
    computeGraphPendingAiCandidateCount,
    createGraphThinkingModelRuntimeDepsProvider,
    graphAiAnalysisSummaryStateForGraph,
    graphLiveAiAnalysisCountsForGraph,
    buildGraphQuestionSpotSummaryForGraph,
    computeGraphQuestionSpotSummaryFromItems,
    computeGraphSelectEdgeActionAttrs = () => "",
    buildGraphThinkingItemsForGraph,
    computeGraphThinkingNoteTitle,
    computeGraphThinkingCleanIds,
    graphThinkingHighlightAttrsForItem,
    renderGraphMapPreviewView,
    renderGraphThinkingItemsView,
    renderGraphWorkbenchPriorityQueueView,
    renderGraphThinkingReviewNoteView,
    renderGraphThinkingPanelContentView,
    renderGraphThinkingPanelView,
    renderGraphWorkbenchPanelView,
    renderGraphUtilityDrawerView,
    graphRelationQualityLabel,
    graphRelationReviewReasonLabel,
    graphBridgeSelectionKey,
    graphCandidateCanSaveRelation,
    graphCandidateEndpointIds,
    graphComputedIsolatedNotes,
    graphExistingRelationPairKeys,
    graphIsolatedQueueItems,
    graphIsolatedSelectionKey,
    graphLocalizedActionText,
    graphNoteHasSavedIsolationDisposition,
    graphNoteIdFromIsolatedItem,
    graphPreferredPotentialRelationType,
    graphRankThemeCandidates,
    graphRelationPairKey,
    graphThemeSelectionKey,
    graphEdgeMatchesFilters,
    writingKnownNoteById,
    isWritingEligibleNote,
    graphWritingCandidateNoteIds,
    GRAPH_CONFLICT_RELATION_TYPES,
  } = deps;
function renderRelationReviewQueueSection(reviewQueue, options = {}) {
  return renderRelationReviewQueueSectionView(reviewQueue, options, {
    escapeHtml,
    graphEdgeSelectionKey,
    graphRelationGroupMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    graphRelationTypeLabel
  });
}
function renderGraphMetricCard(label, value, note, tone = "") {
  return `
    <div class="graph-metric-card" data-tone="${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}
function graphPendingAiCandidateCount(candidates = [], { existingRelationPairKeys = new Set(), excludePairs = new Set(), bridgeOnly = false, excludeBridge = false } = {}) {
  return computeGraphPendingAiCandidateCount(candidates, { existingRelationPairKeys, excludePairs, bridgeOnly, excludeBridge });
}
const graphThinkingModelRuntimeDeps = createGraphThinkingModelRuntimeDepsProvider(() => ({
    escapeHtml,
    graphAiAnalysisPayload,
    graphBridgeSelectionKey,
    graphCandidateCanSaveRelation,
    graphCandidateEndpointIds,
    graphCandidateTouchesNodeScope,
    graphComputedIsolatedNotes,
    graphExistingRelationPairKeys,
    graphFullNoteById,
    graphIsolatedQueueItems,
    graphIsolatedSelectionKey,
    graphLocalizedActionText,
    graphNodeIdsInScope,
    graphNoteHasSavedIsolationDisposition,
    graphNoteIdFromIsolatedItem,
    graphPendingAiCandidateCount,
    graphPreferredPotentialRelationType,
    graphRankThemeCandidates,
    graphRelationPairKey,
    graphRelationQualityLabel,
    graphRelationReviewReasonLabel,
    graphRelationTypeLabel,
    graphSelectEdgeActionAttrs,
    graphThemeSelectionKey
}));
function graphLiveAiAnalysisCounts(aiAnalysis = graphState.aiAnalysis, { nodes = null, edges = null } = {}) {
  return graphLiveAiAnalysisCountsForGraph(aiAnalysis, { nodes, edges, graph: graphState.item || {} }, graphThinkingModelRuntimeDeps());
}
function graphAiAnalysisSummaryState(options = {}) {
  return graphAiAnalysisSummaryStateForGraph({ aiAnalysis: graphState.aiAnalysis, graph: graphState.item || {}, ...options }, graphThinkingModelRuntimeDeps());
}
function currentGraphVisibleNodeIds() {
  if (state.module === "graph" && state.graphVisibleNoteIdsReady === true && state.graphVisibleNoteIds instanceof Set) {
    return [...state.graphVisibleNoteIds];
  }
  const graph = graphState.item;
  if (!graph) return [];
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const allEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const filters = graphState.filters || { relationType: "all", status: "all" };
  const edges = allEdges.filter((edge) => graphEdgeMatchesFilters(edge, filters));
  const filterActive = filters.relationType !== "all" || filters.status !== "all";
  const visibleNodeIds = new Set(edges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  return (filterActive ? nodes.filter((node) => visibleNodeIds.has(node.id)) : nodes).map((node) => node.id);
}
function currentGraphWritingCandidateNoteIds() {
  return graphWritingCandidateNoteIds(currentGraphVisibleNodeIds(), {
    noteLookup: writingKnownNoteById,
    isEligible: isWritingEligibleNote
  });
}
function renderGraphMapPreview(nodes = [], edges = [], linkedNodeIds = new Set()) {
  return renderGraphMapPreviewView(nodes, edges, linkedNodeIds, {
    escapeHtml,
    graphRelationGroupMeta,
    graphRelationTypeLabel
  });
}
function renderGraphAiAnalysisCard(options = {}) {
  const { analysis, summary, pendingCount, topicCount, relationCount, bridgeCount, isolatedCount, totalCandidates } = graphAiAnalysisSummaryState(options);
  const loading = graphState.aiAnalysisLoading;
  const error = graphState.aiAnalysisError;
  const shouldOpen = options.open === true || loading || Boolean(error);
  return `
    <details class="graph-section graph-collapsible-section" data-graph-section="ai-analysis"${shouldOpen ? " open" : analysis ? "" : ""} aria-label="AI 图谱初判">
      <summary class="graph-collapsible-summary">
        <div>
          <div class="graph-section-title">AI 图谱初判</div>
          <div class="graph-section-note">只生成待确认推荐：主题、缺少连接、弱关系和待关联笔记都不会直接写入图谱。</div>
        </div>
        <span class="graph-collapsible-badge">${loading ? "分析中" : `${totalCandidates} 项`}</span>
      </summary>
      <div class="graph-collapsible-body">
        <div class="graph-section-head">
          <div></div>
          <button class="secondary-btn small" type="button" data-run-graph-ai-analysis ${loading ? "disabled" : ""}>
            ${loading ? "分析中..." : analysis ? "重新分析" : "AI 扫描"}
          </button>
        </div>
        ${
          error
            ? `<div class="graph-empty bad">AI 图谱初判失败：${escapeHtml(error)}</div>`
            : analysis
              ? `
                <div class="graph-metrics" aria-label="AI 图谱初判摘要">
                  ${renderGraphMetricCard("待确认项", pendingCount, "当前图谱内处理", pendingCount ? "warn" : "good")}
                  ${renderGraphMetricCard("可写主题推荐", topicCount, "确认后才会保存", topicCount ? "warn" : "good")}
                  ${renderGraphMetricCard("关系推荐", relationCount, "不会自动建边", relationCount ? "warn" : "good")}
                  ${renderGraphMetricCard("可能相关/孤岛", `${bridgeCount}/${isolatedCount}`, "优先补还没说清的连接", bridgeCount + isolatedCount ? "warn" : "good")}
                </div>
                <div class="graph-next-card">
                  <strong>确认顺序</strong>
                  <small>${escapeHtml(
                    pendingCount
                      ? "先在图谱里判断结构是否成立；只确认能说清理由的关系或主题。"
                      : "当前没有新的图谱推荐。"
                  )}</small>
                </div>
              `
              : `<div class="graph-empty">运行一次本地图谱扫描，查看可能的主题、缺少连接和待关联笔记。</div>`
        }
      </div>
    </details>
  `;
}
function buildGraphQuestionSpotSummary({ reviewQueueTotal = 0, bridgeGaps = [], conflictCount = 0, aiAnalysis = null, nodes = null, edges = null } = {}) {
  return buildGraphQuestionSpotSummaryForGraph({ reviewQueueTotal, bridgeGaps, conflictCount, aiAnalysis, nodes, edges, graph: graphState.item || {} }, graphThinkingModelRuntimeDeps());
}
function buildGraphQuestionSpotSummaryFromItems(items = [], { artifactCount = 0 } = {}) {
  return computeGraphQuestionSpotSummaryFromItems(items, { artifactCount });
}
function renderGraphQuestionSpotChip(summary = {}) {
  const total = Number(summary?.total || 0);
  const open = graphState.thinkingPanelOpen === true;
  const empty = !total;
  return `
    <div class="graph-question-chip-wrap${open ? " is-open" : ""}${empty ? " is-empty" : ""}">
      <button class="graph-question-chip${open ? " is-open" : ""}${empty ? " is-empty" : ""}" type="button" data-graph-thinking-toggle aria-expanded="${open}" aria-label="${empty ? "打开追问并运行图谱扫描" : "打开追问"}">
        ${renderGraphIcon("question")}
        <span>${escapeHtml(summary?.label || "暂无追问")}</span>
        <small>${escapeHtml(summary?.detail || "当前范围暂时没有明显的待追问结构。")}</small>
      </button>
      <button class="graph-overlay-close graph-question-chip-close" type="button" data-graph-thinking-hide aria-label="关闭追问" title="关闭追问">${renderGraphIcon("close")}</button>
    </div>
  `;
}
function graphThinkingFilterMeta(value = "all") {
  const key = String(value || "all").trim().toLowerCase();
  if (key === "theme") return { key: "theme", label: "主题", note: "只看可能形成可写主题的聚集。" };
  if (key === "organize") return { key: "organize", label: "整理", note: "只看孤立、桥接、关系确认和错位推荐理由。" };
  return { key: "all", label: "全部", note: "按优先级列出当前最值得继续判断的地方。" };
}
function graphCompactActionLabel(label = "查看") {
  const text = String(label || "查看").trim() || "查看";
  if (/补.*理由/.test(text)) return "补理由";
  if (/桥接|确认|评估|判断|核对|整理|改类型|拆分/.test(text)) return "判断";
  if (/关联/.test(text)) return "关联";
  if (/查看/.test(text)) return "查看";
  return text.length > 4 ? text.slice(0, 4) : text;
}
function graphThinkingNoteTitle(nodeMap = new Map(), id = "", fallback = "相关笔记") {
  return computeGraphThinkingNoteTitle(nodeMap, id, fallback);
}
function graphThinkingCleanIds(values = []) {
  return computeGraphThinkingCleanIds(values);
}
function graphThinkingHighlightAttrs(item = {}) {
  return graphThinkingHighlightAttrsForItem(item, {
    escapeHtml,
    cleanIds: graphThinkingCleanIds,
    edgeSelectionKey: graphEdgeSelectionKey
  });
}
function graphSelectEdgeActionAttrs(edge = {}) {
  return computeGraphSelectEdgeActionAttrs(edge, { escape: escapeHtml });
}
function buildGraphThinkingItems({ nodes = [], edges = [], bridgeGaps = [], reviewQueue = null, conflictItems = [], conflictingRelations = [], aiAnalysis = null, isolatedNotes = [], nodeLookupMap = null } = {}) {
  return buildGraphThinkingItemsForGraph({
    nodes,
    edges,
    bridgeGaps,
    reviewQueue,
    conflictItems,
    conflictingRelations,
    aiAnalysis,
    isolatedNotes,
    nodeLookupMap
  }, graphThinkingModelRuntimeDeps());
}
function graphNodeIdsInScope(nodes = []) {
  return new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean));
}
function graphRelationInNodeScope(edge = {}, nodeIds = new Set()) {
  const fromId = String(edge?.fromNoteId || edge?.source?.id || "").trim();
  const toId = String(edge?.toNoteId || edge?.target?.id || "").trim();
  return Boolean(fromId && toId && nodeIds.has(fromId) && nodeIds.has(toId));
}
function graphRelationTouchesNodeScope(edge = {}, nodeIds = new Set()) {
  const fromId = String(edge?.fromNoteId || edge?.source?.id || "").trim();
  const toId = String(edge?.toNoteId || edge?.target?.id || "").trim();
  return Boolean((fromId && nodeIds.has(fromId)) || (toId && nodeIds.has(toId)));
}
function graphCandidateTouchesNodeScope(candidate = {}, nodeIds = new Set()) {
  if (!nodeIds?.size) return true;
  const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
  return Boolean((sourceNoteId && nodeIds.has(sourceNoteId)) || (targetNoteId && nodeIds.has(targetNoteId)));
}
function graphBridgeGapInNodeScope(gap = {}, nodeIds = new Set()) {
  const sourceIds = graphThinkingCleanIds(gap?.noteIds);
  const targetIds = graphThinkingCleanIds(gap?.targetNoteIds);
  if (!sourceIds.length || sourceIds.some((id) => !nodeIds.has(id))) return false;
  return !targetIds.length || targetIds.some((id) => nodeIds.has(id));
}
function graphConflictItemInNodeScope(item = {}, nodeIds = new Set()) {
  const itemIds = graphThinkingCleanIds(
    Array.isArray(item?.noteIds) && item.noteIds.length
      ? item.noteIds
      : Array.isArray(item?.notes)
        ? item.notes.map((note) => note?.id)
        : []
  );
  return !itemIds.length || itemIds.some((id) => nodeIds.has(id));
}
function graphReviewQueueInNodeScope(reviewQueue = null, nodeIds = new Set()) {
  if (!reviewQueue || typeof reviewQueue !== "object") return reviewQueue;
  const items = (Array.isArray(reviewQueue.items) ? reviewQueue.items : []).filter((item) => graphRelationInNodeScope(item, nodeIds));
  return {
    ...reviewQueue,
    total: items.length,
    items,
    summary: items.length === Number(reviewQueue.total || 0) ? reviewQueue.summary : null
  };
}
function graphMergeRelationsByKey(...groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const edge of Array.isArray(group) ? group : []) {
      const key = String(edge?.id || `${edge?.fromNoteId || ""}->${edge?.toNoteId || ""}:${edge?.relationType || ""}`).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(edge);
    }
  }
  return merged;
}
function renderGraphThinkingItems(items = [], filter = "all") {
  return renderGraphThinkingItemsView(items, filter, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}
function renderGraphWorkbenchPriorityQueue(items = [], activeKey = "questions") {
  return renderGraphWorkbenchPriorityQueueView(items, activeKey, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}
function renderGraphThinkingReviewNote(summary = {}) {
  return renderGraphThinkingReviewNoteView(summary, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}
function renderGraphThinkingPanelContent({ summary = {}, items = [], includeSummary = true } = {}) {
  return renderGraphThinkingPanelContentView({ summary, items, includeSummary }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });}
function renderGraphThinkingPanel({ summary = {}, items = [] } = {}) {
  return renderGraphThinkingPanelView({ summary, items }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}

function renderGraphWorkbenchPanel({ clueSummary = {}, questionSummary = {}, clueSectionsMarkup = "", thinkingItems = [], isolatedQueueMarkup = "" } = {}) {
  return renderGraphWorkbenchPanelView({ clueSummary, questionSummary, clueSectionsMarkup, thinkingItems, isolatedQueueMarkup }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}
function renderGraphUtilityDrawer(options = {}) {
  return renderGraphUtilityDrawerView(options, {
    escapeHtml,
    graphAiAnalysisSummaryState,
    renderGraphIcon
  });
}
function graphSummaryModeNote(relationType = "all") {
  const key = String(relationType || "all").trim().toLowerCase();
  if (key === "meaningful") return "先看有解释力的关系。";
  if (key === "all") return "展开全部关系。";
  if (key === "noisy") return "只看链接提示。";
  if (key === "index") return "只看主题归属。";
  return `只看${graphRelationTypeLabel(key)}。`;
}
  return {
    renderRelationReviewQueueSection,
    renderGraphMetricCard,
    graphPendingAiCandidateCount,
    graphLiveAiAnalysisCounts,
    graphAiAnalysisSummaryState,
    currentGraphVisibleNodeIds,
    currentGraphWritingCandidateNoteIds,
    renderGraphMapPreview,
    renderGraphAiAnalysisCard,
    buildGraphQuestionSpotSummary,
    buildGraphQuestionSpotSummaryFromItems,
    renderGraphQuestionSpotChip,
    graphThinkingFilterMeta,
    graphCompactActionLabel,
    graphThinkingNoteTitle,
    graphThinkingCleanIds,
    graphThinkingHighlightAttrs,
    graphSelectEdgeActionAttrs,
    buildGraphThinkingItems,
    graphNodeIdsInScope,
    graphRelationInNodeScope,
    graphRelationTouchesNodeScope,
    graphCandidateTouchesNodeScope,
    graphBridgeGapInNodeScope,
    graphConflictItemInNodeScope,
    graphReviewQueueInNodeScope,
    graphMergeRelationsByKey,
    renderGraphThinkingItems,
    renderGraphWorkbenchPriorityQueue,
    renderGraphThinkingReviewNote,
    renderGraphThinkingPanelContent,
    renderGraphThinkingPanel,
    renderGraphWorkbenchPanel,
    renderGraphUtilityDrawer,
    graphSummaryModeNote
  };
}
