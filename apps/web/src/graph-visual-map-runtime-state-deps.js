export function buildGraphVisualMapRuntimeStateDeps(host = {}) {
  const {
    GRAPH_RELATION_GROUP_META = {},
    GRAPH_VISUAL_ZOOM_OPTIONS = {},
    graphState = {},
    graphFocusDepthMeta = (value) => ({ key: value || "1" }),
    graphReadingModeMeta = (value) => ({ key: value || "argument" }),
    graphViewModeForRelationType = (value) => value || "argument",
    graphBuildVisualLayout = (nodes = [], edges = []) => ({ nodes, edges, width: 960, height: 520, nodeMap: new Map(), clusterMeta: [] }),
    graphZoomOption = (value) => ({ key: value || "fit", scale: 1 }),
    graphReadingLensMeta = (value) => ({ key: value || "overview" }),
    graphEdgePath = () => "",
    graphRelationVisual = () => ({ key: "neutral" }),
    graphDenseGalaxyMode = () => false,
    shouldShowGraphDensityHint = () => false,
    normalizeGraphSelectionForVisibleItems = (selection) => selection,
    graphNodeNeedsRelationWorkflow = () => false,
    graphBuildReadingLensState = () => ({ active: false })
  } = host;

  return {
    graphState,
    graphFocusDepthMeta,
    graphReadingModeMeta,
    graphViewModeForRelationType,
    graphBuildVisualLayout,
    graphZoomOption,
    graphReadingLensMeta,
    graphEdgePath,
    graphRelationVisual,
    graphDenseGalaxyMode,
    shouldShowGraphDensityHint,
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow,
    graphBuildReadingLensState,
    zoomOptions: GRAPH_VISUAL_ZOOM_OPTIONS,
    relationGroupMeta: GRAPH_RELATION_GROUP_META
  };
}
