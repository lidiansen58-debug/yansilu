function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultRelationLabel(value = "") {
  return String(value || "").trim() || "Relation";
}

function defaultRelationSourceLabel(value = "") {
  return String(value || "").trim() || "Manual";
}

function defaultRelationGroupMeta() {
  return { label: "Relation" };
}

function defaultEdgeSelectionKey(edge = {}) {
  return String(edge.id || `${edge.fromNoteId || ""}->${edge.toNoteId || ""}`).trim();
}

function defaultEdgeVisibleAtFit() {
  return true;
}

function defaultEdgeShouldRender({ fitVisible = true } = {}) {
  return fitVisible;
}

function graphVisualEdgeDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    graphRelationTypeLabel: deps.graphRelationTypeLabel || defaultRelationLabel,
    graphRelationSourceLabel: deps.graphRelationSourceLabel || defaultRelationSourceLabel,
    graphRelationGroupMeta: deps.graphRelationGroupMeta || defaultRelationGroupMeta,
    graphEdgeSelectionKey: deps.graphEdgeSelectionKey || defaultEdgeSelectionKey,
    graphEdgeVisibleAtFit: deps.graphEdgeVisibleAtFit || defaultEdgeVisibleAtFit,
    graphEdgeShouldRender: deps.graphEdgeShouldRender || defaultEdgeShouldRender,
    labels: {
      sourceFallback: "Source note",
      targetFallback: "Target note",
      reviewRelation: "Review relation",
      directionWord: "to",
      metaSeparator: " · ",
      titleArrow: " -> ",
      rationalePrefix: " · ",
      ...(deps.labels || {})
    }
  };
}

export function graphVisualEdgeViewState(
  item = {},
  {
    layoutNodeMap = new Map(),
    selectedEdgeKey = "",
    selectedThemeNoteIds = new Set(),
    selectedBridgeNoteIds = new Set(),
    selectedNodeId = "",
    readingLensState = null,
    filterActive = false,
    denseGalaxyMode = false,
    zoomKey = "fit",
    relationType = "meaningful"
  } = {},
  deps = {}
) {
  const {
    graphRelationTypeLabel,
    graphRelationSourceLabel,
    graphRelationGroupMeta,
    graphEdgeSelectionKey,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender,
    labels
  } = graphVisualEdgeDeps(deps);
  const edge = item.edge || {};
  const visual = item.visual || {};
  const path = item.path || null;
  const connectsFocus = item.connectsFocus === true;
  const sourceTitle = edge.fromTitle || edge.fromNoteId || labels.sourceFallback;
  const targetTitle = edge.toTitle || edge.toNoteId || labels.targetFallback;
  const relationLabel = graphRelationTypeLabel(edge.relationType);
  const rationale = String(edge.rationale || "").trim();
  const sourceLabel = graphRelationSourceLabel(edge.createdBy);
  const relationGroup = graphRelationGroupMeta(edge.relationType);
  const showEdgePin = (filterActive || zoomKey !== "fit") && visual.key !== "index" && !denseGalaxyMode;
  const edgeKey = graphEdgeSelectionKey(edge);
  const selected = selectedEdgeKey === edgeKey;
  const fromId = String(edge?.fromNoteId || "").trim();
  const toId = String(edge?.toNoteId || "").trim();
  const inSelectedTheme = selectedThemeNoteIds.has(fromId) && selectedThemeNoteIds.has(toId);
  const inSelectedBridge = selectedBridgeNoteIds.size > 1 && selectedBridgeNoteIds.has(fromId) && selectedBridgeNoteIds.has(toId);
  const inSelectedNodeNeighborhood = Boolean(selectedNodeId) && (fromId === selectedNodeId || toId === selectedNodeId);
  const fromClusterIndex = Number(layoutNodeMap.get(fromId)?.clusterIndex ?? -1);
  const toClusterIndex = Number(layoutNodeMap.get(toId)?.clusterIndex ?? -1);
  const intercluster = fromClusterIndex >= 0 && toClusterIndex >= 0 && fromClusterIndex !== toClusterIndex;
  const lensPriority = !filterActive && readingLensState?.active && readingLensState.priorityEdgeKeys?.has(edgeKey);
  const lensSecondary = !filterActive && readingLensState?.active && !lensPriority;
  const fitVisible = graphEdgeVisibleAtFit(edge, layoutNodeMap, {
    denseMode: denseGalaxyMode,
    intercluster
  });
  const renderEdge = Boolean(path) && graphEdgeShouldRender({
    zoomKey,
    filterActive,
    relationType,
    fitVisible,
    connectsFocus,
    selected,
    inSelectedNodeNeighborhood,
    inSelectedTheme,
    inSelectedBridge,
    lensPriority,
    visualKey: visual.key,
    denseMode: denseGalaxyMode,
    intercluster
  });
  return {
    edge,
    visual,
    path,
    connectsFocus,
    sourceTitle,
    targetTitle,
    relationLabel,
    rationale,
    sourceLabel,
    relationGroup,
    showEdgePin,
    edgeKey,
    selected,
    fromId,
    toId,
    inSelectedTheme,
    inSelectedBridge,
    inSelectedNodeNeighborhood,
    intercluster,
    lensPriority,
    lensSecondary,
    fitVisible,
    renderEdge,
    ariaLabel: `${labels.reviewRelation} ${sourceTitle} ${labels.directionWord} ${targetTitle}`
  };
}

