const GRAPH_RELATION_QUALITY_LABELS = {
  empty: "缺说明",
  basic: "说明太粗",
  good: "较清楚",
  strong: "清楚"
};

const GRAPH_RELATION_REVIEW_REASON_LABELS = {
  missing_rationale: "补关系说明",
  thin_rationale: "补证据或边界",
  needs_review: "确认关系"
};

function graphReviewSurfaceDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || ((value = "") => String(value ?? "")),
    graphAiAnalysisSummaryState: deps.graphAiAnalysisSummaryState || (() => ({ totalCandidates: 0 })),
    graphEdgeSelectionKey: deps.graphEdgeSelectionKey || ((item = {}) => String(item?.id || "")),
    graphRelationGroupMeta: deps.graphRelationGroupMeta || (() => ({ className: "", label: "" })),
    graphRelationSourceLabel: deps.graphRelationSourceLabel || ((value = "") => String(value || "")),
    graphRelationStatusLabel: deps.graphRelationStatusLabel || ((value = "") => String(value || "")),
    graphRelationTypeLabel: deps.graphRelationTypeLabel || ((value = "") => String(value || "")),
    renderGraphIcon: deps.renderGraphIcon || ((name = "") => String(name || ""))
  };
}

export function graphRelationQualityLabel(level) {
  const key = String(level || "empty").trim().toLowerCase();
  return GRAPH_RELATION_QUALITY_LABELS[key] || key || "待整理";
}

export function graphRelationReviewReasonLabel(reason) {
  const key = String(reason || "needs_review").trim().toLowerCase();
  return GRAPH_RELATION_REVIEW_REASON_LABELS[key] || key || "确认关系";
}

