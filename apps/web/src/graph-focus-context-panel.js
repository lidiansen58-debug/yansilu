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
  support: { label: "支持关系", shortLabel: "支持", detail: "说明哪条笔记支持当前判断。" },
  conflict: { label: "反方与张力", shortLabel: "反方", detail: "说明哪里可能不成立。" },
  boundary: { label: "适用边界", shortLabel: "边界", detail: "说明判断在哪些条件下成立。" },
  bridge: { label: "桥接关系", shortLabel: "桥接", detail: "连接不同主题。" },
  flow: { label: "写作顺序", shortLabel: "顺序", detail: "帮助组织文章前后顺序。" },
  neutral: { label: "相关关系", shortLabel: "相关", detail: "暂未细分用途的关系。" },
  index: { label: "主题索引", shortLabel: "索引", detail: "主题索引或聚合关系。" }
};

function graphFocusContextPanelDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    renderGraphIcon: deps.renderGraphIcon || defaultIcon,
    graphNodeTitle: deps.graphNodeTitle || ((nodeMap, id, fallback = "") => nodeMap?.get?.(id)?.title || fallback || id),
    graphFocusContextModeMeta: deps.graphFocusContextModeMeta || ((value = "argument") => ({
      key: value === "writing" ? "writing" : "argument",
      label: value === "writing" ? "看写作用途" : "看观点关系",
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
  return collapsed ? "已收起右侧关系" : "已显示右侧关系";
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
  const supportCount = (grouped.get("support") || []).length;
  const conflictCount = (grouped.get("conflict") || []).length;
  const boundaryCount = (grouped.get("boundary") || []).length;
  const bridgeCount = (grouped.get("bridge") || []).length;
  const flowCount = (grouped.get("flow") || []).length;
  const neutralCount = (grouped.get("neutral") || []).length;
  const indexCount = (grouped.get("index") || []).length;
  const relationMetricItems = [
    { key: "support", count: supportCount },
    { key: "conflict", count: conflictCount },
    { key: "boundary", count: boundaryCount },
    { key: "bridge", count: bridgeCount },
    { key: "flow", count: flowCount },
    { key: "neutral", count: neutralCount },
    { key: "index", count: indexCount }
  ]
    .filter((item) => item.count > 0)
    .map((item) => {
      const meta = relationGroupMeta[item.key] || relationGroupMeta.neutral || DEFAULT_RELATION_GROUP_META.neutral;
      return `<span title="${escapeHtml(meta.detail)}">${escapeHtml(meta.shortLabel || meta.label)} ${item.count}</span>`;
    })
    .join("");
  const relationHelpOpen = focusContextHelpOpen === true;
  const relationHelp = `
    <div class="graph-focus-help${relationHelpOpen ? "" : " is-collapsed"}" id="graphFocusHelp">
      <div class="graph-focus-help-block">
        <strong>这里显示什么</strong>
        <span>只看当前笔记已经保存的正式关系，不包含还没确认的 AI 候选。</span>
      </div>
      <div class="graph-focus-help-block">
        <strong>怎么读这些分类</strong>
        <span>支持关系说明“谁在帮这条判断成立”；反方与张力提醒“哪里可能不成立”；适用边界说明“在哪些条件下成立”；桥接关系帮助跨主题连接；写作顺序帮助排成文章。</span>
      </div>
      <div class="graph-focus-help-block">
        <strong>AI 做了什么</strong>
        <span>AI 只会先给潜在关联建议。只有你确认后，关系才会进入这里；这里的数量是系统按正式关系类型统计出来的。</span>
      </div>
    </div>
  `;
  const nextHint =
    contextMode.key === "writing"
      ? flowCount
        ? "这条笔记已经能进入写作。下一步检查这些前后关系能不能串成段落。"
        : bridgeCount
          ? "这条笔记已经有跨主题连接。下一步可以挑一条关系写成过渡段。"
          : supportCount
            ? "它已有支持材料。下一步可以选一条支持关系，整理成段落顺序。"
            : "还看不出它能放进哪篇文章。先补一条桥接或前后顺序关系。"
      : conflictCount
        ? "这条笔记已有反方或对照。下一步检查冲突条件有没有写清楚。"
        : boundaryCount
          ? "这条笔记已经有适用边界。下一步可以补反方或反例，让判断更稳。"
          : bridgeCount
            ? "这条笔记已经连到其他主题。下一步把桥接理由写具体。"
            : supportCount
              ? "它已有支持材料，但还缺边界或反方，读起来会偏单边。"
              : "这条笔记还缺清晰的支持、反方或边界关系。先补一条有理由的连接。";
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
                      <small>${escapeHtml(rationale || "还没把这条关系为什么成立写清楚。")}</small>
                    </button>
                    <button class="graph-focus-card-action" type="button" data-graph-relation-adjustment="strengthen"${String(edge?.id || "").trim() ? ` data-graph-relation-id="${escapeHtml(String(edge.id || "").trim())}"` : ""}${String(edge?.toNoteId || "").trim() ? ` data-graph-target-note="${escapeHtml(String(edge.toNoteId || "").trim())}"` : ""}${relationType ? ` data-graph-relation-type="${escapeHtml(relationType)}"` : ""}${String(edge?.id || "").trim() ? "" : " disabled"}>${escapeHtml(actionMeta.label)}</button>
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
    <aside id="graphFocusContextPanel" class="graph-focus-context" aria-label="当前笔记关系上下文">
      <div class="graph-focus-summary">
        <div class="graph-focus-panel-head">
          <div class="graph-focus-kicker">当前笔记关系</div>
          <div class="graph-focus-panel-actions">
            <button class="graph-focus-help-toggle" type="button" data-graph-focus-help-toggle aria-expanded="${relationHelpOpen ? "true" : "false"}" aria-controls="graphFocusHelp" title="${relationHelpOpen ? "收起说明" : "查看说明"}">${renderGraphIcon("question")}<span>说明</span></button>
            <button class="graph-overlay-close graph-focus-panel-close" type="button" data-graph-focus-context-toggle="close" aria-label="收起右侧关系" title="收起右侧关系">${renderGraphIcon("close")}</button>
          </div>
        </div>
        <strong>${escapeHtml(focusedTitle)}</strong>
        <span>${directEdges.length ? `已有 ${directEdges.length} 条正式关系，按用途分组展示。` : "这条笔记还没有正式关系，可以先查找相关笔记，再保存成关系。"}</span>
        ${relationHelp}
      </div>
      <div class="graph-context-mode" aria-label="当前笔记关系查看方式">
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
      ${sections || `<div class="graph-empty">当前这条笔记周围还没有正式关系。先从待关联笔记或 AI 候选里确认一条关系，再回来看图谱。</div>`}
    </aside>
  `;
}
