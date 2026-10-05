import { graphLocalThemeGroups } from "./graph-local-theme-groups.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultRelationPairKey(leftNoteId = "", rightNoteId = "") {
  const normalized = [String(leftNoteId || "").trim(), String(rightNoteId || "").trim()].filter(Boolean).sort();
  return normalized.length === 2 ? `${normalized[0]}::${normalized[1]}` : "";
}

function graphThinkingModelDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    graphAiAnalysisPayload: deps.graphAiAnalysisPayload || ((result) => result?.analysis || result || {}),
    graphBridgeSelectionKey: deps.graphBridgeSelectionKey || ((gap = {}, index = 0) => String(gap?.id || gap?.key || index)),
    graphCandidateCanSaveRelation: deps.graphCandidateCanSaveRelation || (() => true),
    graphCandidateEndpointIds: deps.graphCandidateEndpointIds || ((candidate = {}) => ({
      sourceNoteId: String(candidate.fromNoteId || candidate.sourceNoteId || (Array.isArray(candidate.noteIds) ? candidate.noteIds[0] : "") || "").trim(),
      targetNoteId: String(candidate.toNoteId || candidate.targetNoteId || (Array.isArray(candidate.targetNoteIds) ? candidate.targetNoteIds[0] : "") || (Array.isArray(candidate.noteIds) ? candidate.noteIds[1] : "") || "").trim()
    })),
    graphCandidateTouchesNodeScope: deps.graphCandidateTouchesNodeScope || ((candidate = {}, nodeIds = new Set()) => {
      if (!nodeIds?.size) return true;
      const sourceNoteId = String(candidate.fromNoteId || candidate.sourceNoteId || "").trim();
      const targetNoteId = String(candidate.toNoteId || candidate.targetNoteId || "").trim();
      return Boolean((sourceNoteId && nodeIds.has(sourceNoteId)) || (targetNoteId && nodeIds.has(targetNoteId)));
    }),
    graphComputedIsolatedNotes: deps.graphComputedIsolatedNotes || ((nodes = [], _edges = [], aiIsolatedNotes = []) => {
      const nodeIds = new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean));
      return (Array.isArray(aiIsolatedNotes) ? aiIsolatedNotes : []).filter((note) => nodeIds.has(String(note?.noteId || note?.id || "").trim()));
    }),
    graphExistingRelationPairKeys: deps.graphExistingRelationPairKeys || (() => new Set()),
    graphFullNoteById: deps.graphFullNoteById || ((noteId = "", nodeMap = new Map()) => nodeMap.get(noteId) || null),
    graphIsolatedQueueItems: deps.graphIsolatedQueueItems || (({ isolatedNotes = [] } = {}) => (Array.isArray(isolatedNotes) ? isolatedNotes : [])),
    graphIsolatedSelectionKey: deps.graphIsolatedSelectionKey || ((note = {}, index = 0) => String(note?.noteId || note?.id || index)),
    graphLocalizedActionText: deps.graphLocalizedActionText || ((value = "", fallback = "") => String(value || fallback || "").trim()),
    graphNodeIdsInScope: deps.graphNodeIdsInScope || ((nodes = []) => new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean))),
    graphNoteHasSavedIsolationDisposition: deps.graphNoteHasSavedIsolationDisposition || (() => false),
    graphNoteIdFromIsolatedItem: deps.graphNoteIdFromIsolatedItem || ((item = {}) => String(item?.noteId || item?.id || "").trim()),
    graphPendingAiCandidateCount: deps.graphPendingAiCandidateCount || (() => ({ count: 0, pairKeys: new Set() })),
    graphPreferredPotentialRelationType: deps.graphPreferredPotentialRelationType || ((candidate = {}) => String(candidate.relationType || "associated_with").trim() || "associated_with"),
    graphRankThemeCandidates: deps.graphRankThemeCandidates || (() => []),
    graphRelationPairKey: deps.graphRelationPairKey || defaultRelationPairKey,
    graphRelationQualityLabel: deps.graphRelationQualityLabel || ((level = "") => String(level || "")),
    graphRelationReviewReasonLabel: deps.graphRelationReviewReasonLabel || ((reason = "") => String(reason || "")),
    graphRelationTypeLabel: deps.graphRelationTypeLabel || ((type = "") => String(type || "相关")),
    graphSelectEdgeActionAttrs: deps.graphSelectEdgeActionAttrs || (() => ""),
    graphThemeSelectionKey: deps.graphThemeSelectionKey || ((topic = {}, index = 0) => String(topic?.id || topic?.key || index))
  };
}

