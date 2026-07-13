export const SETTINGS_SECTIONS = Object.freeze([
  {
    id: "workspace",
    label: "本地笔记库",
    paneId: "settingsPaneWorkspace",
    buttonId: "settingsNavWorkspace",
    metaId: "settingsNavWorkspaceMeta",
    bodyId: "settingsPaneWorkspaceBody"
  },
  {
    id: "templates",
    label: "笔记模板",
    paneId: "settingsPaneTemplates",
    buttonId: "settingsNavTemplates",
    metaId: "settingsNavTemplatesMeta",
    bodyId: "settingsPaneTemplatesBody"
  },
  {
    id: "ai",
    label: "AI 设置",
    paneId: "settingsPaneAi",
    buttonId: "settingsNavAi",
    metaId: "settingsNavAiMeta",
    bodyId: "settingsPaneAiBody"
  },
  {
    id: "automation",
    label: "自动处理",
    paneId: "settingsPaneAutomation",
    buttonId: "settingsNavAutomation",
    metaId: "settingsNavAutomationMeta",
    bodyId: "settingsPaneAutomationBody"
  },
  {
    id: "support",
    label: "帮助与反馈",
    paneId: "settingsPaneSupport",
    buttonId: "settingsNavSupport",
    metaId: "settingsNavSupportMeta",
    bodyId: "settingsPaneSupportBody"
  }
]);

export const SETTINGS_DETAIL_ITEMS = Object.freeze([
  { id: "mobile-access", label: "手机访问", group: "手机访问", sectionId: "workspace", cardIds: ["settingsCardMobileAccess"] },
  { id: "current-vault", label: "本地笔记库", group: "工作区与数据", sectionId: "workspace", cardIds: ["settingsCardSwitchVault"] },
  { id: "import-export", label: "导入导出", group: "工作区与数据", sectionId: "workspace", cardIds: ["settingsCardImportExport"] },
  { id: "permanent-template", label: "永久笔记模板", group: "笔记模板", sectionId: "templates", cardIds: ["settingsCardPermanentTemplate"] },
  { id: "literature-template", label: "文献笔记模板", group: "笔记模板", sectionId: "templates", cardIds: ["settingsCardLiteratureTemplate"] },
  { id: "ai-settings", label: "AI 设置", group: "AI", sectionId: "ai", cardIds: ["settingsCardAiSettings"] },
  { id: "automation", label: "自动处理", group: "自动处理", sectionId: "automation", cardIds: ["settingsCardAutomation"] },
  { id: "desktop-help", label: "本地使用说明", group: "帮助与反馈", sectionId: "support", cardIds: ["settingsDesktopHelpCard"] },
  { id: "feedback", label: "问题反馈", group: "帮助与反馈", sectionId: "support", cardIds: ["settingsFeedbackCard"] },
  { id: "version-update", label: "版本更新", group: "帮助与反馈", sectionId: "support", cardIds: ["settingsUpdateCard"] }
]);

const SETTINGS_DETAIL_GROUPS = ["手机访问", "工作区与数据", "笔记模板", "AI", "自动处理", "帮助与反馈"];

