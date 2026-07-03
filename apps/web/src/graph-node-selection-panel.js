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
      counts.conflict || counts.boundary ? "有没有哪条反方或限定关系，应该提升成单独的永久笔记？" : "它目前缺的是支撑、反方、边界，还是桥接？",
      counts.total >= 4 ? "这些连接是否适合聚成一个主题，还是应该拆成两个问题？" : "下一条最值得补的关系，应该连向哪条笔记？"
    ];
    const relationWorkspace = renderGraphRelationWorkspaceForNote(normalized.nodeId, { nodeMap, edges, title: "现有关联" });
    const candidatePanel = renderGraphAiConnectCandidates(normalized.nodeId, {
      nodeMap,
      edges,
      hideEmpty: directEdges.length > 0
    });
    const themeNoteIds = graphThemeCandidateNoteIdsForNode(normalized.nodeId, directEdges, []);
    const canCreateTheme = themeNoteIds.length >= 3;
    const themeTitle = suggestedThemeIndexTitle(themeNoteIds);
    const taskStatus = directEdges.length
      ? "已接入图谱：检查关系是否能支撑你的判断"
      : "未关联：先补一条能说明理由的关系";
    const taskDetail = directEdges.length
      ? "先看已保存关系；如果这条笔记还缺支撑、反方、边界或连接，再查找相关笔记或直接选择。"
      : "先找一条最相关的永久笔记，写清为什么相连，再保存为正式关系。";
    const relationDetails = relationWorkspace
      ? `
        <details class="graph-selection-details">
          <summary>已保存关系和更多操作</summary>
          ${relationWorkspace}
          <div class="graph-selection-metrics" aria-label="笔记关系分布">
            ${renderGraphSelectionMetrics([
              { label: "支持", value: String(counts.support || 0), hint: "能支撑这条判断的关系" },
              { label: "反方/边界", value: String((counts.conflict || 0) + (counts.boundary || 0)), hint: "提醒适用条件或反例" },
              { label: "连接", value: String(counts.bridge || 0), hint: "把两个问题串起来的关系" },
              { label: "过程", value: String(counts.flow || 0), hint: "前后承接或步骤关系" }
            ])}
          </div>
        </details>`
      : "";
    const promptDetails = renderGraphPromptDetails("思考提示（可选）", prompts);
    const openNoteClass = "is-primary";
    const aiConnectClass = directEdges.length ? "is-ai" : "is-primary is-ai";
    return renderGraphSelectionShell({
      className: `is-node is-${role.tone}`,
      ariaLabel: "选中笔记的思考详情",
      kicker: "当前笔记",
      title,
      meta: `${noteTypeLabel(node.noteType)} · 连接 ${Number(node.degree || directEdges.length || 0)} 条`,
      closeLabel: "收起笔记角色",
      task: {
        tone: directEdges.length ? "ready" : "warning",
        status: taskStatus,
        detail: taskDetail,
        badge: directEdges.length ? `${directEdges.length} 条关系` : "需处理"
      },
      body: `
        ${renderGraphNodeInsightPanel(insight)}
        ${relationDetails}
        ${candidatePanel}
        ${promptDetails}`,
      actions: `
        <button class="graph-selection-action ${openNoteClass}" type="button" data-open-note="${escapeHtml(normalized.nodeId)}">打开笔记</button>
        <button class="graph-selection-action ${aiConnectClass}" type="button" data-graph-ai-connect-note="${escapeHtml(normalized.nodeId)}"${aiAnalysisLoading ? " disabled" : ""}>${aiAnalysisLoading ? "正在查找" : "查找相关笔记"}</button>
        <button class="graph-selection-action is-secondary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(normalized.nodeId)}">直接选择相关笔记</button>
        ${
          canCreateTheme
            ? `<button class="graph-selection-action is-secondary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(themeNoteIds.join(","))}" data-graph-theme-title="${escapeHtml(themeTitle)}">创建主题索引</button>`
            : ""
        }`
    });
}
