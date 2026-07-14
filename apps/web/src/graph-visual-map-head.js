function graphMapModeHint(relationType = "meaningful", readingLensKey = "insight") {
  const relationKey = String(relationType || "meaningful").trim().toLowerCase();
  const lensKey = String(readingLensKey || "insight").trim().toLowerCase();
  if (relationKey === "index") {
    return {
      label: "找主题",
      text: "亮起来的是最值得继续整理的一组笔记。"
    };
  }
  if (lensKey === "bridge") {
    return {
      label: "找缺口",
      text: "亮起来的是还没连好、可能缺关系的地方。"
    };
  }
  return {
    label: "看结构",
    text: "同一块里的笔记更相关，先看最大的块和中心笔记。"
  };
}

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
    graphFocusDepthMeta = (value) => ({ key: value, label: value, note: "" })
  } = deps;
  const {
    focusDepth = { key: "1", label: "1", note: "" },
    readingLens = { key: "overview" },
    showDensityHint = false,
    focusContextAvailable = false,
    focusContextCollapsed = false
  } = runtimeState;
  const modeHint = graphMapModeHint(relationType, readingLens.key);
  const gapMode = !filterActive && relationType !== "index" && readingLens.key === "bridge";
  const themeMode = !filterActive && relationType === "index";
  const gapAction = gapMode
    ? `<button class="mini-btn primary" type="button" data-run-graph-ai-analysis="gap">找缺口</button>`
    : "";
  const themeAction = themeMode
    ? `<button class="mini-btn primary" type="button" data-run-graph-ai-analysis="theme">找主题</button>`
    : "";
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
              ? `<button class="graph-focus-panel-toggle" type="button" data-graph-focus-context-toggle="${focusContextCollapsed ? "open" : "close"}" aria-expanded="${focusContextCollapsed ? "false" : "true"}" aria-controls="graphFocusContextPanel" title="${focusContextCollapsed ? "显示详情" : "收起详情"}">${focusContextCollapsed ? "显示详情" : "收起详情"}</button>`
              : ""
          }
        </div>
      </div>
    `
    : `
      <div class="graph-map-primary-row">
        ${renderGraphViewModeSwitcher(relationType, readingLens.key)}
        <div class="graph-map-primary-actions">
          ${gapAction}
          ${themeAction}
          ${compactRelationFilterMarkup}
        </div>
      </div>
      <div class="graph-map-mode-hint" role="status">
        <strong>${escapeHtml(modeHint.label)}</strong>
        <span>${escapeHtml(modeHint.text)}</span>
      </div>
      ${isolatedQueueStripMarkup}
      ${showDensityHint ? `<div class="graph-density-hint">当前图较密，可以拖到局部区域或放大查看。</div>` : ""}
    `;
}
