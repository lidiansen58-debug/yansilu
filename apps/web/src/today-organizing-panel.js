function escape(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
      <button class="mini-btn ${disabled ? "is-ghost" : "primary"}" type="button" data-today-action="${escape(action)}"${disabled ? " disabled" : ""}>
        ${escape(actionLabel)}
      </button>
    </article>
  `;
}

export function renderTodayOrganizingPanel(state = {}) {
  const firstIsolated = state.firstIsolated || null;
  const firstTheme = state.firstTheme || null;
  const firstWriting = state.firstWritingReady || null;
  return `
    <div class="today-organizing-shell">
      <section class="today-organizing-hero" aria-label="今日整理">
        <div>
          <span>今日整理</span>
          <h2>今天只看三件最该做的事。</h2>
          <p>写完一条判断，就找旧笔记、写关系理由、查看主题是否已凑到 3-7 条；凑够后再从主题索引进入写作。</p>
        </div>
        <div class="today-organizing-counts" aria-label="当前整理概览">
          <div><strong>${escape(state.permanentCount || 0)}</strong><span>永久笔记</span></div>
          <div><strong>${escape(state.isolatedCount || 0)}</strong><span>未关联</span></div>
          <div><strong>${escape(state.themeCount || 0)}</strong><span>可成主题</span></div>
        </div>
      </section>
      <section class="today-action-grid" aria-label="今日主动作">
        ${actionCard({
          title: "1. 未关联笔记",
          objectTitle: firstIsolated?.title || "当前没有优先处理的未关联笔记",
          summary: firstIsolated
            ? "先为这条永久笔记找到一个相关对象，并写清它们为什么相关。"
            : "已加载的永久笔记暂时都有明确关系，可以继续看主题或写作。",
          meta: firstIsolated ? `今天还可处理 ${state.isolatedCount} 条` : "",
          action: "connect-first-isolated",
          actionLabel: firstIsolated ? "去建联" : "查看主题",
          disabled: !firstIsolated,
          tone: "connect"
        })}
        ${actionCard({
          title: "2. 可成主题",
          objectTitle: firstTheme?.title || "还没有可直接整理的主题",
          summary: firstTheme
            ? "打开这组相关笔记，检查中心问题、关键关系，以及是否已经凑到 3-7 条。"
            : "当 3-7 条永久笔记围绕同一问题聚集时，可以把它们整理成主题索引。",
          meta: firstTheme ? `${firstTheme.noteCount || 0} 条相关笔记` : "",
          action: "open-first-theme",
          actionLabel: firstTheme ? "整理这个主题" : "先去建联",
          disabled: !firstTheme,
          tone: "theme"
        })}
        ${actionCard({
          title: "3. 可进入写作",
          objectTitle: firstTheme?.title || firstWriting?.title || "先选择一组相关笔记",
          summary: firstTheme
            ? "从这个主题索引进入写作中心，生成文章提纲，再开始草稿。"
            : firstWriting
              ? "这条永久笔记已经有清楚观点，可以先放入写作中心。"
              : "先完成一条清楚观点和一条明确关系，再进入写作。",
          meta: firstWriting ? `${state.writingReadyCount} 条笔记可用` : "",
          action: "open-writing",
          actionLabel: firstTheme || firstWriting ? "进入写作" : "先整理主题",
          disabled: !firstTheme && !firstWriting,
          tone: "writing"
        })}
      </section>
    </div>
  `;
}
