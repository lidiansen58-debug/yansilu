function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

export function graphHash(value = "") {
  return String(value || "").split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);
}

export function graphShortTitle(value = "", maxLength = 14) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(2, maxLength - 1))}…`;
}

export function graphNodeAttentionReasons(node = {}, { selected = false, inSelectedTheme = false, selectedIsolated = false, inSelectedBridge = false } = {}) {
  const reasons = [];
  if (selected) reasons.push("当前选中");
  if (node.isFocused) reasons.push("当前焦点");
  if (node.isGraphIsolatedCandidate || selectedIsolated) reasons.push("待关联笔记");
  if (inSelectedTheme) reasons.push("主题索引成员");
  if (inSelectedBridge) reasons.push("桥接推荐两端");
  if (node.isHub && !node.isFocused) reasons.push("关系最密集");
  if (node.isAnchor && !node.isHub) reasons.push("主题索引核心");
  if (!node.isGraphIsolatedCandidate && Number(node.degree || 0) >= 4) reasons.push("连接较多");
  return uniqueStrings(reasons);
}

export function graphNodeStarTier(node = {}) {
  if (node.isFocused) return "focus";
  if (node.isHub) return "core";
  if (node.isAnchor) return "major";
  if (node.isGraphIsolatedCandidate) return "isolated";
  const degree = Number(node.degree || 0);
  if (degree >= 10) return "major";
  if (degree >= 5) return "medium";
  if (degree >= 2) return "minor";
  return "dust";
}

export function graphNodeStarRank(tier = "") {
  if (tier === "focus") return 5;
  if (tier === "core") return 4;
  if (tier === "major") return 3;
  if (tier === "medium") return 2;
  if (tier === "minor") return 1;
  return 0;
}

export function graphNodeRadiusByTier(tier = "", degree = 0) {
  const safeDegree = Number(degree || 0);
  if (tier === "focus") return Number((8.8 + Math.min(3.6, safeDegree * 0.12)).toFixed(1));
  if (tier === "core") return Number((7.1 + Math.min(2.8, safeDegree * 0.11)).toFixed(1));
  if (tier === "major") return Number((5.2 + Math.min(1.8, safeDegree * 0.08)).toFixed(1));
  if (tier === "medium") return Number((3.1 + Math.min(0.9, safeDegree * 0.04)).toFixed(1));
  if (tier === "minor") return Number((1.55 + Math.min(0.45, safeDegree * 0.02)).toFixed(1));
  if (tier === "isolated") return 3.8;
  return 0.95;
}

export function graphNodeShowsAsPoint(node = {}) {
  const tier = String(node?.starTier || "").trim().toLowerCase();
  return tier === "dust" || tier === "minor";
}

export function graphDenseGalaxyMode({ nodes = [], edges = [], filterActive = false } = {}) {
  if (filterActive) return false;
  const nodeCount = Array.isArray(nodes) ? nodes.length : 0;
  const edgeCount = Array.isArray(edges) ? edges.length : 0;
  return edgeCount >= 140 || (nodeCount >= 80 && edgeCount >= 60);
}

export function graphEdgeVisibleAtFit(edge = {}, nodeMap = new Map(), options = {}, deps = {}) {
  const graphRelationVisual = deps.graphRelationVisual || (() => ({ key: "neutral" }));
  const from = nodeMap.get(String(edge?.fromNoteId || "").trim());
  const to = nodeMap.get(String(edge?.toNoteId || "").trim());
  const fromRank = graphNodeStarRank(from?.starTier);
  const toRank = graphNodeStarRank(to?.starTier);
  const strongest = Math.max(fromRank, toRank);
  const weakest = Math.min(fromRank, toRank);
  const relationType = String(edge?.relationType || "").trim().toLowerCase();
  const relationGroup = graphRelationVisual(relationType).key;
  const denseMode = options.denseMode === true;
  const intercluster = options.intercluster === true;
  if (relationGroup === "index") return true;
  if (denseMode) {
    if (relationGroup === "bridge") return strongest >= 3;
    if (relationGroup === "flow") {
      return intercluster ? strongest >= 3 && weakest >= 2 : strongest >= 4 && weakest >= 2;
    }
    if (["support", "conflict", "boundary"].includes(relationGroup)) {
      return intercluster ? strongest >= 4 && weakest >= 2 : strongest >= 4 && weakest >= 3;
    }
    return false;
  }
  if (strongest >= 4) return true;
  if (relationGroup === "bridge") return strongest >= 3;
  if (["support", "conflict", "boundary", "flow"].includes(relationGroup)) {
    return strongest >= 3 && weakest >= 2;
  }
  return false;
}

export function graphEdgePath(edge = {}, nodeMap = new Map(), deps = {}) {
  const graphRelationVisual = deps.graphRelationVisual || (() => ({ key: "neutral" }));
  const from = nodeMap.get(String(edge?.fromNoteId || "").trim());
  const to = nodeMap.get(String(edge?.toNoteId || "").trim());
  if (!from || !to) return null;

  if (from.id === to.id) {
    const loopRadius = from.radius + 18;
    return {
      d: `M ${from.x} ${from.y - from.radius - 3} C ${from.x + loopRadius} ${from.y - loopRadius * 2}, ${from.x + loopRadius * 2} ${from.y}, ${from.x + from.radius + 5} ${from.y}`,
      labelX: from.x + loopRadius + 4,
      labelY: from.y - loopRadius,
      titleX: from.x,
      titleY: from.y
    };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const startX = from.x + unitX * (from.radius + 5);
  const startY = from.y + unitY * (from.radius + 5);
  const endX = to.x - unitX * (to.radius + 8);
  const endY = to.y - unitY * (to.radius + 8);
  const relationGroup = graphRelationVisual(edge?.relationType).key;
  const signedSeed = ((graphHash(`${edge.fromNoteId}:${edge.toNoteId}:${edge.relationType}`) % 11) - 5) / 5;
  const curveBoost =
    relationGroup === "bridge"
      ? 1.34
      : relationGroup === "flow"
        ? 1.22
        : relationGroup === "boundary"
          ? 1.12
          : 1;
  const curveMagnitude = Math.min(78, Math.max(18, length * 0.12 * curveBoost));
  const curve = signedSeed === 0 ? curveMagnitude * 0.35 : signedSeed * curveMagnitude;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const controlOffsetX = -unitY * curve;
  const controlOffsetY = unitX * curve;
  const control1X = startX + dx * 0.32 + controlOffsetX;
  const control1Y = startY + dy * 0.32 + controlOffsetY;
  const control2X = startX + dx * 0.68 + controlOffsetX;
  const control2Y = startY + dy * 0.68 + controlOffsetY;
  const labelX = midX + controlOffsetX * 0.62;
  const labelY = midY + controlOffsetY * 0.62;
  return {
    d: `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${control1X.toFixed(1)} ${control1Y.toFixed(1)} ${control2X.toFixed(1)} ${control2Y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    labelX: Math.round(labelX),
    labelY: Math.round(labelY - 8),
    titleX: Math.round(midX),
    titleY: Math.round(midY)
  };
}

