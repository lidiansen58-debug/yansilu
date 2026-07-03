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
      label: "关系待办",
      emptyLabel: "关系清楚",
      panelTitle: "关系待办",
      note: "先处理会影响图谱可读性的关系"
    },
    questions: {
      key: "questions",
      label: "思考问题",
      emptyLabel: "暂无问题",
      panelTitle: "思考问题",
      note: "从问题里继续长出观点"
    }
  };
  return meta[key] || meta.clues;
}

function defaultThinkingFilterMeta(value = "") {
  const key = String(value || "all").trim().toLowerCase();
  const meta = {
    all: { key: "all", label: "全部", note: "查看全部待确认内容" },
    theme: { key: "theme", label: "主题", note: "查看可能形成可写主题的聚集" },
    organize: { key: "organize", label: "关系", note: "查看待整理的关系" }
  };
  return meta[key] || meta.all;
}

function defaultCompactActionLabel(label = "") {
  return String(label || "查看").trim() || "查看";
}

function defaultHighlightAttrs() {
  return "";
}

function graphWorkbenchPriorityItems(items = [], activeKey = "questions") {
  const list = Array.isArray(items) ? items : [];
  const filtered =
    activeKey === "clues"
      ? list.filter((item) => item.view === "organize" || ["bridge", "review", "isolated"].includes(String(item.tone || "").trim()))
      : list;
  return filtered.slice(0, 3);
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

export function renderGraphWorkbenchEntryPillsView({ clueSummary = null, questionSummary = null } = {}, deps = {}) {
  const { escapeHtml, graphWorkbenchTabMeta, graphState } = graphWorkbenchPanelDeps(deps);
  const clueMeta = graphWorkbenchTabMeta("clues");
  const questionMeta = graphWorkbenchTabMeta("questions");
  const entries = [
    { meta: clueMeta, total: Number(clueSummary?.total || 0) },
    { meta: questionMeta, total: Number(questionSummary?.total || 0) }
  ];
  return `
    <div class="graph-workbench-entry-group" aria-label="图谱侧栏入口">
      ${entries
        .map(({ meta, total }) => {
          const active = graphState.workbenchPanelOpen === true && graphWorkbenchTabMeta(graphState.workbenchPanelTab).key === meta.key;
          const label = total > 0 ? meta.label : meta.emptyLabel;
          const ariaLabel = total > 0 ? `${meta.label}：${total} 项。${meta.note}` : `${meta.emptyLabel}。${meta.note}`;
          return `
            <button class="graph-workbench-entry${active ? " is-active" : ""}${total <= 0 ? " is-empty" : ""}" type="button" data-graph-workbench-entry="${escapeHtml(meta.key)}" aria-pressed="${active}" aria-label="${escapeHtml(ariaLabel)}" title="${escapeHtml(ariaLabel)}">
              <span>${escapeHtml(label)}</span>
              ${total > 0 ? `<strong>${escapeHtml(String(total))}</strong>` : ""}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderGraphResearchNavigatorEntryView(open = false) {
  const action = open ? "close" : "open";
  const label = "概览";
  const title = open ? "收起概览" : "打开概览";
  return `
    <button class="graph-workbench-entry graph-research-entry${open ? " is-active" : ""}" type="button" data-graph-research-${action} aria-pressed="${open}" title="${title}">
      <span>${label}</span>
    </button>
  `;
}

export function renderGraphThinkingItemsView(items = [], filter = "all", deps = {}) {
  const { escapeHtml, graphState, graphThinkingFilterMeta, graphThinkingHighlightAttrs, graphCompactActionLabel } = graphWorkbenchPanelDeps(deps);
  const meta = graphThinkingFilterMeta(filter);
  const filtered = meta.key === "all" ? items : items.filter((item) => item.view === meta.key);
  if (!filtered.length) {
    return `
      <div class="graph-thinking-empty">
        <strong>${escapeHtml(meta.key === "theme" ? "还没有可写主题推荐" : meta.key === "organize" ? "还没有待处理关系" : "当前没有明显问题")}</strong>
        <span>${escapeHtml(meta.key === "theme" ? "运行图谱扫描后，可以在这里查看可能形成可写主题的笔记组。" : "继续写笔记、补关系理由或运行图谱扫描后，这里会出现新的待处理内容。")}</span>
        <button class="mini-btn" type="button" data-run-graph-ai-analysis ${graphState.aiAnalysisLoading ? "disabled" : ""}>${graphState.aiAnalysisLoading ? "扫描中..." : "扫描追问"}</button>
      </div>
    `;
  }
  return `
    <div class="graph-thinking-list">
      ${filtered
        .slice(0, 8)
        .map((item) => {
          const highlightAttrs = graphThinkingHighlightAttrs(item);
          const actionLabel = item.actionLabel || "查看";
          const compactActionLabel = graphCompactActionLabel(actionLabel);
          return `
            <article class="graph-thinking-item is-${escapeHtml(item.tone || "neutral")}"${highlightAttrs ? ` ${highlightAttrs}` : ""}>
              <button class="graph-thinking-item-main" type="button" ${item.actionAttrs || ""}>
                <span class="graph-thinking-kicker">${escapeHtml(item.kicker || "可继续判断")}</span>
                <strong>${escapeHtml(item.title || "待处理")}</strong>
                <small>${escapeHtml(item.meta || "")}</small>
                <em>${escapeHtml(item.detail || "这里值得继续判断。")}</em>
                ${item.question ? `<span class="graph-thinking-question"><small>要判断的问题</small>${escapeHtml(item.question)}</span>` : ""}
              </button>
              ${item.actionAttrs ? `<button class="graph-thinking-item-action" type="button" ${item.actionAttrs} aria-label="${escapeHtml(actionLabel)}：${escapeHtml(item.title || "待处理")}" title="${escapeHtml(actionLabel)}">${escapeHtml(compactActionLabel)}</button>` : ""}
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderGraphWorkbenchPriorityQueueView(items = [], activeKey = "questions", deps = {}) {
  const { escapeHtml, graphThinkingHighlightAttrs, graphCompactActionLabel } = graphWorkbenchPanelDeps(deps);
  const priorityItems = graphWorkbenchPriorityItems(items, activeKey);
  if (!priorityItems.length) return "";
  const title = activeKey === "clues" ? "先处理这 3 条" : "先看这 3 个问题";
  const note = activeKey === "clues"
    ? "从这里开始，图谱会最快变清楚。"
    : "从这里开始，最容易长出下一步观点。";
  return `
    <section class="graph-priority-queue" aria-label="${escapeHtml(title)}">
      <div class="graph-priority-queue-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(note)}</span>
      </div>
      <div class="graph-priority-queue-list">
        ${priorityItems
          .map((item, index) => {
            const highlightAttrs = graphThinkingHighlightAttrs(item);
            const actionLabel = item.actionLabel || "查看";
            const compactActionLabel = graphCompactActionLabel(actionLabel);
            return `
              <article class="graph-priority-item is-${escapeHtml(item.tone || "neutral")}"${highlightAttrs ? ` ${highlightAttrs}` : ""}>
                <button class="graph-priority-item-main" type="button" ${item.actionAttrs || ""}>
                  <span>${escapeHtml(`${index + 1}. ${item.kicker || "待判断"}`)}</span>
                  <strong>${escapeHtml(item.title || "待处理")}</strong>
                  <small>${escapeHtml(item.question || item.detail || "这里值得继续判断。")}</small>
                </button>
                ${item.actionAttrs ? `<button class="graph-priority-item-action" type="button" ${item.actionAttrs} aria-label="${escapeHtml(actionLabel)}：${escapeHtml(item.title || "待处理")}" title="${escapeHtml(actionLabel)}">${escapeHtml(compactActionLabel)}</button>` : ""}
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
        <strong>已保存 ${escapeHtml(String(artifactCount))} 项待确认</strong>
        <span>这些结果就在当前图谱里处理。先看待确认内容，只保存能说清理由的关系或可写主题。</span>
      </div>
      <button class="graph-thinking-review-action" type="button" data-graph-focus-thinking-review aria-label="查看图谱待确认内容">查看待确认</button>
    </div>
  `;
}

export function renderGraphThinkingPanelContentView({ summary = {}, items = [], includeSummary = true } = {}, deps = {}) {
  const { escapeHtml, graphState, graphThinkingFilterMeta } = graphWorkbenchPanelDeps(deps);
  const categories = Array.isArray(summary.categories) ? summary.categories : [];
  const activeFilter = graphThinkingFilterMeta(graphState.thinkingFilter);
  const filterButtons = ["all", "theme", "organize"]
    .map((value) => {
      const meta = graphThinkingFilterMeta(value);
      const active = meta.key === activeFilter.key;
      return `<button class="graph-thinking-filter${active ? " is-active" : ""}" type="button" data-graph-thinking-filter="${escapeHtml(meta.key)}" aria-pressed="${active}" title="${escapeHtml(meta.note)}">${escapeHtml(meta.label)}</button>`;
    })
    .join("");
  return `
    <div class="graph-thinking-filters" aria-label="待确认内容筛选">
      ${filterButtons}
    </div>
    ${
      includeSummary
        ? (
            categories.length
              ? `<div class="graph-thinking-categories">${categories
                  .map((item) => `<span><strong>${escapeHtml(String(item.count))}</strong>${escapeHtml(item.label)}</span>`)
                  .join("")}</div>`
              : `<div class="graph-empty">当前范围暂时没有明显要优先判断的内容。可以继续写笔记或补充关系理由后再刷新图谱。</div>`
          )
        : ""
    }
    ${includeSummary ? renderGraphThinkingReviewNoteView(summary, deps) : ""}
    <div class="graph-thinking-panel-body">${renderGraphThinkingItemsView(items, activeFilter.key, deps)}</div>
  `;
}

export function renderGraphThinkingPanelView({ summary = {}, items = [] } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon } = graphWorkbenchPanelDeps(deps);
  return `
    <aside class="graph-thinking-panel" aria-label="待确认内容">
      <div class="graph-thinking-panel-head">
        <div>
          <strong>${escapeHtml(summary.label || "待确认内容")}</strong>
          <span>${escapeHtml(summary.detail || "按需查看可写主题推荐、待关联笔记、可能相关内容和关系确认。")}</span>
        </div>
        <button class="graph-overlay-close graph-thinking-panel-close" type="button" data-graph-thinking-close aria-label="关闭待确认面板" title="关闭待确认内容">${renderGraphIcon("close")}</button>
      </div>
      ${renderGraphThinkingPanelContentView({ summary, items, includeSummary: true }, deps)}
    </aside>
  `;
}

export function renderGraphWorkbenchPanelView({ clueSummary = {}, questionSummary = {}, clueSectionsMarkup = "", thinkingItems = [], isolatedQueueMarkup = "" } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon, graphState, graphWorkbenchTabMeta } = graphWorkbenchPanelDeps(deps);
  const open = graphState.workbenchPanelOpen === true;
  if (!open) return "";
  const activeTab = graphWorkbenchTabMeta(graphState.workbenchPanelTab);
  const guide =
    activeTab.key === "clues"
      ? {
          title: "从最影响图谱可读性的地方开始",
          detail: "先处理待关联笔记和缺少连接；已有关系只在需要补理由时再打开。",
          action: "AI 扫描"
        }
      : {
          title: "每次只追一个问题",
          detail: "打开对应笔记或关系，判断它是否能变成新的观点、边界或主题。"
        };
  const tabs = ["clues", "questions"]
    .map((value) => {
      const meta = graphWorkbenchTabMeta(value);
      const total = Number((value === "clues" ? clueSummary?.total : questionSummary?.total) || 0);
      const active = meta.key === activeTab.key;
      return `<button class="graph-workbench-tab${active ? " is-active" : ""}" type="button" data-graph-workbench-tab="${escapeHtml(meta.key)}" aria-pressed="${active}">${escapeHtml(meta.label)}${total > 0 ? ` <strong>${escapeHtml(String(total))}</strong>` : ""}</button>`;
    })
    .join("");
  const summary = activeTab.key === "clues" ? clueSummary : questionSummary;
  const isolatedQueueVisible = activeTab.key === "clues" && String(isolatedQueueMarkup || "").trim();
  const bodyMarkup =
    activeTab.key === "clues"
      ? clueSectionsMarkup || `<div class="graph-empty">当前范围暂时没有明显需要优先处理的关系。</div>`
      : renderGraphThinkingPanelContentView({ summary: questionSummary, items: thinkingItems, includeSummary: false }, deps);
  const priorityMarkup = renderGraphWorkbenchPriorityQueueView(thinkingItems, activeTab.key, deps);
  const foldedBodyMarkup = String(bodyMarkup || "").trim()
    ? `<details class="graph-workbench-all"${priorityMarkup ? "" : " open"}>
        <summary>${activeTab.key === "clues" ? "查看全部关系待办" : "查看全部思考问题"}</summary>
        ${bodyMarkup}
      </details>`
    : "";
  return `
    <aside class="graph-workbench-panel" aria-label="图谱侧栏">
      <div class="graph-workbench-panel-head">
        <div>
          <strong>${escapeHtml(activeTab.panelTitle || activeTab.label)}</strong>
          <span>${escapeHtml(summary?.detail || activeTab.note)}</span>
        </div>
        <button class="graph-overlay-close graph-workbench-panel-close" type="button" data-graph-workbench-close aria-label="收起图谱侧栏" title="收起图谱侧栏">${renderGraphIcon("close")}</button>
      </div>
      <div class="graph-workbench-tabs" aria-label="图谱侧栏标签">
        ${tabs}
      </div>
      <section class="graph-workbench-guide">
        <div>
          <strong>${escapeHtml(guide.title)}</strong>
          <span>${escapeHtml(guide.detail)}</span>
        </div>
        ${
          guide.action
            ? `<button class="mini-btn" type="button" data-run-graph-ai-analysis ${graphState.aiAnalysisLoading ? "disabled" : ""}>${graphState.aiAnalysisLoading ? "扫描中..." : escapeHtml(guide.action)}</button>`
            : ""
        }
      </section>
      <div class="graph-workbench-panel-body">
        ${isolatedQueueVisible ? isolatedQueueMarkup : ""}
        ${priorityMarkup}
        ${foldedBodyMarkup}
      </div>
    </aside>
  `;
}
