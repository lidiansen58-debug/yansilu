export function currentModuleSidebarUi({
  module = "",
  rootName = "",
  escapeHtml = (value) => String(value ?? ""),
  settingsSidebarNavigationHtml = () => ""
} = {}) {
  const resolvedRootName = rootName || "当前目录";
  const configs = {
    distillation: {
      sidebarTitle: "观点整理",
      sidebarSubtitle: "把永久笔记推进成清晰观点。",
      sidebarFoot: "观点整理队列只推动手写字段与确认动作；AI 候选后续仍保持待审，不直接改写笔记。",
      title: "观点整理",
      summary: "这里集中处理永久笔记的一句话判断、三句话压缩与确认状态。先让观点变清楚，再进入关系、主题与写作。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>当前目标</h3>
          <p>从 <strong>${escapeHtml(resolvedRootName)}</strong> 中找出还缺一句话判断、三句话压缩或确认动作的永久笔记，逐条推进。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>处理顺序</h3>
          <ol class="module-sidebar-list">
            <li>先写一句判断</li>
            <li>再压缩成三句话</li>
            <li>最后确认这确实是你的观点</li>
          </ol>
        </div>
      `
    },
    imports: {
      sidebarTitle: "导入与导出",
      sidebarSubtitle: "切换标签后直接操作。",
      sidebarFoot: "",
      title: "导入与导出",
      summary: `把外部资料带入 ${escapeHtml(resolvedRootName)}，或者把永久笔记导出到目标目录。`,
      sidebarHtml: ""
    },
    aiInbox: {
      sidebarTitle: "AI 建议复核",
      sidebarSubtitle: "从系统消息进入，是否落地由你确认。",
      sidebarFoot: "系统消息会先承接 AI 建议。只有你点击采纳、建立关系或生成草稿后，才会进入笔记系统。",
      title: "AI 建议复核",
      summary: "这里处理系统消息中的 AI 关联、问题、冲突和写作线索。先看来源和理由，再决定采纳、忽略、归档，避免 AI 自动污染笔记。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>它用来做什么</h3>
          <p>把 AI 的输出拦在“待确认”层：有价值的关系可以进入图谱，有价值的问题可以生成草稿，没用的建议直接忽略。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>处理顺序</h3>
          <ol class="module-sidebar-list">
            <li>先看待判断建议</li>
            <li>核对来源笔记和关系说明</li>
            <li>确认后再建立关系或生成草稿</li>
          </ol>
        </div>
      `
    },
    graph: {
      sidebarTitle: "永久笔记关系图谱",
      sidebarSubtitle: "看永久笔记之间的观点结构。",
      sidebarFoot: "直接看关系，判断哪些观点在支撑、对照、限定或桥接。",
      title: "永久笔记关系图谱",
      summary: "把永久笔记和它们之间的“支持、反驳、限定、连接”等关系放到一张图里，快速看出中心观点、孤立观点、冲突和缺失连接。",
      sidebarHtml: ""
    },
    writing: {
      sidebarTitle: "写作中心",
      sidebarSubtitle: "从成熟笔记进入写作中心。",
      sidebarFoot: "写作中心应从成熟笔记出发，不替代笔记编辑器。",
      title: "写作中心",
      summary: "这里不是囤积观点卡的地方，而是把已经成熟的永久笔记组织成可写主题、项目和草稿骨架的地方。页面应围绕写作中心这条主路径展开，也要逼你处理反方、边界和概念错位，而不只是堆叠相近观点。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>写作原则</h3>
          <p>先判断哪些主题已经值得写，再挑选支撑该主题的永久笔记加入写作篮。这里帮助组织结构，也会提醒你补反方、边界和漏洞，但不直接代替你完成最终写作。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>建议路径</h3>
          <ol class="module-sidebar-list">
            <li>先确认一个可推进的主题</li>
            <li>把相关永久笔记加入写作篮</li>
            <li>生成并迭代草稿骨架，优先处理冲突与缺口</li>
          </ol>
        </div>
      `
    },
    settings: {
      sidebarTitle: "设置",
      sidebarSubtitle: "左侧切换，右侧设置。",
      sidebarFoot: "",
      title: "设置",
      summary: "当前设置项",
      sidebarHtml: settingsSidebarNavigationHtml()
    }
  };
  return configs[module] || {
    sidebarTitle: "功能页",
    sidebarSubtitle: "当前功能页。",
    sidebarFoot: "当前功能页。",
    title: "功能页",
    summary: "当前模块说明。",
    sidebarHtml: ""
  };
}

export function syncModuleChromeClassesForRuntime({
  module = "",
  moduleWorkspace = null,
  appShell = null
} = {}) {
  const graphMode = module === "graph";
  const importsMode = module === "imports";
  const settingsMode = module === "settings";
  moduleWorkspace?.classList?.toggle?.("graph-mode", graphMode);
  moduleWorkspace?.classList?.toggle?.("imports-mode", importsMode);
  moduleWorkspace?.classList?.toggle?.("settings-mode", settingsMode);
  appShell?.classList?.toggle?.("graph-mode", graphMode);
  appShell?.classList?.toggle?.("settings-desktop-lock", settingsMode);
  return { graphMode, importsMode, settingsMode };
}
