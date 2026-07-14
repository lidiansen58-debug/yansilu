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

function defaultWorkbenchTabMeta(value = "") {
  const key = String(value || "clues").trim().toLowerCase();
  const meta = {
    clues: {
      key: "clues",
      label: "补全关系",
      emptyLabel: "暂无需要补的关系",
      panelTitle: "补全关系",
      statusLabel: "补全关系",
      note: "找出还没连上、关系不清或需要补说明的笔记。"
    },
    questions: {
      key: "questions",
      label: "找主题",
      emptyLabel: "暂无可找主题的线索",
      panelTitle: "找主题",
      statusLabel: "找主题",
      note: "看哪些笔记已经聚成一个可继续写作的问题。"
    }
  };
  return meta[key] || meta.clues;
}

function defaultThinkingFilterMeta(value = "") {
  const key = String(value || "all").trim().toLowerCase();
  const meta = {
    all: { key: "all", label: "全部", note: "查看全部建议。" },
    theme: { key: "theme", label: "找主题", note: "只看可能聚成主题的笔记。" },
    organize: { key: "organize", label: "补全关系", note: "只看需要补关系的笔记。" }
  };
  return meta[key] || meta.all;
}

function defaultCompactActionLabel(label = "") {
  return String(label || "查看").trim() || "查看";
}

function defaultHighlightAttrs() {
  return "";
}

function graphWorkbenchPanelDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    renderGraphIcon: deps.renderGraphIcon || defaultIcon,
    graphWorkbenchTabMeta: deps.graphWorkbenchTabMeta || defaultWorkbenchTabMeta,
    graphThinkingFilterMeta: deps.graphThinkingFilterMeta || defaultThinkingFilterMeta,
    graphThinkingHighlightAttrs: deps.graphThinkingHighlightAttrs || defaultHighlightAttrs,
    graphCompactActionLabel: deps.graphCompactActionLabel || defaultCompactActionLabel,
    graphState: deps.graphState || {}
  };
}

function graphTaskItems(items = [], activeKey = "questions") {
  const list = Array.isArray(items) ? items : [];
  const filtered =
    activeKey === "clues"
      ? list.filter((item) => item.view === "organize" || ["bridge", "review", "isolated"].includes(String(item.tone || "").trim()))
      : list.filter((item) => item.view === "theme" || item.view === "question" || String(item.tone || "").trim() === "theme");
  return (filtered.length ? filtered : list).slice(0, 3);
}

function graphWorkbenchThemeOverviewItems(items = []) {
  return graphTaskItems(items, "questions")
    .map((item) => {
      const title = String(item?.title || "").trim();
      const detail = String(item?.question || item?.detail || item?.meta || "").trim();
      const actionAttrs = String(item?.actionAttrs || "").trim();
      const actionLabel = String(item?.actionLabel || "查看").trim() || "查看";
      if (!title && !detail) return null;
      return { title: title || "主题线索", detail, actionAttrs, actionLabel };
    })
    .filter(Boolean)
    .slice(0, 3);
}

