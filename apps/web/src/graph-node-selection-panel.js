export function renderGraphNodeSelectionPanel({ selection: normalized = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}, deps = {}) {
  const {
    graphRelationStatusCountsAsNetworkEdge = () => false,
    graphNodeNeedsRelationWorkflow = () => false,
    renderGraphIsolatedSelectionPanel = () => "",
    graphNodeRoleMeta = () => ({ tone: "neutral", prompt: "" }),
    renderGraphRelationWorkspaceForNote = () => "",
    renderGraphAiConnectCandidates = () => "",
    renderGraphSelectionShell = () => "",
    noteTypeLabel = (value = "") => String(value || "")
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
  const role = graphNodeRoleMeta(node, directEdges);
  const relationWorkspace = renderGraphRelationWorkspaceForNote(normalized.nodeId, { nodeMap, edges, title: "已保存的关系" });
  const candidatePanel = renderGraphAiConnectCandidates(normalized.nodeId, {
    nodeMap,
    edges,
    hideEmpty: directEdges.length > 0
  });
  const relationDetails = directEdges.length && relationWorkspace
    ? `
      <details class="graph-selection-details">
        <summary>已保存关系 ${directEdges.length}</summary>
        ${relationWorkspace}
      </details>`
    : "";
  return renderGraphSelectionShell({
    className: `is-node is-${role.tone}`,
    ariaLabel: "选中笔记",
    kicker: "笔记",
    title,
    meta: `${noteTypeLabel(node.noteType)} · ${directEdges.length} 条关系`,
    closeLabel: "关闭笔记详情",
    task: null,
    body: `
      ${relationDetails}
      ${candidatePanel}`,
    actions: ""
  });
}
