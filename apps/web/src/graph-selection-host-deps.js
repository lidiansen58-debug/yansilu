import {
  buildGraphEdgeSelectionRuntimeDeps,
  buildGraphNodeSelectionRuntimeDeps,
  buildGraphSelectionDispatcherDeps
} from "./graph-selection-runtime-deps.js";

export function createGraphSelectionDispatcherRuntime(host = {}) {
  return buildGraphSelectionDispatcherDeps({
    renderGraphClusterSelectionPanel: host.renderGraphClusterSelectionPanel,
    renderGraphThemeSelectionPanel: host.renderGraphThemeSelectionPanel,
    renderGraphIsolatedSelectionPanel: host.renderGraphIsolatedSelectionPanel,
    renderGraphIsolatedCompletePanel: host.renderGraphIsolatedCompletePanel,
    renderGraphBridgeSelectionPanel: host.renderGraphBridgeSelectionPanel,
    renderGraphNodeSelectionPanel: host.renderGraphNodeSelectionPanel,
    renderGraphEdgeSelectionPanel: host.renderGraphEdgeSelectionPanel,
    normalizeGraphSelectionForVisibleItems: host.normalizeGraphSelectionForVisibleItems
  });
}

export function createGraphNodeSelectionRuntimeDeps(host = {}) {
  return buildGraphNodeSelectionRuntimeDeps({
    escapeHtml: host.escapeHtml,
    graphRelationStatusCountsAsNetworkEdge: host.graphRelationStatusCountsAsNetworkEdge,
    graphNodeNeedsRelationWorkflow: host.graphNodeNeedsRelationWorkflow,
    renderGraphIsolatedSelectionPanel: host.renderGraphIsolatedSelectionPanel,
    graphRelationGroupCounts: host.graphRelationGroupCounts,
    graphNodeRoleMeta: host.graphNodeRoleMeta,
    graphNodeInsightMeta: host.graphNodeInsightMeta,
    renderGraphNodeInsightPanel: host.renderGraphNodeInsightPanel,
    renderGraphRelationWorkspaceForNote: host.renderGraphRelationWorkspaceForNote,
    renderGraphAiConnectCandidates: host.renderGraphAiConnectCandidates,
    graphThemeCandidateNoteIdsForNode: host.graphThemeCandidateNoteIdsForNode,
    suggestedThemeIndexTitle: host.suggestedThemeIndexTitle,
    renderGraphSelectionMetrics: host.renderGraphSelectionMetrics,
    renderGraphPromptDetails: host.renderGraphPromptDetails,
    renderGraphSelectionShell: host.renderGraphSelectionShell,
    noteTypeLabel: host.noteTypeLabel,
    aiAnalysisLoading: host.graphState?.aiAnalysisLoading === true
  });
}

export function createGraphEdgeSelectionRuntimeDeps(host = {}) {
  return buildGraphEdgeSelectionRuntimeDeps({
    escapeHtml: host.escapeHtml,
    graphEdgeSelectionKey: host.graphEdgeSelectionKey,
    graphNodeTitle: host.graphNodeTitle,
    graphRelationTypeLabel: host.graphRelationTypeLabel,
    graphRelationGroupMeta: host.graphRelationGroupMeta,
    graphEdgeReviewMeta: host.graphEdgeReviewMeta,
    graphEdgeAdjustmentPlan: host.graphEdgeAdjustmentPlan,
    graphFocusCardActionMeta: host.graphFocusCardActionMeta,
    graphRelationSourceLabel: host.graphRelationSourceLabel,
    graphRelationStatusLabel: host.graphRelationStatusLabel,
    renderGraphSelectionMetrics: host.renderGraphSelectionMetrics,
    renderGraphPromptDetails: host.renderGraphPromptDetails,
    renderGraphSelectionShell: host.renderGraphSelectionShell,
    focusContextMode: host.graphState?.focusContextMode,
    relationAdjustmentFocusById: host.graphState?.relationAdjustmentFocusById
  });
}
