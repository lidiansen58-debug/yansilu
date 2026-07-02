function graphVisualMapSelectionSet(values = []) {
  return new Set((Array.isArray(values) ? values : []).filter(Boolean));
}

export function buildGraphVisualMapAdjacencyMap(edges = []) {
  const adjacencyMap = new Map();
  (Array.isArray(edges) ? edges : []).forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (!fromId || !toId) return;
    if (!adjacencyMap.has(fromId)) adjacencyMap.set(fromId, new Set());
    if (!adjacencyMap.has(toId)) adjacencyMap.set(toId, new Set());
    adjacencyMap.get(fromId).add(toId);
    adjacencyMap.get(toId).add(fromId);
  });
  return adjacencyMap;
}

export function buildGraphVisualMapSelectionState({
  graphSelection = null,
  layoutNodes = [],
  layoutEdges = [],
  clusterMeta = [],
  topicCandidates = [],
  isolatedNotes = [],
  bridgeGaps = [],
  relationFilterEdges = [],
  selectionEdges = null,
  selectionNodeMap = null,
  layoutNodeMap = new Map(),
  adjacencyMap = new Map()
} = {}, deps = {}) {
  const {
    normalizeGraphSelectionForVisibleItems = (selection) => selection,
    graphNodeNeedsRelationWorkflow = () => false
  } = deps;

  const normalizedSelection = normalizeGraphSelectionForVisibleItems(graphSelection, {
    nodes: layoutNodes,
    edges: layoutEdges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta
  });
  const fallbackSelectionKind = String(graphSelection?.kind || "").trim();
  const fallbackSelectionNoteId = String(graphSelection?.noteId || graphSelection?.nodeId || "").trim();
  const activeSelection = normalizedSelection || (
    fallbackSelectionNoteId && ["isolated", "isolatedComplete", "relationForm"].includes(fallbackSelectionKind)
      ? { ...graphSelection, kind: fallbackSelectionKind, noteId: fallbackSelectionNoteId }
      : null
  );
  const contextualSelectionEdges = Array.isArray(selectionEdges)
    ? selectionEdges
    : Array.isArray(relationFilterEdges)
      ? relationFilterEdges
      : layoutEdges;
  const contextualNodeMap = selectionNodeMap instanceof Map ? new Map([...layoutNodeMap, ...selectionNodeMap]) : layoutNodeMap;
  const selectionNodeNeedsRelationWorkflow =
    activeSelection?.kind === "node" && graphNodeNeedsRelationWorkflow(activeSelection.nodeId, contextualSelectionEdges, contextualNodeMap);
  const selectedNodeId = activeSelection?.kind === "node" && !selectionNodeNeedsRelationWorkflow ? activeSelection.nodeId : "";
  const selectedNodeNeighborhood = new Set(selectedNodeId ? [selectedNodeId, ...(adjacencyMap.get(selectedNodeId) || [])] : []);
  const selectedEdgeKey = activeSelection?.kind === "edge" ? activeSelection.edgeKey : "";
  const selectedThemeNoteIds = graphVisualMapSelectionSet(activeSelection?.kind === "theme" ? activeSelection.noteIds || [] : []);
  const selectedIsolatedNodeId =
    activeSelection?.kind === "isolated" ? activeSelection.noteId : selectionNodeNeedsRelationWorkflow ? activeSelection.nodeId : "";
  const selectedBridgeNoteIds = graphVisualMapSelectionSet(
    activeSelection?.kind === "bridge" ? [activeSelection.noteId, activeSelection.targetNoteId].map((id) => String(id || "").trim()) : []
  );

  return {
    activeSelection,
    contextualSelectionEdges,
    contextualNodeMap,
    selectionNodeNeedsRelationWorkflow,
    selectedNodeId,
    selectedNodeNeighborhood,
    selectedEdgeKey,
    selectedThemeNoteIds,
    selectedIsolatedNodeId,
    selectedBridgeNoteIds
  };
}
