function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultIcon(name = "") {
  return `<span aria-hidden="true">${defaultEscapeHtml(name)}</span>`;
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function graphResearchNavigatorDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    renderGraphIcon: deps.renderGraphIcon || defaultIcon,
    renderGraphSelectionMetrics: deps.renderGraphSelectionMetrics || (() => ""),
    graphRelationStatusCountsAsNetworkEdge: deps.graphRelationStatusCountsAsNetworkEdge || (() => true),
    graphRelationVisual: deps.graphRelationVisual || (() => ({ key: "neutral" }))
  };
}

export function graphUniqueClusterMeta(clusterMeta = []) {
  const byKey = new Map();
  (Array.isArray(clusterMeta) ? clusterMeta : []).forEach((cluster) => {
    const key = String(cluster?.clusterKey || "").trim();
    if (!key || byKey.has(key)) return;
    const index = Number(cluster?.clusterIndex || 0) + 1;
    byKey.set(key, {
      ...cluster,
      clusterKey: key,
      title: String(cluster?.title || `主题 ${index}`).trim() || `主题 ${index}`,
      memberIds: uniqueStrings(cluster?.memberIds || [])
    });
  });
  return [...byKey.values()];
}

export function graphRelationGroupCountsForResearch(edges = [], deps = {}) {
  const { graphRelationStatusCountsAsNetworkEdge, graphRelationVisual } = graphResearchNavigatorDeps(deps);
  const counts = {
    total: 0,
    support: 0,
    conflict: 0,
    boundary: 0,
    bridge: 0,
    flow: 0,
    neutral: 0,
    index: 0
  };
  (Array.isArray(edges) ? edges : []).forEach((edge) => {
    if (!graphRelationStatusCountsAsNetworkEdge(edge?.status)) return;
    const key = String(graphRelationVisual(edge?.relationType)?.key || "neutral").trim() || "neutral";
    counts.total += 1;
    counts[key] = Number(counts[key] || 0) + 1;
  });
  return counts;
}

export function graphClusterResearchMeta(cluster = {}, { nodeMap = new Map(), edges = [] } = {}, deps = {}) {
  const { graphRelationStatusCountsAsNetworkEdge } = graphResearchNavigatorDeps(deps);
  const memberIds = uniqueStrings(cluster?.memberIds || []);
  const memberSet = new Set(memberIds);
  const memberEdges = (Array.isArray(edges) ? edges : []).filter((edge) => {
    if (!graphRelationStatusCountsAsNetworkEdge(edge?.status)) return false;
    const fromInside = memberSet.has(String(edge?.fromNoteId || "").trim());
    const toInside = memberSet.has(String(edge?.toNoteId || "").trim());
    return fromInside && toInside;
  });
  const externalEdges = (Array.isArray(edges) ? edges : []).filter((edge) => {
    if (!graphRelationStatusCountsAsNetworkEdge(edge?.status)) return false;
    const fromInside = memberSet.has(String(edge?.fromNoteId || "").trim());
    const toInside = memberSet.has(String(edge?.toNoteId || "").trim());
    return (fromInside || toInside) && fromInside !== toInside;
  });
  const counts = graphRelationGroupCountsForResearch(memberEdges, deps);
  const coreNotes = memberIds
    .map((id) => nodeMap.get(id))
    .filter(Boolean)
    .sort((left, right) => Number(right?.degree || 0) - Number(left?.degree || 0) || String(left?.title || "").localeCompare(String(right?.title || ""), "zh-Hans-CN"));
  let tone = "early";
  let label = "还不稳定";
  let detail = "已经有一些笔记靠近，但还需要确认它们是不是在回答同一个问题。";
  let next = "先补一条组内关系，写清它们为什么相关。";
  if (memberIds.length >= 8 && memberEdges.length >= Math.max(4, Math.ceil(memberIds.length * 0.55))) {
    tone = "mature";
    label = "可以成题";
    detail = "这组笔记已经有较多内部关系，可以尝试整理成主题。";
    next = "把它改写成一个中心问题，再补一条边界或反方关系。";
  } else if (memberIds.length >= 5 || memberEdges.length >= 3) {
    tone = "testing";
    label = "值得确认";
    detail = "这里有明显聚集，但主题边界还不够清楚。";
    next = "先打开关键笔记，确认它们是否支撑同一个问题。";
  }
  if (externalEdges.length >= 3) {
    next = "外部连接不少，先判断它是独立主题，还是只是过渡段落。";
  }
  return {
    tone,
    label,
    detail,
    next,
    memberIds,
    memberEdges,
    externalEdges,
    counts,
    coreNotes
  };
}

