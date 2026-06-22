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
      title: String(cluster?.title || `主题群 ${index}`).trim() || `主题群 ${index}`,
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
  let label = "早期主题群";
  let detail = "这里已经出现聚集，但还需要先判断它们是不是在回答同一个研究问题。";
  let next = "先挑两条最关键的笔记，写清它们为什么属于同一个问题。";
  if (memberIds.length >= 8 && memberEdges.length >= Math.max(4, Math.ceil(memberIds.length * 0.55))) {
    tone = "mature";
    label = "主题群较成熟";
    detail = "这里不只是材料相近，已经有一定内部关系，可以尝试提炼成一个主题判断。";
    next = "把这个主题群改写成一句可争论的判断，再补一条反方或边界关系。";
  } else if (memberIds.length >= 5 || memberEdges.length >= 3) {
    tone = "testing";
    label = "值得继续验证";
    detail = "这里有明显聚集，但主题边界还不够清晰，容易把相似材料误当成论证。";
    next = "优先补一条组内关系说明，确认这组笔记是在支撑同一个问题。";
  }
  if (externalEdges.length >= 3) {
    next = "这个主题群和外部连接不少，先判断它是独立主题，还是需要拆成过渡段落。";
  }
  if (!counts.conflict && !counts.boundary && memberIds.length >= 5) {
    detail = `${detail} 目前反方或边界偏少，后续写作时容易显得过顺。`;
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
      ? "已经有成题基础"
      : "先补关系，再判断成题"
    : "先连出第一批主题群";
  const verdict = clusters.length
    ? promisingClusterCount
      ? `这批笔记聚成 ${clusters.length} 个主题群，其中 ${promisingClusterCount} 个可以继续提炼成研究问题或文章判断。`
      : `这批笔记已经聚成 ${clusters.length} 个主题群，但关系说明还偏薄，先不要急着定题。`
    : "这批笔记还没有明显主题群，先从最关键的笔记补第一批关系。";
  const nextAction = clusters.length
    ? brightNodes.length
      ? `建议先点开 ${brightNodes.length} 条优先笔记，判断它们分别承担“证据、反方、边界、连接”里的哪种角色。`
      : "建议先点开最大的主题群，确认这组笔记是否在回答同一个问题。"
    : "建议先找两条最相关的永久笔记，补一条有理由的关系。";
  const pendingNote = pendingTotal
    ? `${pendingTotal} 项待处理内容不是错误，而是系统认为值得以后补关系、补证据或继续判断的地方。`
    : "当前没有明显待处理内容，可以继续看主题群和关键笔记，寻找下一步判断。";
  const risk =
    Number(bridgeGaps?.length || 0) || clueTotal
      ? "优先处理桥接和待补关系，会最快让图谱变清楚。"
      : relationCounts.total && !relationCounts.conflict && !relationCounts.boundary
        ? "关系已有基础，但反方和边界偏少。"
        : "结构比较安静，可以从亮星继续追问。";
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
    risk,
    topicCandidateCount: Array.isArray(topicCandidates) ? topicCandidates.length : 0
  };
}

export function renderGraphResearchNavigatorPanelView({ nav = null } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon, renderGraphSelectionMetrics } = graphResearchNavigatorDeps(deps);
  const state = nav || graphResearchNavigatorState({}, deps);
  const clusterCards = state.clusters.slice(0, 3);
  return `
    <aside class="graph-research-navigator" aria-label="图谱概览">
      <button class="graph-overlay-close graph-research-close" type="button" data-graph-research-close aria-label="关闭概览" title="关闭概览">${renderGraphIcon("close")}</button>
      <div class="graph-research-head">
        <span>图谱概览</span>
        <strong>先判断能不能形成主题</strong>
      </div>
      <section class="graph-research-verdict">
        <small>${escapeHtml(state.headline)}</small>
        <strong>${escapeHtml(state.verdict)}</strong>
        <p>${escapeHtml(state.nextAction)}</p>
      </section>
      <div class="graph-selection-metrics" aria-label="图谱研究摘要">
        ${renderGraphSelectionMetrics([
          { label: "主题群", value: `${state.clusters.length} 个`, hint: "相互靠近的一组笔记" },
          { label: "优先笔记", value: `${state.brightNodes.length} 条`, hint: "先点开的关键笔记" },
          { label: "观点关系", value: `${state.argumentRelationTotal} 条`, hint: "支持/反方/边界" },
          { label: "待处理", value: `${state.pendingTotal} 项`, hint: "待补关系或问题" }
        ])}
      </div>
      <section class="graph-research-next">
        <strong>怎么理解这些数字</strong>
        <p>${escapeHtml(state.pendingNote)}</p>
        <p>${escapeHtml(state.risk)}</p>
      </section>
      ${
        clusterCards.length
          ? `<section class="graph-research-section">
              <strong>先看的主题群</strong>
              ${clusterCards
                .map(
                  ({ cluster, meta }) => `
                    <button class="graph-research-card" type="button" data-graph-select-cluster="${escapeHtml(cluster.clusterKey)}" aria-label="查看主题群 ${escapeHtml(cluster.title)}">
                      <span>${escapeHtml(cluster.title)}</span>
                      <small>${escapeHtml(meta.label)} / ${escapeHtml(String(meta.memberIds.length))} 条笔记 / 点开看边界和下一步</small>
                    </button>
                  `
                )
                .join("")}
            </section>`
          : ""
      }
      ${
        state.brightNodes.length
          ? `<section class="graph-research-section">
              <strong>优先点开的笔记</strong>
              ${state.brightNodes
                .map(
                  (node) => `
                    <button class="graph-research-card" type="button" data-node-id="${escapeHtml(node.id)}" data-graph-select-node="${escapeHtml(node.id)}" aria-label="查看优先笔记 ${escapeHtml(node.title || node.id)}">
                      <span>${escapeHtml(node.title || node.id)}</span>
                      <small>连接 ${escapeHtml(String(node.degree || 0))} 条 / 先判断它是证据、反方、边界还是连接</small>
                    </button>
                  `
                )
                .join("")}
            </section>`
          : ""
      }
      <section class="graph-selection-prompts">
        <strong>读图顺序</strong>
        <p>先看主题群，判断这批笔记主要聚在哪些问题上。</p>
        <p>再点优先笔记，确认哪些判断最值得继续推进。</p>
        <p>最后再看待处理内容，不需要一开始就追每一条线。</p>
      </section>
    </aside>
  `;
}