export function graphThinkingCleanIds(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return [...new Set(list.map((value) => String(value || "").trim()).filter(Boolean))];
}

export function graphThinkingNoteTitle(nodeMap = new Map(), id = "", fallback = "相关笔记") {
  const key = String(id || "").trim();
  if (!key) return fallback;
  const node = nodeMap.get(key);
  return String(node?.title || node?.name || key || fallback).trim() || fallback;
}

export function graphLiveAiAnalysisCountsForGraph(aiAnalysis = null, { nodes = null, edges = null, graph = null } = {}, deps = {}) {
  const {
    graphAiAnalysisPayload,
    graphCandidateEndpointIds,
    graphComputedIsolatedNotes,
    graphExistingRelationPairKeys,
    graphIsolatedQueueItems,
    graphNoteIdFromIsolatedItem,
    graphPendingAiCandidateCount
  } = graphThinkingModelDeps(deps);
  const analysis = graphAiAnalysisPayload(aiAnalysis);
  const graphNodes = Array.isArray(nodes) ? nodes : Array.isArray(graph?.nodes) ? graph.nodes : [];
  const graphEdges = Array.isArray(edges) ? edges : Array.isArray(graph?.edges) ? graph.edges : [];
  const scopedNodeIds = new Set(graphNodes.map((node) => String(node?.id || "").trim()).filter(Boolean));
  const candidateInScope = (candidate = {}) => {
    if (!scopedNodeIds.size) return true;
    const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
    if (!sourceNoteId && !targetNoteId) return true;
    return scopedNodeIds.has(sourceNoteId) || scopedNodeIds.has(targetNoteId);
  };
  const nodeMap = new Map(graphNodes.map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));
  const existingRelationPairKeys = graphExistingRelationPairKeys(graphEdges);
  const topicCount = (Array.isArray(analysis?.topicCandidates) ? analysis.topicCandidates : []).filter((topic) => {
    const noteIds = Array.isArray(topic?.noteIds) ? topic.noteIds : [];
    return !scopedNodeIds.size || noteIds.some((noteId) => scopedNodeIds.has(String(noteId || "").trim()));
  }).length;
  const bridgeCandidates = [
    ...(Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates.map((candidate) => ({ ...candidate, componentBridge: true })) : []),
    ...(Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates.filter((candidate) => candidate?.componentBridge === true) : [])
  ].filter(candidateInScope);
  const relationCandidates = (Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates : [])
    .filter((candidate) => candidate?.componentBridge !== true)
    .filter(candidateInScope);
  const bridgeResult = graphPendingAiCandidateCount(bridgeCandidates, { existingRelationPairKeys, bridgeOnly: true });
  const relationResult = graphPendingAiCandidateCount(relationCandidates, {
    existingRelationPairKeys,
    excludePairs: bridgeResult.pairKeys,
    excludeBridge: true
  });
  const scopedIsolatedNotes = (Array.isArray(analysis?.isolatedNotes) ? analysis.isolatedNotes : []).filter((note) => {
    const noteId = graphNoteIdFromIsolatedItem(note);
    return !scopedNodeIds.size || scopedNodeIds.has(noteId);
  });
  const computedIsolatedNotes = graphComputedIsolatedNotes(graphNodes, graphEdges, scopedIsolatedNotes);
  const isolatedCount = graphIsolatedQueueItems({
    isolatedNotes: computedIsolatedNotes,
    nodeMap,
    edges: graphEdges,
    limit: Math.max(1, computedIsolatedNotes.length || 1)
  }).length;
  return {
    topicCount,
    relationCount: relationResult.count,
    bridgeCount: bridgeResult.count,
    isolatedCount
  };
}

export function graphAiAnalysisSummaryStateForGraph({ aiAnalysis = null, nodes = null, edges = null, graph = null } = {}, deps = {}) {
  const analysis = aiAnalysis?.analysis || null;
  const summary = aiAnalysis?.reviewItems?.summary || {};
  const liveCounts = graphLiveAiAnalysisCountsForGraph(aiAnalysis, { nodes, edges, graph }, deps);
  const topicCount = Number(liveCounts.topicCount || 0);
  const relationCount = Number(liveCounts.relationCount || 0);
  const bridgeCount = Number(liveCounts.bridgeCount || 0);
  const isolatedCount = Number(liveCounts.isolatedCount || 0);
  const pendingCount = topicCount + relationCount + bridgeCount + isolatedCount;
  return {
    analysis,
    summary,
    pendingCount,
    topicCount,
    relationCount,
    bridgeCount,
    isolatedCount,
    totalCandidates: pendingCount || topicCount + relationCount + bridgeCount + isolatedCount
  };
}

