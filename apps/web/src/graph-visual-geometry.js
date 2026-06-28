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
  if (inSelectedTheme) reasons.push("主题候选成员");
  if (inSelectedBridge) reasons.push("桥接候选两端");
  if (node.isHub && !node.isFocused) reasons.push("关系最密集");
  if (node.isAnchor && !node.isHub) reasons.push("主题核心候选");
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
