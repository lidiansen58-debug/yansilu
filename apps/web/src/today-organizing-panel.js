import { renderReviewChecklistPanel } from "./review-checklist-panel.js";

function escape(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildTodayActions(state = {}) {
  const firstMaterial = state.firstPendingMaterial || null;
  const materialTitles = Array.isArray(state.pendingMaterialItems)
    ? state.pendingMaterialItems.map((item) => item?.title).filter(Boolean).slice(0, 3)
    : [];
  const firstIsolated = state.firstIsolated || null;
  const firstTheme = state.firstTheme || null;
  const firstWriting = state.firstWritingReady || null;
  return [
    {
      key: "material",
      title: "处理材料",
      objectTitle: firstMaterial?.title || "随笔和文献暂时都已处理",
      summary: firstMaterial
        ? `先把这条材料加工成自己的判断。${materialTitles.length ? `待处理：${materialTitles.join("、")}` : ""}`
        : "现在没有待加工材料，可以继续检查永久笔记之间的关系。",
      meta: firstMaterial ? `${state.pendingMaterialCount || 0} 条材料待处理` : "没有待处理材料",
      action: "review-material",
      actionLabel: firstMaterial ? "处理这条材料" : "已完成",
      disabled: !firstMaterial,
      tone: "material"
    },
    {
      key: "connect",
      title: "补一条关系",
      objectTitle: firstIsolated?.title || "当前没有优先处理的孤立笔记",
      summary: firstIsolated
        ? "给它找一条真正相关的笔记，并写清楚：支持、反驳、限制，还是类比。"
        : "已加载的永久笔记暂时都有明确关系。",
      meta: firstIsolated ? `还有 ${state.isolatedCount || 0} 条待建联` : "关系状态良好",
      action: "connect-first-isolated",
      actionLabel: firstIsolated ? "去关联" : "已完成",
      disabled: !firstIsolated,
      tone: "connect"
    },
    {
      key: "theme",
      title: "整理主题",
      objectTitle: firstTheme?.title || "还没有可直接整理的主题",
      summary: firstTheme
        ? "先看中心问题、关键笔记和阅读顺序，确认这组笔记能否支撑一篇文章。"
        : "当几条笔记围绕同一问题聚集时，再整理成主题索引。",
      meta: firstTheme ? `${firstTheme.noteCount || 0} 条相关笔记` : "等待更多相关笔记",
      action: "open-first-theme",
      actionLabel: firstTheme ? "打开主题索引" : "先去关联",
      disabled: !firstTheme,
      tone: "theme"
    },
    {
      key: "writing",
      title: "进入写作",
      objectTitle: firstTheme?.title || firstWriting?.title || "还没有可直接写作的主题",
      summary: firstTheme
        ? "把这组笔记带入写作中心，先生成提纲，再决定是否起草。"
        : firstWriting
          ? "这条永久笔记已经有清晰观点，可以先放入写作中心继续组织。"
          : "先完成清晰观点、明确关系和可写主题，再进入写作。",
      meta: firstWriting ? `${state.writingReadyCount || 0} 条笔记可用` : "写作前先整理素材",
      action: "open-writing",
      actionLabel: firstTheme || firstWriting ? "进入写作" : "先整理主题",
      disabled: !firstTheme && !firstWriting,
      tone: "writing"
    }
  ];
}

function primaryAction(actions = []) {
  return actions.find((item) => !item.disabled) || {
    title: "今天可以轻量回顾",
    objectTitle: "当前没有必须立刻处理的整理任务",
    summary: "可以做一次辅助检查，看看标签、关系理由或主题提纲是否值得完善。",
    meta: "整理状态良好",
    action: "",
    actionLabel: "无需处理",
    disabled: true,
    tone: "calm"
  };
}

function actionCard({
  title = "",
  summary = "",
  objectTitle = "",
  meta = "",
  action = "",
  actionLabel = "",
  disabled = false,
  tone = ""
} = {}) {
  return `
    <article class="today-action-card ${tone ? `tone-${escape(tone)}` : ""}">
      <div>
        <span class="today-action-kicker">${escape(title)}</span>
        <strong>${escape(objectTitle || "暂时没有需要处理的对象")}</strong>
        <p>${escape(summary)}</p>
        ${meta ? `<small>${escape(meta)}</small>` : ""}
      </div>
      <button class="mini-btn today-action-button" type="button" data-today-action="${escape(action)}"${disabled ? " disabled" : ""}>
        ${escape(actionLabel)}
      </button>
    </article>
  `;
}

function renderOverview(state = {}) {
  return `
    <section class="today-overview-compact" aria-label="当前笔记库状态">
      <div class="today-overview-counts">
        <span><strong>${escape(state.pendingMaterialCount || 0)}</strong> 待处理材料</span>
        <span><strong>${escape(state.permanentCount || 0)}</strong> 永久笔记</span>
        <span><strong>${escape(state.isolatedCount || 0)}</strong> 未关联</span>
        <span><strong>${escape(state.themeCount || 0)}</strong> 可成主题</span>
      </div>
      <div class="today-path-inline" aria-label="卡片笔记整理路径">
        <span>材料</span><span>永久笔记</span><span>关系</span><span>主题</span><span>写作</span>
      </div>
    </section>
  `;
}

function renderEmptyLibraryHome() {
  return `
    <section class="today-empty-home" aria-label="第一次使用引导">
      <div class="today-empty-home-copy">
        <span class="today-action-kicker">第一次打开，建议先体验示例库</span>
        <h3>用 10 分钟看懂研思录怎么让笔记生长为思想</h3>
        <p>示例库会创建一套卡片笔记写作法 Demo：随笔、文献笔记、永久笔记、关系、主题索引和写作项目。导入前会请你确认，不会自动写入。</p>
      </div>
      <div class="today-empty-home-actions">
        <button class="mini-btn primary" type="button" data-today-action="seed-demo">
          导入示例库 / 体验 Demo
        </button>
        <small>导入后会自动打开导览笔记，照着走一遍就能理解主流程。</small>
      </div>
    </section>
  `;
}

export function renderTodayOrganizingPanel(state = {}) {
  const actions = buildTodayActions(state);
  const recommended = primaryAction(actions);
  if (state.isEmptyLibrary) {
    return `
      <div class="today-organizing-shell is-empty">
        ${renderEmptyLibraryHome()}
        <section class="today-empty-next" aria-label="你会学到什么">
          <article><strong>先记录</strong><span>把随笔和材料放进自己的笔记库。</span></article>
          <article><strong>再建联</strong><span>写清楚笔记之间为什么相关。</span></article>
          <article><strong>后写作</strong><span>从主题索引进入写作中心生成提纲。</span></article>
        </section>
      </div>
    `;
  }
  return `
    <div class="today-organizing-shell">
      <section class="today-primary-step tone-${escape(recommended.tone || "")}" aria-label="推荐下一步">
        <div>
          <span class="today-action-kicker">现在最重要</span>
          <h3>${escape(recommended.title)}</h3>
          <strong>${escape(recommended.objectTitle)}</strong>
          <p>${escape(recommended.summary)}</p>
          ${recommended.meta ? `<small>${escape(recommended.meta)}</small>` : ""}
        </div>
        <button class="mini-btn primary" type="button" data-today-action="${escape(recommended.action)}"${recommended.disabled ? " disabled" : ""}>
          ${escape(recommended.actionLabel)}
        </button>
      </section>
      <section class="today-action-grid" aria-label="继续整理">
        ${actions.filter((item) => item.key !== recommended.key).map(actionCard).join("")}
      </section>
      ${renderOverview(state)}
      <details class="today-secondary-details">
        <summary>辅助检查</summary>
        ${renderReviewChecklistPanel(state.reviewChecklist)}
      </details>
    </div>
  `;
}
