export function buildGraphVisualMapHeadContent({
  filterActive = false,
  relationType = "meaningful",
  compactRelationFilterMarkup = "",
  isolatedQueueStripMarkup = "",
  structureFallback = false,
  graphShellPreviewProps = {},
  runtimeState = {}
} = {}, deps = {}) {
  const {
    escapeHtml = (value) => String(value ?? ""),
    renderGraphViewModeSwitcher = () => "",
    renderGraphReadingLensControls = () => "",
    graphFocusDepthMeta = (value) => ({ key: value, label: value, note: "" })
  } = deps;
  const {
    focusDepth = { key: "1", label: "1", note: "" },
    readingLens = { key: "overview" },
    legendOpen = false,
    showDensityHint = false,
    focusContextAvailable = false,
    focusContextCollapsed = false
  } = runtimeState;
  return filterActive
    ? `
      <div>
        <div class="graph-section-title">当前笔记关系图</div>
        <div class="graph-section-note">当前笔记固定在中心；当前范围：${escapeHtml(focusDepth.label)}。${escapeHtml(focusDepth.note || "可以拖动画布，查看它周围的关系。")}</div>
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
              ? `<button class="graph-focus-panel-toggle" type="button" data-graph-focus-context-toggle="${focusContextCollapsed ? "open" : "close"}" aria-expanded="${focusContextCollapsed ? "false" : "true"}" aria-controls="graphFocusContextPanel" title="${focusContextCollapsed ? "显示选中笔记面板" : "收起选中笔记面板"}">${focusContextCollapsed ? "显示选中笔记面板" : "收起选中笔记面板"}</button>`
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
}
