import {
  buildGraphVisualMapSelectionState
} from "./graph-visual-map-selection-state.js";
import {
  buildGraphVisualMapControlsState
} from "./graph-visual-map-controls-state.js";
import {
  buildGraphVisualMapLayoutState
} from "./graph-visual-map-layout-state.js";
import {
  buildGraphVisualMapControlsInput,
  buildGraphVisualMapLayoutInput,
  buildGraphVisualMapSelectionInput
} from "./graph-visual-map-runtime-input.js";

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

  const layoutState = buildGraphVisualMapLayoutState(buildGraphVisualMapLayoutInput({
    nodes,
    edges,
    relationFilterEdges,
    filterActive,
    focusedNoteId,
    structureFallback
  }), {
    graphBuildVisualLayout,
    graphEdgePath,
    graphRelationVisual,
    graphDenseGalaxyMode,
    shouldShowGraphDensityHint
  });
  const selectionState = buildGraphVisualMapSelectionState(buildGraphVisualMapSelectionInput({
    graphSelection: graphState.selection,
    graphState,
    layoutState,
    edges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    relationFilterEdges,
    selectionEdges,
    selectionNodeMap
  }), {
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow
  });
  const controlsState = buildGraphVisualMapControlsState(buildGraphVisualMapControlsInput({
    graphState,
    relationType,
    layoutState,
    bridgeGaps,
    filterActive,
    workbenchPanelMarkup
  }), {
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
    ...layoutState,
    ...selectionState,
    ...controlsState
  };
}
