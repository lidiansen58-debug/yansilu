function defaultRelationVisual(type = "") {
  const key = String(type || "associated_with").trim().toLowerCase();
  if (key === "supports" || key === "supports_view") return { key: "support" };
  if (key === "contradicts" || key === "opposes") return { key: "conflict" };
  if (key === "qualifies" || key === "limits") return { key: "boundary" };
  if (key === "bridges" || key === "connects") return { key: "bridge" };
  return { key: "associated" };
}

function defaultEdgeSelectionKey(edge = {}) {
  return String(edge?.id || `${edge?.fromNoteId || ""}->${edge?.toNoteId || ""}:${edge?.relationType || ""}`).trim();
}

function defaultReadingLensMeta(value = "insight") {
  const key = String(value || "insight").trim().toLowerCase();
  if (key === "bridge" || key === "argument") return { key };
  return { key: "insight" };
}

export function graphEdgeMatchesReadingLensForRuntime(edge = {}, lens = "insight", deps = {}) {
  const graphRelationVisual = deps.graphRelationVisual || defaultRelationVisual;
  const type = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const group = graphRelationVisual(type).key;
  if (lens === "bridge") return group === "bridge";
  if (lens === "argument") return group === "support" || group === "conflict" || group === "boundary";
  return group === "support" || group === "conflict" || group === "boundary" || group === "bridge";
}

