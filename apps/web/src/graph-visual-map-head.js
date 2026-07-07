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
      <div class="graph-focus-headline">
        <div class="graph-section-title">当前笔记的关系</div>
        <div class="graph-focus-depth" aria-label="当前笔记关系范围">
          ${["1", "2", "all"]
            .map((value) => {
              const meta = graphFocusDepthMeta(value);
              const active = meta.key === focusDepth.key;
              return `<button class="graph-focus-depth-btn${active ? " is-active" : ""}" type="button" data-graph-focus-depth="${escapeHtml(meta.key)}" aria-pressed="${active}" aria-label="${escapeHtml(`${meta.label}：${meta.note}`)}" title="${escapeHtml(meta.note)}">${escapeHtml(meta.label)}</button>`;
            })
            .join("")}
          ${
            focusContextAvailable
              ? `<button class="graph-focus-panel-toggle" type="button" data-graph-focus-context-toggle="${focusContextCollapsed ? "open" : "close"}" aria-expanded="${focusContextCollapsed ? "false" : "true"}" aria-controls="graphFocusContextPanel" title="${focusContextCollapsed ? "显示侧边详情" : "收起侧边详情"}">${focusContextCollapsed ? "显示详情" : "收起详情"}</button>`
              : ""
          }
        </div>
      </div>
    `
    : `
      <div class="graph-map-primary-row">
        ${renderGraphViewModeSwitcher(relationType, readingLens.key)}
        <div class="graph-map-primary-actions">
          ${compactRelationFilterMarkup}
        </div>
      </div>
      ${renderGraphReadingLensControls(readingLens.key, legendOpen, graphShellPreviewProps.readingLensTrailingMarkup)}
      ${isolatedQueueStripMarkup}
      ${structureFallback ? `<div class="graph-structure-fallback-note">还没有明确的主题归属，已先按笔记关系自动分组。</div>` : ""}
      ${showDensityHint ? `<div class="graph-density-hint">当前图较密，可以拖到局部区域或放大查看。</div>` : ""}
    `;
}
