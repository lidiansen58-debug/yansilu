import {
  buildGraphVisualMapHeadContent
} from "./graph-visual-map-head.js";
import {
  graphVisualMapEmptyCopy
} from "./graph-visual-map-empty-state.js";

export const GRAPH_VISUAL_MAP_SHELL_LABELS = {
  mapPanel: "关系图谱",
  canvas: "可缩放的关系图谱画布",
  mapImage: "永久笔记关系图",
  tools: "图谱工具",
  zoomControls: "图谱缩放",
  zoomLevels: "图谱缩放级别",
  zoomOut: "缩小图谱",
  zoomIn: "放大图谱",
  expand: "放大查看图谱",
  collapse: "退出放大查看",
  panCanvas: "拖动画布",
  panCanvasHint: "拖动空白区域移动图谱",
  hoverTitle: "拖动画布，点击笔记查看周边关系",
  hoverDetail: "可以拖动画布移动视野；点击笔记或关系后，在旁边查看它附近的连接。",
  legend: "关系颜色说明",
  selectionOverlay: "图谱处理浮层",
  closeEmpty: "关闭提示并返回图谱",
  argumentView: "查看观点关系",
  structureView: "查看主题结构"
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
