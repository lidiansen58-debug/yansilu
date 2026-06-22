import { buildGraphVisualMapChrome } from "./graph-visual-map-chrome.js";
import { buildGraphVisualMapRuntimeState } from "./graph-visual-map-runtime-state.js";
import { buildGraphVisualMapShellProps } from "./graph-visual-map-shell-props.js";
import {
  renderGraphMapEmptyStateView,
  renderGraphMapLegendView,
  renderGraphMapSvgDefsView,
  renderGraphVisualMapShellView,
  renderGraphZoomStepperView
} from "./graph-visual-map-shell.js";
import { renderGraphVisualEdgeViews } from "./graph-visual-edge-view.js";
import { renderGraphVisualNodeViews } from "./graph-visual-node-view.js";

export function renderGraphVisualMapForRuntime({
  nodes = [],
  edges = [],
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
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow,
    graphBuildReadingLensState,
    zoomOptions,
    relationGroupMeta
  });
  const {
    normalizedFocusedNoteId,
    layout,
    zoom,
    adjacencyMap,
    visibleEdges,
    denseDirectoryMode,
    denseGalaxyMode,
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
    focusContextAvailable,
    focusContextCollapsed,
    readingLensState,
    researchNavigatorCanOpen
  } = mapRuntimeState;
  const compactRelationFilterMarkup = !filterActive ? renderGraphRelationTypeFilter(relationFilterEdges, relationType, true, compactRelationFilterStats) : "";
  const themeBoundaryMarkup = renderGraphThemeBoundary(
    activeSelection?.kind === "theme"
      ? graphThemeBoundaryMeta({
          nodes: layout.nodes,
          noteIds: activeSelection.noteIds,
          title: activeSelection.title,
          layoutWidth: layout.width,
          layoutHeight: layout.height
        })
      : null
  );
  const starfieldMarkup = renderGraphStarfield(layout.width, layout.height, `${graphState.lastLoadedAt}:${relationType}:${zoom.key}`);
  const nebulaMarkup = renderGraphNebulaField(layout.width, layout.height, `${graphState.lastLoadedAt}:${relationType}:${zoom.key}`);
  const clusterGlowMarkup = renderGraphClusterGlow(layout.clusterMeta);
  const focusContextMarkup = focusContextAvailable && !focusContextCollapsed
    ? renderGraphFocusContextPanel({
        focusedNoteId: normalizedFocusedNoteId,
        nodeMap: layout.nodeMap,
        edges
    })
    : "";
  const selectionContextMarkup = renderGraphSelectionPanel({
    selection: activeSelection,
    nodeMap: contextualNodeMap,
    edges: contextualSelectionEdges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta: layout.clusterMeta
  });
  const researchNavigatorMarkup = renderGraphResearchNavigatorPanel({
    nodes: layout.nodes,
    edges,
    topicCandidates,
    bridgeGaps,
    clusterMeta: layout.clusterMeta,
    clueSummary,
    questionSummary: questionSpotSummary
  });
  const researchNavigatorEntryMarkup = renderGraphResearchNavigatorEntry(researchNavigatorCanOpen && !selectionContextMarkup);
  const graphShellPreviewProps = buildGraphVisualMapShellProps({
    runtimeState: mapRuntimeState,
    filterActive,
    workbenchPanelMarkup,
    workbenchEntryMarkup,
    focusContextMarkup,
    selectionContextMarkup,
    researchNavigatorMarkup,
    researchNavigatorEntryMarkup
  });
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
  const nodeViewContext = {
    activeSelection,
    selectedNodeId,
    selectedNodeNeighborhood,
    selectedThemeNoteIds,
    selectedIsolatedNodeId,
    selectedBridgeNoteIds,
    adjacencyMap,
    readingLensState,
    filterActive,
    denseGalaxyMode,
    denseDirectoryMode,
    zoomKey: zoom.key
  };
  const nodeMarkup = renderGraphVisualNodeViews(layout.nodes, nodeViewContext, {
    escapeHtml,
    graphNodeClass,
    graphNodeStarRank,
    graphShortTitle,
    noteTypeLabel,
    graphNodeAttentionReasons,
    graphNodeShowsAsPoint,
    labels: {
      isolatedNodeType: "待关联笔记",
      isolatedNodeAction: "整理待关联笔记",
      nodeRoleAction: "查看笔记角色",
      relationCountPrefix: "连接 ",
      relationCountSuffix: "条",
      metaSeparator: " · ",
      attentionPrefix: "（",
      attentionJoiner: "、",
      attentionSuffix: "）"
    }
  });
  const edgeViewContext = {
    layoutNodeMap: layout.nodeMap,
    selectedEdgeKey,
    selectedThemeNoteIds,
    selectedBridgeNoteIds,
    selectedNodeId,
    readingLensState,
    filterActive,
    denseGalaxyMode,
    zoomKey: zoom.key,
    relationType
  };
  const edgeMarkup = renderGraphVisualEdgeViews(visibleEdges, edgeViewContext, {
    escapeHtml,
    graphRelationTypeLabel,
    graphRelationSourceLabel,
    graphRelationGroupMeta,
    graphEdgeSelectionKey,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender,
    labels: {
      sourceFallback: "源笔记",
      targetFallback: "目标笔记",
      reviewRelation: "查看关系复核",
      directionWord: "到",
      metaSeparator: " · ",
      titleArrow: " → ",
      rationalePrefix: "，"
    }
  });
  const legendMarkup = renderGraphMapLegendView({
    open: legendOpen,
    groups: legendGroups,
    note: "圆点大小表示当前值得注意的程度，不表示最终价值；虚线表示候选或待确认关系。"
  }, shellDeps);
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

  return renderGraphVisualMapShellView(graphShellProps, shellDeps);
}