export function graphEdgeShouldRender(options = {}, deps = {}) {
  const {
    zoomKey = "fit",
    filterActive = false,
    relationType = "meaningful",
    fitVisible = false,
    connectsFocus = false,
    selected = false,
    inSelectedNodeNeighborhood = false,
    inSelectedTheme = false,
    inSelectedBridge = false,
    lensPriority = false,
    visualKey = "",
    denseMode = false,
    intercluster = false
  } = options || {};
  const graphViewModeForRelationType = deps.graphViewModeForRelationType || (() => "meaningful");
  if (zoomKey !== "fit") return true;
  if (filterActive) return true;
  if (graphViewModeForRelationType(relationType) === "structure" || visualKey === "index") {
    return fitVisible || lensPriority || selected || inSelectedTheme || inSelectedBridge;
  }
  if (denseMode) {
    return fitVisible || lensPriority || selected || inSelectedNodeNeighborhood || inSelectedTheme || inSelectedBridge || (intercluster && connectsFocus);
  }
  return fitVisible || lensPriority || selected || inSelectedNodeNeighborhood || inSelectedTheme || inSelectedBridge;
}

export function graphThemeBoundaryMeta({ nodes = [], noteIds = [], title = "", layoutWidth = 0, layoutHeight = 0 } = {}, deps = {}) {
  const cleanIds = deps.graphThinkingCleanIds || ((ids = []) => uniqueStrings(ids));
  const noteSet = new Set(cleanIds(noteIds));
  if (!noteSet.size) return null;
  const members = (Array.isArray(nodes) ? nodes : []).filter((node) => noteSet.has(String(node?.id || "").trim()));
  if (!members.length) return null;
  const minX = Math.min(...members.map((node) => Number(node.x || 0) - Number(node.radius || 0)));
  const maxX = Math.max(...members.map((node) => Number(node.x || 0) + Number(node.radius || 0)));
  const minY = Math.min(...members.map((node) => Number(node.y || 0) - Number(node.radius || 0)));
  const maxY = Math.max(...members.map((node) => Number(node.y || 0) + Number(node.radius || 0)));
  const padding = Math.max(34, Math.min(82, 28 + members.length * 0.55));
  const safeWidth = Math.max(1, Number(layoutWidth || 0));
  const safeHeight = Math.max(1, Number(layoutHeight || 0));
  const x = Math.max(18, Math.round(minX - padding));
  const y = Math.max(18, Math.round(minY - padding));
  const width = Math.max(96, Math.min(Math.round(maxX - minX + padding * 2), Math.round(safeWidth - x - 18)));
  const height = Math.max(78, Math.min(Math.round(maxY - minY + padding * 2), Math.round(safeHeight - y - 18)));
  const coverage = (width * height) / Math.max(1, safeWidth * safeHeight);
  const broad = members.length >= Math.max(24, nodes.length * 0.45) || coverage > 0.62;
  const compact = members.length <= 4 || coverage < 0.18;
  return {
    x,
    y,
    width,
    height,
    rx: Math.round(Math.min(64, Math.max(28, Math.min(width, height) * 0.18))),
    labelX: Math.round(x + 18),
    labelY: Math.round(y + 25),
    count: members.length,
    title: String(title || "待验证主题").trim() || "待验证主题",
    tone: broad ? "is-broad" : compact ? "is-compact" : "is-cluster",
    label: broad ? "松散主题范围" : compact ? "小型主题索引" : "主题索引范围"
  };
}

export function renderGraphThemeBoundary(boundary = null, deps = {}) {
  if (!boundary) return "";
  const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ""));
  return `
    <g class="graph-theme-boundary ${escapeHtml(boundary.tone)}" data-graph-theme-boundary="true" aria-hidden="true">
      <rect class="graph-theme-boundary-aura" x="${boundary.x}" y="${boundary.y}" width="${boundary.width}" height="${boundary.height}" rx="${boundary.rx}"></rect>
      <rect class="graph-theme-boundary-line" x="${boundary.x + 5}" y="${boundary.y + 5}" width="${Math.max(1, boundary.width - 10)}" height="${Math.max(1, boundary.height - 10)}" rx="${Math.max(1, boundary.rx - 5)}"></rect>
      <text class="graph-theme-boundary-label" x="${boundary.labelX}" y="${boundary.labelY}">${escapeHtml(boundary.label)} · ${escapeHtml(String(boundary.count))} 条</text>
    </g>
  `;
}
