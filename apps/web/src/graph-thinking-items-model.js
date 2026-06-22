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
    { key: "theme", label: "涓婚鍊欓€?", count: topicCount },
    { key: "bridge", label: "缂哄皯杩炴帴", count: Math.max(Number(bridgeGaps?.length || 0), bridgeCandidateCount) },
    { key: "review", label: "鍏崇郴寰呭鏍?", count: Math.max(Number(reviewQueueTotal || 0), reviewCandidateCount) },
    { key: "conflict", label: "鍙嶆柟鎴栬竟鐣?", count: Number(conflictCount || 0) },
    { key: "isolated", label: "寰呭叧鑱旂瑪璁?", count: isolatedCount }
  ].filter((item) => Number(item.count || 0) > 0);
  const total = categories.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const detail = categories.length
    ? categories
        .slice(0, 3)
        .map((item) => `${item.count} ${item.label}`)
        .join(" 路 ")
    : "褰撳墠鑼冨洿鏆傛椂娌℃湁鏄庢樉闇€瑕佺户缁拷鐨勯棶棰樸€?";
  return {
    total,
    label: total ? `${total} 涓彲杩介棶棰?` : "鏆傛棤鍙拷闂",
    detail: categories.length ? `寤鸿鍏堢湅锛?${detail}` : detail,
    categories,
    artifactCount
  };
}

