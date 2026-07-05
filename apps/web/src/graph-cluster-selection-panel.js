export function renderGraphClusterSelectionPanelView({ selection = null, clusterMeta = [], nodeMap = new Map(), edges = [] } = {}, deps = {}) {
  const {
    normalizeGraphSelectionForVisibleItems = (value) => value,
    graphUniqueClusterMeta = (items = []) => items,
    graphClusterResearchMeta = () => ({
      memberIds: [],
      memberEdges: [],
      externalEdges: [],
      counts: {},
      coreNotes: [],
      label: "",
      detail: "",
      next: "",
      tone: "early"
    }),
    escapeHtml = (value = "") => String(value ?? ""),
    renderGraphSelectionShell = () => "",
    renderGraphSelectionMetrics = () => "",
    renderGraphThemeIndexWorkspace = () => "",
    renderGraphPromptDetails = () => ""
  } = deps;

  const normalized = normalizeGraphSelectionForVisibleItems(selection, { nodes: [...nodeMap.values()], edges, clusterMeta });
  if (!normalized || normalized.kind !== "cluster") return "";
  const cluster = graphUniqueClusterMeta(clusterMeta).find((item) => item.clusterKey === normalized.clusterKey) || normalized;
  const meta = graphClusterResearchMeta(cluster, { nodeMap, edges });
  const coreNotes = meta.coreNotes.slice(0, 5);
  const firstNoteId = String(coreNotes[0]?.id || normalized.anchorId || "").trim();
  const prompts = [
    "这组笔记能否写成一个清楚的问题？还是只是材料靠得近？",
    meta.counts.conflict || meta.counts.boundary
      ? "已有反方或边界，它是否揭示了主题的真实范围？"
      : "缺哪条反方、限定或反例，才能避免主题过顺？",
    meta.externalEdges.length
      ? "这些外部连接是在补缺口，还是说明这个主题应该拆分？"
      : "是否需要一条通向其他主题的连接？"
  ];
  const title = normalized.title || cluster.title || "未命名主题";

  return renderGraphSelectionShell({
    className: "is-cluster",
    ariaLabel: "主题详情",
    kicker: "主题",
    title,
    meta: `${meta.memberIds.length} 条笔记 · ${meta.memberEdges.length} 条组内关系`,
    closeLabel: "关闭主题详情",
    roleLabel: meta.label,
    roleDetail: meta.detail,
    body: `
      <div class="graph-selection-metrics" aria-label="主题关系结构">
        ${renderGraphSelectionMetrics([
          { label: "笔记", value: `${meta.memberIds.length} 条` },
          { label: "组内关系", value: `${meta.memberEdges.length} 条` },
          { label: "外部连接", value: `${meta.externalEdges.length} 条` },
          { label: "反方/边界", value: `${(meta.counts.boundary || 0) + (meta.counts.conflict || 0)} 条` }
        ])}
      </div>
      <section class="graph-selection-reason">
        <small>下一步判断</small>
        <p>${escapeHtml(meta.next)}</p>
      </section>
      ${renderGraphThemeIndexWorkspace(meta.memberIds, { title, relationCount: meta.memberEdges.length, tone: meta.tone })}
      <section class="graph-theme-notes" aria-label="主题关键笔记">
        <strong>关键笔记</strong>
        ${coreNotes
          .map(
            (note) => `
              <button class="graph-theme-note" type="button" data-open-note="${escapeHtml(note.id)}">
                <span>${escapeHtml(note.title || note.id)}</span>
                <small>${escapeHtml(String(note.degree || 0))} 条关系</small>
              </button>
            `
          )
          .join("")}
      </section>
      ${renderGraphPromptDetails("思考提示", prompts)}`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(meta.memberIds.join(","))}" data-graph-theme-title="${escapeHtml(title)}"${meta.memberIds.length >= 3 ? "" : " disabled"}>保存为可写主题</button>
      <button class="graph-selection-action is-secondary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(firstNoteId)}"${firstNoteId ? "" : " disabled"}>补主题关系</button>
      <button class="graph-selection-action is-quiet" type="button" data-open-note="${escapeHtml(firstNoteId)}"${firstNoteId ? "" : " disabled"}>打开关键笔记</button>`
  });
}
