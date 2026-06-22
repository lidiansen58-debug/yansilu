export function buildGraphVisualMapChromeDeps(host = {}) {
  const {
    GRAPH_RELATION_MARKER_COLORS = {},
    GRAPH_VISUAL_ZOOM_OPTIONS = {},
    escapeHtml = (value) => String(value ?? ""),
    graphClusterGlow = () => "",
    graphFocusContextPanel = () => "",
    graphFocusDepthMeta = (value) => ({ key: value || "1" }),
    graphIcon = () => "",
    graphNebulaField = () => "",
    graphReadingLensControls = () => "",
    graphRelationTypeFilter = () => "",
    graphResearchNavigatorEntry = () => "",
    graphResearchNavigatorPanel = () => "",
    graphSelectionPanel = () => "",
    graphStarfield = () => "",
    graphThemeBoundary = () => "",
    graphThemeBoundaryMeta = () => null,
    graphViewModeForRelationType = (value) => value || "argument",
    graphViewModeSwitcher = () => ""
  } = host;

  return {
    renderGraphRelationTypeFilter: graphRelationTypeFilter,
    graphThemeBoundaryMeta,
    renderGraphThemeBoundary: graphThemeBoundary,
    renderGraphStarfield: graphStarfield,
    renderGraphNebulaField: graphNebulaField,
    renderGraphClusterGlow: graphClusterGlow,
    renderGraphFocusContextPanel: graphFocusContextPanel,
    renderGraphSelectionPanel: graphSelectionPanel,
    renderGraphResearchNavigatorPanel: graphResearchNavigatorPanel,
    renderGraphResearchNavigatorEntry: graphResearchNavigatorEntry,
    escapeHtml,
    renderGraphIcon: graphIcon,
    renderGraphViewModeSwitcher: graphViewModeSwitcher,
    renderGraphReadingLensControls: graphReadingLensControls,
    graphFocusDepthMeta,
    graphViewModeForRelationType,
    zoomOptions: GRAPH_VISUAL_ZOOM_OPTIONS,
    markerColors: GRAPH_RELATION_MARKER_COLORS
  };
}