export function buildGraphQuestionSpotSummaryForGraph({ reviewQueueTotal = 0, bridgeGaps = [], conflictCount = 0, aiAnalysis = null, nodes = null, edges = null, graph = null } = {}, deps = {}) {
  const reviewSummary = aiAnalysis?.reviewItems?.summary || {};
  const liveCounts = graphLiveAiAnalysisCountsForGraph(aiAnalysis, { nodes, edges, graph }, deps);
  const topicCount = Number(liveCounts.topicCount || 0);
  const bridgeCandidateCount = Number(liveCounts.bridgeCount || 0);
  const reviewCandidateCount = Number(liveCounts.relationCount || 0);
  const isolatedCount = Number(liveCounts.isolatedCount || 0);
  const artifactCount = Number(
    topicCount + bridgeCandidateCount + reviewCandidateCount + isolatedCount ||
      reviewSummary.artifactCount ||
      aiAnalysis?.reviewItems?.storedArtifactIds?.length ||
      aiAnalysis?.reviewItems?.artifacts?.length ||
      0
  );
  const categories = [
    { key: "theme", label: "可写主题推荐", count: topicCount },
    { key: "bridge", label: "缺少连接", count: Math.max(Number(bridgeGaps?.length || 0), bridgeCandidateCount) },
    { key: "review", label: "关系待确认", count: Math.max(Number(reviewQueueTotal || 0), reviewCandidateCount) },
    { key: "conflict", label: "反方或边界", count: Number(conflictCount || 0) },
    { key: "isolated", label: "待关联笔记", count: isolatedCount }
  ].filter((item) => Number(item.count || 0) > 0);
  const total = categories.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const detail = categories.length
    ? categories
        .slice(0, 3)
        .map((item) => `${item.count} ${item.label}`)
        .join("  ·  ")
    : "当前范围暂时没有明显需要继续追问的问题。";
  return {
    total,
    label: total ? `${total} 个可追问问题` : "暂无可追问问题",
    detail: categories.length ? `建议先看：${detail}` : detail,
    categories,
    artifactCount
  };
}

export function buildGraphQuestionSpotSummaryFromItems(items = [], { artifactCount = 0 } = {}) {
  const list = (Array.isArray(items) ? items : []).filter(Boolean);
  const categories = [
    { key: "theme", label: "可写主题推荐", count: list.filter((item) => item.view === "theme").length },
    { key: "bridge", label: "缺少连接", count: list.filter((item) => item.tone === "bridge" || item.tone === "isolated").length },
    { key: "review", label: "关系待确认", count: list.filter((item) => item.tone === "review").length },
    { key: "conflict", label: "反方或边界", count: list.filter((item) => item.tone === "conflict").length }
  ].filter((item) => Number(item.count || 0) > 0);
  const total = list.length;
  const detail = categories.length
    ? categories
        .slice(0, 3)
        .map((item) => `${item.count} ${item.label}`)
        .join("  · ")
    : "当前范围暂时没有明显需要继续追问的问题。";
  return {
    total,
    label: total ? `${total} 个可追问问题` : "暂无可追问问题",
    detail: categories.length ? `建议先看：${detail}` : detail,
    categories,
    artifactCount: Number(artifactCount || 0)
  };
}

