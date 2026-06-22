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
      title: "杩欐潯绗旇鍛ㄥ洿鏆傛椂娌℃湁鍙鍏崇郴",
      message: "鍙兘鏄繖鏉＄瑪璁拌繕娌℃湁寤虹珛姝ｅ紡鍏崇郴锛屼篃鍙兘鏄綋鍓嶆樉绀鸿寖鍥村お绐勩€傚彲浠ュ厛琛ヤ竴鏉℃敮鎸併€侀檺瀹氭垨杩炴帴鍏崇郴銆?"
    };
  }
  if (graphViewModeForRelationType(relationType) === "structure") {
    return {
      title: `${modeLabel}褰撳墠娌℃湁鍙绗旇`,
      message: "涓婚鍒嗗竷鍙湅涓婚褰掑睘鍜岀煡璇嗗垎鍖恒€傚鏋滆繖閲屼负绌猴紝鍙互鍒囧洖鐪嬭鐐瑰叧绯伙紝鎴栧厛涓虹瑪璁拌ˉ鍏呬富棰樺綊灞炪€?"
    };
  }
  return {
    title: `${modeLabel}褰撳墠娌℃湁鍙绗旇`,
    message: "褰撳墠绛涢€夋病鏈夌暀涓嬪彲璇荤殑瑙傜偣鍏崇郴銆傚彲浠ュ垏鍒板叏閮ㄥ叧绯伙紝鎴栧厛浠庡彸渚у緟澶勭悊鍐呭閲屽垽鏂綔鍦ㄥ叧鑱斻€?"
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
        <div class="graph-section-title">褰撳墠绗旇鍏崇郴鍥?/div>
        <div class="graph-section-note">褰撳墠绗旇鍥哄畾鍦ㄤ腑蹇冿紱褰撳墠鑼冨洿锛?{focusDepth.label}銆傚彲浠ユ嫋鍔ㄧ敾甯冿紝鏌ョ湅瀹冨懆鍥寸殑鍏崇郴銆?/div>
        <div class="graph-focus-depth" aria-label="褰撳墠绗旇鍏崇郴鑼冨洿">
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
              ? `<button class="graph-focus-panel-toggle" type="button" data-graph-focus-context-toggle="${focusContextCollapsed ? "open" : "close"}" aria-expanded="${focusContextCollapsed ? "false" : "true"}" aria-controls="graphFocusContextPanel" title="${focusContextCollapsed ? "鏄剧ず鍙充晶鍏崇郴" : "鏀惰捣鍙充晶鍏崇郴"}">${focusContextCollapsed ? "鏄剧ず鍙充晶鍏崇郴" : "鏀惰捣鍙充晶鍏崇郴"}</button>`
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
      ${structureFallback ? `<div class="graph-structure-fallback-note">褰撳墠娌℃湁涓婚褰掑睘鍏崇郴锛屽凡鎸夌瑪璁颁箣闂寸殑鍏崇郴鑷姩鍒嗙粍銆?/div>` : ""}
      ${showDensityHint ? `<div class="graph-density-hint">褰撳墠鍥炬瘮杈冨瘑锛屽缓璁洿鎺ユ嫋鍔ㄥ埌灞€閮ㄥ尯鍩燂紝鍐嶉厤鍚堟偓鍋滄垨鏀惧ぇ缁х画鐪嬨€?/div>` : ""}
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
