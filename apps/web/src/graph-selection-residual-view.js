export function createGraphSelectionResidualView(deps = {}) {
  const {
    GRAPH_CONFIRMABLE_RELATION_TYPES,
    GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES,
    computeGraphDirectNetworkEdgeCount,
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
    graphThemeCandidateNoteIdsForNode,
    graphRelationFormTypeOptions,
    graphCandidatePercent,
    graphManualRelationTargetsForNote,
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
    renderGraphIsolatedJoinNetworkFlow = renderGraphIsolatedJoinNetworkFlowHtml,
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
    graphRelationVisual = () => ({ key: "neutral" }),
    graphEdgeAdjustmentPlan,
    graphIsolatedWorkflowShell,
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
    graphCandidateTouchesNodeScope,
    graphComputedIsolatedNotes,
    graphExistingRelationPairKeys,
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
    graphSelectEdgeActionAttrs,
    graphThemeSelectionKey,
    graphRelationInNodeScope,
    graphRelationTouchesNodeScope,
    graphBridgeGapInNodeScope,
    graphConflictItemInNodeScope,
    graphReviewQueueInNodeScope,
    graphEdgeMatchesFilters,
    writingKnownNoteById,
    isWritingEligibleNote,
    graphWritingCandidateNoteIds,
    GRAPH_CONFLICT_RELATION_TYPES,
  } = deps;

function renderGraphIsolatedSelectionPanel({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {
  return graphIsolatedWorkflowShell.renderSelectionPanel({ selection, isolatedNotes, nodeMap, edges });
}

function renderGraphIsolatedCompletePanel({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {
  const noteId = String(selection?.noteId || selection?.nodeId || "").trim();
  return graphIsolatedWorkflowShell.renderCompletePanel({
    selection: {
      ...selection,
      saveResult: graphRelationSaveResultForNote(noteId, graphState.isolatedRelationSaveResultByNoteId)
    },
    isolatedNotes,
    nodeMap,
    edges
  });
}

function renderGraphRelationFormSelectionPanel({ selection = null, nodeMap = new Map(), edges = [] } = {}) {
  const noteId = String(selection?.noteId || selection?.nodeId || "").trim();
  if (!noteId) return "";
  const note = graphFullNoteById(noteId, nodeMap) || {};
  const title = graphNodeTitle(nodeMap, noteId, note.title || "当前笔记");
  const targetNoteId = String(selection?.targetNoteId || "").trim();
  const targetTitle = targetNoteId ? graphNodeTitle(nodeMap, targetNoteId, targetNoteId) : "";
  const returnTo = String(selection?.returnTo || "").trim().toLowerCase();
  const savesIntoIsolatedFlow = returnTo === "isolated";
  const visibleEdgeCount = computeGraphDirectNetworkEdgeCount(noteId, edges, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge
  });
  return renderGraphSelectionShell({
    className: "is-node is-relation-form",
    ariaLabel: "建立笔记关系",
    kicker: "建立关系",
    title,
    meta: targetTitle ? `预选目标：${targetTitle}` : "这条永久笔记还没有进入关系网",
    closeLabel: "收起关系表单",
    body: renderGraphIsolatedJoinNetworkFlow(noteId, {
      nodeMap,
      edges,
      visibleEdgeCount,
      preferredTargetNoteId: targetNoteId,
      preferredRelationType: selection?.relationType || "",
      preferredRationale: selection?.rationale || "",
      heading: targetTitle ? "确认这条关系" : "建立关系",
      helper: targetTitle
        ? "目标笔记已带入；选关系类型，写一句理由后保存。"
        : "先用 AI 推荐或手动搜索选择目标，再选关系类型，写一句理由后保存。",
      saveHint: savesIntoIsolatedFlow
        ? "保存后这条笔记会退出未关联状态，并自动进入下一条。"
        : "保存后会留在当前图谱。",
      isolatedFlow: savesIntoIsolatedFlow
    }),
    actions: ""
  });
}

function renderGraphBridgeSelectionPanel({ selection = null, bridgeGaps = [], nodeMap = new Map() } = {}) {
  const bridge = resolveGraphBridgeSelection(selection, bridgeGaps, [...nodeMap.values()]);
  if (!bridge) return "";
  const noteId = bridge.noteId;
  const targetNoteId = bridge.targetNoteId;
  const targetTitle = bridge.targetTitle || (targetNoteId ? graphNodeTitle(nodeMap, targetNoteId, targetNoteId) : "");
  const item = bridge.item || {};
  const gapTypeLabel = bridge.gapType === "disconnected_cluster" ? "断开的主题群" : "缺少连接";
  const detail = String(item?.suggestedAction || item?.rationale || "这条笔记可能需要一条中间判断，才能回到当前结构。").trim();
  const prompts = [
    targetTitle ? `它和「${targetTitle}」之间缺的是证据、限定、反方，还是一个中间概念？` : "它应当保持独立，还是只是缺少一条能说明理由的连接？",
    "如果补上这条连接，图谱会产生新的论证路径，还是只是多一条导航线？",
    "这条连接应该写成概念过渡、方法相似，还是问题延伸？"
  ];
  return renderGraphSelectionShell({
    className: "is-bridge",
    ariaLabel: "缺少连接判断详情",
    kicker: "缺少连接",
    title: bridge.title,
    meta: targetTitle ? `建议连接到 ${targetTitle}` : "等待判断连接方向",
    closeLabel: "收起缺少连接判断",
    roleLabel: gapTypeLabel,
    roleDetail: detail,
    body: `
      <div class="graph-selection-metrics" aria-label="桥接两端">
        ${renderGraphSelectionMetrics([
          { label: "源笔记", value: bridge.title },
          { label: "目标", value: targetTitle || "待寻找" },
          { label: "状态", value: "推荐，未确认" }
        ])}
      </div>
      ${renderGraphPromptDetails("缺少什么连接（可选）", prompts)}`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(noteId)}"${targetNoteId ? ` data-graph-target-note="${escapeHtml(targetNoteId)}"` : ""} data-graph-relation-type="bridges"${noteId ? "" : " disabled"}>在这里建立关系</button>
      <button class="graph-selection-action is-quiet" type="button" data-open-note="${escapeHtml(noteId)}"${noteId ? "" : " disabled"}>打开源笔记</button>`
  });
}

function graphUniqueClusterMeta(clusterMeta = []) {
  return computeGraphUniqueClusterMeta(clusterMeta);
}

function graphClusterResearchMeta(cluster = {}, { nodeMap = new Map(), edges = [] } = {}) {
  return computeGraphClusterResearchMeta(cluster, { nodeMap, edges }, {
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationVisual
  });
}

function renderGraphClusterSelectionPanel({ selection = null, clusterMeta = [], nodeMap = new Map(), edges = [] } = {}) {
  return renderGraphClusterSelectionPanelView({ selection, clusterMeta, nodeMap, edges }, {
    normalizeGraphSelectionForVisibleItems,
    graphUniqueClusterMeta,
    graphClusterResearchMeta,
    escapeHtml,
    renderGraphSelectionShell,
    renderGraphSelectionMetrics,
    renderGraphThemeIndexWorkspace: renderGraphThemeIndexWorkspaceMarkup,
    renderGraphPromptDetails
  });
}

function graphResearchNavigatorState({ nodes = [], edges = [], topicCandidates = [], bridgeGaps = [], clusterMeta = [], clueSummary = null, questionSummary = null } = {}) {
  return computeGraphResearchNavigatorState({ nodes, edges, topicCandidates, bridgeGaps, clusterMeta, clueSummary, questionSummary }, {
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationVisual
  });
}

function renderGraphResearchNavigatorPanel({ nodes = [], edges = [], topicCandidates = [], bridgeGaps = [], clusterMeta = [], clueSummary = null, questionSummary = null } = {}) {
  const nav = graphResearchNavigatorState({ nodes, edges, topicCandidates, bridgeGaps, clusterMeta, clueSummary, questionSummary });
  return renderGraphResearchNavigatorPanelView({ nav }, {
    escapeHtml,
    renderGraphIcon,
    renderGraphSelectionMetrics
  });
}

const graphSelectionPanelRenderer = createGraphSelectionPanelRenderer(() => ({
  escapeHtml,
  renderGraphClusterSelectionPanel,
  renderGraphThemeSelectionPanel,
  renderGraphIsolatedSelectionPanel,
  renderGraphIsolatedCompletePanel,
  renderGraphRelationFormSelectionPanel,
  renderGraphBridgeSelectionPanel,
  normalizeGraphSelectionForVisibleItems,
  graphRelationStatusCountsAsNetworkEdge,
  graphNodeNeedsRelationWorkflow,
  graphRelationGroupCounts,
  graphNodeRoleMeta,
  graphNodeInsightMeta,
  renderGraphNodeInsightPanel,
  renderGraphRelationWorkspaceForNote,
  renderGraphAiConnectCandidates,
  graphThemeCandidateNoteIdsForNode,
  suggestedThemeIndexTitle,
  renderGraphSelectionMetrics,
  renderGraphPromptDetails,
  renderGraphSelectionShell,
  noteTypeLabel,
  graphState,
  graphEdgeSelectionKey,
  graphNodeTitle,
  graphRelationTypeLabel,
  graphRelationGroupMeta,
  graphEdgeReviewMeta,
  graphEdgeAdjustmentPlan,
  graphFocusCardActionMeta,
  graphRelationSourceLabel,
  graphRelationStatusLabel
}));
const {
  renderGraphSelectionPanel
} = graphSelectionPanelRenderer;



  return {
    graphUniqueClusterMeta,
    graphClusterResearchMeta,
    renderGraphClusterSelectionPanel,
    graphResearchNavigatorState,
    renderGraphResearchNavigatorPanel,
    renderGraphSelectionPanel
  };
}
