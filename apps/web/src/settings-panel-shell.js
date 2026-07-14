import {
  SETTINGS_DETAIL_ITEMS,
  SETTINGS_SECTIONS,
  normalizeSettingsSection,
  settingsDetailItemConfig,
  settingsItemSummary,
  settingsSectionConfig
} from "./prototype-settings-navigation.js";

export function renderSettingsWorkbenchChromeForRuntime(deps = {}) {
  const {
    $ = () => null,
    document = globalThis.document,
    settingsState = {},
    settingsSectionChromeMap = () => ({}),
    settingsAiOverviewSummary = () => ({}),
    settingsMobileItemOptionsHtml = () => "",
    settingsLeafLabel = (value = "", fallback = "默认笔记库") => String(value || fallback).trim() || fallback,
    formatSettingsUserError = (value = "") => String(value || "")
  } = deps;
  const activeSection = normalizeSettingsSection(settingsState.activeSection);
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  const vault = settingsState.vault;
  const chromeMap = settingsSectionChromeMap();
  const aiSummary = settingsAiOverviewSummary();
  const automationCount = Number(settingsState.ai?.scheduledTasksTotal || 0) + Number(settingsState.ai?.suggestionsTotal || 0);
  const overviewLabels = document?.querySelectorAll?.("#settingsPanel .settings-overview-label") || [];

  const overviewKicker = document?.querySelector?.("#settingsPanel .settings-overview-kicker");
  const overviewTitle = document?.querySelector?.("#settingsPanel .settings-overview-title");
  const overviewBody = document?.querySelector?.("#settingsPanel .settings-overview-body");
  if (overviewKicker) overviewKicker.textContent = "设置分类";
  if (overviewTitle) overviewTitle.textContent = "按类别管理研思录。";
  if (overviewBody) overviewBody.textContent = "工作区、模板、AI、自动整理和帮助各自归类。";
  if (overviewLabels.length >= 3) {
    overviewLabels[0].textContent = "工作区";
    overviewLabels[1].textContent = "AI 路线";
    overviewLabels[2].textContent = "自动整理";
  }

  SETTINGS_SECTIONS.forEach((section, index) => {
    const pane = $(section.paneId);
    const button = $(section.buttonId);
    const meta = $(section.metaId);
    const title = button?.querySelector?.(".settings-nav-title");
    const isActive = section.id === activeSection;
    pane?.classList.toggle("hidden", !isActive);
    button?.classList.toggle("is-active", isActive);
    button?.setAttribute("aria-pressed", isActive ? "true" : "false");
    if (button?.style) button.style.order = String(index);
    if (title) title.textContent = section.label;
    if (meta) meta.textContent = chromeMap[section.id]?.meta || section.label;
  });

  const mobileItemSelect = $("settingsMobileItemSelect");
  if ($("settingsMapStatusValue")) $("settingsMapStatusValue").textContent = activeItem.label;
  if (mobileItemSelect) {
    const nextOptionsHtml = settingsMobileItemOptionsHtml();
    if (mobileItemSelect.innerHTML !== nextOptionsHtml) mobileItemSelect.innerHTML = nextOptionsHtml;
    mobileItemSelect.value = activeItem.id;
  }

  if ($("settingsOverviewWorkspaceName")) $("settingsOverviewWorkspaceName").textContent = vault?.vaultPath ? settingsLeafLabel(vault.vaultPath) : "等待同步";
  if ($("settingsOverviewWorkspaceMeta")) {
    $("settingsOverviewWorkspaceMeta").textContent = vault
      ? `${vault.initialized ? "已初始化" : "待初始化"} · ${vault.defaultVaultPath ? `默认：${settingsLeafLabel(vault.defaultVaultPath)}` : "等待默认路径"}`
      : (formatSettingsUserError(settingsState.error) || "笔记库状态会在这里汇总。");
  }
  if ($("settingsOverviewAiRoute")) $("settingsOverviewAiRoute").textContent = aiSummary.value;
  if ($("settingsOverviewAiMeta")) $("settingsOverviewAiMeta").textContent = aiSummary.meta || "当前使用的模型、服务和连接状态。";
  if ($("settingsOverviewAutomation")) $("settingsOverviewAutomation").textContent = `${automationCount} 个待处理`;
  if ($("settingsOverviewAutomationMeta")) $("settingsOverviewAutomationMeta").textContent = `待处理 ${Number(settingsState.ai?.suggestionsTotal || 0)} / 整理规则 ${Number(settingsState.ai?.scheduledTasksTotal || 0)}`;
}

export function renderSettingsSidebarColumnForRuntime(deps = {}) {
  const {
    $ = () => null,
    document = globalThis.document,
    settingsState = {},
    settingsSectionChromeMap = () => ({}),
    settingsSectionGuidanceMap = () => ({}),
    escapeHtml = (value = "") => String(value ?? "")
  } = deps;
  const activeSection = normalizeSettingsSection(settingsState.activeSection);
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  const chromeMap = settingsSectionChromeMap();
  const guidance = settingsSectionGuidanceMap()[activeSection] || {};
  const navCardNote = document?.querySelector?.("#settingsSectionNav")?.closest(".settings-nav-card")?.querySelector(".settings-nav-card-note");

  $("settingsNavEntryCard")?.classList.remove("hidden");
  if ($("settingsSidebarIntroNote")) $("settingsSidebarIntroNote").textContent = "按工作区、模板、AI、自动整理和帮助分类。";
  if (navCardNote) navCardNote.textContent = "按工作区、模板、AI、自动整理和帮助分类。";
  if ($("settingsSidebarFocusPill")) {
    const badge = chromeMap[activeSection]?.badge || activeItem.label;
    $("settingsSidebarFocusPill").textContent = `${activeItem.label} · ${badge}`;
  }
  if ($("settingsSidebarFocusBody")) $("settingsSidebarFocusBody").textContent = guidance.focus || "先看当前帮助项，确认下一步该打开说明、反馈，还是进入本地设置。";
  if ($("settingsSidebarChecklist")) {
    const notes = Array.isArray(guidance.notes) && guidance.notes.length > 0
      ? guidance.notes
      : ["当前参数会跟随笔记库同步。", "先确认状态，再执行写入操作。", "右侧区域只显示当前设置项内容。"];
    $("settingsSidebarChecklist").innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  }
}

export function renderSettingsDetailFocusForRuntime(deps = {}) {
  const { $ = () => null, settingsState = {} } = deps;
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  const config = settingsSectionConfig(activeItem.sectionId);
  const visibleCardIds = new Set(activeItem.cardIds || []);
  SETTINGS_DETAIL_ITEMS.forEach((item) => {
    item.cardIds.forEach((cardId) => {
      const card = $(cardId);
      if (!card) return;
      card.classList.toggle("hidden", !(item.sectionId === config.id && visibleCardIds.has(cardId)));
    });
  });
  const pane = $(config.paneId);
  const paneTitle = pane?.querySelector(".settings-pane-title");
  const paneNote = pane?.querySelector(".settings-pane-note");
  if (paneTitle) paneTitle.textContent = activeItem.label;
  if (paneNote) paneNote.textContent = settingsItemSummary(activeItem.id);
}
