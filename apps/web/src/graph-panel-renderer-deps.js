export function buildGraphPanelRendererDeps(deps = {}) {
  const {
    escapeHtml,
    renderGraphErrorState,
    renderGraphIsolatedQueue,
    renderGraphIsolatedQueueStrip,
    renderGraphBridgeGapSection,
    renderGraphWeakRelationClueSection,
    renderRelationReviewQueueSection,
    renderGraphAiAnalysisCard,
    renderGraphWorkbenchEntryPills,
    renderGraphWorkbenchPanel,
    renderGraphRelationTypeFilter,
    renderGraphInlineNotice,
    renderGraphVisualMap
  } = deps;

  return {
    escapeHtml,
    renderGraphErrorState,
    renderGraphIsolatedQueue,
    renderGraphIsolatedQueueStrip,
    renderGraphBridgeGapSection,
    renderGraphWeakRelationClueSection,
    renderRelationReviewQueueSection,
    renderGraphAiAnalysisCard,
    renderGraphWorkbenchEntryPills,
    renderGraphWorkbenchPanel,
    renderGraphRelationTypeFilter,
    renderGraphInlineNotice,
    renderGraphVisualMap
  };
}
