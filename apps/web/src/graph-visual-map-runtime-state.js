function defaultSet(values = []) {
  return new Set((Array.isArray(values) ? values : []).filter(Boolean));
}

export function buildGraphVisualMapRuntimeState({
  graphState = {},
  nodes = [],
  edges = [],
  relationFilterEdges = [],
  selectionEdges = null,
  selectionNodeMap = null,
  filterActive = false,
  focusedNoteId = "",
  relationType = "meaningful",
  topicCandidates = [],
  isolatedNotes = [],
  bridgeGaps = [],
  workbenchPanelMarkup = "",
  structureFallback = false
} = {}, deps = {}) {
  const {
    graphFocusDepthMeta = (value) => ({ key: value || "1", label: value || "1", note: "" }),
    graphReadingModeMeta = (value) => ({ key: value || "argument", label: value || "" }),
    graphViewModeForRelationType = (value) => value || "argument",
    graphBuildVisualLayout = (inputNodes = [], inputEdges = []) => ({
      nodes: inputNodes,
      edges: inputEdges,
      width: 960,
      height: 520,
      nodeMap: new Map(inputNodes.map((node) => [node?.id, node])),
      clusterMeta: []
    }),
    graphZoomOption = (value) => ({ key: value || "fit", scale: 1 }),
    graphReadingLensMeta = (value) => ({ key: value || "overview" }),
    graphEdgePath = () => "",
    graphRelationVisual = () => ({ key: "neutral" }),
    graphDenseGalaxyMode = () => false,
    shouldShowGraphDensityHint = () => false,
    normalizeGraphSelectionForVisibleItems = (selection) => selection,
    graphNodeNeedsRelationWorkflow = () => false,
    graphBuildReadingLensState = () => ({ active: false }),
    zoomOptions = {},
    relationGroupMeta = {}
  } = deps;

  const normalizedFocusedNoteId = String(focusedNoteId || "").trim();
  const focusDepth = graphFocusDepthMeta(graphState.focusDepth);
  const modeMeta = graphReadingModeMeta(graphViewModeForRelationType(relationType));
  const layout = graphBuildVisualLayout(nodes, edges, { focusedNoteId: normalizedFocusedNoteId });
  const zoom = graphZoomOption(graphState.zoom);
  const expanded = graphState.expanded === true;
  const readingLens = graphReadingLensMeta(graphState.readingLens);
  const zoomWidth = Math.round(layout.width * zoom.scale);
  const zoomHeight = Math.round(layout.height * zoom.scale);

  const adjacencyMap = new Map();
  edges.forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (!fromId || !toId) return;
    if (!adjacencyMap.has(fromId)) adjacencyMap.set(fromId, new Set());
    if (!adjacencyMap.has(toId)) adjacencyMap.set(toId, new Set());
    adjacencyMap.get(fromId).add(toId);
    adjacencyMap.get(toId).add(fromId);
  });

  const visibleEdges = edges
    .map((edge) => {
      const connectsFocus =
        normalizedFocusedNoteId &&
        (String(edge?.fromNoteId || "").trim() === normalizedFocusedNoteId ||
          String(edge?.toNoteId || "").trim() === normalizedFocusedNoteId);
      return {
        edge,
        path: graphEdgePath(edge, layout.nodeMap),
        visual: graphRelationVisual(edge?.relationType),
        connectsFocus
      };
    })
    .filter((item) => item.path);

  const denseDirectoryMode = !filterActive;
  const denseGalaxyMode = graphDenseGalaxyMode({
    nodes: layout.nodes,
    edges,
    filterActive
  });
  const showDensityHint = shouldShowGraphDensityHint({ dense: layout.nodes.length > 120, filterActive });
  const compactRelationFilterStats = structureFallback
    ? {
        structureFallback: true,
        totalCount: relationFilterEdges.length,
        meaningfulCount: edges.length,
        indexCount: 0
      }
    : null;
  const legendOpen = graphState.legendOpen === true;
  const activeSelection = normalizeGraphSelectionForVisibleItems(graphState.selection, {
    nodes: layout.nodes,
    edges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta: layout.clusterMeta
  });
  const contextualSelectionEdges = Array.isArray(selectionEdges) ? selectionEdges : Array.isArray(relationFilterEdges) ? relationFilterEdges : edges;
  const contextualNodeMap = selectionNodeMap instanceof Map ? selectionNodeMap : layout.nodeMap;
  const selectionNodeNeedsRelationWorkflow =
    activeSelection?.kind === "node" && graphNodeNeedsRelationWorkflow(activeSelection.nodeId, contextualSelectionEdges, contextualNodeMap);
  const selectedNodeId = activeSelection?.kind === "node" && !selectionNodeNeedsRelationWorkflow ? activeSelection.nodeId : "";
  const selectedNodeNeighborhood = new Set(selectedNodeId ? [selectedNodeId, ...(adjacencyMap.get(selectedNodeId) || [])] : []);
  const selectedEdgeKey = activeSelection?.kind === "edge" ? activeSelection.edgeKey : "";
  const selectedThemeNoteIds = defaultSet(activeSelection?.kind === "theme" ? activeSelection.noteIds || [] : []);
  const selectedIsolatedNodeId =
    activeSelection?.kind === "isolated" ? activeSelection.noteId : selectionNodeNeedsRelationWorkflow ? activeSelection.nodeId : "";
  const selectedBridgeNoteIds = defaultSet(
    activeSelection?.kind === "bridge" ? [activeSelection.noteId, activeSelection.targetNoteId].map((id) => String(id || "").trim()) : []
  );
  const legendGroups = ["support", "conflict", "boundary", "bridge", "flow", "neutral", "index"]
    .map((key) => {
      const meta = relationGroupMeta[key];
      return meta ? { key, className: `is-${key}`, ...meta } : null;
    })
    .filter(Boolean);
  const zoomKeys = Object.keys(zoomOptions || {});
  const zoomIndex = Math.max(0, zoomKeys.indexOf(zoom.key));
  const focusContextAvailable = filterActive && normalizedFocusedNoteId;
  const focusContextCollapsed = graphState.focusContextCollapsed === true;
  const readingLensState = graphBuildReadingLensState({
    nodes: layout.nodes,
    visibleEdges,
    bridgeGaps,
    lens: readingLens.key
  });
  const researchNavigatorAutoHidden = denseGalaxyMode && graphState.researchNavigatorTouched !== true;
  const researchNavigatorHidden = graphState.researchNavigatorHidden === true || researchNavigatorAutoHidden;
  const researchNavigatorCanOpen = !filterActive && researchNavigatorHidden !== true && !workbenchPanelMarkup;

  return {
    normalizedFocusedNoteId,
    focusDepth,
    modeMeta,
    layout,
    zoom,
    expanded,
    readingLens,
    zoomWidth,
    zoomHeight,
    adjacencyMap,
    visibleEdges,
    denseDirectoryMode,
    denseGalaxyMode,
    showDensityHint,
    compactRelationFilterStats,
    legendOpen,
    activeSelection,
    contextualSelectionEdges,
    contextualNodeMap,
    selectionNodeNeedsRelationWorkflow,
    selectedNodeId,
    selectedNodeNeighborhood,
    selectedEdgeKey,
    selectedThemeNoteIds,
    selectedIsolatedNodeId,
    selectedBridgeNoteIds,
    legendGroups,
    zoomKeys,
    zoomIndex,
    focusContextAvailable,
    focusContextCollapsed,
    readingLensState,
    researchNavigatorAutoHidden,
    researchNavigatorHidden,
    researchNavigatorCanOpen
  };
}
