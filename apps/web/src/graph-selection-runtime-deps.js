export function buildGraphSelectionDispatcherDeps(host = {}) {
  const {
    renderGraphClusterSelectionPanel,
    renderGraphThemeSelectionPanel,
    renderGraphIsolatedSelectionPanel,
    renderGraphIsolatedCompletePanel,
    renderGraphBridgeSelectionPanel,
    renderGraphNodeSelectionPanel,
    renderGraphEdgeSelectionPanel,
    normalizeGraphSelectionForVisibleItems
  } = host;

  return {
    renderers: {
      renderClusterPanel: renderGraphClusterSelectionPanel,
      renderThemePanel: renderGraphThemeSelectionPanel,
      renderIsolatedPanel: renderGraphIsolatedSelectionPanel,
      renderIsolatedCompletePanel: renderGraphIsolatedCompletePanel,
      renderBridgePanel: renderGraphBridgeSelectionPanel,
      renderNodePanel: renderGraphNodeSelectionPanel,
      renderEdgePanel: renderGraphEdgeSelectionPanel
    },
    deps: {
      normalizeSelection: normalizeGraphSelectionForVisibleItems
    }
  };
}

export function buildGraphNodeSelectionRuntimeDeps(host = {}) {
  const {
    escapeHtml,
    graphRelationStatusCountsAsNetworkEdge,
    graphNodeNeedsRelationWorkflow,
    renderGraphIsolatedSelectionPanel,
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
    aiAnalysisLoading = false
  } = host;

  return {
    escapeHtml,
    graphRelationStatusCountsAsNetworkEdge,
    graphNodeNeedsRelationWorkflow,
    renderGraphIsolatedSelectionPanel,
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
    aiAnalysisLoading
  };
}

export function buildGraphEdgeSelectionRuntimeDeps(host = {}) {
  const {
    escapeHtml,
    graphEdgeSelectionKey,
    graphNodeTitle,
    graphRelationTypeLabel,
    graphRelationGroupMeta,
    graphEdgeReviewMeta,
    graphEdgeAdjustmentPlan,
    graphFocusCardActionMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    renderGraphSelectionMetrics,
    renderGraphPromptDetails,
    renderGraphSelectionShell,
    focusContextMode = "argument",
    relationAdjustmentFocusById = {}
  } = host;

  return {
    escapeHtml,
    graphEdgeSelectionKey,
    graphNodeTitle,
    graphRelationTypeLabel,
    graphRelationGroupMeta,
    graphEdgeReviewMeta,
    graphEdgeAdjustmentPlan,
    graphFocusCardActionMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    renderGraphSelectionMetrics,
    renderGraphPromptDetails,
    renderGraphSelectionShell,
    focusContextMode,
    relationAdjustmentFocusById
  };
}
