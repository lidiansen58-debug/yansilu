import { renderGraphMapLegendView } from "./graph-visual-map-shell.js";
import { renderGraphVisualEdgeViews } from "./graph-visual-edge-view.js";
import { renderGraphVisualNodeViews } from "./graph-visual-node-view.js";

export const GRAPH_VISUAL_NODE_LABELS = {
  isolatedNodeType: "待关联笔记",
  isolatedNodeAction: "整理待关联笔记",
  nodeRoleAction: "查看笔记角色",
  relationCountPrefix: "连接 ",
  relationCountSuffix: "条",
  metaSeparator: " · ",
  attentionPrefix: "（",
  attentionJoiner: "、",
  attentionSuffix: "）"
};

export const GRAPH_VISUAL_EDGE_LABELS = {
  sourceFallback: "源笔记",
  targetFallback: "目标笔记",
  reviewRelation: "查看关系复核",
  directionWord: "到",
  metaSeparator: " · ",
  titleArrow: " → ",
  rationalePrefix: "，"
};

export const GRAPH_VISUAL_LEGEND_NOTE = "圆点大小表示当前值得注意的程度，不表示最终价值；虚线表示候选或待确认关系。";

export function buildGraphVisualNodeViewContext(runtimeState = {}) {
  const {
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
    zoom = {}
  } = runtimeState;

  return {
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
}

export function buildGraphVisualEdgeViewContext(runtimeState = {}, relationType = "meaningful") {
  const {
    layout = {},
    selectedEdgeKey,
    selectedThemeNoteIds,
    selectedBridgeNoteIds,
    selectedNodeId,
    readingLensState,
    filterActive,
    denseGalaxyMode,
    zoom = {}
  } = runtimeState;

  return {
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
}

export function renderGraphVisualNodeMarkupForRuntime(runtimeState = {}, deps = {}) {
  const {
    escapeHtml = (value) => String(value ?? ""),
    graphNodeClass,
    graphNodeStarRank,
    graphShortTitle,
    noteTypeLabel,
    graphNodeAttentionReasons,
    graphNodeShowsAsPoint
  } = deps;
  const { layout = {} } = runtimeState;

  return renderGraphVisualNodeViews(layout.nodes || [], buildGraphVisualNodeViewContext(runtimeState), {
    escapeHtml,
    graphNodeClass,
    graphNodeStarRank,
    graphShortTitle,
    noteTypeLabel,
    graphNodeAttentionReasons,
    graphNodeShowsAsPoint,
    labels: GRAPH_VISUAL_NODE_LABELS
  });
}

export function renderGraphVisualEdgeMarkupForRuntime(runtimeState = {}, relationType = "meaningful", deps = {}) {
  const {
    escapeHtml = (value) => String(value ?? ""),
    graphRelationTypeLabel,
    graphRelationSourceLabel,
    graphRelationGroupMeta,
    graphEdgeSelectionKey,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender
  } = deps;
  const { visibleEdges = [] } = runtimeState;

  return renderGraphVisualEdgeViews(visibleEdges, buildGraphVisualEdgeViewContext(runtimeState, relationType), {
    escapeHtml,
    graphRelationTypeLabel,
    graphRelationSourceLabel,
    graphRelationGroupMeta,
    graphEdgeSelectionKey,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender,
    labels: GRAPH_VISUAL_EDGE_LABELS
  });
}

export function renderGraphVisualLegendMarkupForRuntime(runtimeState = {}, shellDeps = {}) {
  const { legendOpen = false, legendGroups = [] } = runtimeState;

  return renderGraphMapLegendView({
    open: legendOpen,
    groups: legendGroups,
    note: GRAPH_VISUAL_LEGEND_NOTE
  }, shellDeps);
}
