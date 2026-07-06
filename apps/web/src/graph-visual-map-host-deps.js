import {
  buildGraphVisualMapRuntimeDeps
} from "./graph-visual-map-runtime-deps.js";

export function buildGraphVisualMapHostDeps(host = {}) {
  return {
    GRAPH_RELATION_GROUP_META: host.GRAPH_RELATION_GROUP_META,
    GRAPH_RELATION_MARKER_COLORS: host.GRAPH_RELATION_MARKER_COLORS,
    GRAPH_VISUAL_ZOOM_OPTIONS: host.GRAPH_VISUAL_ZOOM_OPTIONS,
    escapeHtml: host.escapeHtml,
    graphBuildReadingLensState: host.graphBuildReadingLensState,
    graphBuildVisualLayout: host.graphBuildVisualLayout,
    graphClusterGlow: host.graphClusterGlow,
    graphDenseGalaxyMode: host.graphDenseGalaxyMode,
    graphEdgePath: host.graphEdgePath,
    graphEdgeSelectionKey: host.graphEdgeSelectionKey,
    graphEdgeShouldRender: host.graphEdgeShouldRender,
    graphEdgeVisibleAtFit: host.graphEdgeVisibleAtFit,
    graphFocusContextPanel: host.graphFocusContextPanel,
    graphFocusDepthMeta: host.graphFocusDepthMeta,
    graphIcon: host.graphIcon,
    graphNebulaField: host.graphNebulaField,
    graphNodeAttentionReasons: host.graphNodeAttentionReasons,
    graphNodeClass: host.graphNodeClass,
    graphNodeNeedsRelationWorkflow: host.graphNodeNeedsRelationWorkflow,
    graphNodeShowsAsPoint: host.graphNodeShowsAsPoint,
    graphNodeStarRank: host.graphNodeStarRank,
    graphReadingLensControls: host.graphReadingLensControls,
    graphReadingLensMeta: host.graphReadingLensMeta,
    graphReadingModeMeta: host.graphReadingModeMeta,
    graphRelationGroupMeta: host.graphRelationGroupMeta,
    graphRelationSourceLabel: host.graphRelationSourceLabel,
    graphRelationTypeFilter: host.graphRelationTypeFilter,
    graphRelationTypeLabel: host.graphRelationTypeLabel,
    graphRelationVisual: host.graphRelationVisual,
    graphResearchNavigatorEntry: host.graphResearchNavigatorEntry,
    graphResearchNavigatorPanel: host.graphResearchNavigatorPanel,
    graphSelectionPanel: host.graphSelectionPanel,
    graphShortTitle: host.graphShortTitle,
    graphStarfield: host.graphStarfield,
    graphState: host.graphState,
    graphThemeBoundary: host.graphThemeBoundary,
    graphThemeBoundaryMeta: host.graphThemeBoundaryMeta,
    graphViewModeForRelationType: host.graphViewModeForRelationType,
    graphViewModeSwitcher: host.graphViewModeSwitcher,
    graphZoomOption: host.graphZoomOption,
    normalizeGraphSelectionForVisibleItems: host.normalizeGraphSelectionForVisibleItems,
    noteTypeLabel: host.noteTypeLabel,
    shouldShowGraphCanvasHelpHint: host.shouldShowGraphCanvasHelpHint,
    shouldShowGraphDensityHint: host.shouldShowGraphDensityHint
  };
}

export function createGraphVisualMapPrototypeDepsProvider(hostProvider = () => ({})) {
  return () => buildGraphVisualMapRuntimeDeps(buildGraphVisualMapHostDeps(hostProvider()));
}
