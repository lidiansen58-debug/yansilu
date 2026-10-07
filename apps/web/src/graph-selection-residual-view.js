import { renderGraphBridgeSelectionPanelView } from "./graph-bridge-selection-panel.js";

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
    resolveGraphBridgeSelection,
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

function renderGraphBridgeSelectionPanel({ selection = null, bridgeGaps = [], nodeMap = new Map(), edges = [] } = {}) {
  const bridge = resolveGraphBridgeSelection(selection, bridgeGaps, [...nodeMap.values()]);
  if (!bridge) return "";
  return renderGraphBridgeSelectionPanelView({ bridge, nodeMap, edges }, {
    renderGraphSelectionShell, graphFullNoteById, graphEdgeSelectionKey
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
  return renderGraphClusterSelectionPanelView({ selection, clusterMeta, nodeMap, edges, disclosureState: graphState.sectionOpen || {} }, {
    normalizeGraphSelectionForVisibleItems,
    graphUniqueClusterMeta,
    graphClusterResearchMeta,
    escapeHtml,
    renderGraphSelectionShell
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
    renderGraphIsolatedSelectionPanel,
    renderGraphIsolatedCompletePanel,
    renderGraphBridgeSelectionPanel,
    graphUniqueClusterMeta,
    graphClusterResearchMeta,
    renderGraphClusterSelectionPanel,
    graphResearchNavigatorState,
    renderGraphResearchNavigatorPanel,
    renderGraphSelectionPanel
  };
}