function escapeHtmlValue(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeSettingsSection(sectionId = "") {
  const requested = String(sectionId || "").trim().toLowerCase();
  return SETTINGS_SECTIONS.some((section) => section.id === requested) ? requested : "workspace";
}

export function settingsSectionConfig(sectionId = "") {
  const normalized = normalizeSettingsSection(sectionId);
  return SETTINGS_SECTIONS.find((section) => section.id === normalized) || SETTINGS_SECTIONS[0];
}

export function normalizeSettingsItem(itemId = "") {
  const requested = String(itemId || "").trim().toLowerCase();
  return SETTINGS_DETAIL_ITEMS.some((item) => item.id === requested) ? requested : SETTINGS_DETAIL_ITEMS[0].id;
}

export function settingsDetailItemConfig(itemId = "") {
  const normalized = normalizeSettingsItem(itemId);
  return SETTINGS_DETAIL_ITEMS.find((item) => item.id === normalized) || SETTINGS_DETAIL_ITEMS[0];
}

export function settingsSectionChromeMap({
  settingsState = {},
  settingsVaultPathMissing = () => false,
  settingsLeafLabel = (value = "", fallback = "默认笔记库") => String(value || fallback).trim() || fallback,
  settingsAiOverviewSummary = () => ({}),
  settingsAiRuntimeModeLabel = () => "自动",
  feedbackRepository = "",
  feedbackRepositoryReady = false
} = {}) {
  const vault = settingsState.vault;
  const missingPath = settingsVaultPathMissing();
  const workspaceBadge = missingPath
    ? "路径失效"
    : vault
      ? (vault.initialized ? "已初始化" : "待初始化")
      : "待同步";
  const workspaceMeta = missingPath
    ? "当前路径失效，请重新选择"
    : (vault?.vaultPath ? settingsLeafLabel(vault.vaultPath) : "选择或切换笔记库");
  const templateDraftCount = ["permanent", "literature"].filter((kind) => settingsState.noteTemplates?.[kind]?.draftActive).length;
  const aiSummary = settingsAiOverviewSummary();
  const automationCount = Number(settingsState.ai?.scheduledTasksTotal || 0) + Number(settingsState.ai?.suggestionsTotal || 0);
  return {
    workspace: {
      badge: workspaceBadge,
      meta: workspaceMeta
    },
    templates: {
      badge: templateDraftCount > 0 ? `${templateDraftCount} 个草稿` : "2 项",
      meta: templateDraftCount > 0 ? "有未保存模板改动" : "永久笔记与文献模板"
    },
    ai: {
      badge: settingsAiRuntimeModeLabel(settingsState.ai?.runtimeMode),
      meta: aiSummary.meta || "本机 AI、在线 AI 与使用方式"
    },
    automation: {
      badge: String(automationCount),
      meta: `待确认 ${Number(settingsState.ai?.suggestionsTotal || 0)} / 后台任务 ${Number(settingsState.ai?.scheduledTasksTotal || 0)}`
    },
    support: {
      badge: feedbackRepositoryReady ? "反馈入口" : "待绑定",
      meta: feedbackRepositoryReady ? "遇到问题先看这里、Demo、任务帮助" : "遇到问题先看这里"
    }
  };
}

export function settingsSectionIconLabel(sectionId = "") {
  const labels = {
    workspace: "WS",
    templates: "TM",
    ai: "AI",
    automation: "AU",
    support: "SP"
  };
  return labels[normalizeSettingsSection(sectionId)] || "ST";
}

export function settingsSectionSidebarIconSvg(sectionId = "") {
  const normalized = normalizeSettingsSection(sectionId);
  const icons = {
    workspace: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"></path>
        <path d="M12 21V12"></path>
        <path d="M21 7.5 12 12 3 7.5"></path>
      </svg>
    `,
    templates: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 4h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
        <path d="M15 4v5h5"></path>
        <path d="M8 13h8"></path>
        <path d="M8 17h6"></path>
      </svg>
    `,
    ai: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3v4"></path>
        <path d="M12 17v4"></path>
        <path d="M4.93 4.93 7.76 7.76"></path>
        <path d="M16.24 16.24 19.07 19.07"></path>
        <path d="M3 12h4"></path>
        <path d="M17 12h4"></path>
        <path d="M4.93 19.07 7.76 16.24"></path>
        <path d="M16.24 7.76 19.07 4.93"></path>
        <circle cx="12" cy="12" r="4.5"></circle>
      </svg>
    `,
    automation: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 6v6l4 2"></path>
        <circle cx="12" cy="12" r="9"></circle>
      </svg>
    `,
    support: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 20h9"></path>
        <path d="M12 4h9"></path>
        <path d="M3 6h4v4H3z"></path>
        <path d="M3 14h4v4H3z"></path>
        <path d="M7 8h5"></path>
        <path d="M7 16h5"></path>
      </svg>
    `
  };
  return icons[normalized] || icons.workspace;
}

export function settingsItemSidebarIconSvg(itemId = "") {
  const normalized = normalizeSettingsItem(itemId);
  const icons = {
    "current-vault": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l1.6 2H17.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"></path>
        <path d="M8 11h8"></path>
        <path d="M8 14h5"></path>
      </svg>
    `,
    "mobile-access": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="7" y="3.5" width="10" height="17" rx="2.4"></rect>
        <path d="M10 6h4"></path>
        <path d="M10 17.5h4"></path>
        <path d="M4.5 9.5c1.2-1.2 2.5-1.8 4-1.8"></path>
        <path d="M4.5 14.5c1.2 1.2 2.5 1.8 4 1.8"></path>
      </svg>
    `,
    "import-export": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7.5 4.5v9"></path>
        <path d="m4.5 10.5 3 3 3-3"></path>
        <path d="M16.5 19.5v-9"></path>
        <path d="m13.5 13.5 3-3 3 3"></path>
        <path d="M4.5 19.5h15"></path>
      </svg>
    `,
    "switch-vault": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H10l1.4 1.8H17.5A2.5 2.5 0 0 1 20 10.3v5.2A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5z"></path>
        <path d="M10 12h8"></path>
        <path d="m15 9 3 3-3 3"></path>
      </svg>
    `,
    "permanent-template": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 4.5h7l4 4v11A2.5 2.5 0 0 1 15.5 22h-8A2.5 2.5 0 0 1 5 19.5v-12A3 3 0 0 1 8 4.5z"></path>
        <path d="M14 4.5v4h4"></path>
        <path d="M8.5 13h7"></path>
        <path d="M8.5 16h5"></path>
        <path d="m8.5 9.5 1.4 1.4L12.8 8"></path>
      </svg>
    `,
    "literature-template": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6.5 4.5h9A2.5 2.5 0 0 1 18 7v12.5l-3.5-2-3.5 2-3.5-2-3.5 2V7A2.5 2.5 0 0 1 6.5 4.5z"></path>
        <path d="M8 9h8"></path>
        <path d="M8 12h6"></path>
        <path d="M8 15h4"></path>
      </svg>
    `,
    "ai-settings": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="6.5" y="6.5" width="11" height="11" rx="2.5"></rect>
        <path d="M12 3.5v3"></path>
        <path d="M12 17.5v3"></path>
        <path d="M3.5 12h3"></path>
        <path d="M17.5 12h3"></path>
        <circle cx="12" cy="12" r="2.4"></circle>
      </svg>
    `,
    automation: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5"></circle>
        <path d="M12 7.5v4.5l3 1.8"></path>
        <path d="m16.8 5.8 1.4-1.4"></path>
      </svg>
    `,
    "desktop-help": `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4.5" y="5.5" width="15" height="10.5" rx="2"></rect>
        <path d="M8 19h8"></path>
        <path d="M10 16v3"></path>
        <path d="M14 16v3"></path>
      </svg>
    `,
    feedback: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6.5 6.5h11A2.5 2.5 0 0 1 20 9v6a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3v-3H6.5A2.5 2.5 0 0 1 4 15V9a2.5 2.5 0 0 1 2.5-2.5z"></path>
        <path d="M9 11h6"></path>
        <path d="M9 14h4"></path>
      </svg>
    `
  };
  return icons[normalized] || settingsSectionSidebarIconSvg(settingsDetailItemConfig(normalized).sectionId);
}

export function settingsItemSummary(itemId = "") {
  const summaries = {
    "current-vault": "在这里直接选择并切换笔记库路径。",
    "import-export": "导入外部资料或导出永久笔记；日常保护数据请优先使用左侧的备份与恢复。",
    "mobile-access": "扫码连接手机。",
    "permanent-template": "设置新建永久笔记时使用的默认内容。",
    "literature-template": "设置新建文献笔记时使用的默认内容。",
    "ai-settings": "",
    automation: "处理待确认建议，必要时再查看后台任务和运行结果。",
    "version-update": "检查新版本，必要时打开下载页。",
    "desktop-help": "说明笔记文件、数据库和笔记库切换规则。",
    feedback: "反馈问题或复制排查信息。"
  };
  const key = normalizeSettingsItem(itemId);
  return Object.prototype.hasOwnProperty.call(summaries, key)
    ? summaries[key]
    : "右侧只显示当前点击设置项相关的内容。";
}

export function formatSettingsUserError(errorMessage = "") {
  const text = String(errorMessage || "").trim();
  if (!text) return "";
  if (/ENOENT|no such file or directory/i.test(text)) return "找不到当前笔记库路径，请重新选择或切换笔记库。";
  if (/EACCES|EPERM|permission denied/i.test(text)) return "当前路径没有访问权限，请检查文件夹权限后再试。";
  if (/timed out|timeout/i.test(text)) return "读取超时，请稍后重试。";
  return text.length > 120 ? "读取失败，请重试；如果仍然失败，请重新选择笔记库路径。" : text;
}

export function settingsSectionGuidanceMap({
  settingsState = {},
  settingsLeafLabel = (value = "", fallback = "默认笔记库") => String(value || fallback).trim() || fallback,
  settingsAiOverviewSummary = () => ({ value: "日常整理" })
} = {}) {
  const currentVault = settingsState.vault?.vaultPath
    ? settingsLeafLabel(settingsState.vault.vaultPath)
    : "笔记库";
  const aiSummary = settingsAiOverviewSummary();
  return {
    workspace: {
      focus: `查看 ${currentVault} 的状态和默认路径。`,
      notes: [
        "切换笔记库会关闭当前标签页，并重新加载目录树与缓存上下文。",
        "缓存可以重建，Markdown 主内容不能丢。",
        "先用路径选择器确认目标目录，再执行切换。"
      ]
    },
    templates: {
      focus: "先统一永久笔记与文献模板骨架，再进入具体字段和 Markdown 预览。",
      notes: [
        "保存模板只影响后续新建笔记，不会回写已有内容。",
        "{{title}} 是当前稳定标题占位符，优先围绕它组织骨架。",
        "需要差异化时，先改字段文案，再决定是否扩展结构。"
      ]
    },
    ai: {
      focus: `先选择“本机 AI”或“在线 AI”，再确认当前方案 ${aiSummary.value} 是否适合日常研究。`,
      notes: [
        "本机 AI 适合敏感资料和离线研究。",
        "在线 AI 适合团队网关、云端模型或统一服务。",
        "入口向导完成后，再用一句不含敏感内容的短句试运行。"
      ]
    },
    automation: {
      focus: "先处理需要你确认的建议；后台任务和运行结果只在需要调整或排查时查看。",
      notes: [
        "待确认建议不会自动写入笔记或图谱。",
        "后台任务只负责生成推荐结果，最终是否采纳仍由你决定。",
        "运行结果用于排查失败和确认最近一次处理。"
      ]
    },
    support: {
      focus: "先确认反馈入口和本地说明，再决定是提交问题还是复制问题信息。",
      notes: [
        "反馈入口会优先带上当前版本、模块和上下文信息。",
        "本地使用说明主要解释路径、本地文件和工作区切换行为。",
        "复制问题信息前注意不要把敏感密钥一并带出去。"
      ]
    }
  };
}

export function settingsSidebarNavigationHtml({
  settingsState = {},
  chromeMap = {},
  escapeHtml = escapeHtmlValue
} = {}) {
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  const groupHtml = SETTINGS_DETAIL_GROUPS.map((group) => {
    const items = SETTINGS_DETAIL_ITEMS.filter((item) => item.group === group).map((item) => {
      const chrome = chromeMap[item.sectionId] || {};
      const isActive = item.id === activeItem.id;
      return `
        <button
          class="settings-sidebar-menu-item ${isActive ? "is-active" : ""}"
          type="button"
          data-settings-item="${escapeHtml(item.id)}"
          aria-pressed="${isActive ? "true" : "false"}"
        >
          <span class="settings-sidebar-menu-icon">${settingsItemSidebarIconSvg(item.id)}</span>
          <span class="settings-sidebar-menu-copy">
            <span class="settings-sidebar-menu-title">${escapeHtml(item.label)}</span>
            <span class="settings-sidebar-menu-meta">${escapeHtml(chrome.meta || settingsSectionConfig(item.sectionId).label)}</span>
          </span>
        </button>
      `;
    }).join("");
    return `
      <section class="settings-sidebar-menu-group">
        <div class="settings-sidebar-menu-heading">${escapeHtml(group)}</div>
        <div class="settings-sidebar-menu-list">${items}</div>
      </section>
    `;
  }).join("");

  return `
    <div class="settings-sidebar-shell">
      <button class="settings-sidebar-back" type="button" id="settingsSidebarBackToApp">
        <span aria-hidden="true">←</span>
        <span>返回应用</span>
      </button>
      <div class="settings-sidebar-menu">
        ${groupHtml}
      </div>
    </div>
  `;
}

export function settingsMobileItemOptionsHtml({ escapeHtml = escapeHtmlValue } = {}) {
  return SETTINGS_DETAIL_GROUPS.map((group) => {
    const options = SETTINGS_DETAIL_ITEMS
      .filter((item) => item.group === group)
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`)
      .join("");
    return `<optgroup label="${escapeHtml(group)}">${options}</optgroup>`;
  }).join("");
}

export function settingsModuleHeaderCopy({ settingsState = {} } = {}) {
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  return {
    title: activeItem.label,
    summary: settingsItemSummary(activeItem.id),
    templateKind: activeItem.id === "literature-template"
      ? "literature"
      : activeItem.id === "permanent-template"
        ? "permanent"
        : ""
  };
}