export function renderGraphVisualEdgeView(item = {}, context = {}, deps = {}) {
  const { escapeHtml, labels } = graphVisualEdgeDeps(deps);
  const state = graphVisualEdgeViewState(item, context, deps);
  if (!state.renderEdge) return "";
  const markerStyle = state.visual.key === "index" ? "" : ` style="--graph-edge-marker: url(#graph-arrow-${escapeHtml(state.visual.key)})"`;
  return `
    <g class="graph-map-edge-group graph-edge ${state.fitVisible ? "is-fit-visible" : "is-fit-hidden"} ${state.connectsFocus ? "is-focused-path" : ""} ${state.selected ? "is-selected" : ""} ${state.inSelectedNodeNeighborhood ? "is-selected-neighborhood" : ""} ${state.lensPriority ? "is-lens-priority" : ""} ${state.lensSecondary ? "is-lens-secondary" : ""} ${state.inSelectedTheme ? "is-theme-selected" : ""} ${state.inSelectedBridge ? "is-bridge-selected" : ""} ${state.intercluster ? "is-intercluster" : ""}" data-open-note="${escapeHtml(state.edge.fromNoteId || "")}" data-edge-key="${escapeHtml(state.edgeKey)}" data-edge-id="${escapeHtml(String(state.edge.id || "").trim())}" data-edge-from="${escapeHtml(state.edge.fromNoteId || "")}" data-edge-to="${escapeHtml(state.edge.toNoteId || "")}" data-edge-relation-type="${escapeHtml(String(state.edge.relationType || "").trim())}" data-edge-source-title="${escapeHtml(state.sourceTitle)}" data-edge-target-title="${escapeHtml(state.targetTitle)}" data-edge-relation="${escapeHtml(state.relationLabel)}" data-edge-group="${escapeHtml(state.relationGroup.label)}" data-edge-source="${escapeHtml(state.sourceLabel)}" data-edge-rationale="${escapeHtml(state.rationale)}" role="button" tabindex="0" aria-label="${escapeHtml(state.ariaLabel)}">
      <title>${escapeHtml(state.sourceTitle)}${labels.titleArrow}${escapeHtml(state.targetTitle)}${labels.metaSeparator}${escapeHtml(state.relationGroup.label)}${labels.metaSeparator}${escapeHtml(state.relationLabel)}${labels.metaSeparator}${escapeHtml(state.sourceLabel)}${state.rationale ? `${labels.rationalePrefix}${escapeHtml(state.rationale)}` : ""}</title>
      <path class="graph-map-edge-underlay ${escapeHtml(state.visual.className)}" d="${state.path.d}"></path>
      <path class="graph-map-edge ${escapeHtml(state.visual.className)}" d="${state.path.d}"${markerStyle}></path>
      <path class="graph-map-edge-hit" d="${state.path.d}"></path>
      ${state.showEdgePin ? `<circle class="graph-map-edge-pin ${escapeHtml(state.visual.className)}" cx="${state.path.titleX}" cy="${state.path.titleY}" r="3"></circle>` : ""}
    </g>
  `;
}

export function renderGraphVisualEdgeViews(items = [], context = {}, deps = {}) {
  return (Array.isArray(items) ? items : [])
    .map((item) => renderGraphVisualEdgeView(item, context, deps))
    .join("");
}
