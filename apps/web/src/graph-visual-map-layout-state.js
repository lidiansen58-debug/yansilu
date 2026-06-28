import {
  buildGraphVisualMapAdjacencyMap
} from "./graph-visual-map-selection-state.js";

export function buildGraphVisualMapLayoutState({
  nodes = [],
  edges = [],
  relationFilterEdges = [],
  filterActive = false,
  focusedNoteId = "",
  structureFallback = false
} = {}, deps = {}) {
  const {
    graphBuildVisualLayout = (inputNodes = [], inputEdges = []) => ({
      nodes: inputNodes,
      edges: inputEdges,
      width: 960,
      height: 520,
      nodeMap: new Map(inputNodes.map((node) => [node?.id, node])),
      clusterMeta: []
    }),
    graphEdgePath = () => "",
    graphRelationVisual = () => ({ key: "neutral" }),
    graphDenseGalaxyMode = () => false,
    shouldShowGraphDensityHint = () => false
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

  return {
    normalizedFocusedNoteId,
    layout,
    adjacencyMap,
    visibleEdges,
    denseDirectoryMode,
    denseGalaxyMode,
    showDensityHint,
    compactRelationFilterStats
  };
}
