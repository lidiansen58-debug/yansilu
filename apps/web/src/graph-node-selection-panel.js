export function renderGraphNodeSelectionPanel({ selection: normalized = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}, deps = {}) {
  const {
    escapeHtml = (value = "") => String(value ?? ""),
    graphRelationStatusCountsAsNetworkEdge = () => false,
    graphNodeNeedsRelationWorkflow = () => false,
    renderGraphIsolatedSelectionPanel = () => "",
    graphRelationGroupCounts = () => ({ total: 0, support: 0, conflict: 0, boundary: 0, bridge: 0, flow: 0 }),
    graphNodeRoleMeta = () => ({ tone: "neutral", prompt: "" }),
    graphNodeInsightMeta = () => ({}),
    renderGraphNodeInsightPanel = () => "",
    renderGraphRelationWorkspaceForNote = () => "",
    renderGraphAiConnectCandidates = () => "",
    graphThemeCandidateNoteIdsForNode = () => [],
    suggestedThemeIndexTitle = () => "",
    renderGraphSelectionMetrics = () => "",
    renderGraphPromptDetails = () => "",
    renderGraphSelectionShell = () => "",
    noteTypeLabel = (value = "") => String(value || ""),
    aiAnalysisLoading = false
  } = deps;
  if (!normalized) return "";
  const node = nodeMap.get(normalized.nodeId);
  if (!node) return "";
  const title = String(node?.title || normalized.nodeId).trim() || normalized.nodeId;
  const directEdges = edges.filter((edge) => {
    if (!graphRelationStatusCountsAsNetworkEdge(edge?.status)) return false;
    return String(edge?.fromNoteId || "").trim() === normalized.nodeId || String(edge?.toNoteId || "").trim() === normalized.nodeId;
  });
  if (graphNodeNeedsRelationWorkflow(normalized.nodeId, edges, nodeMap)) {
    return renderGraphIsolatedSelectionPanel({
      selection: { kind: "isolated", noteId: normalized.nodeId, title },
      isolatedNotes,
      nodeMap,
      edges
    });
  }
  const counts = graphRelationGroupCounts(directEdges);
  const role = graphNodeRoleMeta(node, directEdges);
  const insight = graphNodeInsightMeta(node, directEdges, { nodeMap, edges });
  const prompts = [
    role.prompt,
    counts.conflict || counts.boundary ? "反方或边界是否应该单独写成一条永久笔记？" : "这条笔记现在最缺支撑、反方、边界，还是桥接？",
    counts.total >= 4 ? "这些关系能不能聚成一个可写主题？" : "下一条最值得补的关系应该连向哪条笔记？"
  ];
  const relationWorkspace = renderGraphRelationWorkspaceForNote(normalized.nodeId, { nodeMap, edges, title: "已保存的关系" });
  const candidatePanel = renderGraphAiConnectCandidates(normalized.nodeId, {
    nodeMap,
    edges,
    hideEmpty: directEdges.length > 0
  });
  const themeNoteIds = graphThemeCandidateNoteIdsForNode(normalized.nodeId, directEdges, []);
  const canCreateTheme = themeNoteIds.length >= 3;
  const themeTitle = suggestedThemeIndexTitle(themeNoteIds);
  const taskStatus = directEdges.length ? "检查这些关系能否支撑观点" : "把这条笔记连到另一条笔记";
  const taskDetail = directEdges.length
    ? "先看已保存关系；如果还缺支撑、反方、边界或桥接，再查找相关笔记。"
    : "选择一条能互相说明的永久笔记，写一句为什么相关，然后保存。";
  const relationDetails = relationWorkspace
    ? `
      <details class="graph-selection-details">
        <summary>已保存关系</summary>
        ${relationWorkspace}
        <div class="graph-selection-metrics" aria-label="笔记关系分布">
          ${renderGraphSelectionMetrics([
            { label: "支持", value: String(counts.support || 0), hint: "支撑当前判断" },
            { label: "反方/边界", value: String((counts.conflict || 0) + (counts.boundary || 0)), hint: "提醒条件或反例" },
            { label: "连接", value: String(counts.bridge || 0), hint: "连接到其他问题" },
            { label: "顺序", value: String(counts.flow || 0), hint: "可用于文章顺序" }
          ])}
        </div>
      </details>`
    : "";
  const promptDetails = renderGraphPromptDetails("思考提示", prompts);
  const aiConnectClass = directEdges.length ? "is-ai" : "is-primary is-ai";
  return renderGraphSelectionShell({
    className: `is-node is-${role.tone}`,
    ariaLabel: "选中笔记",
    kicker: "笔记",
    title,
    meta: `${noteTypeLabel(node.noteType)} · ${directEdges.length} 条关系`,
    closeLabel: "关闭笔记详情",
    task: {
      tone: directEdges.length ? "ready" : "warning",
      status: taskStatus,
      detail: taskDetail,
      badge: directEdges.length ? `${directEdges.length} 条关系` : "未关联"
    },
    body: `
      ${renderGraphNodeInsightPanel(insight)}
      ${relationDetails}
      ${candidatePanel}
      ${promptDetails}`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-open-note="${escapeHtml(normalized.nodeId)}">打开笔记</button>
      <button class="graph-selection-action ${aiConnectClass}" type="button" data-graph-ai-connect-note="${escapeHtml(normalized.nodeId)}"${aiAnalysisLoading ? " disabled" : ""}>${aiAnalysisLoading ? "正在查找" : "查找相关笔记"}</button>
      <button class="graph-selection-action is-secondary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(normalized.nodeId)}">手动关联</button>
      ${
        canCreateTheme
          ? `<button class="graph-selection-action is-secondary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(themeNoteIds.join(","))}" data-graph-theme-title="${escapeHtml(themeTitle)}">保存为可写主题</button>`
          : ""
      }`
  });
}
