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
      title: "说清一条记录",
      objectTitle: firstMaterial?.title || "随笔和文献暂时都已处理",
      summary: firstMaterial
        ? `用自己的话说清楚它对你意味着什么。${materialTitles.length ? `待处理：${materialTitles.join("、")}` : ""}`
        : "记录都已说清楚，可以检查关联。",
      meta: firstMaterial ? `${state.pendingMaterialCount || 0} 条待处理` : "已处理",
      action: "review-material",
      actionLabel: firstMaterial ? "说清这条记录" : "已完成",
      disabled: !firstMaterial,
      tone: "material"
    },
    {
      key: "connect",
      title: "说明为什么有关",
      objectTitle: firstIsolated?.title || "暂无待关联笔记",
      summary: firstIsolated
        ? "找一条相关笔记，写一句它们为什么有关。"
        : "笔记之间已经有清楚的关联。",
      meta: firstIsolated ? `${state.isolatedCount || 0} 条待关联` : "已关联",
      action: "connect-first-isolated",
      actionLabel: firstIsolated ? "去关联" : "已完成",
      disabled: !firstIsolated,
      tone: "connect"
    },
    {
      key: "theme",
      title: "围绕问题整理",
      objectTitle: firstTheme?.title || "还没有可直接整理的主题",
      summary: firstTheme
        ? "看看这些笔记能不能一起回答一个问题。"
        : "先积累几条彼此相关的笔记。",
      meta: firstTheme ? `${firstTheme.noteCount || 0} 条相关` : "待积累",
      action: "open-first-theme",
      actionLabel: firstTheme ? "打开这组笔记" : "先去关联",
      disabled: !firstTheme,
      tone: "theme"
    },
    {
      key: "writing",
      title: "用笔记开始写作",
      objectTitle: firstTheme?.title || firstWriting?.title || "暂无可写主题",
      summary: firstTheme
        ? "先生成提纲，再决定是否起草。"
        : firstWriting
          ? "放入写作中心继续组织。"
          : "先整理观点、关系和主题。",
      meta: firstWriting ? `${state.writingReadyCount || 0} 条可用` : "先整理",
      action: "open-writing",
      actionLabel: firstTheme || firstWriting ? "进入写作" : "先整理主题",
      disabled: !firstTheme && !firstWriting,
      tone: "writing"
    }
  ];
}

