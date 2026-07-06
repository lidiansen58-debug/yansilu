export function currentModuleSidebarUi({
  module = "",
  rootName = "",
  escapeHtml = (value) => String(value ?? ""),
  settingsSidebarNavigationHtml = () => ""
} = {}) {
  const resolvedRootName = rootName || "当前目录";
  const configs = {
    today: {
      sidebarTitle: "首页",
      sidebarSubtitle: "每天从这里开始，只推进最值得做的一步。",
      sidebarFoot: "首页是总入口：先处理待整理材料，再补关系、成主题，最后进入写作。",
      title: "让笔记生长为思想",
      summary: "每天只推进一步：处理材料、补一条关系、整理一个主题，最后进入写作。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>从一个小动作开始</h3>
          <p>先处理最上方的推荐任务。材料会变成永久笔记，永久笔记通过关系形成主题，主题再进入写作。</p>
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
    backup: {
      sidebarTitle: "备份与恢复",
      sidebarSubtitle: "先保护整个笔记库，再考虑导入导出。",
      sidebarFoot: "备份文件已加密，请保存到当前笔记库之外，并牢记密码。",
      title: "备份与恢复",
      summary: "把整个笔记库加密打包，或者恢复到一个新文件夹。适合迁移电脑、保存版本和发布前留底。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>推荐顺序</h3>
          <ol class="module-sidebar-list">
            <li>选择笔记库外的保存位置</li>
            <li>设置并记住备份密码</li>
            <li>创建加密备份后复制到可靠位置</li>
          </ol>
        </div>
      `
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
      sidebarTitle: "从主题到草稿",
      sidebarSubtitle: "把相关笔记整理成一篇文章的起点。",
      sidebarFoot: "复杂说明放在帮助里；这里先完成下一步。",
      title: "写作中心",
      summary: "选择相关笔记，确定可写主题，生成提纲，再保存草稿。",
      sidebarHtml: `
        <div class="module-sidebar-card">
          <h3>当前目标</h3>
          <p>先把能回答同一问题的笔记放到一起，再把它变成提纲和草稿。</p>
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
  const backupMode = module === "backup";
  moduleWorkspace?.classList?.toggle?.("graph-mode", graphMode);
  moduleWorkspace?.classList?.toggle?.("imports-mode", importsMode);
  moduleWorkspace?.classList?.toggle?.("backup-mode", backupMode);
  moduleWorkspace?.classList?.toggle?.("settings-mode", settingsMode);
  appShell?.classList?.toggle?.("graph-mode", graphMode);
  appShell?.classList?.toggle?.("settings-desktop-lock", settingsMode);
  return { graphMode, importsMode, backupMode, settingsMode };
}
