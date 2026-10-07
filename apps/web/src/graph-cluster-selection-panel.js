export function renderGraphClusterSelectionPanelView({ selection = null, clusterMeta = [], nodeMap = new Map(), edges = [], disclosureState = {} } = {}, deps = {}) {
  const {
    normalizeGraphSelectionForVisibleItems = (value) => value,
    graphUniqueClusterMeta = (items = []) => items,
    graphClusterResearchMeta = () => ({
      memberIds: [],
      memberEdges: [],
      externalEdges: [],
      counts: {},
      coreNotes: []
    }),
    escapeHtml = (value = "") => String(value ?? ""),
    renderGraphSelectionShell = () => ""
  } = deps;

  const normalized = normalizeGraphSelectionForVisibleItems(selection, { nodes: [...nodeMap.values()], edges, clusterMeta });
  if (!normalized || normalized.kind !== "cluster") return "";
  const cluster = graphUniqueClusterMeta(clusterMeta).find((item) => item.clusterKey === normalized.clusterKey) || normalized;
  const meta = graphClusterResearchMeta(cluster, { nodeMap, edges });
  const firstNoteId = String(meta.coreNotes[0]?.id || normalized.anchorId || "").trim();
  const title = normalized.title || cluster.title || "未命名笔记组";
  const sectionKey = `cluster-${encodeURIComponent(cluster.anchorId || normalized.anchorId || meta.memberIds[0] || normalized.clusterKey)}`;
  const notesKey = `${sectionKey}-notes`;
  const relationsKey = `${sectionKey}-relations`;
  const renderNotes = (notes) => notes.map((note) => `
    <button class="graph-theme-note" type="button" data-open-note="${escapeHtml(note.id)}">
      <span>${escapeHtml(note.title || note.id)}</span>
      <small>${escapeHtml(String(note.degree || 0))} 条关系</small>
    </button>`).join("");
  const remainingNotes = meta.coreNotes.slice(5);

  return renderGraphSelectionShell({
    className: "is-cluster",
    ariaLabel: "笔记组详情",
    kicker: "笔记组",
    title,
    meta: `${meta.memberIds.length} 条笔记 · ${meta.memberEdges.length} 条组内关系`,
    closeLabel: "关闭笔记组详情",
    body: `
      <section class="graph-theme-notes" aria-label="组内笔记">
        ${renderNotes(meta.coreNotes.slice(0, 5))}
        ${remainingNotes.length ? `
          <details class="graph-cluster-disclosure graph-cluster-more-notes" data-graph-section="${escapeHtml(notesKey)}"${disclosureState[notesKey] ? " open" : ""}>
            <summary class="graph-collapsible-summary">其余 ${remainingNotes.length} 条笔记</summary>
            <div class="graph-cluster-note-list">${renderNotes(remainingNotes)}</div>
          </details>` : ""}
      </section>
      <details class="graph-cluster-disclosure graph-cluster-relations" data-graph-section="${escapeHtml(relationsKey)}"${disclosureState[relationsKey] ? " open" : ""}>
        <summary class="graph-collapsible-summary">关系概况</summary>
        <dl>
          <div><dt>与组外笔记的关联</dt><dd>${meta.externalEdges.length} 条</dd></div>
          <div><dt>反驳与限定关系</dt><dd>${(meta.counts.boundary || 0) + (meta.counts.conflict || 0)} 条</dd></div>
        </dl>
      </details>`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(meta.memberIds.join(","))}" data-graph-theme-title="${escapeHtml(title)}"${meta.memberIds.length >= 3 ? "" : " disabled"}>整理主题</button>
      <button class="graph-selection-action is-secondary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(firstNoteId)}"${firstNoteId ? "" : " disabled"}>添加关联</button>`
  });
}
