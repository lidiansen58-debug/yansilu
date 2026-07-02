export function currentModuleSidebarUi({
  module = "",
  rootName = "",
  escapeHtml = (value) => String(value ?? ""),
  settingsSidebarNavigationHtml = () => ""
} = {}) {
  const resolvedRootName = rootName || "当前目录";
  const configs = {
    today: {
      sidebarTitle: "今日整理",
      sidebarSubtitle: "打开后只看下一步该做什么。",
      sidebarFoot: "今天只推进一个小动作：接入关系、整理主题索引，或从主题进入写作。",
      title: "今日整理",
      summary: "这里把卢曼方法压成当天可做的小动作：先让新永久笔记找旧笔记并写清关系理由，再把 3-7 条同问题笔记整理成主题索引，最后从主题进入写作。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>使用顺序</h3>
          <ol class="module-sidebar-list">
            <li>写完永久笔记，马上找一条旧笔记</li>
            <li>建立关系，并写清为什么相关</li>
            <li>3-7 条笔记围绕同一问题时，整理成主题索引</li>
            <li>从主题索引进入文章提纲和草稿</li>
          </ol>
        </div>
      `
    },
    distillation: {
      sidebarTitle: "观点整理",
      sidebarSubtitle: "把永久笔记推进成清晰观点。",
      sidebarFoot: "观点整理只给出建议；你确认后才会写入笔记。",
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
      sidebarTitle: "AI 建议",
      sidebarSubtitle: "从系统消息进入，是否落地由你确认。",
      sidebarFoot: "系统消息会先承接 AI 建议。只有你点击采纳、建立关系或生成草稿后，才会进入笔记系统。",
      title: "AI 建议",
      summary: "这里处理需要你确认的关系、问题、冲突和写作建议。先看来源和理由，再决定采纳、忽略、归档，避免 AI 自动污染笔记。",
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
      sidebarSubtitle: "从相关笔记进入提纲和草稿。",
      sidebarFoot: "写作中心帮你组织文章结构，不替代最终写作。",
      title: "写作中心",
      summary: "这里回答四件事：我能写什么、用哪些笔记写、文章结构怎么起步、下一步写哪一段。先确定可写主题，再选择相关笔记，生成文章提纲，最后开始草稿。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>你要回答四件事</h3>
          <p>这篇文章能写什么？用哪些笔记写？提纲怎么起步？下一段该写哪里？这里会帮你把相关笔记整理成可检查的文章结构。</p>
        </div>
        <div class="module-sidebar-card">
          <h3>操作顺序</h3>
          <ol class="module-sidebar-list">
            <li>先确认一个可写主题</li>
            <li>选择支撑它的相关笔记</li>
            <li>生成文章提纲，再开始草稿</li>
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
