function defaultSetFrom(values = []) {
  return new Set((Array.isArray(values) ? values : []).filter(Boolean));
}

export function buildGraphPanelState({
  appState = {},
  graphState = {},
  folder = null,
  scopeDirectoryId = "",
  canReuseScopedGraph = false
} = {}, deps = {}) {
  const {
    graphRelationStatusCountsAsNetworkEdge = () => false,
    graphScopedItems = (graph) => ({ nodes: graph?.nodes || [], allNodes: graph?.nodes || [], edges: graph?.edges || [] }),
    normalizeGraphRelationTypeFilter = (value) => value || "meaningful",
    graphEdgeMatchesFilters = () => true,
    graphFocusedItems = (nodes = [], edges = [], allNodes = []) => ({ nodes, edges, allNodes, focused: false, focusedNoteId: "" }),
    graphNodeIdsInScope = (nodes = []) => defaultSetFrom(nodes.map((node) => node?.id)),
    graphRelationTouchesNodeScope = () => false,
    graphRelationInNodeScope = () => false,
    graphRelationVisual = () => ({ key: "neutral" }),
    graphMergeRelationsByKey = (a = [], b = []) => [...a, ...b],
    graphConflictItemInNodeScope = () => false,
    graphReviewQueueInNodeScope = (queue) => queue,
    graphBridgeGapInNodeScope = () => false,
    graphHasMeaningfulStructureEdges = () => false,
    graphStructureFallbackEdges = (edges = []) => edges,
    graphComputedIsolatedNotes = () => [],
    graphMarkIsolatedNodes = (nodes = []) => nodes,
    graphBuildIsolatedVisualNodes = () => [],
    graphBuildFocusedRelationTypeStats = () => null,
    normalizeGraphSelectionForVisibleItems = (selection) => selection,
    formatClockTime = () => "",
    graphPotentialRelationNodeMap = () => new Map(),
    graphWeakRelationClues = () => [],
    graphClueSummaryState = () => null,
    buildGraphThinkingItems = () => [],
    buildGraphQuestionSpotSummaryFromItems = () => null,
    graphIsolatedQueueItems = () => []
  } = deps;
  const fallbackConnectivity = {
    connectivityReady: false,
    connectedNoteIds: new Set(),
    visibleNoteIds: new Set(),
    visibleNoteIdsReady: true
  };
  if (graphState.loading && !canReuseScopedGraph) {
    return {
      kind: "loading",
      ...fallbackConnectivity,
      summaryText: `正在加载“${folder?.name || "永久笔记目录"}”的永久笔记关系...`,
      emptyMessage: "正在读取永久笔记盒及其子目录里的笔记、正式关系和待补说明。"
    };
  }
  if (graphState.error && !canReuseScopedGraph) {
    return {
      kind: "error",
      ...fallbackConnectivity,
      summaryText: "图谱暂时无法读取，笔记树仍可正常使用。",
      error: graphState.error
    };
  }
  const graph = canReuseScopedGraph ? graphState.item : null;
  if (!graph) {
    return {
      kind: "empty",
      ...fallbackConnectivity,
      summaryText: "0 条永久笔记，0 条关系"
    };
  }

  const allGraphEdges = Array.isArray(graph?.edges) ? graph.edges : [];
  const connectedNoteIds = new Set(
    allGraphEdges
      .filter((edge) => graphRelationStatusCountsAsNetworkEdge(edge?.status))
      .flatMap((edge) => [String(edge?.fromNoteId || "").trim(), String(edge?.toNoteId || "").trim()])
      .filter(Boolean)
  );
  const scoped = graphScopedItems(graph, { scopeDirectoryId });
  const filters = graphState.filters || { relationType: "all", status: "all" };
  const effectiveRelationType = normalizeGraphRelationTypeFilter(filters.relationType, "meaningful");
  const activeFilters = { ...filters, relationType: effectiveRelationType };
  const focusTraversalEdges = scoped.edges.filter((edge) => graphEdgeMatchesFilters(edge, activeFilters));
  const focused = graphFocusedItems(scoped.nodes, scoped.edges, scoped.allNodes, focusTraversalEdges);
  const showingFocusedNote = Boolean(focused.focused && focused.focusedNoteId);
  const graphInsights = graph?.insights && typeof graph.insights === "object" ? graph.insights : {};
  const scopedAllNodes = Array.isArray(scoped.allNodes) ? scoped.allNodes : scoped.nodes;
  const scopedActionNodeIds = graphNodeIdsInScope(scopedAllNodes);
  const scopedNetworkEdges = allGraphEdges.filter((edge) => graphRelationTouchesNodeScope(edge, scopedActionNodeIds));
  const topicCandidates = Array.isArray(graphState.aiAnalysis?.analysis?.topicCandidates) ? graphState.aiAnalysis.analysis.topicCandidates : [];
  const aiIsolatedNotes = Array.isArray(graphState.aiAnalysis?.analysis?.isolatedNotes) ? graphState.aiAnalysis.analysis.isolatedNotes : [];
  const insightConflictingRelations = (Array.isArray(graphInsights.conflictingRelations) ? graphInsights.conflictingRelations : []).filter((edge) => graphRelationInNodeScope(edge, scopedActionNodeIds));
  const scopedTensionRelations = (Array.isArray(scoped.edges) ? scoped.edges : []).filter((edge) => {
    const group = graphRelationVisual(edge?.relationType).key;
    return group === "conflict" || group === "boundary";
  });
  const conflictingRelations = graphMergeRelationsByKey(insightConflictingRelations, scopedTensionRelations);
  const conflictItems = (Array.isArray(graphState.conflicts?.conflicts) ? graphState.conflicts.conflicts : []).filter((item) => graphConflictItemInNodeScope(item, scopedActionNodeIds));
  const scopedReviewQueue = graphReviewQueueInNodeScope(graphState.reviewQueue, scopedActionNodeIds);
  const bridgeGaps = (Array.isArray(graphInsights.bridgeGaps) ? graphInsights.bridgeGaps : []).filter((gap) => graphBridgeGapInNodeScope(gap, scopedActionNodeIds));
  let filteredEdges = focused.edges.filter((edge) => graphEdgeMatchesFilters(edge, activeFilters));
  const structureFallback = effectiveRelationType === "index" && !showingFocusedNote && !filteredEdges.length && graphHasMeaningfulStructureEdges(focused.edges);
  if (structureFallback) {
    filteredEdges = graphStructureFallbackEdges(focused.edges, activeFilters);
  }
  const isolatedNotes = !showingFocusedNote ? graphComputedIsolatedNotes(scopedAllNodes, scopedNetworkEdges, aiIsolatedNotes) : [];
  const visibleNodeIds = new Set(filteredEdges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  let visibleNodes = !showingFocusedNote
    ? scopedAllNodes
    : effectiveRelationType === "all"
      ? focused.nodes
      : focused.nodes.filter((node) => visibleNodeIds.has(node.id));
  if (showingFocusedNote && !visibleNodes.length && focused.focusedNoteId) {
    visibleNodes = focused.nodes.filter((node) => node.id === focused.focusedNoteId);
  }
  visibleNodes = !showingFocusedNote ? graphMarkIsolatedNodes(visibleNodes, isolatedNotes) : visibleNodes;
  const edges = filteredEdges;
  const showIsolatedVisualNodes = !showingFocusedNote && (effectiveRelationType === "meaningful" || effectiveRelationType === "all");
  const isolatedVisualNodes = showIsolatedVisualNodes
    ? graphBuildIsolatedVisualNodes({ isolatedNotes, allNodes: scopedAllNodes, currentNodes: visibleNodes })
    : [];
  const visualNodes = isolatedVisualNodes.length ? [...visibleNodes, ...isolatedVisualNodes] : visibleNodes;
  const focusedRelationTypeStats = showingFocusedNote
    ? graphBuildFocusedRelationTypeStats(scoped.nodes, scoped.edges, scoped.allNodes, activeFilters)
    : null;
  const normalizedSelection = String(graphState.selection?.kind || "").trim().toLowerCase() !== "cluster"
    ? normalizeGraphSelectionForVisibleItems(graphState.selection, { nodes: visualNodes, edges, topicCandidates, isolatedNotes, bridgeGaps })
    : graphState.selection;
  const lastLoadedAtLabel = formatClockTime(graphState.lastLoadedAt);
  const lastErrorAtLabel = formatClockTime(graphState.lastErrorAt);
  const notices = [];
  const baseSummary = `${scopedAllNodes.length} 条永久笔记，${scoped.edges.length} 条关系`;
  if (graphState.loading) {
    notices.push({
      tone: "info",
      title: "正在刷新图谱",
      message: `${lastLoadedAtLabel ? `当前先保留 ${lastLoadedAtLabel} 的结果，` : ""}新的笔记和关系读完后会自动替换。`
    });
  }
  if (graphState.error) {
    notices.push({
      tone: "warn",
      title: "这次刷新没有成功",
      message: `${lastLoadedAtLabel ? `已保留 ${lastLoadedAtLabel} 的图谱快照。` : "已保留上一版图谱。"}${lastErrorAtLabel ? ` ${lastErrorAtLabel} 刷新失败。` : ""}${graphState.error}`,
      retry: true
    });
  }
  const summaryText = graphState.error
    ? `${baseSummary} 这次刷新失败，已保留上一版图谱。`
    : graphState.loading
      ? `${baseSummary} 正在刷新最新结果。`
      : baseSummary;
  const graphRelationTargetNodeMap = graphPotentialRelationNodeMap();
  scopedAllNodes.forEach((node) => {
    const id = String(node?.id || "").trim();
    if (id) graphRelationTargetNodeMap.set(id, { ...(graphRelationTargetNodeMap.get(id) || {}), ...node });
  });
  const weakRelationClueCount = !showingFocusedNote ? graphWeakRelationClues(edges, 6).length : 0;
  const clueSummary = !showingFocusedNote
    ? graphClueSummaryState({
        bridgeGapCount: bridgeGaps.length,
        weakRelationCount: weakRelationClueCount,
        reviewQueue: scopedReviewQueue,
        nodes: scopedAllNodes,
        edges: scopedNetworkEdges
      })
    : null;
  const thinkingItems = !showingFocusedNote
    ? buildGraphThinkingItems({
        nodes: scopedAllNodes,
        edges: scopedNetworkEdges,
        bridgeGaps,
        reviewQueue: scopedReviewQueue,
        conflictItems,
        conflictingRelations,
        aiAnalysis: graphState.aiAnalysis,
        isolatedNotes,
        nodeLookupMap: graphRelationTargetNodeMap
      })
    : [];
  const questionSpotSummary = !showingFocusedNote
    ? buildGraphQuestionSpotSummaryFromItems(thinkingItems, {
        artifactCount: Number(
          graphState.aiAnalysis?.reviewItems?.summary?.artifactCount ||
            graphState.aiAnalysis?.reviewItems?.storedArtifactIds?.length ||
            graphState.aiAnalysis?.reviewItems?.artifacts?.length ||
            0
        )
      })
    : null;
  const currentGraphQueueNoteId = String(normalizedSelection?.noteId || normalizedSelection?.nodeId || "").trim();
  const isolatedQueueItems = !showingFocusedNote
    ? graphIsolatedQueueItems({
        isolatedNotes,
        nodeMap: graphRelationTargetNodeMap,
        edges: scopedNetworkEdges,
        currentNoteId: currentGraphQueueNoteId,
        limit: 6
      })
    : [];

  return {
    kind: "ready",
    connectivityReady: true,
    connectedNoteIds,
    visibleNoteIds: new Set(visualNodes.map((node) => node.id)),
    visibleNoteIdsReady: true,
    backButtonHidden: !(appState.module === "graph" && String(appState.selectedFileId || "").trim()),
    summaryText,
    notices,
    graph,
    scoped,
    scopedAllNodes,
    scopedNetworkEdges,
    effectiveRelationType,
    focused,
    showingFocusedNote,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    scopedReviewQueue,
    edges,
    visualNodes,
    focusedRelationTypeStats,
    normalizedSelection,
    structureFallback,
    graphRelationTargetNodeMap,
    clueSummary,
    thinkingItems,
    questionSpotSummary,
    currentGraphQueueNoteId,
    isolatedQueueItems,
    sectionOpen: graphState.sectionOpen || {}
  };
}