export function buildGraphQuestionSpotSummaryFromItems(items = [], { artifactCount = 0 } = {}) {
  const list = (Array.isArray(items) ? items : []).filter(Boolean);
  const categories = [
    { key: "theme", label: "涓婚鍊欓€?", count: list.filter((item) => item.view === "theme").length },
    { key: "bridge", label: "缂哄皯杩炴帴", count: list.filter((item) => item.tone === "bridge" || item.tone === "isolated").length },
    { key: "review", label: "鍏崇郴寰呭鏍?", count: list.filter((item) => item.tone === "review").length },
    { key: "conflict", label: "鍙嶆柟鎴栬竟鐣?", count: list.filter((item) => item.tone === "conflict").length }
  ].filter((item) => Number(item.count || 0) > 0);
  const total = list.length;
  const detail = categories.length
    ? categories
        .slice(0, 3)
        .map((item) => `${item.count} ${item.label}`)
        .join(" 璺?")
    : "褰撳墠鑼冨洿鏆傛椂娌℃湁鏄庢樉闇€瑕佺户缁拷鐨勯棶棰樸€?";
  return {
    total,
    label: total ? `${total} 涓彲杩介棶棰?` : "鏆傛棤鍙拷闂",
    detail: categories.length ? `寤鸿鍏堢湅锛?${detail}` : detail,
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
      actionLabel: "鏌ョ湅",
      actionAttrs: "",
      ...item,
      id
    });
  };

  graphRankThemeCandidates(analysis?.topicCandidates, { nodeMap, edges }).slice(0, 4).forEach(({ topic, originalIndex, quality }, index) => {
    const noteIds = Array.isArray(topic?.noteIds) ? topic.noteIds.filter(Boolean) : [];
    const topicKey = graphThemeSelectionKey(topic, originalIndex);
    addItem({
      id: `topic-${topicKey}`,
      priority: Number(quality?.listPriority || 86) - index * 0.1,
      view: "theme",
      tone: "theme",
      kicker: "涓婚鍊欓€?",
      title: String(topic?.title || "寰呴獙璇佷富棰?").trim() || "寰呴獙璇佷富棰?",
      meta: `${noteIds.length || "鑻ュ共"} 鏉＄瑪璁?路 ${quality?.listLabel || "寰呴獙璇佷富棰?"}`,
      detail: String(topic?.rationale || quality?.detail || "澶氭潯姘镐箙绗旇鍑虹幇鐩歌繎绾跨储锛岄€傚悎鍒ゆ柇鏄惁褰㈡垚鏄庣‘涓婚銆?").trim(),
      question: quality?.listQuestion || "杩欑粍绗旇鑳藉惁鍐欐垚涓€鍙ュ彲浜夎鐨勫垽鏂紝鑰屼笉鍙槸鍏变韩鍚屼竴涓爣绛撅紵",
      actionLabel: "璇勪及涓婚",
      actionAttrs: `data-graph-select-theme="${escapeHtml(topicKey)}"`,
      highlightNodeIds: noteIds
    });
  });

  (Array.isArray(bridgeGaps) ? bridgeGaps : []).filter((gap) => Array.isArray(gap?.noteIds) && gap.noteIds.length).slice(0, 5).forEach((gap, index) => {
    const sourceNoteId = String(gap?.noteIds?.[0] || "").trim();
    const sourceTitle = String(gap?.noteTitles?.[0] || graphThinkingNoteTitle(nodeMap, sourceNoteId, "褰撳墠绗旇")).trim() || "褰撳墠绗旇";
    const targetNoteId = String(gap?.targetNoteIds?.[0] || "").trim();
    const targetTitle = String(gap?.targetNoteTitles?.[0] || graphThinkingNoteTitle(nodeMap, targetNoteId, "")).trim();
    const gapType = String(gap?.gapType || "bridge_gap").trim().toLowerCase();
    const bridgeKey = graphBridgeSelectionKey(gap, index);
    addItem({
      id: `bridge-${bridgeKey}`,
      priority: 84 - index,
      view: "organize",
      tone: "bridge",
      kicker: gapType === "disconnected_cluster" ? "鏂紑鐨勪富棰樼兢" : "缂哄皯杩炴帴",
      title: sourceTitle,
      meta: targetTitle ? `寤鸿杩炴帴鍒般€?${targetTitle}銆?` : "寰呭叧鑱旂瑪璁?",
      detail: graphLocalizedActionText(gap?.suggestedAction || gap?.rationale, "杩欐潯绗旇鍙兘闇€瑕佷竴鏉′腑闂村垽鏂紝鎵嶈兘鍥炲埌褰撳墠缁撴瀯銆?"),
      question: targetTitle ? `瀹冨拰銆?${targetTitle}銆嶄箣闂寸己鐨勬槸璇佹嵁銆侀檺瀹氥€佸弽鏂癸紝杩樻槸涓€涓腑闂存蹇碉紵` : "瀹冨簲褰撲繚鎸佺嫭绔嬶紝杩樻槸鍙槸缂哄皯涓€鏉¤兘璇存槑鐞嗙敱鐨勮繛鎺ワ紵",
      actionLabel: "鍒ゆ柇杩炴帴",
      actionAttrs: `data-graph-select-bridge="${escapeHtml(bridgeKey)}" data-graph-bridge-note="${escapeHtml(sourceNoteId)}"${targetNoteId ? ` data-graph-target-note="${escapeHtml(targetNoteId)}"` : ""}`,
      highlightNodeIds: [sourceNoteId, targetNoteId]
    });
  });

  (Array.isArray(reviewQueue?.items) ? reviewQueue.items : []).slice(0, 5).forEach((item, index) => {
    const source = item.source || {};
    const target = item.target || {};
    const sourceTitle = source.title || graphThinkingNoteTitle(nodeMap, item.fromNoteId, "婧愮瑪璁?");
    const targetTitle = target.title || graphThinkingNoteTitle(nodeMap, item.toNoteId, "鐩爣绗旇");
    const rationale = String(item.rationale || "").trim();
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
      kicker: "鍏崇郴寰呭鏍?",
      title: `${sourceTitle} -> ${targetTitle}`,
      meta: `${graphRelationReviewReasonLabel(item.reviewReason)} 路 ${graphRelationQualityLabel(item.rationaleQualityLevel)}`,
      detail: rationale && rationale !== "markdown_wikilink" ? rationale : "杩欐潯鍏崇郴杩樻病鏈夊啓娓呬负浠€涔堟垚绔嬨€?",
      question: "濡傛灉鍒犳帀杩欐潯绾匡紝鎹熷け鐨勬槸璁鸿瘉缁撴瀯锛岃繕鏄彧鏄皯浜嗕竴涓鑸摼鎺ワ紵",
      actionLabel: "澶嶆牳鍏崇郴",
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
      kicker: "鍐茬獊/杈圭晫",
      title: String(item?.title || "鍏崇郴鍙兘閫犳垚姝т箟").trim() || "鍏崇郴鍙兘閫犳垚姝т箟",
      meta: String(item?.conflictType || "寰呭鏍?").trim() || "寰呭鏍?",
      detail: String(item?.rationale || "杩欓噷鍙兘璁╂蹇佃竟鐣屽彉妯＄硦锛岄€傚悎妫€鏌ユ槸鍚﹂渶瑕佹媶鍒嗘垨鏀瑰悕銆?").trim(),
      question: "杩欓噷鐨勫紶鍔涙槸鍦ㄦ彁绀虹湡瀹炲弽鏂癸紝杩樻槸姒傚康鍛藉悕杩樹笉澶熸竻妤氾紵",
      actionLabel: noteId ? "鏌ョ湅绗旇" : "缁х画鍒ゆ柇",
      actionAttrs: noteId ? `data-open-note="${escapeHtml(noteId)}"` : "",
      highlightNodeIds: noteIds
    });
  });

  (Array.isArray(conflictingRelations) ? conflictingRelations : []).slice(0, 3).forEach((edge, index) => {
    const sourceTitle = edge.fromTitle || graphThinkingNoteTitle(nodeMap, edge.fromNoteId, "婧愮瑪璁?");
    const targetTitle = edge.toTitle || graphThinkingNoteTitle(nodeMap, edge.toNoteId, "鐩爣绗旇");
    addItem({
      id: `tension-${String(edge.id || edge.fromNoteId || index)}-${String(edge.toNoteId || "")}`,
      priority: 68 - index,
      view: "organize",
      tone: "conflict",
      kicker: "鍙嶆柟/杈圭晫",
      title: `${sourceTitle} -> ${targetTitle}`,
      meta: graphRelationTypeLabel(edge.relationType),
      detail: String(edge.rationale || "杩欐潯鍏崇郴鍙兘淇濈暀浜嗗弽鏂广€侀檺瀹氭垨杈圭晫鏉′欢銆?").trim(),
      question: "杩欐潯杈圭晫鏉′欢搴斿綋鍐欒繘涓婚鍒ゆ柇锛岃繕鏄媶鎴愪竴鏉＄嫭绔嬬殑鍙嶄緥绗旇锛?",
      actionLabel: "澶嶆牳杈圭晫",
      actionAttrs: graphSelectEdgeActionAttrs(edge),
      highlightNodeIds: [edge.fromNoteId, edge.toNoteId],
      highlightEdge: edge
    });
  });

  (Array.isArray(analysis?.isolatedNotes) ? analysis.isolatedNotes : [])
    .filter((note) => currentIsolatedIds.has(graphNoteIdFromIsolatedItem(note)))
    .filter((note) => !graphNoteHasSavedIsolationDisposition(graphFullNoteById(graphNoteIdFromIsolatedItem(note), nodeMap) || note))
    .slice(0, 5).forEach((note, index) => {
      const noteId = String(note?.noteId || note?.id || "").trim();
      const isolatedKey = graphIsolatedSelectionKey(note, index);
      addItem({
        id: `isolated-${String(noteId || index)}`,
        priority: 64 - index,
        view: "organize",
        tone: "isolated",
        kicker: "寰呭叧鑱旂瑪璁?",
        title: String(note?.title || graphThinkingNoteTitle(nodeMap, noteId, "寰呭叧鑱旂瑪璁?")).trim() || "寰呭叧鑱旂瑪璁?",
        meta: "鏆傛湭杩涘叆涓婚缇?",
        detail: String(note?.thesis || "鍒ゆ柇瀹冨簲褰撴ˉ鎺ュ埌鐜版湁涓婚锛岃繕鏄厛鐣欏湪鏆傚瓨銆?").trim(),
        question: "瀹冩殏鏃舵父绂伙紝鏄洜涓虹湡鐨勭嫭鐗癸紝杩樻槸鍥犱负杩樻病鏈夊啓鍑轰负浠€涔堢浉鍏筹紵",
        actionLabel: "鏁寸悊",
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
      const sourceTitle = graphThinkingNoteTitle(nodeMap, sourceNoteId, "婧愮瑪璁?");
      const targetTitle = graphThinkingNoteTitle(nodeMap, targetNoteId, "鐩爣绗旇");
      addItem({
        id: `candidate-${String(candidate?.id || sourceNoteId || index)}-${String(targetNoteId || "")}`,
        priority: 60 - index,
        view: "organize",
        tone: "review",
        kicker: "鍏崇郴鍊欓€?",
        title: `${sourceTitle} -> ${targetTitle}`,
        meta: `${graphRelationTypeLabel(relationType)} 路 寰呯‘璁?`,
        detail: String(candidate.rationale || "鏈湴鍥捐氨鎵弿鍙戠幇涓ゆ潯绗旇鍙兘鏈夊叧鑱旓紝闇€瑕佷汉宸ュ垽鏂€?").trim(),
        question: "杩欐潯鍙€夊叧绯昏兘涓嶈兘璇存竻鈥滀负浠€涔堢浉杩炩€濓紝杩樻槸鍙槸鏍囬鐩镐技锛?",
        actionLabel: "鏌ョ湅婧愮瑪璁?",
        actionAttrs: `data-open-note="${escapeHtml(sourceNoteId)}"`,
        highlightNodeIds: [sourceNoteId, targetNoteId]
      });
    });

  return items.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
}
