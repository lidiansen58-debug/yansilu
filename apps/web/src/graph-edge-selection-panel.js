export function renderGraphEdgeSelectionPanel({ selection: normalized = null, nodeMap = new Map(), edges = [] } = {}, deps = {}) {
  const {
    escapeHtml = (value = "") => String(value ?? ""),
    graphEdgeSelectionKey = (edge = {}) => String(edge?.id || ""),
    graphNodeTitle = (_nodeMap, noteId = "", fallback = "") => fallback || noteId,
    graphRelationTypeLabel = (value = "") => String(value || ""),
    graphRelationGroupMeta = () => ({ label: "" }),
    graphEdgeReviewMeta = () => ({ tone: "neutral", label: "", detail: "", prompt: "" }),
    graphEdgeAdjustmentPlan = () => ({ label: "", detail: "", cards: [] }),
    graphFocusCardActionMeta = () => ({ label: "" }),
    graphRelationSourceLabel = (value = "") => String(value || ""),
    graphRelationStatusLabel = (value = "") => String(value || ""),
    renderGraphSelectionMetrics = () => "",
    renderGraphPromptDetails = () => "",
    renderGraphSelectionShell = () => "",
    focusContextMode = "argument",
    relationAdjustmentFocusById = {}
  } = deps;
  if (!normalized) return "";
  const edge = edges.find((item) => graphEdgeSelectionKey(item) === normalized.edgeKey);
  if (!edge) return "";
  const sourceId = String(edge?.fromNoteId || "").trim();
  const targetId = String(edge?.toNoteId || "").trim();
  const sourceTitle = edge.fromTitle || graphNodeTitle(nodeMap, sourceId, sourceId || "源笔记");
  const targetTitle = edge.toTitle || graphNodeTitle(nodeMap, targetId, targetId || "目标笔记");
  const relationType = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const relationLabel = graphRelationTypeLabel(relationType);
  const group = graphRelationGroupMeta(relationType);
  const rationale = String(edge?.rationale || "").trim();
  const review = graphEdgeReviewMeta(edge);
  const adjustment = graphEdgeAdjustmentPlan(edge);
  const actionMeta = graphFocusCardActionMeta(edge, focusContextMode);
  const relationId = String(edge?.id || "").trim();
  const selectedAdjustmentKey = relationId ? String(relationAdjustmentFocusById?.[relationId] || "").trim().toLowerCase() : "";
  const selectedAdjustment = selectedAdjustmentKey
    ? adjustment.cards.find((card) => card.key === selectedAdjustmentKey) || null
    : null;
  const prompts = [
    review.prompt,
    "这条关系方向是否正确？是否应该反过来，或拆成两条更具体的关系？",
    "如果这条线被删除，图谱损失的是论证结构，还是只是导航便利？"
  ];
  return renderGraphSelectionShell({
    className: `is-edge is-${review.tone}`,
    ariaLabel: "选中关系的复核详情",
    kicker: "已保存关系",
    title: `${sourceTitle} -> ${targetTitle}`,
    meta: `${group.label} · ${relationLabel} · ${graphRelationSourceLabel(edge.createdBy)}`,
    closeLabel: "收起关系复核",
    roleLabel: review.label,
    roleDetail: review.detail,
    body: `
      <div class="graph-selection-reason">
        <small>当前理由</small>
        <p>${escapeHtml(rationale && rationale !== "markdown_wikilink" ? rationale : "还没有写清楚这条关系为什么成立。")}</p>
      </div>
      <section class="graph-relation-adjustment" aria-label="关系调整建议">
        <div class="graph-relation-adjustment-head">
          <span>${escapeHtml(adjustment.label)}</span>
          <p>${escapeHtml(adjustment.detail)}</p>
        </div>
        <div class="graph-relation-adjustment-grid">
          ${adjustment.cards
            .map(
              (card) => `
                <button class="graph-relation-adjustment-card${card.active || card.key === selectedAdjustmentKey ? " is-active" : ""}" type="button" data-graph-relation-adjustment="${escapeHtml(card.key)}" data-graph-relation-id="${escapeHtml(relationId)}"${targetId ? ` data-graph-target-note="${escapeHtml(targetId)}"` : ""}${relationType ? ` data-graph-relation-type="${escapeHtml(relationType)}"` : ""}${relationId ? "" : " disabled"}>
                  <strong>${escapeHtml(card.title)}</strong>
                  <span>${escapeHtml(card.text)}</span>
                  <small>${escapeHtml(card.actionLabel)}</small>
                </button>
              `
            )
            .join("")}
        </div>
        ${
          selectedAdjustment
            ? `<div class="graph-selection-reason is-soft">
                <small>当前处理方向</small>
                <p>${escapeHtml(`${selectedAdjustment.title}：${selectedAdjustment.text}。先在这里确认判断；需要改正文时，再用“打开源笔记”。`)}</p>
              </div>`
            : ""
        }
      </section>
      <div class="graph-selection-metrics" aria-label="关系属性">
        ${renderGraphSelectionMetrics([
          { label: "类型", value: relationLabel },
          { label: "状态", value: graphRelationStatusLabel(edge.status) },
          { label: "来源", value: graphRelationSourceLabel(edge.createdBy) }
        ])}
      </div>
      ${renderGraphPromptDetails("复核提示（可选）", prompts)}`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-open-note="${escapeHtml(sourceId)}">打开源笔记</button>
      <button class="graph-selection-action is-secondary" type="button" data-graph-relation-adjustment="strengthen"${relationId ? ` data-graph-relation-id="${escapeHtml(relationId)}"` : ""}${targetId ? ` data-graph-target-note="${escapeHtml(targetId)}"` : ""}${relationType ? ` data-graph-relation-type="${escapeHtml(relationType)}"` : ""}${relationId ? "" : " disabled"}>${escapeHtml(actionMeta.label)}</button>`
  });
}
