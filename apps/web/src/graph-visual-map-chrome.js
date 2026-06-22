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
  hoverTitle: "Drag, hover, or click to inspect local context",
  hoverDetail: "Drag the canvas, then hover over notes or relations to inspect nearby links.",
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

export function graphVisualMapEmptyCopy({
  filterActive = false,
  modeLabel = "",
  relationType = "meaningful",
  graphViewModeForRelationType = (value) => value
} = {}) {
  if (filterActive) {
    return {
      title: "这条笔记周围暂时没有可见关系",
      message: "可能是这条笔记还没有建立正式关系，也可能是当前显示范围太窄。可以先补一条支持、限定或连接关系。"
    };
  }
  if (graphViewModeForRelationType(relationType) === "structure") {
    return {
      title: `${modeLabel}当前没有可见笔记`,
      message: "主题分布只看主题归属和知识分区。如果这里为空，可以切回看观点关系，或先为笔记补充主题归属。"
    };
  }
  return {
    title: `${modeLabel}当前没有可见笔记`,
    message: "当前筛选没有留下可读的观点关系。可以切到全部关系，或先从右侧待处理内容里判断潜在关联。"
  };
}

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
    focusDepth = { key: "1", label: "1", note: "" },
    modeMeta = { label: "" },
    zoom = { key: "fit" },
    zoomIndex = 0,
    readingLens = { key: "overview" },
    legendOpen = false,
    showDensityHint = false,
    focusContextAvailable = false,
    focusContextCollapsed = false
  } = runtimeState;
  const shellDeps = createGraphVisualMapShellDeps({ escapeHtml, renderGraphIcon });
  const zoomStepperMarkup = renderGraphZoomStepperView({
    zoomKey: zoom.key,
    zoomOptions,
    zoomIndex
  }, shellDeps);
  const svgDefsMarkup = renderGraphMapSvgDefsView({ markerColors }, shellDeps);
  const headContentMarkup = filterActive
    ? `
      <div>
        <div class="graph-section-title">当前笔记关系图</div>
        <div class="graph-section-note">当前笔记固定在中心；当前范围：${focusDepth.label}。可以拖动画布，查看它周围的关系。</div>
        <div class="graph-focus-depth" aria-label="当前笔记关系范围">
          ${["1", "2", "all"]
            .map((value) => {
              const meta = graphFocusDepthMeta(value);
              const active = meta.key === focusDepth.key;
              return `<button class="graph-focus-depth-btn${active ? " is-active" : ""}" type="button" data-graph-focus-depth="${escapeHtml(meta.key)}" aria-pressed="${active}" title="${escapeHtml(meta.note)}">${escapeHtml(meta.label)}</button>`;
            })
            .join("")}
          <span class="graph-focus-depth-note">${escapeHtml(focusDepth.note)}</span>
          ${
            focusContextAvailable
              ? `<button class="graph-focus-panel-toggle" type="button" data-graph-focus-context-toggle="${focusContextCollapsed ? "open" : "close"}" aria-expanded="${focusContextCollapsed ? "false" : "true"}" aria-controls="graphFocusContextPanel" title="${focusContextCollapsed ? "显示右侧关系" : "收起右侧关系"}">${focusContextCollapsed ? "显示右侧关系" : "收起右侧关系"}</button>`
              : ""
          }
        </div>
      </div>
    `
    : `
      <div class="graph-map-primary-row">
        ${renderGraphViewModeSwitcher(relationType)}
        <div class="graph-map-primary-actions">
          ${compactRelationFilterMarkup}
        </div>
      </div>
      ${renderGraphReadingLensControls(readingLens.key, legendOpen, graphShellPreviewProps.readingLensTrailingMarkup)}
      ${isolatedQueueStripMarkup}
      ${structureFallback ? `<div class="graph-structure-fallback-note">当前没有主题归属关系，已按笔记之间的关系自动分组。</div>` : ""}
      ${showDensityHint ? `<div class="graph-density-hint">当前图比较密，建议直接拖动到局部区域，再配合悬停或放大继续看。</div>` : ""}
    `;
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