export function graphBuildReadingLensStateForRuntime(
  { nodes = [], visibleEdges = [], bridgeGaps = [], lens = "insight" } = {},
  deps = {}
) {
  const graphReadingLensMeta = deps.graphReadingLensMeta || defaultReadingLensMeta;
  const graphEdgeSelectionKey = deps.graphEdgeSelectionKey || defaultEdgeSelectionKey;
  const graphRelationVisual = deps.graphRelationVisual || defaultRelationVisual;
  const graphNodeStarRank = deps.graphNodeStarRank || (() => 0);
  const graphEdgeMatchesReadingLens = deps.graphEdgeMatchesReadingLens || ((edge, activeLens) => graphEdgeMatchesReadingLensForRuntime(edge, activeLens, { graphRelationVisual }));
  const meta = graphReadingLensMeta(lens);
  const priorityEdgeKeys = new Set();
  const priorityNodeIds = new Set();
  const protectedNodeIds = new Set();
  const nodeMap = new Map((Array.isArray(nodes) ? nodes : []).map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));

  visibleEdges.forEach(({ edge }) => {
    if (!graphEdgeMatchesReadingLens(edge, meta.key)) return;
    const edgeKey = graphEdgeSelectionKey(edge);
    if (edgeKey) priorityEdgeKeys.add(edgeKey);
    [edge?.fromNoteId, edge?.toNoteId].forEach((id) => {
      const noteId = String(id || "").trim();
      if (noteId) priorityNodeIds.add(noteId);
    });
  });

  if (meta.key === "insight") {
    nodes.forEach((node) => {
      const degree = Number(node?.degree || 0) || 0;
      if (node?.isHub || node?.isAnchor || degree >= 3) priorityNodeIds.add(String(node.id || "").trim());
    });
  }

  if (meta.key === "bridge") {
    bridgeGaps.forEach((gap) => {
      [...(gap?.noteIds || []), ...(gap?.targetNoteIds || [])].forEach((id) => {
        const noteId = String(id || "").trim();
        if (noteId) {
          priorityNodeIds.add(noteId);
          protectedNodeIds.add(noteId);
        }
      });
    });
    nodes.forEach((node) => {
      if (node?.isGraphIsolatedCandidate) {
        const noteId = String(node.id || "").trim();
        if (noteId) {
          priorityNodeIds.add(noteId);
          protectedNodeIds.add(noteId);
        }
      }
    });
  }

  if (nodes.length >= 80 && visibleEdges.length >= 120) {
    const originalPriorityEdgeKeys = new Set(priorityEdgeKeys);
    const lensEdgeLimit = meta.key === "bridge" ? 8 : meta.key === "argument" ? 12 : 14;
    const scoredEdges = visibleEdges
      .filter(({ edge }) => {
        const edgeKey = graphEdgeSelectionKey(edge);
        return edgeKey && originalPriorityEdgeKeys.has(edgeKey);
      })
      .map(({ edge }) => {
        const edgeKey = graphEdgeSelectionKey(edge);
        const relationGroup = graphRelationVisual(edge?.relationType).key;
        const fromNode = nodeMap.get(String(edge?.fromNoteId || "").trim());
        const toNode = nodeMap.get(String(edge?.toNoteId || "").trim());
        const fromRank = graphNodeStarRank(fromNode?.starTier);
        const toRank = graphNodeStarRank(toNode?.starTier);
        const strongest = Math.max(fromRank, toRank);
        const weakest = Math.min(fromRank, toRank);
        const groupWeight =
          relationGroup === "bridge"
            ? 3.8
            : relationGroup === "conflict"
              ? 3.4
              : relationGroup === "boundary"
                ? 3.1
                : relationGroup === "support"
                  ? 2.8
                  : relationGroup === "flow"
                    ? 2.5
                    : 1.6;
        const degreeWeight = (Number(fromNode?.degree || 0) + Number(toNode?.degree || 0)) * 0.06;
        return {
          edgeKey,
          noteIds: [String(edge?.fromNoteId || "").trim(), String(edge?.toNoteId || "").trim()].filter(Boolean),
          score: groupWeight + strongest * 1.2 + weakest * 0.65 + degreeWeight
        };
      })
      .sort((left, right) => right.score - left.score);

    priorityEdgeKeys.clear();
    priorityNodeIds.clear();
    scoredEdges.slice(0, lensEdgeLimit).forEach((item) => {
      priorityEdgeKeys.add(item.edgeKey);
      item.noteIds.forEach((id) => {
        if (id) priorityNodeIds.add(id);
      });
    });
    visibleEdges.forEach(({ edge }) => {
      const edgeKey = graphEdgeSelectionKey(edge);
      if (!edgeKey || !originalPriorityEdgeKeys.has(edgeKey)) return;
      const fromId = String(edge?.fromNoteId || "").trim();
      const toId = String(edge?.toNoteId || "").trim();
      if (protectedNodeIds.has(fromId) || protectedNodeIds.has(toId)) {
        priorityEdgeKeys.add(edgeKey);
        if (fromId) priorityNodeIds.add(fromId);
        if (toId) priorityNodeIds.add(toId);
      }
    });
    protectedNodeIds.forEach((id) => {
      if (id) priorityNodeIds.add(id);
    });
  }

  if (nodes.length > 8 && priorityNodeIds.size >= nodes.length) {
    const limit = Math.max(8, Math.ceil(nodes.length * 0.38));
    const cappedPriorityNodeIds = nodes
      .slice()
      .sort((a, b) => {
        const bScore = (b?.isFocused ? 100 : 0) + (b?.isHub ? 40 : 0) + (b?.isAnchor ? 24 : 0) + Number(b?.degree || 0);
        const aScore = (a?.isFocused ? 100 : 0) + (a?.isHub ? 40 : 0) + (a?.isAnchor ? 24 : 0) + Number(a?.degree || 0);
        return bScore - aScore || String(a?.title || a?.id || "").localeCompare(String(b?.title || b?.id || ""), "zh-Hans-CN");
      })
      .slice(0, limit)
      .map((node) => String(node?.id || "").trim())
      .filter(Boolean);
    priorityNodeIds.clear();
    cappedPriorityNodeIds.forEach((id) => priorityNodeIds.add(id));
  }

  return {
    lens: meta.key,
    priorityEdgeKeys,
    priorityNodeIds,
    active: priorityEdgeKeys.size > 0 || priorityNodeIds.size > 0
  };
}

export function createGraphReadingLensStateController(deps = {}) {
  const graphEdgeMatchesReadingLens = (edge = {}, lens = "insight") =>
    graphEdgeMatchesReadingLensForRuntime(edge, lens, deps);
  return {
    graphEdgeMatchesReadingLens,
    graphBuildReadingLensState: (payload = {}) =>
      graphBuildReadingLensStateForRuntime(payload, {
        ...deps,
        graphEdgeMatchesReadingLens
      })
  };
}