function primaryAction(actions = []) {
  return actions.find((item) => !item.disabled) || {
    title: "随手记录",
    objectTitle: "记下一个新想法",
    summary: "先写下来，之后再整理成自己的观点。",
    meta: "",
    action: "start-first-note",
    actionLabel: "记一条",
    disabled: false,
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
        <span><strong>${escape(state.pendingMaterialCount || 0)}</strong><small>待说清</small></span>
        <span><strong>${escape(state.permanentCount || 0)}</strong><small>已沉淀观点</small></span>
        <span><strong>${escape(state.isolatedCount || 0)}</strong><small>未关联</small></span>
        <span><strong>${escape(state.themeCount || 0)}</strong><small>可继续整理</small></span>
      </div>
      <div class="today-overview-note">
        先完成上方推荐任务。
      </div>
    </section>
  `;
}

function renderBeginnerGuide() {
  return `
    <section class="today-beginner-guide" aria-label="新用户使用步骤">
      <div class="today-beginner-copy">
        <span class="today-action-kicker">推荐路径</span>
        <strong>记录 -> 判断 -> 关联 -> 写作</strong>
      </div>
      <ol>
        <li><span>1</span><strong>说清记录</strong></li>
        <li><span>2</span><strong>留下判断</strong></li>
        <li><span>3</span><strong>说明关联</strong></li>
        <li><span>4</span><strong>开始写作</strong></li>
      </ol>
    </section>
  `;
}

function renderEmptyLibraryHome(state = {}) {
  const startupPending = state.startupPending === true;
  const startupError = String(state.startupError || "");
  const unavailable = startupPending || Boolean(startupError);
  return `
    <section class="today-empty-home" aria-label="第一次使用引导">
      <div class="today-empty-home-copy">
        <span class="today-empty-brand">研思录 <small>让笔记生长为思想</small></span>
        <h3>从一条笔记开始</h3>
        <p>记下想法，整理成观点，再用它们写出文章。</p>
      </div>
      <div class="today-empty-home-actions">
        <button class="mini-btn primary" type="button" data-today-action="${startupError ? "retry-startup" : "start-first-note"}"${startupPending ? ` disabled aria-busy="true"` : ""}>
          ${startupPending ? "正在准备..." : startupError ? "重新连接" : "新建笔记"}
        </button>
        <small data-today-entry-status role="status"${unavailable ? "" : " hidden"}>${startupPending ? "正在准备本地笔记库..." : escape(startupError)}</small>
      </div>
      <div class="today-empty-home-secondary" aria-label="其他开始方式">
        <div class="today-empty-home-option">
          <button class="mini-btn" type="button" data-today-action="open-import"${unavailable ? " disabled" : ""}>导入笔记</button>
          <small>从 Markdown 文件夹导入</small>
        </div>
        <div class="today-empty-home-option">
          <button class="mini-btn" type="button" data-today-action="seed-demo"${unavailable ? " disabled" : ""}>导入示例笔记与写作</button>
          <small data-today-demo-status aria-live="polite">示例包含笔记与文章，操作要点保存在笔记里。</small>
        </div>
        <div class="today-demo-progress" data-today-demo-progress role="progressbar" aria-label="Demo 导入进度" hidden>
          <span></span>
        </div>
      </div>
    </section>
  `;
}

function renderTodaySummary(state = {}) {
  return `
    <section class="today-quick-summary" aria-label="首页概览">
      <div class="today-path-inline">
        <span>路径</span>
        <strong>记录 -> 判断 -> 关联 -> 写作</strong>
      </div>
      <div class="today-overview-counts">
        <span><strong>${escape(state.pendingMaterialCount || 0)}</strong><small>待说清</small></span>
        <span><strong>${escape(state.isolatedCount || 0)}</strong><small>未关联</small></span>
        <span><strong>${escape(state.themeCount || 0)}</strong><small>可整理</small></span>
      </div>
    </section>
  `;
}

function renderTodayNotice(message = "") {
  const text = String(message || "").trim();
  if (!text) return "";
  return `
    <section class="today-import-notice" aria-live="polite">
      <strong>导入完成</strong>
      <span>${escape(text)}</span>
    </section>
  `;
}

export function renderTodayOrganizingPanel(state = {}) {
  if (!state.isEmptyLibrary && (state.startupPending || state.startupError)) {
    return `
      <div class="today-organizing-shell is-startup">
        <section class="today-empty-home" aria-label="笔记库连接">
          <div class="today-empty-home-copy">
            <h3>${state.startupPending ? "正在准备笔记库" : "暂时无法读取笔记库"}</h3>
          </div>
          <div class="today-empty-home-actions">
            <button class="mini-btn primary" type="button" data-today-action="retry-startup"${state.startupPending ? ` disabled aria-busy="true"` : ""}>${state.startupPending ? "正在准备..." : "重新连接"}</button>
            <small data-today-entry-status role="status">${state.startupPending ? "正在准备本地笔记库..." : escape(state.startupError)}</small>
          </div>
        </section>
      </div>
    `;
  }
  const actions = buildTodayActions(state);
  const recommended = primaryAction(actions);
  if (state.isEmptyLibrary) {
    return `
      <div class="today-organizing-shell is-empty">
        ${renderEmptyLibraryHome(state)}
      </div>
    `;
  }
  return `
    <div class="today-organizing-shell">
      ${renderTodayNotice(state.noticeMessage)}
      <section class="today-primary-step tone-${escape(recommended.tone || "")}" aria-label="推荐下一步">
        <div>
          <strong>${escape(recommended.objectTitle)}</strong>
          <p>${escape(recommended.summary)}</p>
          ${recommended.meta ? `<small>${escape(recommended.meta)}</small>` : ""}
        </div>
        <button class="mini-btn primary" type="button" data-today-action="${escape(recommended.action)}"${recommended.disabled ? " disabled" : ""}>
          ${escape(recommended.actionLabel)}
        </button>
      </section>
      ${renderTodaySummary(state)}
      <section class="today-secondary-tabs" aria-label="辅助信息">
        <div class="today-secondary-tablist" role="tablist" aria-label="辅助信息切换">
          <button class="today-secondary-tab" type="button" role="tab" aria-selected="false" data-today-secondary-tab="path">其他步骤 <span>展开</span></button>
          <button class="today-secondary-tab" type="button" role="tab" aria-selected="false" data-today-secondary-tab="check">今日提醒 <span>展开</span></button>
          ${recommended.action !== "start-first-note" ? `<button class="mini-btn" type="button" data-today-action="start-first-note">记一条</button>` : ""}
        </div>
        <div class="today-secondary-panel" role="tabpanel" data-today-secondary-panel="path" hidden>
          <div class="today-secondary-body">
            ${renderBeginnerGuide()}
            ${renderOverview(state)}
            <section class="today-action-grid" aria-label="其他可做">
              ${actions.filter((item) => item.key !== recommended.key && !item.disabled).map(actionCard).join("")}
            </section>
          </div>
        </div>
        <div class="today-secondary-panel" role="tabpanel" data-today-secondary-panel="check" hidden>
          <div class="today-secondary-body">
            ${renderReviewChecklistPanel(state.reviewChecklist)}
          </div>
        </div>
      </section>
    </div>
  `;
}
