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
      <section class="today-organizing-hero" aria-label="今日整理说明">
        <div>
          <span>今日整理</span>
          <h2>先把笔记接入关系网，再让主题进入写作。</h2>
          <p>这里不展示复杂术语，只给今天最值得做的三个动作。每一步都从具体笔记开始。</p>
        </div>
        <div class="today-organizing-counts" aria-label="当前整理概览">
          <div><strong>${escape(state.permanentCount || 0)}</strong><span>永久笔记</span></div>
          <div><strong>${escape(state.isolatedCount || 0)}</strong><span>未关联</span></div>
          <div><strong>${escape(state.themeCount || 0)}</strong><span>可写主题</span></div>
        </div>
      </section>
      <section class="today-action-grid" aria-label="今日主动作">
        ${actionCard({
          title: "1. 完成知识建联",
          objectTitle: firstIsolated?.title || "当前没有优先处理的未关联笔记",
          summary: firstIsolated
            ? "为这条永久笔记找一条最重要的旧笔记关系，写清为什么相关。"
            : "已加载的永久笔记暂时没有明显孤立项，可以继续整理主题或写作。",
          meta: firstIsolated ? `还有 ${state.isolatedCount} 条未关联笔记` : "",
          action: "connect-first-isolated",
          actionLabel: firstIsolated ? "处理这条笔记" : "暂无可处理",
          disabled: !firstIsolated,
          tone: "connect"
        })}
        ${actionCard({
          title: "2. 整理可成主题",
          objectTitle: firstTheme?.title || "还没有可直接整理的主题",
          summary: firstTheme
            ? "打开这组相关笔记，检查中心问题、关键关系和能否形成文章。"
            : "当多条永久笔记围绕同一问题聚集时，可以把它们整理成主题入口。",
          meta: firstTheme ? `${firstTheme.noteCount || 0} 条相关笔记` : "",
          action: "open-first-theme",
          actionLabel: firstTheme ? "查看主题" : "先积累关系",
          disabled: !firstTheme,
          tone: "theme"
        })}
        ${actionCard({
          title: "3. 开始写作",
          objectTitle: firstTheme?.title || firstWriting?.title || "先选择一组相关笔记",
          summary: firstTheme
            ? "从这个主题进入写作中心，生成文章提纲，再开始草稿。"
            : firstWriting
              ? "这条永久笔记已经具备基本观点，可以先放入写作中心。"
              : "先完成至少一条清楚的观点和关系，再进入写作。",
          meta: firstWriting ? `${state.writingReadyCount} 条笔记已具备观点基础` : "",
          action: "open-writing",
          actionLabel: firstTheme || firstWriting ? "打开写作中心" : "暂不可写",
          disabled: !firstTheme && !firstWriting,
          tone: "writing"
        })}
      </section>
    </div>
  `;
}