export function renderGraphWorkbenchEntryPillsView({ clueSummary = null, questionSummary = null } = {}, deps = {}) {
  const { escapeHtml, graphWorkbenchTabMeta, graphState } = graphWorkbenchPanelDeps(deps);
  const entries = [
    { meta: graphWorkbenchTabMeta("clues"), total: Number(clueSummary?.total || 0) },
    { meta: graphWorkbenchTabMeta("questions"), total: Number(questionSummary?.total || 0) }
  ];
  return `
    <div class="graph-workbench-entry-group" aria-label="图谱详情入口">
      ${entries
        .map(({ meta, total }) => {
          const active = graphState.workbenchPanelOpen === true && graphWorkbenchTabMeta(graphState.workbenchPanelTab).key === meta.key;
          return `
            <button class="graph-workbench-entry${active ? " is-active" : ""}${total <= 0 ? " is-empty" : ""}" type="button" data-graph-workbench-entry="${escapeHtml(meta.key)}" aria-pressed="${active}" title="${escapeHtml(meta.note)}">
              <span>${escapeHtml(meta.label)}</span>
              ${total > 0 ? `<strong>${escapeHtml(String(total))}</strong>` : ""}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderGraphResearchNavigatorEntryView() {
  return "";
}

export function renderGraphThinkingItemsView(items = [], filter = "all", deps = {}) {
  const { escapeHtml, graphState, graphThinkingFilterMeta, graphThinkingHighlightAttrs, graphCompactActionLabel } = graphWorkbenchPanelDeps(deps);
  const meta = graphThinkingFilterMeta(filter);
  const filtered = meta.key === "all" ? items : items.filter((item) => item.view === meta.key);
  if (!filtered.length) {
    return `
      <div class="graph-thinking-empty">
        <strong>${escapeHtml(meta.key === "theme" ? "还没有可找主题的线索" : meta.key === "organize" ? "还没有需要补的关系" : "当前没有明显建议")}</strong>
        <span>${escapeHtml(meta.key === "theme" ? "先补几条有理由的关系，再回来找主题。" : "继续写笔记或补关系后，这里会出现更具体的建议。")}</span>
        <button class="mini-btn" type="button" data-run-graph-ai-analysis ${graphState.aiAnalysisLoading ? "disabled" : ""}>${graphState.aiAnalysisLoading ? "扫描中..." : "重新检查"}</button>
      </div>
    `;
  }
  return `
    <div class="graph-thinking-list">
      ${filtered
        .slice(0, 8)
        .map((item) => {
          const highlightAttrs = graphThinkingHighlightAttrs(item);
          const actionLabel = item.actionLabel || "打开";
          const compactActionLabel = graphCompactActionLabel(actionLabel);
          return `
            <article class="graph-thinking-item is-${escapeHtml(item.tone || "neutral")}"${highlightAttrs ? ` ${highlightAttrs}` : ""}>
              <button class="graph-thinking-item-main" type="button" ${item.actionAttrs || ""}>
                <strong>${escapeHtml(item.title || "待处理笔记")}</strong>
                <small>${escapeHtml(item.meta || item.detail || "")}</small>
              </button>
              ${item.actionAttrs ? `<button class="graph-thinking-item-action" type="button" ${item.actionAttrs} aria-label="${escapeHtml(`${actionLabel}：${item.title || "待处理笔记"}`)}" title="${escapeHtml(actionLabel)}">${escapeHtml(compactActionLabel)}</button>` : ""}
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderGraphWorkbenchPriorityQueueView(items = [], activeKey = "questions", deps = {}) {
  const { escapeHtml, graphThinkingHighlightAttrs, graphCompactActionLabel } = graphWorkbenchPanelDeps(deps);
  const priorityItems = graphTaskItems(items, activeKey);
  if (!priorityItems.length) return "";
  const title = activeKey === "clues" ? "建议先补这几条关系" : "建议先看这几个主题线索";
  const note = activeKey === "clues"
    ? "打开笔记，补清楚它和哪条笔记互相说明。"
    : "看这些笔记是否在回答同一个问题。";
  return `
    <section class="graph-priority-queue" aria-label="${escapeHtml(title)}">
      <div class="graph-priority-queue-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(note)}</span>
      </div>
      <div class="graph-priority-queue-list">
        ${priorityItems
          .map((item) => {
            const highlightAttrs = graphThinkingHighlightAttrs(item);
            const actionLabel = item.actionLabel || "打开";
            const compactActionLabel = graphCompactActionLabel(actionLabel);
            return `
              <article class="graph-priority-item is-${escapeHtml(item.tone || "neutral")}"${highlightAttrs ? ` ${highlightAttrs}` : ""}>
                <button class="graph-priority-item-main" type="button" ${item.actionAttrs || ""}>
                  <strong>${escapeHtml(item.title || "待处理笔记")}</strong>
                  <small>${escapeHtml(item.question || item.detail || item.meta || "")}</small>
                </button>
                ${item.actionAttrs ? `<button class="graph-priority-item-action" type="button" ${item.actionAttrs} aria-label="${escapeHtml(`${actionLabel}：${item.title || "待处理笔记"}`)}" title="${escapeHtml(actionLabel)}">${escapeHtml(compactActionLabel)}</button>` : ""}
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

export function renderGraphThinkingReviewNoteView(summary = {}, deps = {}) {
  const { escapeHtml } = graphWorkbenchPanelDeps(deps);
  const artifactCount = Number(summary?.artifactCount || 0);
  if (!artifactCount) return "";
  return `
    <div class="graph-thinking-review-note">
      <div>
        <strong>${escapeHtml(String(artifactCount))} 项待确认</strong>
        <span>只保留你能说清理由的关系或主题。</span>
      </div>
      <button class="graph-thinking-review-action" type="button" data-graph-focus-thinking-review aria-label="查看待确认内容">查看</button>
    </div>
  `;
}

export function renderGraphThinkingPanelContentView({ summary = {}, items = [], includeSummary = true } = {}, deps = {}) {
  const { escapeHtml, graphState, graphThinkingFilterMeta } = graphWorkbenchPanelDeps(deps);
  const activeFilter = graphThinkingFilterMeta(graphState.thinkingFilter);
  return `
    ${
      includeSummary
        ? `<div class="graph-thinking-categories"><span><strong>${escapeHtml(String(summary?.total || items.length || 0))}</strong>${escapeHtml(activeFilter.label)}</span></div>`
        : ""
    }
    ${includeSummary ? renderGraphThinkingReviewNoteView(summary, deps) : ""}
    <div class="graph-thinking-panel-body">${renderGraphThinkingItemsView(items, activeFilter.key, deps)}</div>
  `;
}

export function renderGraphThinkingPanelView({ summary = {}, items = [] } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon } = graphWorkbenchPanelDeps(deps);
  return `
    <aside class="graph-thinking-panel" aria-label="图谱建议">
      <div class="graph-thinking-panel-head">
        <div>
          <strong>${escapeHtml(summary.label || "图谱建议")}</strong>
          <span>${escapeHtml(summary.detail || "先看建议，再决定是否采纳。")}</span>
        </div>
        <button class="graph-overlay-close graph-thinking-panel-close" type="button" data-graph-thinking-close aria-label="关闭图谱建议" title="关闭">${renderGraphIcon("close")}</button>
      </div>
      ${renderGraphThinkingPanelContentView({ summary, items, includeSummary: true }, deps)}
    </aside>
  `;
}

export function renderGraphWorkbenchPanelView({ clueSummary = {}, questionSummary = {}, clueSectionsMarkup = "", thinkingItems = [], isolatedQueueMarkup = "" } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon, graphState, graphWorkbenchTabMeta } = graphWorkbenchPanelDeps(deps);
  if (graphState.workbenchPanelOpen !== true) return "";
  const activeTab = graphWorkbenchTabMeta(graphState.workbenchPanelTab);
  const isRelation = activeTab.key === "clues";
  const summary = isRelation ? clueSummary : questionSummary;
  const title = isRelation ? "补全关系" : "找主题";
  const total = Number(summary?.total || 0);
  const themeOverviewItems = isRelation ? [] : graphWorkbenchThemeOverviewItems(thinkingItems);
  const lead = isRelation
    ? total
      ? `图里有 ${total} 个地方可能还没连清楚。`
      : "当前没有明显断开的地方。"
    : total
      ? `图里有 ${total} 个地方可能已经聚成主题。`
      : "当前还没有明显可找主题的线索。";
  const tips = isRelation
    ? [
        "看哪些笔记仍然散着。",
        "看哪里缺一条能说明理由的连接。",
        "真正补关系，到笔记或关联功能里完成。"
      ]
    : [
        "看哪些笔记已经聚成一组。",
        "判断它们是否在回答同一个问题。",
        "真正整理主题，到主题或写作功能里完成。"
      ];
  const guideTitle = isRelation ? "如何找缺口" : "如何发现主题";
  const guideNote = isRelation
    ? "先看断开的笔记、关系薄的地方和缺少理由的连接。"
    : themeOverviewItems.length
      ? "先看下面这些成组线索，再判断它们是否在回答同一个问题。"
      : "先看成组笔记、共同问题和能否写成一句判断。";
  const guideOpen = graphState.workbenchGuideOpen === true;
  return `
    <aside class="graph-workbench-panel" aria-label="${escapeHtml(title)}">
      <div class="graph-workbench-panel-head">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(lead)}</span>
        </div>
        <button class="graph-overlay-close graph-workbench-panel-close" type="button" data-graph-workbench-close aria-label="收起${escapeHtml(title)}" title="收起">${renderGraphIcon("close")}</button>
      </div>
      <div class="graph-workbench-panel-body">
        <section class="graph-workbench-guide" aria-label="${escapeHtml(guideTitle)}">
          <button class="graph-workbench-guide-action" type="button" data-graph-workbench-guide-toggle aria-expanded="${guideOpen}" aria-label="${escapeHtml(guideTitle)}">${escapeHtml(guideTitle)}</button>
          ${guideOpen ? `<span>${escapeHtml(guideNote)}</span>` : ""}
        </section>
        ${
          themeOverviewItems.length
            ? `<section class="graph-workbench-theme-overview" aria-label="主题线索概述">
                ${themeOverviewItems
                  .map(
                    (item) => item.actionAttrs ? `
                      <button class="graph-workbench-theme-overview-item" type="button" ${item.actionAttrs} aria-label="${escapeHtml(`${item.actionLabel}：${item.title}`)}">
                        <strong>${escapeHtml(item.title)}</strong>
                        ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}
                      </button>
                    ` : `
                      <article class="graph-workbench-theme-overview-item">
                        <strong>${escapeHtml(item.title)}</strong>
                        ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}
                      </article>
                    `
                  )
                  .join("")}
              </section>`
            : ""
        }
        <ul class="graph-workbench-note-list">
          ${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}
        </ul>
      </div>
    </aside>
  `;
}
