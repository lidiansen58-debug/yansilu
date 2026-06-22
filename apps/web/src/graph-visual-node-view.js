function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultNodeClass() {
  return "";
}

function defaultNodeStarRank(tier = "") {
  const key = String(tier || "").trim().toLowerCase();
  if (key === "focus") return 5;
  if (key === "core") return 4;
  if (key === "major") return 3;
  if (key === "medium") return 2;
  if (key === "minor") return 1;
  return 0;
}

function defaultShortTitle(value = "", maxLength = 14) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(2, maxLength - 1))}...`;
}

function defaultNoteTypeLabel(value = "") {
  return String(value || "").trim() || "Note";
}

function defaultAttentionReasons() {
  return [];
}

function defaultShowsAsPoint(node = {}) {
  const tier = String(node?.starTier || "").trim().toLowerCase();
  return tier === "dust" || tier === "minor";
}

function graphVisualNodeDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    graphNodeClass: deps.graphNodeClass || defaultNodeClass,
    graphNodeStarRank: deps.graphNodeStarRank || defaultNodeStarRank,
    graphShortTitle: deps.graphShortTitle || defaultShortTitle,
    noteTypeLabel: deps.noteTypeLabel || defaultNoteTypeLabel,
    graphNodeAttentionReasons: deps.graphNodeAttentionReasons || defaultAttentionReasons,
    graphNodeShowsAsPoint: deps.graphNodeShowsAsPoint || defaultShowsAsPoint,
    labels: {
      isolatedNodeType: "Isolated note",
      isolatedNodeAction: "Organize isolated note",
      nodeRoleAction: "View note role",
      relationCountSuffix: "relations",
      metaSeparator: " · ",
      attentionPrefix: " (",
      attentionJoiner: ", ",
      attentionSuffix: ")",
      ...(deps.labels || {})
    }
  };
}

export function graphVisualNodeViewState(
  node = {},
  index = 0,
  {
    activeSelection = null,
    selectedNodeId = "",
    selectedNodeNeighborhood = new Set(),
    selectedThemeNoteIds = new Set(),
    selectedIsolatedNodeId = "",
    selectedBridgeNoteIds = new Set(),
    adjacencyMap = new Map(),
    readingLensState = null,
    filterActive = false,
    denseGalaxyMode = false,
    denseDirectoryMode = false,
    zoomKey = "fit"
  } = {},
  deps = {}
) {
  const {
    graphNodeClass,
    graphNodeStarRank,
    graphShortTitle,
    noteTypeLabel,
    graphNodeAttentionReasons,
    graphNodeShowsAsPoint,
    labels
  } = graphVisualNodeDeps(deps);
  const title = node.title || node.id;
  const starRank = graphNodeStarRank(node.starTier);
  const labelLimit = node.isHub
    ? (zoomKey === "fit" ? 12 : 18)
    : starRank >= 3
      ? (zoomKey === "fit" ? 10 : 15)
      : zoomKey === "fit"
        ? 6
        : zoomKey === "read"
          ? 10
          : 14;
  const label = graphShortTitle(title, labelLimit);
  const labelY = node.y + node.radius + 12;
  const metaY = labelY + 11;
  const labelQuota = denseGalaxyMode
    ? (zoomKey === "detail" ? 3 : zoomKey === "read" ? 1 : 0)
    : denseDirectoryMode
      ? zoomKey === "detail"
        ? 5
        : zoomKey === "read"
          ? 1
          : 0
      : zoomKey === "detail"
        ? 7
        : zoomKey === "read"
          ? 2
          : 0;
  const inSelectedTheme = selectedThemeNoteIds.has(node.id);
  const isolatedKey = String(node.isolatedKey || "").trim();
  const selectedIsolated = Boolean(
    selectedIsolatedNodeId === node.id ||
    (activeSelection?.kind === "isolated" && isolatedKey && activeSelection.isolatedKey === isolatedKey) ||
    (activeSelection?.kind === "isolatedComplete" && activeSelection.noteId === node.id)
  );
  const inSelectedBridge = selectedBridgeNoteIds.has(node.id);
  const selected = selectedNodeId === node.id;
  const inSelectedNodeNeighborhood = selectedNodeNeighborhood.has(node.id);
  const lensPriority = Boolean(!filterActive && readingLensState?.active && readingLensState.priorityNodeIds?.has(node.id));
  const lensSecondary = Boolean(!filterActive && readingLensState?.active && !lensPriority);
  const fitLensLabel = lensPriority && starRank >= 3;
  const showLabel = Boolean(zoomKey === "fit"
    ? (
        node.isFocused ||
        node.isHub ||
        selected ||
        inSelectedTheme ||
        selectedIsolated ||
        inSelectedBridge ||
        fitLensLabel
      )
    : (
        node.isFocused ||
        node.isHub ||
        node.isAnchor ||
        selected ||
        inSelectedNodeNeighborhood ||
        inSelectedTheme ||
        selectedIsolated ||
        inSelectedBridge ||
        lensPriority ||
        starRank >= 3 ||
        index < labelQuota
      ));
  const showMeta = Boolean(showLabel && zoomKey === "detail" && starRank >= 4 && (
    node.isHub ||
    node.isFocused ||
    selected ||
    inSelectedNodeNeighborhood ||
    inSelectedTheme ||
    selectedIsolated ||
    inSelectedBridge ||
    lensPriority
  ));
  const revealOnly = Boolean(
    !showLabel &&
    !selected &&
    !inSelectedTheme &&
    !selectedIsolated &&
    !inSelectedBridge &&
    !lensPriority &&
    (zoomKey === "fit" ? false : denseDirectoryMode && starRank <= 1)
  );
  const neighbors = [...(adjacencyMap.get(node.id) || [])];
  const metaLabel = node.isGraphIsolatedCandidate ? labels.isolatedNodeType : noteTypeLabel(node.noteType);
  const attentionReasons = graphNodeAttentionReasons(node, { selected, inSelectedTheme, selectedIsolated, inSelectedBridge });
  const attentionText = attentionReasons.length
    ? `${labels.attentionPrefix}${attentionReasons.join(labels.attentionJoiner)}${labels.attentionSuffix}`
    : "";
  const haloVisible = node.isGraphIsolatedCandidate || node.isFocused || selected || inSelectedTheme || selectedIsolated || inSelectedBridge || starRank >= 4;
  const haloTone = node.isGraphIsolatedCandidate || selectedIsolated
    ? "is-isolated"
    : inSelectedBridge
      ? "is-bridge"
      : node.isFocused || selected
        ? "is-focus"
        : inSelectedTheme
          ? "is-theme"
          : "is-anchor";
  const hitRadius = Math.max(18, Number(node.radius || 0) + 6);
  const glintRadius = Math.max(1.2, Number(node.radius || 0) * 0.12);
  const glintX = Number(node.x || 0) - Math.max(1.2, Number(node.radius || 0) * 0.24);
  const glintY = Number(node.y || 0) - Math.max(1.2, Number(node.radius || 0) * 0.24);
  const pointLike = Boolean(
    graphNodeShowsAsPoint(node) ||
    (denseGalaxyMode &&
      zoomKey === "fit" &&
      !node.isHub &&
      !node.isFocused &&
      !selected &&
      !inSelectedTheme &&
      !selectedIsolated &&
      !inSelectedBridge &&
      starRank <= 2)
  );
  const clusterArmDepth = Math.max(0, Math.min(1, Number(node.clusterArmDepth || 0)));
  const pointFade = pointLike ? Math.max(0.36, 0.94 - clusterArmDepth * 0.48) : 1;
  const glintFade = pointLike ? Math.max(0.18, 0.82 - clusterArmDepth * 0.52) : 1;
  const nodeStyle = `--graph-node-core-alpha:${pointFade.toFixed(2)};--graph-node-glint-alpha:${glintFade.toFixed(2)};`;
  return {
    typeClass: graphNodeClass(node.noteType),
    title,
    starRank,
    label,
    labelY,
    metaY,
    selected,
    inSelectedNodeNeighborhood,
    inSelectedTheme,
    selectedIsolated,
    inSelectedBridge,
    lensPriority,
    lensSecondary,
    showLabel,
    showMeta,
    revealOnly,
    neighbors,
    isolatedKey,
    metaLabel,
    attentionReasons,
    attentionText,
    haloVisible,
    haloTone,
    hitRadius,
    glintRadius,
    glintX,
    glintY,
    pointLike,
    nodeStyle,
    ariaLabel: `${node.isGraphIsolatedCandidate ? labels.isolatedNodeAction : labels.nodeRoleAction} ${title}`
  };
}

export function renderGraphVisualNodeView(node = {}, index = 0, context = {}, deps = {}) {
  const { escapeHtml, labels } = graphVisualNodeDeps(deps);
  const state = graphVisualNodeViewState(node, index, context, deps);
  return `
    <g class="graph-map-node graph-node ${state.typeClass} is-star-${escapeHtml(node.starTier || "minor")} ${node.isHub ? "is-hub" : ""} ${node.isFocused ? "is-focused" : ""} ${node.isContext ? "is-context" : ""} ${node.isAnchor ? "is-anchor" : ""} ${node.isGraphIsolatedCandidate ? "is-graph-isolated" : ""} ${state.selected ? "is-selected" : ""} ${state.inSelectedNodeNeighborhood ? "is-selected-neighborhood" : ""} ${state.lensPriority ? "is-lens-priority" : ""} ${state.lensSecondary ? "is-lens-secondary" : ""} ${state.selectedIsolated ? "is-isolated-selected" : ""} ${state.inSelectedTheme ? "is-theme-selected" : ""} ${state.inSelectedBridge ? "is-bridge-selected" : ""} ${state.revealOnly ? "is-label-on-hover" : ""}" style="${state.nodeStyle}" data-open-note="${escapeHtml(node.id)}" data-node-id="${escapeHtml(node.id)}" data-node-title="${escapeHtml(state.title)}" data-node-type="${escapeHtml(state.metaLabel)}" data-node-degree="${escapeHtml(String(Number(node.degree || 0)))}" data-node-neighbors="${escapeHtml(state.neighbors.join(","))}" data-node-attention="${escapeHtml(state.attentionReasons.join(","))}"${state.isolatedKey ? ` data-graph-isolated-key="${escapeHtml(state.isolatedKey)}"` : ""} role="button" tabindex="0" aria-label="${escapeHtml(state.ariaLabel)}">
      <title>${escapeHtml(state.title)}${labels.metaSeparator}${escapeHtml(state.metaLabel)}${labels.metaSeparator}${labels.relationCountPrefix || ""}${Number(node.degree || 0)} ${escapeHtml(labels.relationCountSuffix)}${escapeHtml(state.attentionText)}</title>
      <circle class="graph-map-node-hit" cx="${node.x}" cy="${node.y}" r="${state.hitRadius}"></circle>
      ${Number(node.auraRadius || 0) > 0 ? `<circle class="graph-map-node-aura is-${escapeHtml(node.starTier || "minor")}" cx="${node.x}" cy="${node.y}" r="${Number(node.auraRadius || 0)}"></circle>` : ""}
      ${state.haloVisible ? `<circle class="graph-map-node-orbit ${escapeHtml(state.haloTone)}" cx="${node.x}" cy="${node.y}" r="${Number(node.radius || 0) + 5.5}"></circle>` : ""}
      <circle class="graph-map-node-core" cx="${node.x}" cy="${node.y}" r="${node.radius}"></circle>
      ${state.pointLike ? "" : `<circle class="graph-map-node-glint" cx="${state.glintX}" cy="${state.glintY}" r="${state.glintRadius}"></circle>`}
      ${(state.showLabel || state.revealOnly) ? `<text class="graph-map-node-label${state.revealOnly ? " is-hover-reveal" : ""}" x="${node.x}" y="${state.labelY}" text-anchor="middle">${escapeHtml(state.label)}</text>` : ""}
      ${state.showMeta ? `<text class="graph-map-node-meta" x="${node.x}" y="${state.metaY}" text-anchor="middle">${escapeHtml(state.metaLabel)}${labels.metaSeparator}${Number(node.degree || 0)}</text>` : ""}
    </g>
  `;
}

export function renderGraphVisualNodeViews(nodes = [], context = {}, deps = {}) {
  return (Array.isArray(nodes) ? nodes : [])
    .map((node, index) => renderGraphVisualNodeView(node, index, context, deps))
    .join("");
}
