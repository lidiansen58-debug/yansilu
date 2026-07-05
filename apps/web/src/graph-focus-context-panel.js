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

const DEFAULT_RELATION_GROUP_META = {
  support: { label: "支持", shortLabel: "支持", detail: "哪些笔记在支撑当前判断。" },
  conflict: { label: "反方", shortLabel: "反方", detail: "哪些笔记提醒这个判断可能不成立。" },
  boundary: { label: "边界", shortLabel: "边界", detail: "这个判断在什么条件下成立。" },
  bridge: { label: "连接", shortLabel: "连接", detail: "把不同主题或问题接起来的关系。" },
  flow: { label: "顺序", shortLabel: "顺序", detail: "写作时可以放在前后顺序里的关系。" },
  neutral: { label: "相关", shortLabel: "相关", detail: "还没有细分用途的普通相关关系。" },
  index: { label: "主题", shortLabel: "主题", detail: "这组关系可能形成可写主题，确认后再保存。" }
};

function graphFocusContextPanelDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    renderGraphIcon: deps.renderGraphIcon || defaultIcon,
    graphNodeTitle: deps.graphNodeTitle || ((nodeMap, id, fallback = "") => nodeMap?.get?.(id)?.title || fallback || id),
    graphFocusContextModeMeta: deps.graphFocusContextModeMeta || ((value = "argument") => ({
      key: value === "writing" ? "writing" : "argument",
      label: value === "writing" ? "写作怎么用" : "观点怎么连",
      note: value === "writing" ? "按写作用途排序关系。" : "按论证用途排序关系。"
    })),
    graphRelationStatusCountsAsNetworkEdge: deps.graphRelationStatusCountsAsNetworkEdge || (() => true),
    graphRelationVisual: deps.graphRelationVisual || (() => ({ key: "neutral" })),
    graphFocusedCounterpartTitle: deps.graphFocusedCounterpartTitle || ((edge = {}, focusedNoteId = "", nodeMap = new Map()) => {
      const focusedId = String(focusedNoteId || "").trim();
      const counterpartId = String(edge?.fromNoteId || "").trim() === focusedId
        ? String(edge?.toNoteId || "").trim()
        : String(edge?.fromNoteId || "").trim();
      return {
        counterpartId,
        counterpartTitle: nodeMap?.get?.(counterpartId)?.title || counterpartId || "相关笔记"
      };
    }),
    graphRelationTypeLabel: deps.graphRelationTypeLabel || ((value = "") => String(value || "相关关系").trim()),
    graphFocusedEdgeDirection: deps.graphFocusedEdgeDirection || (() => "关联"),
    graphRelationSourceLabel: deps.graphRelationSourceLabel || (() => "手动保存"),
    graphFocusCardActionMeta: deps.graphFocusCardActionMeta || (() => ({ label: "调整关系" })),
    relationGroupMeta: deps.relationGroupMeta || DEFAULT_RELATION_GROUP_META
  };
}

export function graphFocusContextCollapsedState(current = false, action = "") {
  const normalized = String(action || "").trim().toLowerCase();
  if (normalized === "open") return false;
  if (normalized === "close") return true;
  return current !== true;
}

export function graphFocusContextCollapsedStatus(collapsed = false) {
  return collapsed ? "已收起选中笔记详情" : "已显示选中笔记详情";
}

export function graphFocusHelpOpenState(current = false) {
  return current !== true;
}

export function graphFocusHelpStatus(open = false) {
  return open ? "已展开关系说明" : "已收起关系说明";
}

