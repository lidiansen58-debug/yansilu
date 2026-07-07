import { buildGraphVisualMapChrome } from "./graph-visual-map-chrome.js";
import { buildGraphVisualMapContextMarkup } from "./graph-visual-map-context.js";
import { buildGraphVisualMapRuntimeState } from "./graph-visual-map-runtime-state.js";
import { buildGraphVisualMapShellProps } from "./graph-visual-map-shell-props.js";
import {
  renderGraphMapEmptyStateView,
  renderGraphMapSvgDefsView,
  renderGraphZoomStepperView
} from "./graph-visual-map-shell.js";
import {
  renderGraphVisualEdgeMarkupForRuntime,
  renderGraphVisualLegendMarkupForRuntime,
  renderGraphVisualNodeMarkupForRuntime
} from "./graph-visual-map-view-renderer.js";

export function composeGraphVisualMapForRuntime({
  nodes = [],
  edges = [],
  focusContextEdges = null,
  graphSelection = null,
  relationFilterEdges = [],
  selectionEdges = null,
  selectionNodeMap = null,
  filterActive = false,
  focusedNoteId = "",
  relationType = "meaningful",
  questionSpotSummary = null,
  topicCandidates = [],
  isolatedNotes = [],
  bridgeGaps = [],
  clueSummary = null,
  workbenchPanelMarkup = "",
  workbenchEntryMarkup = "",
  isolatedQueueStripMarkup = "",
  toolbarMarkup = "",
  structureFallback = false
} = {}, deps = {}) {
  const {
    graphState = {},
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
    shouldShowGraphCanvasHelpHint,
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow,
    graphBuildReadingLensState,
    zoomOptions = {},
    relationGroupMeta = {},
    renderGraphRelationTypeFilter = () => "",
    graphThemeBoundaryMeta = () => null,
    renderGraphThemeBoundary = () => "",
    renderGraphStarfield = () => "",
    renderGraphNebulaField = () => "",
    renderGraphClusterGlow = () => "",
    renderGraphFocusContextPanel = () => "",
    renderGraphSelectionPanel = () => "",
    renderGraphResearchNavigatorPanel = () => "",
    renderGraphResearchNavigatorEntry = () => "",
    escapeHtml = (value) => String(value ?? ""),
    renderGraphIcon = () => "",
    renderGraphViewModeSwitcher = () => "",
    renderGraphReadingLensControls = () => "",
    markerColors = {},
    graphNodeClass,
    graphNodeStarRank,
    graphShortTitle,
    noteTypeLabel,
    graphNodeAttentionReasons,
    graphNodeShowsAsPoint,
    graphRelationTypeLabel,
    graphRelationSourceLabel,
    graphRelationGroupMeta,
    graphEdgeSelectionKey,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender
  } = deps;

  const mapRuntimeState = buildGraphVisualMapRuntimeState({
    graphState,
    nodes,
    edges,
    focusContextEdges,
    graphSelection,
    relationFilterEdges,
    selectionEdges,
    selectionNodeMap,
    filterActive,
    focusedNoteId,
    relationType,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    workbenchPanelMarkup,
    structureFallback
  }, {
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
    shouldShowGraphCanvasHelpHint,
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow,
    graphBuildReadingLensState,
    zoomOptions,
    relationGroupMeta
  });
  const graphContextMarkup = buildGraphVisualMapContextMarkup({
    runtimeState: mapRuntimeState,
    filterActive,
    relationType,
    relationFilterEdges,
    questionSpotSummary,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clueSummary,
    workbenchPanelMarkup,
    workbenchEntryMarkup,
    isolatedQueueStripMarkup,
    structureFallback,
    edges,
    focusContextEdges: Array.isArray(focusContextEdges) ? focusContextEdges : edges
  }, {
    graphState,
    renderGraphRelationTypeFilter,
    graphThemeBoundaryMeta,
    renderGraphThemeBoundary,
    renderGraphStarfield,
    renderGraphNebulaField,
    renderGraphClusterGlow,
    renderGraphFocusContextPanel,
    renderGraphSelectionPanel,
    renderGraphResearchNavigatorPanel,
    renderGraphResearchNavigatorEntry
  });
  const {
    compactRelationFilterMarkup,
    themeBoundaryMarkup,
    starfieldMarkup,
    nebulaMarkup,
    clusterGlowMarkup,
    focusContextMarkup,
    selectionContextMarkup,
    researchNavigatorMarkup,
    researchNavigatorEntryMarkup,
    graphShellPreviewProps
  } = graphContextMarkup;
  const graphChrome = buildGraphVisualMapChrome({
    runtimeState: mapRuntimeState,
    filterActive,
    relationType,
    compactRelationFilterMarkup,
    isolatedQueueStripMarkup,
    structureFallback,
    graphShellPreviewProps
  }, {
    escapeHtml,
    renderGraphIcon,
    renderGraphZoomStepperView,
    renderGraphMapSvgDefsView,
    renderGraphMapEmptyStateView,
    renderGraphViewModeSwitcher,
    renderGraphReadingLensControls,
    graphFocusDepthMeta,
    graphViewModeForRelationType,
    zoomOptions,
    markerColors
  });
  const {
    shellDeps,
    zoomStepperMarkup,
    svgDefsMarkup,
    headContentMarkup,
    emptyStateMarkup
  } = graphChrome;
  const nodeMarkup = renderGraphVisualNodeMarkupForRuntime(mapRuntimeState, {
    escapeHtml,
    graphNodeClass,
    graphNodeStarRank,
    graphShortTitle,
    noteTypeLabel,
    graphNodeAttentionReasons,
    graphNodeShowsAsPoint
  });
  const edgeMarkup = renderGraphVisualEdgeMarkupForRuntime(mapRuntimeState, relationType, {
    escapeHtml,
    graphRelationTypeLabel,
    graphRelationSourceLabel,
    graphRelationGroupMeta,
    graphEdgeSelectionKey,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender
  });
  const legendMarkup = renderGraphVisualLegendMarkupForRuntime(mapRuntimeState, shellDeps);
  const graphShellProps = buildGraphVisualMapShellProps({
    runtimeState: mapRuntimeState,
    filterActive,
    toolbarMarkup,
    headContentMarkup,
    legendMarkup,
    workbenchPanelMarkup,
    workbenchEntryMarkup,
    focusContextMarkup,
    selectionContextMarkup,
    researchNavigatorMarkup,
    researchNavigatorEntryMarkup,
    zoomStepperMarkup,
    svgDefsMarkup,
    nebulaMarkup,
    clusterGlowMarkup,
    starfieldMarkup,
    themeBoundaryMarkup,
    edgeMarkup,
    nodeMarkup,
    emptyStateMarkup
  });

  return { graphShellProps, shellDeps };
}