export function graphResearchNavigatorState({ nodes = [], edges = [], topicCandidates = [], bridgeGaps = [], clusterMeta = [], clueSummary = null, questionSummary = null } = {}, deps = {}) {
  const clusters = graphUniqueClusterMeta(clusterMeta);
  const nodeMap = new Map((Array.isArray(nodes) ? nodes : []).map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));
  const clusterSummaries = clusters
    .map((cluster) => ({
      cluster,
      meta: graphClusterResearchMeta(cluster, { nodeMap, edges }, deps)
    }))
    .sort((left, right) => right.meta.memberIds.length - left.meta.memberIds.length || right.meta.memberEdges.length - left.meta.memberEdges.length);
  const matureClusterCount = clusterSummaries.filter((item) => item.meta?.tone === "mature").length;
  const testingClusterCount = clusterSummaries.filter((item) => item.meta?.tone === "testing").length;
  const promisingClusterCount = matureClusterCount + testingClusterCount;
  const relationCounts = graphRelationGroupCountsForResearch(edges, deps);
  const brightNodes = [...nodeMap.values()]
    .sort((left, right) => Number(right?.degree || 0) - Number(left?.degree || 0) || String(left?.title || "").localeCompare(String(right?.title || ""), "zh-Hans-CN"))
    .slice(0, 3);
  const clueTotal = Number(clueSummary?.total || 0);
  const questionTotal = Number(questionSummary?.total || 0);
  const pendingTotal = clueTotal + questionTotal;
  const argumentRelationTotal = (relationCounts.support || 0) + (relationCounts.conflict || 0) + (relationCounts.boundary || 0);
  const headline = clusters.length
    ? promisingClusterCount
      ? "结构已经成形"
      : "先补关系，再判断主题"
    : "先连出第一批关系";
  const verdict = clusters.length
    ? promisingClusterCount
      ? `这批笔记聚成 ${clusters.length} 组，其中 ${promisingClusterCount} 组值得继续整理。`
      : `这批笔记已经聚成 ${clusters.length} 组，但关系理由还偏薄。`
    : "这批笔记还没有明显结构，先从最相关的永久笔记补一条关系。";
  const nextAction = brightNodes.length
    ? `建议先打开 ${brightNodes.length} 条关键笔记，确认它们在图中的作用。`
    : "建议先找两条最相关的永久笔记，补一条有理由的关系。";
  const pendingNote = pendingTotal
    ? `还有 ${pendingTotal} 个地方值得补关系或继续确认。`
    : "当前没有明显待处理项，可以从关键笔记继续阅读。";
  return {
    clusters: clusterSummaries,
    brightNodes,
    relationCounts,
    matureClusterCount,
    testingClusterCount,
    promisingClusterCount,
    clueTotal,
    questionTotal,
    pendingTotal,
    argumentRelationTotal,
    headline,
    verdict,
    nextAction,
    pendingNote,
    risk: pendingTotal ? "先补关系会最快让图谱变清楚。" : "结构比较安静，可以继续阅读关键笔记。",
    topicCandidateCount: Array.isArray(topicCandidates) ? topicCandidates.length : 0
  };
}

export function renderGraphResearchNavigatorPanelView({ nav = null } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon } = graphResearchNavigatorDeps(deps);
  const state = nav || graphResearchNavigatorState({}, deps);
  const clusterCards = state.clusters.slice(0, 3);
  const keyNotes = state.brightNodes.slice(0, 2);
  return `
    <aside class="graph-research-navigator" aria-label="看结构">
      <button class="graph-overlay-close graph-research-close" type="button" data-graph-research-close aria-label="收起看结构" title="收起">${renderGraphIcon("close")}</button>
      <div class="graph-research-head">
        <strong>看结构</strong>
      </div>
      <section class="graph-research-verdict">
        <strong>${escapeHtml(state.headline)}</strong>
        <p>${escapeHtml(state.verdict)}</p>
      </section>
      ${
        clusterCards.length
          ? `<section class="graph-research-section">
              <strong>主要结构</strong>
              ${clusterCards
                .map(
                  ({ cluster, meta }) => `
                    <div class="graph-research-card">
                      <span>${escapeHtml(cluster.title)}</span>
                      <small>${escapeHtml(String(meta.memberIds.length))} 条笔记 · ${escapeHtml(meta.label)}</small>
                    </div>
                  `
                )
                .join("")}
            </section>`
          : ""
      }
      ${
        keyNotes.length
          ? `<section class="graph-research-section">
              <strong>先看这几条</strong>
              ${keyNotes
                .map(
                  (node) => `
                    <div class="graph-research-card">
                      <span>${escapeHtml(node.title || node.id)}</span>
                      <small>${escapeHtml(String(node.degree || 0))} 条连接</small>
                    </div>
                  `
                )
                .join("")}
            </section>`
          : ""
      }
    </aside>
  `;
}
