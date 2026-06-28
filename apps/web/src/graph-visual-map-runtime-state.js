import {
  buildGraphVisualMapAdjacencyMap,
  buildGraphVisualMapSelectionState
} from "./graph-visual-map-selection-state.js";
import {
  buildGraphVisualMapControlsState
} from "./graph-visual-map-controls-state.js";

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
  const layout = graphBuildVisualLayout(nodes, edges, { focusedNoteId: normalizedFocusedNoteId });

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
  const controlsState = buildGraphVisualMapControlsState({
    graphState,
    relationType,
    layout,
    visibleEdges,
    bridgeGaps,
    filterActive,
    normalizedFocusedNoteId,
    denseGalaxyMode,
    workbenchPanelMarkup
  }, {
    graphFocusDepthMeta,
    graphReadingModeMeta,
    graphViewModeForRelationType,
    graphZoomOption,
    graphReadingLensMeta,
    graphBuildReadingLensState,
    zoomOptions,
    relationGroupMeta
  });

  return {
    normalizedFocusedNoteId,
    layout,
    adjacencyMap,
    visibleEdges,
    denseDirectoryMode,
    denseGalaxyMode,
    showDensityHint,
    compactRelationFilterStats,
    ...selectionState,
    ...controlsState
  };
}
