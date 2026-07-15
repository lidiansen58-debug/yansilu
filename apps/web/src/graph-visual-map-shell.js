function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultIcon(name = "") {
  return `<span aria-hidden="true">${defaultEscapeHtml(name)}</span>`;
}

function graphVisualMapShellDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    renderGraphIcon: deps.renderGraphIcon || defaultIcon,
    labels: {
      mapPanel: "关系图谱",
      canvas: "可缩放的关系图谱画布",
      mapImage: "永久笔记关系图",
      tools: "图谱工具",
      zoomControls: "图谱缩放",
      zoomLevels: "图谱缩放级别",
      zoomOut: "缩小图谱",
      zoomIn: "放大图谱",
      wheelZoomHint: "也可以用鼠标滚轮缩放",
      expand: "放大查看图谱",
      collapse: "退出放大查看",
      panCanvas: "拖动画布",
      panCanvasHint: "拖动空白区域移动图谱",
      canvasHelpHint: "滚轮缩放，拖动查看，点击笔记看详情",
      hoverTitle: "拖动画布，点击笔记查看周边关系",
      hoverDetail: "可以拖动画布移动视野；点击笔记或关系后，在旁边查看它附近的连接。",
      legend: "关系颜色说明",
      selectionOverlay: "图谱处理浮层",
      closeEmpty: "关闭提示",
      argumentView: "观点关系",
      structureView: "主题结构",
      ...(deps.labels || {})
    }
  };
}

export function renderGraphZoomStepperView(
  { zoomKey = "fit", zoomOptions = {}, zoomIndex = 0 } = {},
  deps = {}
) {
  const { escapeHtml, renderGraphIcon, labels } = graphVisualMapShellDeps(deps);
  const zoomKeys = Object.keys(zoomOptions || {});
  const controls = Object.entries(zoomOptions || {})
    .map(([key, option]) => {
      const active = zoomKey === key;
      const title = [option.note, labels.wheelZoomHint].filter(Boolean).join(" · ");
      return `<button class="graph-zoom-btn${active ? " is-active" : ""}" type="button" data-graph-zoom-option="${escapeHtml(key)}" aria-pressed="${active}" title="${escapeHtml(title)}" aria-label="${escapeHtml(option.label)}">${renderGraphIcon(option.icon || key)}<span>${escapeHtml(option.label)}</span></button>`;
    })
    .join("");
  return `
    <button class="graph-zoom-step" type="button" data-graph-zoom-step="-1" aria-label="${escapeHtml(labels.zoomOut)}" title="${escapeHtml(`${labels.zoomOut} · ${labels.wheelZoomHint}`)}"${zoomIndex === 0 ? " disabled" : ""}>${renderGraphIcon("zoom-out")}</button>
    <div class="graph-zoom-preset-group" aria-label="${escapeHtml(labels.zoomLevels)}">
      ${controls}
    </div>
    <button class="graph-zoom-step" type="button" data-graph-zoom-step="1" aria-label="${escapeHtml(labels.zoomIn)}" title="${escapeHtml(`${labels.zoomIn} · ${labels.wheelZoomHint}`)}"${zoomIndex === zoomKeys.length - 1 ? " disabled" : ""}>${renderGraphIcon("zoom-in")}</button>
  `;
}

export function renderGraphMapMarkerDefsView(markerColors = {}, deps = {}) {
  const { escapeHtml } = graphVisualMapShellDeps(deps);
  return Object.entries(markerColors || {})
    .map(
      ([key, color]) => `
        <marker id="graph-arrow-${escapeHtml(key)}" markerWidth="4.2" markerHeight="4.2" refX="3.5" refY="2.1" orient="auto" markerUnits="strokeWidth">
          <path d="M 0.8 0.9 L 3.5 2.1 L 0.8 3.3" fill="none" stroke="${escapeHtml(color)}" stroke-opacity="0.48" stroke-width="0.52" stroke-linecap="round" stroke-linejoin="round"></path>
        </marker>
      `
    )
    .join("");
}

