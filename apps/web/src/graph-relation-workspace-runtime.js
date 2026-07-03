export function createGraphRelationWorkspaceRuntime(deps = {}) {
  const {
    GRAPH_CONFIRMABLE_RELATION_TYPES,
    GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES,
    computeGraphCandidatePercent,
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

function graphWorkspaceRenderDeps() {
  return buildGraphWorkspaceRenderDeps({
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationGroupCounts,
    graphNodeTitle,
    suggestedThemeIndexTitle,
    graphEdgeSelectionKey,
    graphRelationTypeLabel,
    renderGraphSelectionMetrics
  });
}

function graphThemeCandidateNoteIdsForNode(noteId = "", directEdges = [], aiCandidates = []) {
  return computeGraphThemeCandidateNoteIdsForNode(noteId, directEdges, aiCandidates);
}

function renderGraphRelationWorkspaceForNote(noteId = "", { nodeMap = new Map(), edges = [], title = "关联整理" } = {}) {
  return renderGraphRelationWorkspaceMarkup(noteId, { nodeMap, edges, title, deps: graphWorkspaceRenderDeps() });
}

function renderGraphThemeIndexWorkspace(noteIds = [], { title = "可写主题推荐", relationCount = 0, tone = "" } = {}) {
  return renderGraphThemeIndexWorkspaceMarkup(noteIds, { title, relationCount, tone, deps: graphWorkspaceRenderDeps() });
}

const GRAPH_RELATION_FORM_TYPES = ["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"];

function graphRelationFormTypeOptions(selectedType = "associated_with") {
  const selected = String(selectedType || "associated_with").trim().toLowerCase() || "associated_with";
  return GRAPH_RELATION_FORM_TYPES.map(
    (type) => `<option value="${escapeHtml(type)}"${type === selected ? " selected" : ""}>${escapeHtml(graphRelationTypeLabel(type))}</option>`
  ).join("");
}

function graphCandidatePercent(candidate = {}) {
  return computeGraphCandidatePercent(candidate);
}

function graphManualRelationTargetsForNote(noteId = "", { nodeMap = new Map(), edges = [], limit = 80 } = {}) {
  return computeGraphManualRelationTargetsForNote(
    noteId,
    { nodeMap, edges, limit },
    { relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge }
  );
}



  return {
    graphWorkspaceRenderDeps,
    graphThemeCandidateNoteIdsForNode,
    renderGraphRelationWorkspaceForNote,
    renderGraphThemeIndexWorkspace,
    graphRelationFormTypeOptions,
    graphCandidatePercent,
    graphManualRelationTargetsForNote
  };
}
