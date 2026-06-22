function defaultNormalizeSelection(selection = null) {
  return selection;
}

function defaultRenderPanel() {
  return "";
}

function graphSelectionRenderers(renderers = {}) {
  return {
    renderClusterPanel: renderers.renderClusterPanel || defaultRenderPanel,
    renderThemePanel: renderers.renderThemePanel || defaultRenderPanel,
    renderIsolatedPanel: renderers.renderIsolatedPanel || defaultRenderPanel,
    renderIsolatedCompletePanel: renderers.renderIsolatedCompletePanel || defaultRenderPanel,
    renderRelationFormPanel: renderers.renderRelationFormPanel || defaultRenderPanel,
    renderBridgePanel: renderers.renderBridgePanel || defaultRenderPanel,
    renderNodePanel: renderers.renderNodePanel || defaultRenderPanel,
    renderEdgePanel: renderers.renderEdgePanel || defaultRenderPanel
  };
}

export function graphSelectionDispatcherKind(selection = null) {
  return String(selection?.kind || "").trim();
}

export function renderGraphSelectionByKind(context = {}, renderers = {}) {
  const {
    selection = null,
    nodeMap = new Map(),
    edges = [],
    topicCandidates = [],
    isolatedNotes = [],
    bridgeGaps = [],
    clusterMeta = []
  } = context || {};
  const normalized = selection;
  if (!normalized) return "";
  const panelRenderers = graphSelectionRenderers(renderers);
  const kind = graphSelectionDispatcherKind(normalized);

  if (kind === "cluster") {
    return panelRenderers.renderClusterPanel({ selection: normalized, clusterMeta, nodeMap, edges });
  }
  if (kind === "theme") {
    return panelRenderers.renderThemePanel({ selection: normalized, topicCandidates, nodeMap, edges });
  }
  if (kind === "isolated") {
    return panelRenderers.renderIsolatedPanel({ selection: normalized, isolatedNotes, nodeMap, edges });
  }
  if (kind === "isolatedComplete") {
    return panelRenderers.renderIsolatedCompletePanel({ selection: normalized, isolatedNotes, nodeMap, edges });
  }
  if (kind === "relationForm") {
    return panelRenderers.renderRelationFormPanel({ selection: normalized, nodeMap, edges });
  }
  if (kind === "bridge") {
    return panelRenderers.renderBridgePanel({ selection: normalized, bridgeGaps, nodeMap });
  }
  if (kind === "node") {
    return panelRenderers.renderNodePanel({ selection: normalized, isolatedNotes, nodeMap, edges });
  }
  if (kind === "edge") {
    return panelRenderers.renderEdgePanel({ selection: normalized, nodeMap, edges });
  }
  return "";
}

export function renderGraphSelectionPanelViaDispatcher(context = {}, renderers = {}, deps = {}) {
  const {
    selection = null,
    nodeMap = new Map(),
    edges = [],
    topicCandidates = [],
    isolatedNotes = [],
    bridgeGaps = [],
    clusterMeta = []
  } = context || {};
  const normalizeSelection = deps.normalizeSelection || defaultNormalizeSelection;
  const normalized = normalizeSelection(selection, {
    nodes: [...nodeMap.values()],
    edges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta
  });
  return renderGraphSelectionByKind({
    selection: normalized,
    nodeMap,
    edges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta
  }, renderers);
}
