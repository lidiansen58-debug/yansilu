function defaultNormalizeSelection(selection = null) {
  return selection;
}

function defaultRenderPanel() {
  return "";
}

function escapeFallbackHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderIsolatedCompleteFallback(selection = null) {
  const title = String(selection?.title || selection?.sourceTitle || selection?.noteId || "当前笔记").trim() || "当前笔记";
  const result = selection?.saveResult && typeof selection.saveResult === "object" ? selection.saveResult : {};
  const targetTitle = String(result.targetTitle || selection?.targetTitle || "").trim();
  const relationLabel = String(result.relationLabel || selection?.relationLabel || "").trim();
  return `
    <aside class="graph-selection-panel is-isolated is-complete" aria-label="孤立笔记已接入关系网">
      <div class="graph-selection-head">
        <div>
          <span class="graph-selection-kicker">已接入关系网</span>
          <strong>${escapeFallbackHtml(title)}</strong>
          <small>关系已保存</small>
        </div>
        <button class="graph-overlay-close graph-selection-close" type="button" data-graph-selection-close aria-label="收起处理结果" title="收起处理结果">×</button>
      </div>
      <div class="graph-selection-body">
        <section class="graph-isolated-complete-card">
          <small>已建立关系</small>
          <strong>${escapeFallbackHtml(targetTitle ? `已关联到：${targetTitle}` : "这条笔记已进入关系网")}</strong>
          <p>${escapeFallbackHtml(relationLabel ? `关系类型：${relationLabel}。` : "关系已保存。")}这条笔记已经退出未关联状态。</p>
        </section>
      </div>
    </aside>
  `;
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
    return panelRenderers.renderIsolatedCompletePanel({ selection: normalized, isolatedNotes, nodeMap, edges }) || renderIsolatedCompleteFallback(normalized);
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
