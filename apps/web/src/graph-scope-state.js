export function graphScopeDirectoryIdForRuntime(state = {}, deps = {}) {
  const {
    graphOriginalScopeDirectoryId = "dir_original_default",
    isDirectoryUnderOriginalRoot = () => false
  } = deps;
  const selected = String(state.selectedFolderId || "").trim();
  return selected && isDirectoryUnderOriginalRoot(selected) ? selected : graphOriginalScopeDirectoryId;
}

export function graphLoadedScopeCoversDirectoryForRuntime(graphState = {}, scopeDirectoryId = "", deps = {}) {
  const descendantDirectoryIds = deps.descendantDirectoryIds || ((id) => [id].filter(Boolean));
  const loadedDirectoryId = String(graphState.lastLoadedDirectoryId || "").trim();
  const targetDirectoryId = String(scopeDirectoryId || "").trim();
  if (!graphState.item || !loadedDirectoryId || !targetDirectoryId) return false;
  if (loadedDirectoryId === targetDirectoryId) return true;
  return descendantDirectoryIds(loadedDirectoryId).includes(targetDirectoryId);
}

export function graphScopedItemsForRuntime(graph = {}, context = {}, deps = {}) {
  const {
    scopeDirectoryId = "",
    focusedNoteId = "",
    notes = []
  } = context;
  const {
    descendantDirectoryIds = (id) => [id].filter(Boolean),
    typeFromFolder = () => "original"
  } = deps;
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const allEdges = Array.isArray(graph?.edges) ? graph.edges : [];
  const scopedDirectoryIds = new Set(descendantDirectoryIds(scopeDirectoryId));
  const scopedNodes = nodes.filter((node) => scopedDirectoryIds.has(String(node.directoryId || node.folderId || "").trim()));
  const cleanFocusedNoteId = String(focusedNoteId || "").trim();
  if (cleanFocusedNoteId && !scopedNodes.some((node) => String(node?.id || "").trim() === cleanFocusedNoteId)) {
    const focusedNote = (Array.isArray(notes) ? notes : []).find((note) => String(note?.id || "").trim() === cleanFocusedNoteId);
    const focusedFolderId = String(focusedNote?.folderId || focusedNote?.directoryId || "").trim();
    if (focusedNote && focusedFolderId && scopedDirectoryIds.has(focusedFolderId)) {
      scopedNodes.push({
        id: cleanFocusedNoteId,
        title: String(focusedNote.title || cleanFocusedNoteId).trim() || cleanFocusedNoteId,
        folderId: focusedFolderId,
        directoryId: focusedFolderId,
        noteType: String(focusedNote.noteType || (focusedFolderId ? typeFromFolder(focusedFolderId) : "") || "original").trim() || "original",
        status: String(focusedNote.status || "draft").trim() || "draft",
        degree: 0
      });
    }
  }
  const scopedNodeIds = new Set(scopedNodes.map((node) => node.id));
  const scopedEdges = allEdges.filter((edge) => scopedNodeIds.has(edge.fromNoteId) && scopedNodeIds.has(edge.toNoteId));
  const relatedNodeIds = new Set(scopedEdges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  return {
    scopeDirectoryId,
    allNodes: scopedNodes,
    nodes: scopedNodes.filter((node) => relatedNodeIds.has(node.id)),
    edges: scopedEdges
  };
}

export function graphFocusedItemsForRuntime(nodes = [], edges = [], allNodes = nodes, traversalEdges = edges, context = {}, deps = {}) {
  const normalizeGraphFocusDepth = deps.normalizeGraphFocusDepth || ((value) => String(value || "1"));
  const focusedNoteId = String(context.focusedNoteId || "").trim();
  if (!focusedNoteId) return { focusedNoteId: "", nodes, edges, focused: false };
  const focusDepth = normalizeGraphFocusDepth(context.focusDepth, "1");
  const adjacency = new Map();
  traversalEdges.forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (!fromId || !toId) return;
    if (!adjacency.has(fromId)) adjacency.set(fromId, new Set());
    if (!adjacency.has(toId)) adjacency.set(toId, new Set());
    adjacency.get(fromId).add(toId);
    adjacency.get(toId).add(fromId);
  });
  const visibleIds = new Set([focusedNoteId]);
  const queue = [{ id: focusedNoteId, depth: 0 }];
  const visited = new Set([focusedNoteId]);
  const maxDepth = focusDepth === "all" ? Number.POSITIVE_INFINITY : Number(focusDepth || 1) || 1;
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (current.depth >= maxDepth) continue;
    for (const neighborId of adjacency.get(current.id) || []) {
      visibleIds.add(neighborId);
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ id: neighborId, depth: current.depth + 1 });
    }
  }
  const relatedEdges = edges.filter((edge) => visibleIds.has(edge.fromNoteId) && visibleIds.has(edge.toNoteId));
  if (!relatedEdges.length) {
    return {
      focusedNoteId,
      nodes: allNodes.filter((node) => node.id === focusedNoteId),
      edges: [],
      focused: true,
      focusDepth
    };
  }
  return {
    focusedNoteId,
    nodes: nodes.filter((node) => visibleIds.has(node.id)),
    edges: relatedEdges,
    focused: true,
    focusDepth
  };
}

export function graphBuildFocusedRelationTypeStatsForRuntime(nodes = [], edges = [], allNodes = nodes, filters = {}, context = {}, deps = {}) {
  const normalizeGraphRelationTypeFilter = deps.normalizeGraphRelationTypeFilter || ((value) => String(value || "meaningful"));
  const graphEdgeMatchesFilters = deps.graphEdgeMatchesFilters || (() => true);
  const focusedItems = deps.graphFocusedItems || graphFocusedItemsForRuntime;
  const normalizedSelected = normalizeGraphRelationTypeFilter(filters.relationType, "meaningful");
  const normalizedStatus = String(filters.status || "all").trim().toLowerCase() || "all";
  const relationTypes = new Set(
    (Array.isArray(edges) ? edges : [])
      .map((edge) => String(edge?.relationType || "associated_with").trim().toLowerCase())
      .filter(Boolean)
  );
  const countFor = (relationType = "all") => {
    const traversalFilters = { relationType, status: normalizedStatus };
    const traversalEdges = (Array.isArray(edges) ? edges : []).filter((edge) => graphEdgeMatchesFilters(edge, traversalFilters));
    const focusedScope = focusedItems(nodes, edges, allNodes, traversalEdges, context);
    return focusedScope.edges.filter((edge) => graphEdgeMatchesFilters(edge, traversalFilters)).length;
  };
  const counts = {};
  relationTypes.forEach((relationType) => {
    const count = countFor(relationType);
    if (count > 0) counts[relationType] = count;
  });
  if (
    normalizedSelected &&
    !["meaningful", "all", "noisy", "index"].includes(normalizedSelected) &&
    !Object.prototype.hasOwnProperty.call(counts, normalizedSelected)
  ) {
    counts[normalizedSelected] = 0;
  }
  return {
    counts,
    totalCount: countFor("all"),
    meaningfulCount: countFor("meaningful"),
    noisyCount: countFor("noisy"),
    indexCount: countFor("index")
  };
}