export function renderRelationReviewQueueSectionView(reviewQueue, options = {}, deps = {}) {
  const {
    escapeHtml,
    graphEdgeSelectionKey,
    graphRelationGroupMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    graphRelationTypeLabel
  } = graphReviewSurfaceDeps(deps);
  const items = Array.isArray(reviewQueue?.items) ? reviewQueue.items : [];
  const total = Number(reviewQueue?.total || items.length || 0);
  const error = String(reviewQueue?.error || "").trim();
  if (!error && total <= 0) return "";
  const open = options.open === true;
  const summary = reviewQueue?.summary && typeof reviewQueue.summary === "object" ? reviewQueue.summary : {};
  const byQuality = summary.byQualityLevel && typeof summary.byQualityLevel === "object" ? summary.byQualityLevel : {};
  const emptyCount = Number(byQuality.empty || 0);
  const basicCount = Number(byQuality.basic || 0);
  return `
      <details class="graph-section graph-collapsible-section graph-review-section" data-graph-section="review-queue"${open ? " open" : ""}>
        <summary class="graph-collapsible-summary">
          <div>
            <div class="graph-section-title">需要补充说明的关系</div>
            <div class="graph-section-note">这些关系已经保存，但理由还不够清楚。补一句“为什么相关”，以后看图谱才知道这条线的意义。</div>
          </div>
          <span class="graph-collapsible-badge">${total} 条</span>
        </summary>
        <div class="graph-collapsible-body">
        ${
          error
            ? `<div class="graph-empty bad">待处理列表加载失败：${escapeHtml(error)}</div>`
            : items.length
              ? `
                <div class="graph-review-summary">
                  <strong>${total} 条关系需要补充说明</strong>
                  <small>缺说明 ${emptyCount} 条；说明太粗 ${basicCount} 条。点卡片可以回到源笔记补充说明。</small>
                </div>
                <div class="graph-list">
                  ${items
                    .map((item) => {
                      const source = item.source || {};
                      const target = item.target || {};
                      const sourceTitle = source.title || item.fromNoteId || "源笔记";
                      const targetTitle = target.title || item.toNoteId || "目标笔记";
                      const rationale = String(item.rationale || "").trim();
                      const relationGroup = graphRelationGroupMeta(item.relationType);
                      return `
                        <div class="graph-review-card" role="button" tabindex="0" data-open-note="${escapeHtml(item.fromNoteId || source.id || "")}">
                          <button class="graph-review-action mini-btn" type="button" data-graph-select-edge="${escapeHtml(graphEdgeSelectionKey(item))}" data-graph-select-edge-id="${escapeHtml(item.id || "")}" data-graph-select-edge-from="${escapeHtml(item.fromNoteId || source.id || "")}" data-graph-select-edge-to="${escapeHtml(item.toNoteId || target.id || "")}" data-graph-select-edge-type="${escapeHtml(String(item.relationType || "").trim().toLowerCase())}" aria-label="确认关系：${escapeHtml(sourceTitle)} 到 ${escapeHtml(targetTitle)}" title="确认关系"><span>确认</span></button>
                          <span class="graph-review-main">
                            <span class="graph-review-title">${escapeHtml(sourceTitle)} -> ${escapeHtml(targetTitle)}</span>
                            <span class="graph-review-meta">
                              <span class="graph-relation-badge ${escapeHtml(relationGroup.className)}">${escapeHtml(relationGroup.label)} · ${escapeHtml(graphRelationTypeLabel(item.relationType))}</span>
                              ${escapeHtml(graphRelationReviewReasonLabel(item.reviewReason))} · ${escapeHtml(graphRelationQualityLabel(item.rationaleQualityLevel))} · ${escapeHtml(graphRelationSourceLabel(item.createdBy))} · ${escapeHtml(graphRelationStatusLabel(item.status))}
                            </span>
                            <small>${escapeHtml(rationale && rationale !== "markdown_wikilink" ? rationale : "尚未写清这条关系为什么成立。")}</small>
                          </span>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              `
              : `<div class="graph-empty">永久笔记范围内没有缺说明或说明太粗的关系。可以切换关系类型，查看完整结构是否合理。</div>`
        }
        </div>
      </details>
  `;
}

export function renderGraphUtilityDrawerView({ bridgeGapCount = 0, weakRelationCount = 0, reviewQueue = null, sectionsMarkup = "", open = false, nodes = null, edges = null } = {}, deps = {}) {
  const { escapeHtml, graphAiAnalysisSummaryState, renderGraphIcon } = graphReviewSurfaceDeps(deps);
  const content = String(sectionsMarkup || "").trim();
  if (!content) return "";
  const reviewCount = Number(reviewQueue?.total || 0);
  const aiState = graphAiAnalysisSummaryState({ nodes, edges });
  const badges = [
    bridgeGapCount > 0 ? `<span>潜在关联 ${escapeHtml(String(bridgeGapCount))}</span>` : "",
    weakRelationCount > 0 ? `<span>待判断关联 ${escapeHtml(String(weakRelationCount))}</span>` : "",
    reviewCount > 0 ? `<span>待补说明 ${escapeHtml(String(reviewCount))}</span>` : "",
    aiState.totalCandidates > 0 ? `<span>AI 推荐 ${escapeHtml(String(aiState.totalCandidates))}</span>` : ""
  ]
    .filter(Boolean)
    .join("");
  return `
    <details class="graph-utility-drawer" data-graph-utility-drawer${open ? " open" : ""}>
      <summary class="graph-utility-drawer-summary">
        <span class="graph-utility-drawer-drag-handle" data-graph-utility-drag-handle aria-hidden="true" title="拖动位置">${renderGraphIcon("drag")}</span>
        <div class="graph-utility-drawer-copy">
          <strong>${renderGraphIcon("clue")}稍后处理</strong>
          <span>把暂时不急着处理的推荐、理由缺口和可写主题先收在这里，需要时再展开。</span>
        </div>
        <div class="graph-utility-drawer-meta">
          ${badges ? `<div class="graph-utility-drawer-badges">${badges}</div>` : `<div class="graph-utility-drawer-hint">稍后再看</div>`}
        </div>
        <button class="graph-overlay-close graph-utility-drawer-close" type="button" data-graph-utility-close aria-label="关闭稍后处理" title="关闭稍后处理">${renderGraphIcon("close")}</button>
      </summary>
      <div class="graph-utility-drawer-body">
        ${content}
      </div>
    </details>
  `;
}
