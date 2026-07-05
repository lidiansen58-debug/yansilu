import {
  buildGraphVisualMapHeadContent
} from "./graph-visual-map-head.js";
import {
  graphVisualMapEmptyCopy
} from "./graph-visual-map-empty-state.js";

export const GRAPH_VISUAL_MAP_SHELL_LABELS = {
  mapPanel: "Graph map",
  canvas: "Zoomable graph canvas",
  mapImage: "Permanent note relation graph",
  tools: "Graph tools",
  zoomControls: "Graph zoom",
  zoomLevels: "Graph zoom levels",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  expand: "Expand graph",
  collapse: "Collapse graph",
  panCanvas: "Pan canvas",
  panCanvasHint: "Drag blank space to pan the graph",
  hoverTitle: "拖动画布，点击笔记查看周边关系",
  hoverDetail: "可以拖动画布移动视野；点击笔记或关系后，在旁边查看它附近的连接。",
  legend: "Relation color legend",
  selectionOverlay: "Relation workflow overlay",
  closeEmpty: "Close hint and return to relation graph",
  argumentView: "View argument relations",
  structureView: "View topic structure"
};

export function createGraphVisualMapShellDeps({
  escapeHtml = (value) => String(value ?? ""),
  renderGraphIcon = () => ""
} = {}) {
  return {
    escapeHtml,
    renderGraphIcon,
    labels: GRAPH_VISUAL_MAP_SHELL_LABELS
  };
}

export {
  graphVisualMapEmptyCopy
} from "./graph-visual-map-empty-state.js";
export function buildGraphVisualMapChrome({
  runtimeState = {},
  filterActive = false,
  relationType = "meaningful",
  compactRelationFilterMarkup = "",
  isolatedQueueStripMarkup = "",
  structureFallback = false,
  graphShellPreviewProps = {}
} = {}, deps = {}) {
  const {
    escapeHtml = (value) => String(value ?? ""),
    renderGraphIcon = () => "",
    renderGraphZoomStepperView = () => "",
    renderGraphMapSvgDefsView = () => "",
    renderGraphMapEmptyStateView = () => "",
    renderGraphViewModeSwitcher = () => "",
    renderGraphReadingLensControls = () => "",
    graphFocusDepthMeta = (value) => ({ key: value, label: value, note: "" }),
    graphViewModeForRelationType = (value) => value,
    zoomOptions = {},
    markerColors = {}
  } = deps;
  const {
    modeMeta = { label: "" },
    zoom = { key: "fit" },
    zoomIndex = 0
  } = runtimeState;
  const shellDeps = createGraphVisualMapShellDeps({ escapeHtml, renderGraphIcon });
  const zoomStepperMarkup = renderGraphZoomStepperView({
    zoomKey: zoom.key,
    zoomOptions,
    zoomIndex
  }, shellDeps);
  const svgDefsMarkup = renderGraphMapSvgDefsView({ markerColors }, shellDeps);
  const headContentMarkup = buildGraphVisualMapHeadContent({
    filterActive,
    relationType,
    compactRelationFilterMarkup,
    isolatedQueueStripMarkup,
    structureFallback,
    graphShellPreviewProps,
    runtimeState
  }, {
    escapeHtml,
    renderGraphViewModeSwitcher,
    renderGraphReadingLensControls,
    graphFocusDepthMeta
  });
  const emptyCopy = graphVisualMapEmptyCopy({
    filterActive,
    modeLabel: modeMeta.label,
    relationType,
    graphViewModeForRelationType
  });
  const emptyStateMarkup = renderGraphMapEmptyStateView(emptyCopy, shellDeps);

  return {
    shellDeps,
    zoomStepperMarkup,
    svgDefsMarkup,
    headContentMarkup,
    emptyStateMarkup,
    emptyCopy
  };
}