export function renderGraphFocusContextPanel({
  focusedNoteId = "",
  nodeMap = new Map(),
  edges = [],
  focusContextMode = "argument",
  focusContextHelpOpen = false
} = {}, deps = {}) {
  const {
    escapeHtml,
    renderGraphIcon,
    graphNodeTitle,
    graphFocusContextModeMeta,
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationVisual,
    graphFocusedCounterpartTitle,
    graphRelationTypeLabel,
    graphFocusedEdgeDirection,
    graphRelationSourceLabel,
    graphFocusCardActionMeta,
    relationGroupMeta
  } = graphFocusContextPanelDeps(deps);
  const cleanFocusedNoteId = String(focusedNoteId || "").trim();
  const focusedTitle = graphNodeTitle(nodeMap, cleanFocusedNoteId, cleanFocusedNoteId || "当前笔记");
  const contextMode = graphFocusContextModeMeta(focusContextMode);
  const directEdges = (Array.isArray(edges) ? edges : []).filter((edge) => {
    if (!graphRelationStatusCountsAsNetworkEdge(edge?.status)) return false;
    return String(edge?.fromNoteId || "").trim() === cleanFocusedNoteId || String(edge?.toNoteId || "").trim() === cleanFocusedNoteId;
  });
  const grouped = new Map();
  directEdges.forEach((edge) => {
    const visual = graphRelationVisual(edge?.relationType);
    const key = String(visual?.key || "neutral").trim() || "neutral";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(edge);
  });
  const counts = {
    support: (grouped.get("support") || []).length,
    conflict: (grouped.get("conflict") || []).length,
    boundary: (grouped.get("boundary") || []).length,
    bridge: (grouped.get("bridge") || []).length,
    flow: (grouped.get("flow") || []).length,
    neutral: (grouped.get("neutral") || []).length,
    index: (grouped.get("index") || []).length
  };
  const relationMetricItems = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const meta = relationGroupMeta[key] || relationGroupMeta.neutral || DEFAULT_RELATION_GROUP_META.neutral;
      return `<span title="${escapeHtml(meta.detail)}">${escapeHtml(meta.shortLabel || meta.label)} ${count}</span>`;
    })
    .join("");
  const relationHelpOpen = focusContextHelpOpen === true;
  const relationHelp = `
    <div class="graph-focus-help${relationHelpOpen ? "" : " is-collapsed"}" id="graphFocusHelp">
      <div class="graph-focus-help-block">
        <strong>这里看什么</strong>
        <span>这里只显示已经保存的关系。AI 建议不会自动进入这里，必须由你确认。</span>
      </div>
      <div class="graph-focus-help-block">
        <strong>怎么判断</strong>
        <span>支持让观点更站得住；反方和边界让观点不片面；连接和顺序帮助后续写文章。</span>
      </div>
    </div>
  `;
  const nextHint =
    contextMode.key === "writing"
      ? counts.flow
        ? "可以先检查这些顺序关系，看看能不能排成文章段落。"
        : counts.bridge
          ? "已经有跨主题连接，可以尝试写一段过渡。"
          : counts.support
            ? "已有支撑材料，下一步补一个反方或边界，文章会更稳。"
            : "还看不出能放进哪篇文章，先补一条连接或顺序关系。"
      : counts.conflict
        ? "已经有反方或张力，下一步检查冲突条件有没有写清楚。"
        : counts.boundary
          ? "已经有边界，下一步补一个反例或支撑材料。"
          : counts.support
            ? "已有支撑，但还缺反方或边界，观点容易单薄。"
            : "还缺清楚的支持、反方或边界关系，先补一条有理由的连接。";
  const groupOrder = contextMode.key === "writing"
    ? ["flow", "bridge", "support", "boundary", "conflict", "neutral", "index"]
    : ["support", "conflict", "boundary", "bridge", "flow", "neutral", "index"];
  const sections = groupOrder
    .map((key) => {
      const items = grouped.get(key) || [];
      if (!items.length) return "";
      const meta = relationGroupMeta[key] || relationGroupMeta.neutral || DEFAULT_RELATION_GROUP_META.neutral;
      return `
        <section class="graph-focus-section">
          <div class="graph-focus-section-head">
            <span class="graph-relation-badge is-${escapeHtml(key)}">${escapeHtml(meta.label)}</span>
            <small>${items.length} 条</small>
          </div>
          <div class="graph-focus-list">
            ${items
              .map((edge) => {
                const { counterpartId, counterpartTitle } = graphFocusedCounterpartTitle(edge, cleanFocusedNoteId, nodeMap);
                const rationale = String(edge?.rationale || "").trim();
                const relationLabel = graphRelationTypeLabel(edge?.relationType);
                const direction = graphFocusedEdgeDirection(edge, cleanFocusedNoteId);
                const relationType = String(edge?.relationType || "").trim().toLowerCase();
                const actionMeta = graphFocusCardActionMeta(edge, contextMode.key);
                return `
                  <div class="graph-focus-card">
                    <button class="graph-focus-card-main" type="button" data-open-note="${escapeHtml(counterpartId)}">
                      <strong>${escapeHtml(counterpartTitle)}</strong>
                      <span>${escapeHtml(direction)} / ${escapeHtml(relationLabel)} / ${escapeHtml(graphRelationSourceLabel(edge?.createdBy))}</span>
                      <small>${escapeHtml(rationale || "还没有写清这条关系为什么成立。")}</small>
                    </button>
                    <button class="graph-focus-card-action" type="button" data-graph-relation-adjustment="strengthen"${String(edge?.id || "").trim() ? ` data-graph-relation-id="${escapeHtml(String(edge.id || "").trim())}"` : ""}${String(edge?.toNoteId || "").trim() ? ` data-graph-target-note="${escapeHtml(String(edge.toNoteId || "").trim())}"` : ""}${relationType ? ` data-graph-relation-type="${escapeHtml(relationType)}"` : ""}${String(edge?.id || "").trim() ? "" : " disabled"}>${escapeHtml(actionMeta.label || "调整")}</button>
                  </div>
                `;
              })
              .join("")}
          </div>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");

  return `
    <aside id="graphFocusContextPanel" class="graph-focus-context" aria-label="当前笔记关系详情">
      <div class="graph-focus-summary">
        <div class="graph-focus-panel-head">
          <div class="graph-focus-kicker">当前笔记</div>
          <div class="graph-focus-panel-actions">
            <button class="graph-focus-help-toggle" type="button" data-graph-focus-help-toggle aria-expanded="${relationHelpOpen ? "true" : "false"}" aria-controls="graphFocusHelp" title="${relationHelpOpen ? "收起说明" : "查看说明"}">${renderGraphIcon("question")}<span>说明</span></button>
            <button class="graph-overlay-close graph-focus-panel-close" type="button" data-graph-focus-context-toggle="close" aria-label="收起选中笔记详情" title="收起详情">${renderGraphIcon("close")}</button>
          </div>
        </div>
        <strong>${escapeHtml(focusedTitle)}</strong>
        <span>${directEdges.length ? `已有 ${directEdges.length} 条关系` : "还没有正式关系"}</span>
        ${relationHelp}
      </div>
      <div class="graph-context-mode" aria-label="关系查看方式">
        ${["argument", "writing"]
          .map((value) => {
            const meta = graphFocusContextModeMeta(value);
            const active = meta.key === contextMode.key;
            return `<button class="graph-context-mode-btn${active ? " is-active" : ""}" type="button" data-graph-context-mode="${escapeHtml(meta.key)}" aria-pressed="${active}" title="${escapeHtml(meta.note)}">${escapeHtml(meta.label)}</button>`;
          })
          .join("")}
      </div>
      <div class="graph-context-mode-note">${escapeHtml(contextMode.note)}</div>
      <div class="graph-focus-metrics">
        ${relationMetricItems || `<span>暂无正式关系</span>`}
      </div>
      <div class="graph-focus-next">${escapeHtml(nextHint)}</div>
      ${sections || `<div class="graph-empty">这条笔记周围还没有正式关系。先从“关联”里保存一条关系，再回来看图谱。</div>`}
    </aside>
  `;
}
