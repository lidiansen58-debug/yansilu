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
        ? `先把这条材料转述成自己的判断，或明确它暂时不用。${materialTitles.length ? ` 待处理：${materialTitles.join("、")}` : ""}`
        : "可以继续检查永久笔记之间的关系。",
      meta: firstMaterial ? `${state.pendingMaterialCount || 0} 条材料待处理` : "没有待处理材料",
      action: "review-material",
      actionLabel: firstMaterial ? "查看这条材料" : "已完成",
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
      actionLabel: firstIsolated ? "去建联" : "已完成",
      disabled: !firstIsolated,
      tone: "connect"
    },
    {
      key: "theme",
      title: "整理主题",
      objectTitle: firstTheme?.title || "还没有可直接整理的主题",
      summary: firstTheme
        ? "先打开主题索引，检查中心问题、关键笔记和阅读顺序。"
        : "当几条笔记围绕同一问题聚集时，再整理成主题索引。",
      meta: firstTheme ? `${firstTheme.noteCount || 0} 条相关笔记` : "等待更多相关笔记",
      action: "open-first-theme",
      actionLabel: firstTheme ? "打开主题索引" : "先去建联",
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
      actionLabel: firstTheme || firstWriting ? "用这个主题进入写作" : "先整理主题",
      disabled: !firstTheme && !firstWriting,
      tone: "writing"
    }
  ];
}

function primaryAction(actions = []) {
  return actions.find((item) => !item.disabled) || {
    title: "今天可以轻量回顾",
    objectTitle: "当前没有必须立刻处理的整理任务",
    summary: "可以打开高级检查，看看标签、关系理由或主题提纲是否值得顺手完善。",
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

function renderEmptyLibraryDemoCard() {
  return `
    <section class="today-empty-demo-card" aria-label="第一次使用推荐">
      <div>
        <span class="today-action-kicker">推荐</span>
        <h3>先体验示例库，10 分钟看懂研思录</h3>
        <p>示例库会创建一套卡片笔记写作法 Demo：随笔、文献笔记、永久笔记、关系、主题索引和写作项目。导入前会请你确认，不会偷偷写入数据。</p>
      </div>
      <button class="mini-btn primary" type="button" data-today-action="seed-demo">
        导入示例库 / 体验 Demo
      </button>
    </section>
  `;
}

export function renderTodayOrganizingPanel(state = {}) {
  const actions = buildTodayActions(state);
  const recommended = primaryAction(actions);
  const emptyDemoCard = state.isEmptyLibrary ? renderEmptyLibraryDemoCard() : "";
  return `
    <div class="today-organizing-shell">
      <section class="today-organizing-hero" aria-label="首页">
        <div>
          <span>首页</span>
          <h2>从这里开始整理知识</h2>
          <p>把随笔和文献加工成永久笔记，再用关系和主题把它们接起来。每天先看这里，只推进最值得做的下一步。</p>
        </div>
        <div class="today-organizing-counts" aria-label="当前整理概览">
          <div><strong>${escape(state.pendingMaterialCount || 0)}</strong><span>待处理材料</span></div>
          <div><strong>${escape(state.permanentCount || 0)}</strong><span>永久笔记</span></div>
          <div><strong>${escape(state.isolatedCount || 0)}</strong><span>未关联</span></div>
          <div><strong>${escape(state.themeCount || 0)}</strong><span>可成主题</span></div>
        </div>
      </section>
      ${emptyDemoCard}
      <section class="today-primary-step tone-${escape(recommended.tone || "")}" aria-label="推荐下一步">
        <div>
          <span class="today-action-kicker">推荐下一步</span>
          <h3>${escape(recommended.title)}</h3>
          <strong>${escape(recommended.objectTitle)}</strong>
          <p>${escape(recommended.summary)}</p>
          ${recommended.meta ? `<small>${escape(recommended.meta)}</small>` : ""}
        </div>
        <button class="mini-btn primary" type="button" data-today-action="${escape(recommended.action)}"${recommended.disabled ? " disabled" : ""}>
          ${escape(recommended.actionLabel)}
        </button>
      </section>
      <section class="today-path-strip" aria-label="卡片笔记整理路径">
        <span>材料</span>
        <span>永久笔记</span>
        <span>关系</span>
        <span>主题</span>
        <span>写作</span>
      </section>
      <section class="today-action-grid" aria-label="继续整理">
        ${actions.filter((item) => item.key !== recommended.key).map(actionCard).join("")}
      </section>
      <details class="today-secondary-details">
        <summary>高级检查：回顾清单和 AI 补充建议</summary>
        ${renderReviewChecklistPanel(state.reviewChecklist)}
      </details>
    </div>
  `;
}