export function renderGraphMapSvgDefsView({ markerColors = {} } = {}, deps = {}) {
  return `
    ${renderGraphMapMarkerDefsView(markerColors, deps)}
    <radialGradient id="graph-node-core-fill" cx="38%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff"></stop>
      <stop offset="52%" stop-color="#edfaff"></stop>
      <stop offset="100%" stop-color="#8fe0de"></stop>
    </radialGradient>
    <radialGradient id="graph-node-literature-fill" cx="38%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff"></stop>
      <stop offset="60%" stop-color="#fff7e6"></stop>
      <stop offset="100%" stop-color="#f7c885"></stop>
    </radialGradient>
    <radialGradient id="graph-node-fleeting-fill" cx="38%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff"></stop>
      <stop offset="58%" stop-color="#eefaff"></stop>
      <stop offset="100%" stop-color="#8ed4f6"></stop>
    </radialGradient>
    <filter id="graph-soft-node-glow" x="-70%" y="-70%" width="240%" height="240%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#07111c" flood-opacity="0.18"></feDropShadow>
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#67d8df" flood-opacity="0.2"></feDropShadow>
    </filter>
    <filter id="graph-soft-edge-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.3" flood-color="#38a3c9" flood-opacity="0.1"></feDropShadow>
    </filter>
    <filter id="graph-nebula-blur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="22"></feGaussianBlur>
    </filter>
    <linearGradient id="graph-map-backdrop-fill" x1="4%" y1="6%" x2="94%" y2="100%">
      <stop offset="0%" stop-color="#040912" stop-opacity="0.99"></stop>
      <stop offset="46%" stop-color="#07111e" stop-opacity="0.985"></stop>
      <stop offset="100%" stop-color="#0b1828" stop-opacity="0.99"></stop>
    </linearGradient>
  `;
}

export function renderGraphMapEmptyStateView({ title = "", message = "" } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon, labels } = graphVisualMapShellDeps(deps);
  return `
    <div class="graph-map-empty-canvas">
      <div class="graph-map-empty-orbit" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="graph-map-empty-card">
        <button class="graph-overlay-close graph-map-empty-close" type="button" data-graph-empty-close aria-label="${escapeHtml(labels.closeEmpty)}" title="${escapeHtml(labels.closeEmpty)}">${renderGraphIcon("close")}</button>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
        <div class="graph-map-empty-actions">
          <button class="mini-btn primary" type="button" data-graph-task-view="structure">看结构</button>
          <button class="mini-btn" type="button" data-graph-task-view="relations">找缺口</button>
          <button class="mini-btn" type="button" data-graph-task-view="themes">找主题</button>
        </div>
      </div>
    </div>
  `;
}

