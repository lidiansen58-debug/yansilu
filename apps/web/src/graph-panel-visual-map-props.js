export function renderGraphPanelFocusedToolbar(panelState = {}, deps = {}) {
  const {
    renderGraphRelationTypeFilter = () => ""
  } = deps;

  if (!panelState.showingFocusedNote) return "";
  return `
      <div class="graph-canvas-toolbar">
        <div class="graph-canvas-toolbar-spacer" aria-hidden="true"></div>
        <div class="graph-canvas-toolbar-actions">
          ${renderGraphRelationTypeFilter(panelState.focused?.edges || [], panelState.effectiveRelationType, false, panelState.focusedRelationTypeStats)}
        </div>
      </div>
    `;
}

export function buildGraphPanelVisualMapProps(panelState = {}, {
  workbenchPanelMarkup = "",
  workbenchEntryMarkup = "",
  isolatedQueueStripMarkup = "",
  toolbarMarkup = ""
} = {}) {
  const focused = panelState.focused || {};

  return {
    nodes: panelState.visualNodes,
    edges: panelState.edges,
    relationFilterEdges: focused.edges,
    selectionEdges: panelState.scopedNetworkEdges,
    selectionNodeMap: panelState.graphRelationTargetNodeMap,
    filterActive: Boolean(panelState.showingFocusedNote),
    focusedNoteId: focused.focusedNoteId,
    relationType: panelState.effectiveRelationType,
    questionSpotSummary: panelState.questionSpotSummary,
    topicCandidates: panelState.topicCandidates,
    isolatedNotes: panelState.isolatedNotes,
    bridgeGaps: panelState.bridgeGaps,
    clueSummary: panelState.clueSummary,
    workbenchPanelMarkup,
    workbenchEntryMarkup,
    isolatedQueueStripMarkup,
    toolbarMarkup,
    structureFallback: panelState.structureFallback
  };
}
