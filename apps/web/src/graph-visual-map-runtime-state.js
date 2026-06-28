import {
  buildGraphVisualMapAdjacencyMap,
  buildGraphVisualMapSelectionState
} from "./graph-visual-map-selection-state.js";

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

  const adjacencyMap = buildGraphVisualMapAdjacencyMap(edges);

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
  const selectionState = buildGraphVisualMapSelectionState({
    graphSelection: graphState.selection,
    layoutNodes: layout.nodes,
    layoutEdges: edges,
    clusterMeta: layout.clusterMeta,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    relationFilterEdges,
    selectionEdges,
    selectionNodeMap,
    layoutNodeMap: layout.nodeMap,
    adjacencyMap
  }, {
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow
  });
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
    ...selectionState,
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
