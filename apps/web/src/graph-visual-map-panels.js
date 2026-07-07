export function buildGraphVisualMapPanelMarkup({
  runtimeState = {},
  questionSpotSummary = null,
  topicCandidates = [],
  isolatedNotes = [],
  bridgeGaps = [],
  clueSummary = null,
  edges = [],
  focusContextEdges = null
} = {}, deps = {}) {
  const {
    renderGraphFocusContextPanel = () => "",
    renderGraphSelectionPanel = () => "",
    renderGraphResearchNavigatorPanel = () => "",
    renderGraphResearchNavigatorEntry = () => ""
  } = deps;
  const {
    normalizedFocusedNoteId = "",
    layout = { nodes: [], nodeMap: new Map(), clusterMeta: [] },
    activeSelection = null,
    contextualSelectionEdges = [],
    contextualNodeMap = new Map(),
    focusContextAvailable = false,
    focusContextCollapsed = false,
    researchNavigatorCanOpen = false
  } = runtimeState;

  const focusContextMarkup = focusContextAvailable && !focusContextCollapsed
    ? renderGraphFocusContextPanel({
        focusedNoteId: normalizedFocusedNoteId,
        nodeMap: layout.nodeMap,
        edges: Array.isArray(focusContextEdges) ? focusContextEdges : edges
    })
    : "";
  const selectionContextMarkup = renderGraphSelectionPanel({
    selection: activeSelection,
    nodeMap: contextualNodeMap,
    edges: contextualSelectionEdges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta: layout.clusterMeta
  });
  const researchNavigatorMarkup = renderGraphResearchNavigatorPanel({
    nodes: layout.nodes,
    edges,
    topicCandidates,
    bridgeGaps,
    clusterMeta: layout.clusterMeta,
    clueSummary,
    questionSummary: questionSpotSummary
  });
  const researchNavigatorEntryMarkup = renderGraphResearchNavigatorEntry(researchNavigatorCanOpen && !selectionContextMarkup);

  return {
    focusContextMarkup,
    selectionContextMarkup,
    researchNavigatorMarkup,
    researchNavigatorEntryMarkup
  };
}