export function renderGraphVisualMapShellView({
  expanded = false,
  readingLensActive = false,
  readingLensKey = "",
  selectionKind = "",
  toolbarMarkup = "",
  headContentMarkup = "",
  legendMarkup = "",
  hasNodes = false,
  sidePanelMarkup = "",
  selectionOverlayMarkup = "",
  zoomKey = "fit",
  zoomWidth = 0,
  zoomHeight = 0,
  canvasHelpHintVisible = false,
  layoutWidth = 0,
  layoutHeight = 0,
  zoomStepperMarkup = "",
  svgDefsMarkup = "",
  nebulaMarkup = "",
  clusterGlowMarkup = "",
  starfieldMarkup = "",
  themeBoundaryMarkup = "",
  edgeMarkup = "",
  nodeMarkup = "",
  emptyStateMarkup = ""
} = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon, labels } = graphVisualMapShellDeps(deps);
  const panelClasses = [
    "graph-map-panel",
    expanded ? "is-expanded" : "",
    readingLensActive ? `has-reading-lens is-reading-lens-${escapeHtml(readingLensKey)}` : "",
    selectionKind === "node" ? "is-selecting-node" : "",
    selectionKind === "theme" ? "is-selecting-theme" : "",
    selectionKind === "isolated" || selectionKind === "isolatedComplete" ? "is-selecting-isolated" : "",
    selectionKind === "bridge" ? "is-selecting-bridge" : ""
  ].filter(Boolean).join(" ");
  const stageClass = `graph-map-stage${sidePanelMarkup ? " has-side-panel" : ""}${selectionOverlayMarkup ? " has-selection-overlay" : ""}`;
  return `
    <section class="${panelClasses}" aria-label="${escapeHtml(labels.mapPanel)}">
      <div class="graph-map-head">
        ${toolbarMarkup}
        ${headContentMarkup}
      </div>
      ${legendMarkup}
      <div class="${stageClass}">
        ${
          hasNodes
            ? `
              <div class="graph-map-body${sidePanelMarkup ? " has-side-panel" : ""}">
                <div class="graph-map-canvas">
                  <div class="graph-map-viewport" data-graph-zoom="${escapeHtml(zoomKey)}" aria-label="${escapeHtml(labels.canvas)}">
                    <div class="graph-map-floater" aria-label="${escapeHtml(labels.tools)}">
                      <button class="graph-expand-btn" type="button" data-graph-toggle-expanded="${expanded ? "off" : "on"}" title="${escapeHtml(expanded ? labels.collapse : labels.expand)}" aria-label="${escapeHtml(expanded ? labels.collapse : labels.expand)}">${renderGraphIcon(expanded ? "collapse" : "expand")}</button>
                      <button class="graph-floater-toggle graph-pan-hint" type="button" disabled aria-disabled="true" title="${escapeHtml(labels.panCanvasHint)}" aria-label="${escapeHtml(labels.panCanvas)}">${renderGraphIcon("hand")}</button>
                      <div class="graph-zoom-controls" aria-label="${escapeHtml(labels.zoomControls)}">
                        ${zoomStepperMarkup}
                      </div>
                    </div>
                    <div class="graph-hover-card" id="graphHoverCard" aria-live="polite">
                      <strong>${escapeHtml(labels.hoverTitle)}</strong>
                      <span>${escapeHtml(labels.hoverDetail)}</span>
                    </div>
                    ${canvasHelpHintVisible ? `<div class="graph-canvas-help-hint" role="status">${escapeHtml(labels.canvasHelpHint)}</div>` : ""}
                    <svg class="graph-map-svg" data-graph-zoom="${escapeHtml(zoomKey)}" viewBox="0 0 ${layoutWidth} ${layoutHeight}" style="--graph-zoom-width: ${zoomWidth}px; --graph-zoom-height: ${zoomHeight}px;" role="img" aria-label="${escapeHtml(labels.mapImage)}">
                      <defs>${svgDefsMarkup}</defs>
                      <rect class="graph-map-backdrop" x="0" y="0" width="${layoutWidth}" height="${layoutHeight}" rx="28" fill="url(#graph-map-backdrop-fill)"></rect>
                      <g class="graph-map-nebulae" filter="url(#graph-nebula-blur)">${nebulaMarkup}</g>
                      <g class="graph-map-cluster-glows" filter="url(#graph-nebula-blur)">${clusterGlowMarkup}</g>
                      <g class="graph-map-stars">${starfieldMarkup}</g>
                      ${themeBoundaryMarkup ? `<g class="graph-map-theme-boundaries">${themeBoundaryMarkup}</g>` : ""}
                      <g class="graph-map-edges">${edgeMarkup}</g>
                      <g class="graph-map-nodes">${nodeMarkup}</g>
                    </svg>
                  </div>
                  ${sidePanelMarkup}
                </div>
              </div>
            `
            : emptyStateMarkup
        }
        ${selectionOverlayMarkup ? `<div class="graph-selection-overlay" role="dialog" aria-modal="false" aria-label="${escapeHtml(labels.selectionOverlay)}">${selectionOverlayMarkup}</div>` : ""}
      </div>
    </section>
  `;
}
