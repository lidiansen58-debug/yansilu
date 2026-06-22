function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function graphDataListFromElement(element = null, name = "") {
  return String(element?.getAttribute?.(name) || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function graphEdgeMatchesThinkingTarget(edgeElement = null, target = {}) {
  if (!edgeElement) return false;
  const edgeKey = String(target.edgeKey || "").trim();
  const edgeId = String(target.edgeId || "").trim();
  const fromId = String(target.fromId || "").trim();
  const toId = String(target.toId || "").trim();
  const relationType = String(target.relationType || "").trim().toLowerCase();
  if (edgeKey && String(edgeElement.getAttribute("data-edge-key") || "").trim() === edgeKey) return true;
  if (edgeId && String(edgeElement.getAttribute("data-edge-id") || "").trim() === edgeId) return true;
  if (!fromId || !toId) return false;
  const candidateFrom = String(edgeElement.getAttribute("data-edge-from") || "").trim();
  const candidateTo = String(edgeElement.getAttribute("data-edge-to") || "").trim();
  if (candidateFrom !== fromId || candidateTo !== toId) return false;
  return !relationType || String(edgeElement.getAttribute("data-edge-relation-type") || "").trim().toLowerCase() === relationType;
}

function graphThinkingHoverDeps(deps = {}) {
  return {
    document: deps.document || globalThis.document,
    getHoverCard: deps.getHoverCard || (() => null),
    resetHoverState: deps.resetHoverState || (() => {}),
    escapeHtml: deps.escapeHtml || defaultEscapeHtml
  };
}

export function resetGraphHoverDomState(deps = {}) {
  const { document, getHoverCard } = graphThinkingHoverDeps(deps);
  const panel = document?.querySelector?.(".graph-map-panel");
  if (!panel) return false;
  panel.classList.remove("is-hovering-node", "is-hovering-edge", "is-hovering-thinking");
  panel.querySelectorAll(".graph-map-node.is-dimmed, .graph-map-node.is-hovered").forEach((element) => {
    element.classList.remove("is-dimmed", "is-hovered");
  });
  panel.querySelectorAll(".graph-map-edge-group.is-dimmed, .graph-map-edge-group.is-hovered").forEach((element) => {
    element.classList.remove("is-dimmed", "is-hovered");
  });
  const card = getHoverCard();
  if (card) {
    card.innerHTML = `
      <strong>拖动、悬停或点击查看局部关系</strong>
      <span>拖动画布调整位置；把鼠标移到笔记或关系上，可以只看它附近的关系。</span>
    `;
  }
  return true;
}

export function applyGraphThinkingHoverDomState(thinkingElement = null, deps = {}) {
  const { document, getHoverCard, resetHoverState, escapeHtml } = graphThinkingHoverDeps(deps);
  const panel = document?.querySelector?.(".graph-map-panel");
  if (!panel || !thinkingElement) return false;
  const nodeIds = new Set(graphDataListFromElement(thinkingElement, "data-graph-thinking-node-ids"));
  const edgeTarget = {
    edgeKey: String(thinkingElement.getAttribute("data-graph-thinking-edge-key") || "").trim(),
    edgeId: String(thinkingElement.getAttribute("data-graph-thinking-edge-id") || "").trim(),
    fromId: String(thinkingElement.getAttribute("data-graph-thinking-edge-from") || "").trim(),
    toId: String(thinkingElement.getAttribute("data-graph-thinking-edge-to") || "").trim(),
    relationType: String(thinkingElement.getAttribute("data-graph-thinking-edge-type") || "").trim().toLowerCase()
  };
  const edgeElements = [...panel.querySelectorAll(".graph-map-edge-group")];
  const matchedEdges = new Set();
  edgeElements.forEach((element) => {
    if (!graphEdgeMatchesThinkingTarget(element, edgeTarget)) return;
    matchedEdges.add(element);
    const fromId = String(element.getAttribute("data-edge-from") || "").trim();
    const toId = String(element.getAttribute("data-edge-to") || "").trim();
    if (fromId) nodeIds.add(fromId);
    if (toId) nodeIds.add(toId);
  });
  if (!nodeIds.size && !matchedEdges.size) {
    resetHoverState();
    return false;
  }
  panel.classList.add("is-hovering-thinking");
  panel.classList.toggle("is-hovering-edge", Boolean(matchedEdges.size));
  panel.classList.toggle("is-hovering-node", !matchedEdges.size);
  panel.querySelectorAll(".graph-map-node").forEach((element) => {
    const candidateId = String(element.getAttribute("data-node-id") || "").trim();
    const hovered = Boolean(candidateId) && nodeIds.has(candidateId);
    element.classList.toggle("is-hovered", hovered);
    element.classList.toggle("is-dimmed", Boolean(candidateId) && !hovered);
  });
  edgeElements.forEach((element) => {
    const fromId = String(element.getAttribute("data-edge-from") || "").trim();
    const toId = String(element.getAttribute("data-edge-to") || "").trim();
    const connectsHighlightedNodes = nodeIds.size > 1 && nodeIds.has(fromId) && nodeIds.has(toId);
    const hovered = matchedEdges.has(element) || connectsHighlightedNodes;
    element.classList.toggle("is-hovered", hovered);
    element.classList.toggle("is-dimmed", !hovered);
  });
  const card = getHoverCard();
  if (card) {
    const title = String(thinkingElement.getAttribute("data-graph-thinking-title") || "待处理").trim() || "待处理";
    const kicker = String(thinkingElement.getAttribute("data-graph-thinking-kicker") || "可追问处").trim() || "可追问处";
    const detail = String(thinkingElement.getAttribute("data-graph-thinking-detail") || "").trim();
    const edgeCount = edgeElements.filter((element) => element.classList.contains("is-hovered")).length;
    card.innerHTML = `
      <strong>${escapeHtml(kicker)}：${escapeHtml(title)}</strong>
      <span>图中已标出 ${escapeHtml(String(nodeIds.size))} 条笔记${edgeCount ? `、${escapeHtml(String(edgeCount))} 条关系` : ""}${detail ? ` · ${escapeHtml(detail)}` : ""}</span>
    `;
  }
  return true;
}

export function applyGraphNodeHoverDomState(nodeElement = null, deps = {}) {
  const { document, getHoverCard, escapeHtml } = graphThinkingHoverDeps(deps);
  const panel = document?.querySelector?.(".graph-map-panel");
  if (!panel || !nodeElement) return false;
  const nodeId = String(nodeElement.getAttribute("data-node-id") || "").trim();
  if (!nodeId) return false;
  const neighbors = new Set(graphDataListFromElement(nodeElement, "data-node-neighbors"));
  neighbors.add(nodeId);
  panel.classList.add("is-hovering-node");
  panel.classList.remove("is-hovering-edge", "is-hovering-thinking");
  panel.querySelectorAll(".graph-map-node").forEach((element) => {
    const candidateId = String(element.getAttribute("data-node-id") || "").trim();
    element.classList.toggle("is-hovered", candidateId === nodeId);
    element.classList.toggle("is-dimmed", Boolean(candidateId) && !neighbors.has(candidateId));
  });
  panel.querySelectorAll(".graph-map-edge-group").forEach((element) => {
    const fromId = String(element.getAttribute("data-edge-from") || "").trim();
    const toId = String(element.getAttribute("data-edge-to") || "").trim();
    const related = fromId === nodeId || toId === nodeId;
    element.classList.toggle("is-hovered", related);
    element.classList.toggle("is-dimmed", !related);
  });
  const card = getHoverCard();
  if (card) {
    const title = String(nodeElement.getAttribute("data-node-title") || nodeId).trim() || nodeId;
    const type = String(nodeElement.getAttribute("data-node-type") || "笔记").trim() || "笔记";
    const degree = Number(nodeElement.getAttribute("data-node-degree") || 0) || 0;
    const neighborCount = Math.max(0, neighbors.size - 1);
    card.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(type)} · 直接连接 ${escapeHtml(String(degree))} 条 · 一跳邻居 ${escapeHtml(String(neighborCount))} 个</span>
    `;
  }
  return true;
}

export function applyGraphEdgeHoverDomState(edgeElement = null, deps = {}) {
  const { document, getHoverCard, escapeHtml } = graphThinkingHoverDeps(deps);
  const panel = document?.querySelector?.(".graph-map-panel");
  if (!panel || !edgeElement) return false;
  const fromId = String(edgeElement.getAttribute("data-edge-from") || "").trim();
  const toId = String(edgeElement.getAttribute("data-edge-to") || "").trim();
  const highlightedNodeIds = new Set([fromId, toId].filter(Boolean));
  panel.classList.add("is-hovering-edge");
  panel.classList.remove("is-hovering-node", "is-hovering-thinking");
  panel.querySelectorAll(".graph-map-node").forEach((element) => {
    const candidateId = String(element.getAttribute("data-node-id") || "").trim();
    element.classList.toggle("is-hovered", highlightedNodeIds.has(candidateId));
    element.classList.toggle("is-dimmed", Boolean(candidateId) && !highlightedNodeIds.has(candidateId));
  });
  panel.querySelectorAll(".graph-map-edge-group").forEach((element) => {
    const candidateFrom = String(element.getAttribute("data-edge-from") || "").trim();
    const candidateTo = String(element.getAttribute("data-edge-to") || "").trim();
    const sameEdge = candidateFrom === fromId && candidateTo === toId;
    element.classList.toggle("is-hovered", sameEdge);
    element.classList.toggle("is-dimmed", !sameEdge);
  });
  const card = getHoverCard();
  if (card) {
    const sourceTitle = String(edgeElement.getAttribute("data-edge-source-title") || fromId || "源笔记").trim() || "源笔记";
    const targetTitle = String(edgeElement.getAttribute("data-edge-target-title") || toId || "目标笔记").trim() || "目标笔记";
    const relation = String(edgeElement.getAttribute("data-edge-relation") || "关联").trim() || "关联";
    const group = String(edgeElement.getAttribute("data-edge-group") || "关系").trim() || "关系";
    const source = String(edgeElement.getAttribute("data-edge-source") || "自己").trim() || "自己";
    const rationale = String(edgeElement.getAttribute("data-edge-rationale") || "").trim();
    card.innerHTML = `
      <strong>${escapeHtml(sourceTitle)} → ${escapeHtml(targetTitle)}</strong>
      <span>${escapeHtml(group)} · ${escapeHtml(relation)} · ${escapeHtml(source)}${rationale ? ` · ${escapeHtml(rationale)}` : ""}</span>
    `;
  }
  return true;
}

export function graphThinkingHighlightAttrsForItem(item = {}, deps = {}) {
  const {
    escapeHtml = defaultEscapeHtml,
    cleanIds = (values = []) => (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean),
    edgeSelectionKey = () => ""
  } = deps;
  const nodeIds = cleanIds(item.highlightNodeIds);
  const edge = item.highlightEdge && typeof item.highlightEdge === "object" ? item.highlightEdge : {};
  const edgeId = String(item.highlightEdgeId || edge.id || "").trim();
  const edgeFrom = String(item.highlightEdgeFrom || edge.fromNoteId || "").trim();
  const edgeTo = String(item.highlightEdgeTo || edge.toNoteId || "").trim();
  const edgeType = String(item.highlightEdgeType || edge.relationType || "").trim().toLowerCase();
  const edgeKey = String(
    item.highlightEdgeKey || (edgeId || edgeFrom || edgeTo ? edgeSelectionKey({ id: edgeId, fromNoteId: edgeFrom, toNoteId: edgeTo, relationType: edgeType }) : "")
  ).trim();
  const attrs = [];
  if (nodeIds.length) attrs.push(`data-graph-thinking-node-ids="${escapeHtml(nodeIds.join(","))}"`);
  if (edgeKey) attrs.push(`data-graph-thinking-edge-key="${escapeHtml(edgeKey)}"`);
  if (edgeId) attrs.push(`data-graph-thinking-edge-id="${escapeHtml(edgeId)}"`);
  if (edgeFrom) attrs.push(`data-graph-thinking-edge-from="${escapeHtml(edgeFrom)}"`);
  if (edgeTo) attrs.push(`data-graph-thinking-edge-to="${escapeHtml(edgeTo)}"`);
  if (edgeType) attrs.push(`data-graph-thinking-edge-type="${escapeHtml(edgeType)}"`);
  if (!attrs.length) return "";
  attrs.unshift('data-graph-thinking-highlight="true"');
  attrs.push(`data-graph-thinking-kicker="${escapeHtml(item.kicker || "可追问处")}"`);
  attrs.push(`data-graph-thinking-title="${escapeHtml(item.title || "待处理")}"`);
  attrs.push(`data-graph-thinking-detail="${escapeHtml(item.detail || item.question || "这里值得继续判断。")}"`);
  return attrs.join(" ");
}
