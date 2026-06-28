export function buildGraphVisualMapLegendGroups(relationGroupMeta = {}) {
  return ["support", "conflict", "boundary", "bridge", "flow", "neutral", "index"]
    .map((key) => {
      const meta = relationGroupMeta[key];
      return meta ? { key, className: `is-${key}`, ...meta } : null;
    })
    .filter(Boolean);
}

export function buildGraphVisualMapControlsState({
  graphState = {},
  relationType = "meaningful",
  layout = { width: 960, height: 520, nodes: [] },
  visibleEdges = [],
  bridgeGaps = [],
  filterActive = false,
  normalizedFocusedNoteId = "",
  denseGalaxyMode = false,
  workbenchPanelMarkup = ""
} = {}, deps = {}) {
  const {
    graphFocusDepthMeta = (value) => ({ key: value || "1", label: value || "1", note: "" }),
    graphReadingModeMeta = (value) => ({ key: value || "argument", label: value || "" }),
    graphViewModeForRelationType = (value) => value || "argument",
    graphZoomOption = (value) => ({ key: value || "fit", scale: 1 }),
    graphReadingLensMeta = (value) => ({ key: value || "overview" }),
    graphBuildReadingLensState = () => ({ active: false }),
    zoomOptions = {},
    relationGroupMeta = {}
  } = deps;

  const focusDepth = graphFocusDepthMeta(graphState.focusDepth);
  const modeMeta = graphReadingModeMeta(graphViewModeForRelationType(relationType));
  const zoom = graphZoomOption(graphState.zoom);
  const expanded = graphState.expanded === true;
  const readingLens = graphReadingLensMeta(graphState.readingLens);
  const zoomWidth = Math.round((layout.width || 0) * zoom.scale);
  const zoomHeight = Math.round((layout.height || 0) * zoom.scale);
  const legendOpen = graphState.legendOpen === true;
  const legendGroups = buildGraphVisualMapLegendGroups(relationGroupMeta);
  const zoomKeys = Object.keys(zoomOptions || {});
  const zoomIndex = Math.max(0, zoomKeys.indexOf(zoom.key));
  const focusContextAvailable = filterActive && normalizedFocusedNoteId;
  const focusContextCollapsed = graphState.focusContextCollapsed === true;
  const readingLensState = graphBuildReadingLensState({
    nodes: layout.nodes || [],
    visibleEdges,
    bridgeGaps,
    lens: readingLens.key
  });
  const researchNavigatorAutoHidden = denseGalaxyMode && graphState.researchNavigatorTouched !== true;
  const researchNavigatorHidden = graphState.researchNavigatorHidden === true || researchNavigatorAutoHidden;
  const researchNavigatorCanOpen = !filterActive && researchNavigatorHidden !== true && !workbenchPanelMarkup;

  return {
    focusDepth,
    modeMeta,
    zoom,
    expanded,
    readingLens,
    zoomWidth,
    zoomHeight,
    legendOpen,
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
