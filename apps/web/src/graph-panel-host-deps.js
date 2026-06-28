import {
  buildGraphPanelRuntimeDeps
} from "./graph-panel-runtime-deps.js";

export function buildGraphPanelPrototypeHostDeps(host = {}) {
  return {
    syncGraphDisclosureState: host.syncGraphDisclosureState,
    syncAllNoteRelationNetworkStatuses: host.syncAllNoteRelationNetworkStatuses,
    buildGraphPanelState: host.buildGraphPanelState,
    renderGraphPanelForRuntime: host.renderGraphPanelForRuntime,
    graphRelationStatusCountsAsNetworkEdge: host.graphRelationStatusCountsAsNetworkEdge,
    graphScopedItems: host.graphScopedItems,
    normalizeGraphRelationTypeFilter: host.normalizeGraphRelationTypeFilter,
    graphEdgeMatchesFilters: host.graphEdgeMatchesFilters,
    graphFocusedItems: host.graphFocusedItems,
    graphNodeIdsInScope: host.graphNodeIdsInScope,
    graphRelationTouchesNodeScope: host.graphRelationTouchesNodeScope,
    graphRelationInNodeScope: host.graphRelationInNodeScope,
    graphRelationVisual: host.graphRelationVisual,
    graphMergeRelationsByKey: host.graphMergeRelationsByKey,
    graphConflictItemInNodeScope: host.graphConflictItemInNodeScope,
    graphReviewQueueInNodeScope: host.graphReviewQueueInNodeScope,
    graphBridgeGapInNodeScope: host.graphBridgeGapInNodeScope,
    graphHasMeaningfulStructureEdges: host.graphHasMeaningfulStructureEdges,
    graphStructureFallbackEdges: host.graphStructureFallbackEdges,
    graphComputedIsolatedNotes: host.graphComputedIsolatedNotes,
    graphMarkIsolatedNodes: host.graphMarkIsolatedNodes,
    graphBuildIsolatedVisualNodes: host.graphBuildIsolatedVisualNodes,
    graphBuildFocusedRelationTypeStats: host.graphBuildFocusedRelationTypeStats,
    normalizeGraphSelectionForVisibleItems: host.normalizeGraphSelectionForVisibleItems,
    formatClockTime: host.formatClockTime,
    graphPotentialRelationNodeMap: host.graphPotentialRelationNodeMap,
    graphWeakRelationClues: host.graphWeakRelationClues,
    graphClueSummaryState: host.graphClueSummaryState,
    buildGraphThinkingItems: host.buildGraphThinkingItems,
    buildGraphQuestionSpotSummaryFromItems: host.buildGraphQuestionSpotSummaryFromItems,
    graphIsolatedQueueItems: host.graphIsolatedQueueItems,
    escapeHtml: host.escapeHtml,
    renderGraphErrorState: host.renderGraphErrorState,
    renderGraphIsolatedQueue: host.renderGraphIsolatedQueue,
    renderGraphIsolatedQueueStrip: host.renderGraphIsolatedQueueStrip,
    renderGraphBridgeGapSection: host.renderGraphBridgeGapSection,
    renderGraphWeakRelationClueSection: host.renderGraphWeakRelationClueSection,
    renderRelationReviewQueueSection: host.renderRelationReviewQueueSection,
    renderGraphAiAnalysisCard: host.renderGraphAiAnalysisCard,
    renderGraphWorkbenchEntryPills: host.renderGraphWorkbenchEntryPills,
    renderGraphWorkbenchPanel: host.renderGraphWorkbenchPanel,
    renderGraphRelationTypeFilter: host.renderGraphRelationTypeFilter,
    renderGraphInlineNotice: host.renderGraphInlineNotice,
    renderGraphVisualMap: host.renderGraphVisualMap
  };
}

export function createGraphPanelPrototypeRuntimeDepsProvider(hostProvider = () => ({})) {
  return () => buildGraphPanelRuntimeDeps(buildGraphPanelPrototypeHostDeps(hostProvider()));
}
