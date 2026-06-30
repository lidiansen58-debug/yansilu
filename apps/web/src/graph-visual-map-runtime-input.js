export function buildGraphVisualMapLayoutInput({
  nodes = [],
  edges = [],
  relationFilterEdges = [],
  filterActive = false,
  focusedNoteId = "",
  structureFallback = false
} = {}) {
  return {
    nodes,
    edges,
    relationFilterEdges,
    filterActive: filterActive === true,
    focusedNoteId: String(focusedNoteId || "").trim(),
    structureFallback: structureFallback === true
  };
}

export function buildGraphVisualMapSelectionInput({
  graphState = {},
  graphSelection = null,
  layoutState = {},
  edges = [],
  relationFilterEdges = [],
  selectionEdges = null,
  selectionNodeMap = null,
  topicCandidates = [],
  isolatedNotes = [],
  bridgeGaps = []
} = {}) {
  return {
    graphSelection: graphSelection || graphState.selection,
    layoutNodes: layoutState.layout?.nodes || [],
    layoutEdges: edges,
    clusterMeta: layoutState.layout?.clusterMeta || [],
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    relationFilterEdges,
    selectionEdges,
    selectionNodeMap,
    layoutNodeMap: layoutState.layout?.nodeMap || new Map(),
    adjacencyMap: layoutState.adjacencyMap || new Map()
  };
}

export function buildGraphVisualMapControlsInput({
  graphState = {},
  layoutState = {},
  relationType = "meaningful",
  bridgeGaps = [],
  filterActive = false,
  workbenchPanelMarkup = ""
} = {}) {
  return {
    graphState,
    relationType: String(relationType || "meaningful").trim() || "meaningful",
    layout: layoutState.layout || { width: 960, height: 520, nodes: [] },
    visibleEdges: layoutState.visibleEdges || [],
    bridgeGaps,
    filterActive: filterActive === true,
    normalizedFocusedNoteId: layoutState.normalizedFocusedNoteId || "",
    denseGalaxyMode: layoutState.denseGalaxyMode === true,
    workbenchPanelMarkup: String(workbenchPanelMarkup || "")
  };
}

export function buildGraphVisualMapRuntimeInputs(options = {}, { layoutState = {} } = {}) {
  return {
    layoutInput: buildGraphVisualMapLayoutInput(options),
    selectionInput: buildGraphVisualMapSelectionInput({
      ...options,
      layoutState
    }),
    controlsInput: buildGraphVisualMapControlsInput({
      ...options,
      layoutState
    })
  };
}
