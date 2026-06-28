export function buildGraphWorkspaceRenderDeps(host = {}) {
  return {
    relationStatusCountsAsNetworkEdge: host.graphRelationStatusCountsAsNetworkEdge,
    relationGroupCounts: host.graphRelationGroupCounts,
    nodeTitle: host.graphNodeTitle,
    suggestThemeIndexTitle: host.suggestedThemeIndexTitle,
    edgeSelectionKey: host.graphEdgeSelectionKey,
    relationTypeLabel: host.graphRelationTypeLabel,
    renderSelectionMetrics: host.renderGraphSelectionMetrics
  };
}

export function buildGraphThinkingModelRuntimeDeps(host = {}) {
  return {
    escapeHtml: host.escapeHtml,
    graphAiAnalysisPayload: host.graphAiAnalysisPayload,
    graphBridgeSelectionKey: host.graphBridgeSelectionKey,
    graphCandidateCanSaveRelation: host.graphCandidateCanSaveRelation,
    graphCandidateEndpointIds: host.graphCandidateEndpointIds,
    graphCandidateTouchesNodeScope: host.graphCandidateTouchesNodeScope,
    graphComputedIsolatedNotes: host.graphComputedIsolatedNotes,
    graphExistingRelationPairKeys: host.graphExistingRelationPairKeys,
    graphFullNoteById: host.graphFullNoteById,
    graphIsolatedQueueItems: host.graphIsolatedQueueItems,
    graphIsolatedSelectionKey: host.graphIsolatedSelectionKey,
    graphLocalizedActionText: host.graphLocalizedActionText,
    graphNodeIdsInScope: host.graphNodeIdsInScope,
    graphNoteHasSavedIsolationDisposition: host.graphNoteHasSavedIsolationDisposition,
    graphNoteIdFromIsolatedItem: host.graphNoteIdFromIsolatedItem,
    graphPendingAiCandidateCount: host.graphPendingAiCandidateCount,
    graphPreferredPotentialRelationType: host.graphPreferredPotentialRelationType,
    graphRankThemeCandidates: host.graphRankThemeCandidates,
    graphRelationPairKey: host.graphRelationPairKey,
    graphRelationQualityLabel: host.graphRelationQualityLabel,
    graphRelationReviewReasonLabel: host.graphRelationReviewReasonLabel,
    graphRelationTypeLabel: host.graphRelationTypeLabel,
    graphSelectEdgeActionAttrs: host.graphSelectEdgeActionAttrs,
    graphThemeSelectionKey: host.graphThemeSelectionKey
  };
}

export function createGraphThinkingModelRuntimeDepsProvider(hostProvider = () => ({})) {
  return () => buildGraphThinkingModelRuntimeDeps(hostProvider());
}
