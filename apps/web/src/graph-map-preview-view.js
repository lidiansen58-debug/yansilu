export function renderGraphMapPreviewView(nodes = [], edges = [], linkedNodeIds = new Set(), deps = {}) {
  const {
    escapeHtml = (value = "") => String(value ?? ""),
    graphRelationGroupMeta = () => ({ label: "", className: "" }),
    graphRelationTypeLabel = (value = "") => String(value || "")
  } = deps;

  if (!nodes.length) {
    return `
      <div class="graph-map-card">
        <div class="graph-map-head">
          <strong>结构预览</strong>
          <small>当前范围暂无笔记</small>
        </div>
        <div class="graph-empty">先建立几条永久笔记，再用关系把它们串成局部图谱。</div>
      </div>
    `;
  }

  const edgeRows = edges.slice(0, 5).map((edge) => {
    const fromNode = nodes.find((node) => node.id === edge.fromNoteId);
    const toNode = nodes.find((node) => node.id === edge.toNoteId);
    const relationGroup = graphRelationGroupMeta(edge.relationType);
    return {
      from: fromNode?.title || edge.fromTitle || edge.fromNoteId || "源笔记",
      to: toNode?.title || edge.toTitle || edge.toNoteId || "目标笔记",
      relation: graphRelationTypeLabel(edge.relationType),
      relationGroupLabel: relationGroup.label,
      relationGroupClass: relationGroup.className,
      fromState: linkedNodeIds.has(edge.fromNoteId) ? "linked" : "",
      toState: linkedNodeIds.has(edge.toNoteId) ? "linked" : ""
    };
  });
  const isolatedRows = edgeRows.length
    ? []
    : nodes.slice(0, 4).map((node) => ({
        from: node.title || node.id,
        to: "等待连接",
        relation: "未连接",
        isolated: true
      }));
  const rows = edgeRows.length ? edgeRows : isolatedRows;
  return `
    <div class="graph-map-card">
      <div class="graph-map-head">
        <strong>结构预览</strong>
        <small>${escapeHtml(edges.length ? `展示前 ${Math.min(edges.length, 5)} 条关系` : "当前主要是待关联笔记")}</small>
      </div>
      <div class="graph-map" aria-label="当前图谱结构预览">
        ${rows
          .map(
            (row) => `
              <div class="graph-map-node-row">
                <span class="graph-map-node" data-state="${escapeHtml(row.isolated ? "isolated" : row.fromState || "")}">${escapeHtml(row.from)}</span>
                <span class="graph-map-link ${escapeHtml(row.relationGroupClass || "")}">
                  <strong>${escapeHtml(row.relation)}</strong>
                  ${row.relationGroupLabel ? `<small>${escapeHtml(row.relationGroupLabel)}</small>` : ""}
                </span>
                <span class="graph-map-node" data-state="${escapeHtml(row.isolated ? "isolated" : row.toState || "")}">${escapeHtml(row.to)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${
        edges.length > 5
          ? `<div class="graph-map-more">还有 ${escapeHtml(edges.length - 5)} 条关系在下方列表中。</div>`
          : ""
      }
    </div>
  `;
}