export function buildGraphThinkingItemsForGraph({ nodes = [], edges = [], bridgeGaps = [], reviewQueue = null, conflictItems = [], conflictingRelations = [], aiAnalysis = null, isolatedNotes = [], nodeLookupMap = null } = {}, deps = {}) {
  const {
    escapeHtml,
    graphBridgeSelectionKey,
    graphCandidateCanSaveRelation,
    graphCandidateEndpointIds,
    graphCandidateTouchesNodeScope,
    graphExistingRelationPairKeys,
    graphFullNoteById,
    graphIsolatedSelectionKey,
    graphLocalizedActionText,
    graphNodeIdsInScope,
    graphNoteHasSavedIsolationDisposition,
    graphNoteIdFromIsolatedItem,
    graphPreferredPotentialRelationType,
    graphRankThemeCandidates,
    graphRelationPairKey,
    graphRelationQualityLabel,
    graphRelationReviewReasonLabel,
    graphRelationTypeLabel,
    graphSelectEdgeActionAttrs,
    graphThemeSelectionKey
  } = graphThinkingModelDeps(deps);
  const scopedNodeMap = new Map((Array.isArray(nodes) ? nodes : []).map((node) => [String(node?.id || ""), node]).filter(([id]) => id));
  const nodeMap = nodeLookupMap instanceof Map ? nodeLookupMap : scopedNodeMap;
  const scopedNodeIds = graphNodeIdsInScope(nodes);
  const analysis = aiAnalysis?.analysis || null;
  const currentIsolatedIds = new Set(
    (Array.isArray(isolatedNotes) ? isolatedNotes : [])
      .map((note) => graphNoteIdFromIsolatedItem(note))
      .filter(Boolean)
  );
  const existingRelationPairKeys = graphExistingRelationPairKeys(edges);
  const items = [];
  const addItem = (item) => {
    const id = String(item?.id || "").trim();
    if (!id) return;
    items.push({
      priority: 50,
      view: "organize",
      tone: "neutral",
      actionLabel: "查看",
      actionAttrs: "",
      ...item,
      id
    });
  };

  graphLocalThemeGroups({ nodes, edges }).forEach((group) => {
    const title = String(group.anchor.title || group.anchor.id);
    addItem({
      id: `local-theme-${group.anchor.id}`,
      priority: 86,
      view: "theme",
      tone: "theme",
      title,
      meta: `${group.noteIds.length} 条笔记 · ${group.edges.length} 条已保存关系`,
      detail: group.notes.filter((note) => note.id !== group.anchor.id).map((note) => note.title || note.id).join("、"),
      question: "这些相关笔记，能否围绕一个问题写作？由你确认问题和材料。",
      actionLabel: "整理材料",
      actionAttrs: `data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(group.noteIds.join(","))}" data-graph-theme-title="${escapeHtml(title)}"`,
      highlightNodeIds: group.noteIds
    });
  });

  graphRankThemeCandidates(analysis?.topicCandidates, { nodeMap, edges }).slice(0, 4).forEach(({ topic, originalIndex, quality }, index) => {
    const noteIds = Array.isArray(topic?.noteIds) ? topic.noteIds.filter(Boolean) : [];
    const topicKey = graphThemeSelectionKey(topic, originalIndex);
    addItem({
      id: `topic-${topicKey}`,
      priority: Number(quality?.listPriority || 86) - index * 0.1,
      view: "theme",
      tone: "theme",
      kicker: "可写主题推荐",
      title: String(topic?.title || "可选择目标").trim() || "可选择目标",
      meta: `${noteIds.length || "若干"} 条笔记 ·  ${quality?.listLabel || "可选择目标"}`,
      detail: String(topic?.rationale || quality?.detail || "多条永久笔记出现相近推荐理由，适合判断是否形成明确主题。").trim(),
      question: quality?.listQuestion || "这组笔记能否写成一句可争论的判断，而不只是共享同一个标签？",
      actionLabel: "确认主题",
      actionAttrs: `data-graph-select-theme="${escapeHtml(topicKey)}"`,
      highlightNodeIds: noteIds
    });
  });

  (Array.isArray(bridgeGaps) ? bridgeGaps : []).filter((gap) => Array.isArray(gap?.noteIds) && scopedNodeMap.has(String(gap.noteIds[0] || "").trim()))
    .filter((gap) => !gap?.targetNoteIds?.[0] || nodeMap.has(String(gap.targetNoteIds[0]).trim()))
    .filter((gap) => gap?.targetNoteIds?.[0] || !currentIsolatedIds.has(String(gap.noteIds[0] || "").trim()))
    .slice(0, 5).forEach((gap, index) => {
    const sourceNoteId = String(gap?.noteIds?.[0] || "").trim();
    const sourceTitle = graphThinkingNoteTitle(nodeMap, sourceNoteId, "当前笔记");
    const targetNoteId = String(gap?.targetNoteIds?.[0] || "").trim();
    const targetTitle = graphThinkingNoteTitle(nodeMap, targetNoteId, "");
    const gapType = String(gap?.gapType || "bridge_gap").trim().toLowerCase();
    const bridgeKey = graphBridgeSelectionKey(gap, index);
    addItem({
      id: `bridge-${bridgeKey}`,
      priority: 84 - index,
      view: "organize",
      tone: "bridge",
      kicker: gapType === "disconnected_cluster" ? "分开的笔记组" : "可对照笔记",
      title: sourceTitle,
      meta: targetTitle ? `对照「${targetTitle}」` : "查看是否有相关观点",
      detail: targetTitle
        ? existingRelationPairKeys.has(graphRelationPairKey(sourceNoteId, targetNoteId))
          ? "两条笔记已有关系；可以阅读内容，检查是否需要补充。"
          : "两条笔记尚无直接关系；分处两组不代表必须关联，先对照内容。"
        : "图谱中尚未找到明确目标；可以寻找相关观点，也可以保持独立。",
      question: targetTitle ? `它和「${targetTitle}」是否确实互相说明？` : "是否存在值得保留的关联？",
      actionLabel: "对照笔记",
      actionAttrs: `data-graph-select-bridge="${escapeHtml(bridgeKey)}" data-graph-bridge-note="${escapeHtml(sourceNoteId)}"${targetNoteId ? ` data-graph-target-note="${escapeHtml(targetNoteId)}"` : ""}`,
      highlightNodeIds: [sourceNoteId, targetNoteId]
    });
  });

  const reviewItems = Array.isArray(reviewQueue?.items) ? reviewQueue.items : [];
  const missingReasons = (Array.isArray(edges) ? edges : []).filter((edge) =>
    nodeMap.has(String(edge?.fromNoteId || "")) && nodeMap.has(String(edge?.toNoteId || "")) &&
    !String(edge?.rationale || "").trim() &&
    String(edge?.createdBy || edge?.source || "") !== "markdown_wikilink" &&
    !reviewItems.some((item) => item.id && item.id === edge.id)
  );
  [...reviewItems, ...missingReasons].slice(0, 5).forEach((item, index) => {
    const source = item.source || {};
    const target = item.target || {};
    const sourceTitle = graphThinkingNoteTitle(nodeMap, item.fromNoteId || source.id, source.title || "源笔记");
    const targetTitle = graphThinkingNoteTitle(nodeMap, item.toNoteId || target.id, target.title || "目标笔记");
    const rationale = String(item.rationale || "").trim();
    const isBodyLink = rationale === "markdown_wikilink" || String(item.createdBy || item.source || "") === "markdown_wikilink";
    const edgeTarget = {
      id: item.id,
      fromNoteId: item.fromNoteId || source.id || "",
      toNoteId: item.toNoteId || target.id || "",
      relationType: item.relationType,
      createdBy: item.createdBy
    };
    addItem({
      id: `review-${String(item.id || item.fromNoteId || index)}`,
      priority: 78 - index,
      view: "organize",
      tone: "review",
      kicker: "关系待确认",
      title: `${sourceTitle} -> ${targetTitle}`,
      meta: isBodyLink ? "正文关联 · 上下文在来源笔记中" : !rationale ? "关系记录未填写单独说明" : graphRelationTypeLabel(item.relationType),
      detail: isBodyLink ? "阅读来源正文，检查两条笔记怎样互相说明；已有链接无需重复建立。" : rationale || "可以对照两条笔记补充理由；没有单独说明不代表关系不成立。",
      question: "对照两条笔记，是否需要补充理由或调整方向？",
      actionLabel: "查看关系",
      actionAttrs: graphSelectEdgeActionAttrs(edgeTarget),
      highlightNodeIds: [edgeTarget.fromNoteId, edgeTarget.toNoteId],
      highlightEdge: edgeTarget
    });
  });

  (Array.isArray(conflictItems) ? conflictItems : []).slice(0, 3).forEach((item, index) => {
    const noteIds = graphThinkingCleanIds(
      Array.isArray(item?.noteIds) && item.noteIds.length
        ? item.noteIds
        : Array.isArray(item?.notes)
          ? item.notes.map((note) => note?.id)
          : []
    );
    const noteId = String(noteIds[0] || "").trim();
    addItem({
      id: `conflict-${String(item?.id || noteId || index)}`,
      priority: 72 - index,
      view: "organize",
      tone: "conflict",
      kicker: "冲突/边界",
      title: String(item?.title || "关系可能造成歧义").trim() || "关系可能造成歧义",
      meta: String(item?.conflictType || "待确认").trim() || "待确认",
      detail: String(item?.rationale || "这里可能让概念边界变模糊，适合检查是否需要拆分或改名。").trim(),
      question: "这里的张力是在提示真实反驳，还是概念命名还不够清楚？",
      actionLabel: noteId ? "查看笔记" : "继续判断",
      actionAttrs: noteId ? `data-open-note="${escapeHtml(noteId)}"` : "",
      highlightNodeIds: noteIds
    });
  });

  (Array.isArray(conflictingRelations) ? conflictingRelations : []).slice(0, 3).forEach((edge, index) => {
    const sourceTitle = edge.fromTitle || graphThinkingNoteTitle(nodeMap, edge.fromNoteId, "源笔记");
    const targetTitle = edge.toTitle || graphThinkingNoteTitle(nodeMap, edge.toNoteId, "目标笔记");
    addItem({
      id: `tension-${String(edge.id || edge.fromNoteId || index)}-${String(edge.toNoteId || "")}`,
      priority: 68 - index,
      view: "organize",
      tone: "conflict",
      kicker: "反方/边界",
      title: `${sourceTitle} -> ${targetTitle}`,
      meta: graphRelationTypeLabel(edge.relationType),
      detail: String(edge.rationale || "这条关系可能保留了反驳、限定或边界条件。").trim(),
      question: "这条边界条件应当写进主题判断，还是拆成一条独立的反例笔记？",
      actionLabel: "确认边界",
      actionAttrs: graphSelectEdgeActionAttrs(edge),
      highlightNodeIds: [edge.fromNoteId, edge.toNoteId],
      highlightEdge: edge
    });
  });

  (Array.isArray(isolatedNotes) ? isolatedNotes : [])
    .filter((note) => currentIsolatedIds.has(graphNoteIdFromIsolatedItem(note)) && scopedNodeMap.has(graphNoteIdFromIsolatedItem(note)))
    .filter((note) => !(Array.isArray(edges) ? edges : []).some((edge) => edge.fromNoteId === graphNoteIdFromIsolatedItem(note) || edge.toNoteId === graphNoteIdFromIsolatedItem(note)))
    .filter((note) => !graphNoteHasSavedIsolationDisposition(graphFullNoteById(graphNoteIdFromIsolatedItem(note), nodeMap) || note))
    .slice(0, 5).forEach((note, index) => {
      const noteId = String(note?.noteId || note?.id || "").trim();
      const isolatedKey = graphIsolatedSelectionKey(note, index);
      addItem({
        id: `isolated-${String(noteId || index)}`,
        priority: 64 - index,
        view: "organize",
        tone: "isolated",
        kicker: "待关联笔记",
        title: graphThinkingNoteTitle(nodeMap, noteId, "待关联笔记"),
        meta: "当前范围内没有已保存的关系",
        detail: String(graphFullNoteById(noteId, nodeMap)?.thesis || note?.thesis || "可查找相关观点，也可以保持独立。").trim(),
        question: "有没有另一条笔记能支持、反驳或补充这个观点？没有就保持独立。",
        actionLabel: "整理",
        actionAttrs: `data-graph-select-isolated="${escapeHtml(isolatedKey)}" data-graph-isolated-note="${escapeHtml(noteId)}"`,
        highlightNodeIds: [noteId]
      });
    });

  (Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates : [])
    .filter((candidate) => !candidate?.componentBridge)
    .filter((candidate) => graphCandidateTouchesNodeScope(candidate, scopedNodeIds))
    .filter((candidate) => graphCandidateCanSaveRelation(candidate))
    .filter((candidate) => {
      const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
      const pairKey = graphRelationPairKey(sourceNoteId, targetNoteId);
      return pairKey && !existingRelationPairKeys.has(pairKey);
    })
    .slice(0, 4).forEach((candidate, index) => {
      const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
      const relationType = graphPreferredPotentialRelationType(candidate);
      const sourceTitle = graphThinkingNoteTitle(nodeMap, sourceNoteId, "源笔记");
      const targetTitle = graphThinkingNoteTitle(nodeMap, targetNoteId, "目标笔记");
      addItem({
        id: `candidate-${String(candidate?.id || sourceNoteId || index)}-${String(targetNoteId || "")}`,
        priority: 60 - index,
        view: "organize",
        tone: "review",
        kicker: "关系推荐",
        title: `${sourceTitle} -> ${targetTitle}`,
        meta: `${graphRelationTypeLabel(relationType)}  ·  待确认`,
        detail: String(candidate.rationale || "本地图谱扫描发现两条笔记可能有关联，需要人工判断。").trim(),
        question: "这条可选关系能不能说清“为什么相连”，还是只是标题相似？",
        actionLabel: "查看源笔记",
        actionAttrs: `data-open-note="${escapeHtml(sourceNoteId)}"`,
        highlightNodeIds: [sourceNoteId, targetNoteId]
      });
    });

  return items.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
}
