import { normalizeAiRuntimeMode } from "./ai-settings-state.js";
import {
  SETTINGS_DETAIL_ITEMS,
  formatSettingsUserError as computeFormatSettingsUserError,
  normalizeSettingsSection,
  settingsDetailItemConfig,
  settingsItemSummary as computeSettingsItemSummary,
  settingsMobileItemOptionsHtml as renderSettingsMobileItemOptionsHtml,
  settingsModuleHeaderCopy as computeSettingsModuleHeaderCopy,
  settingsSectionChromeMap as computeSettingsSectionChromeMap,
  settingsSectionConfig,
  settingsSectionGuidanceMap as computeSettingsSectionGuidanceMap,
  settingsSidebarNavigationHtml as renderSettingsSidebarNavigationHtml
} from "./prototype-settings-navigation.js";
import { renderSettingsDetailFocusForRuntime, renderSettingsSidebarColumnForRuntime, renderSettingsWorkbenchChromeForRuntime } from "./settings-panel-shell.js";
import { renderSettingsPanelForRuntime } from "./settings-panel-renderer.js";
import { renderVaultBackupPanel } from "./settings-vault-backup-panel.js";

export function createSettingsPanelRuntimeRoutes(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};

  function settingsLeafLabel(value = "", fallback = "默认笔记库") {
    const text = String(value || "").trim();
    if (!text) return fallback;
    const segments = text.split(/[\\/]+/).filter(Boolean);
    return segments.at(-1) || text || fallback;
  }

  function settingsAiRuntimeModeLabel(value = "") {
    const normalized = normalizeAiRuntimeMode(value || "auto");
    if (normalized === "local_only") return "只用本地模型";
    if (normalized === "cloud_only") return "只用远程模型";
    return "自动选择";
  }

  function settingsAiAdvancedRuntimeModeLabel(value = "") {
    return normalizeAiRuntimeMode(value || "auto") === "hybrid" ? "本地优先（高级）" : settingsAiRuntimeModeLabel(value);
  }

  function settingsAiUserModeDisplayLabel(value = "") {
    const key = String(value || "").trim();
    const labels = {
      Auto: "自动",
      Economy: "节省成本",
      Balanced: "均衡质量",
      "Deep Thinking": "深度思考",
      "Local / Private": "本地 / 私密"
    };
    return labels[key] || key || "自动";
  }

  function settingsAiProviderDisplayLabel(value = "") {
    const key = String(value || "").trim();
    const labels = {
      "Ollama Local": "本地 AI",
      ollama_local_gateway: "本地 AI",
      local_private_gateway: "本地 AI",
      "Platform Managed OpenAI": "在线 AI",
      platform_managed_openai: "在线 AI"
    };
    return labels[key] || key || "AI 服务";
  }

  function settingsAiModelPackDisplayLabel(value = "") {
    const key = String(value || "").trim();
    const labels = {
      "Starter Auto": "日常整理",
      "Low Cost Research": "低成本研究",
      "Deep Work": "深度工作",
      "China Optimized": "国内优化",
      "Global Optimized": "远程增强",
      "Privacy First": "本地私密",
      "Ollama Local": "本地 AI",
      "MiniCPM Local": "MiniCPM 本地",
      "MiniCPM Remote": "MiniCPM 远程"
    };
    return labels[key] || key || "日常整理";
  }

  function settingsAiOverviewSummary() {
    const current = deps();
    const preview = current.settingsState.ai.routePreview || null;
    const providerName = String(preview?.provider?.displayName || preview?.provider?.providerId || "").trim();
    const routeModel = String(preview?.route?.modelRef || "").trim();
    const localModel = String(current.settingsState.ai.localModel || "").trim();
    const routeModelName = routeModel.includes(":") ? routeModel.slice(routeModel.lastIndexOf(":") + 1) : routeModel;
    const rawValue = routeModelName || localModel || String(current.settingsState.ai.modelPack || "Starter Auto").trim() || "Starter Auto";
    const value = settingsAiModelPackDisplayLabel(rawValue);
    const runtimeMode = normalizeAiRuntimeMode(current.settingsState.ai.runtimeMode || "auto");
    const advancedModelRef = String(current.settingsState.ai.advancedModelRef || "").trim();
    const secretRef = String(current.settingsState.ai.secretRef || "").trim();
    const hasUserConfig = Boolean(localModel || advancedModelRef || secretRef || runtimeMode === "local_only" || runtimeMode === "cloud_only" || runtimeMode === "off");
    const metaParts = [];
    if (runtimeMode === "off") {
      metaParts.push("停用");
    } else if (!hasUserConfig) {
      metaParts.push("未配置");
    } else if (providerName) {
      metaParts.push(settingsAiProviderDisplayLabel(providerName));
    } else {
      metaParts.push(settingsAiRuntimeModeLabel(runtimeMode));
    }
    return {
      value,
      meta: metaParts.filter(Boolean).join(" / ")
    };
  }

  function settingsSectionChromeMap() {
    const current = deps();
    return computeSettingsSectionChromeMap({
      settingsState: current.settingsState,
      settingsVaultPathMissing,
      settingsLeafLabel,
      settingsAiOverviewSummary,
      settingsAiRuntimeModeLabel,
      feedbackRepository: current.feedbackRepository,
      feedbackRepositoryReady: current.feedbackRepositoryReady
    });
  }

  function settingsItemSummary(itemId = "") {
    return computeSettingsItemSummary(itemId);
  }

  function formatSettingsUserError(errorMessage = "") {
    return computeFormatSettingsUserError(errorMessage);
  }

  function settingsVaultPathMissing() {
    return /找不到当前笔记库路径|ENOENT|no such file or directory/i.test(String(deps().settingsState.error || "").trim());
  }

  function settingsSectionGuidanceMap() {
    const current = deps();
    return computeSettingsSectionGuidanceMap({
      settingsState: current.settingsState,
      settingsLeafLabel,
      settingsAiOverviewSummary
    });
  }

  function settingsSidebarNavigationHtml() {
    const current = deps();
    return renderSettingsSidebarNavigationHtml({
      settingsState: current.settingsState,
      chromeMap: settingsSectionChromeMap(),
      escapeHtml: current.escapeHtml
    });
  }

  function settingsMobileItemOptionsHtml() {
    return renderSettingsMobileItemOptionsHtml({ escapeHtml: deps().escapeHtml });
  }

  function settingsModuleHeaderCopy() {
    return computeSettingsModuleHeaderCopy({ settingsState: deps().settingsState });
  }

  function setSettingsSection(sectionId = "", options = {}) {
    const current = deps();
    const nextSection = normalizeSettingsSection(sectionId);
    const changed = current.settingsState.activeSection !== nextSection;
    current.settingsState.activeSection = nextSection;
    const firstItem = SETTINGS_DETAIL_ITEMS.find((item) => item.sectionId === nextSection);
    if (firstItem) current.settingsState.activeItem = firstItem.id;
    if (options.render !== false) {
      if (current.state.module === "settings") current.renderSidebarTitle();
      renderSettingsPanel();
    }
    if (changed && options.announce) {
      const config = settingsSectionConfig(nextSection);
      current.setStatus(`已切换到设置分区：${config.label}`, "ok");
    }
  }

  function setSettingsItem(itemId = "", options = {}) {
    const current = deps();
    const nextItem = settingsDetailItemConfig(itemId);
    const changed = current.settingsState.activeItem !== nextItem.id;
    current.settingsState.activeItem = nextItem.id;
    current.settingsState.activeSection = nextItem.sectionId;
    if (options.render !== false) {
      if (current.state.module === "settings") current.renderSidebarTitle();
      renderSettingsPanel();
    }
    if (changed && options.announce) {
      current.setStatus(`已切换到设置项：${nextItem.label}`, "ok");
    }
  }

  function ensureSettingsWorkbenchLayout() {
    return;
  }

  function renderSettingsWorkbenchChrome() {
    const current = deps();
    renderSettingsWorkbenchChromeForRuntime({
      $: current.$,
      document: current.document,
      settingsState: current.settingsState,
      settingsSectionChromeMap,
      settingsAiOverviewSummary,
      settingsMobileItemOptionsHtml,
      settingsLeafLabel,
      formatSettingsUserError
    });
  }

  function renderSettingsSidebarColumn() {
    const current = deps();
    renderSettingsSidebarColumnForRuntime({
      $: current.$,
      document: current.document,
      settingsState: current.settingsState,
      settingsSectionChromeMap,
      settingsSectionGuidanceMap,
      escapeHtml: current.escapeHtml
    });
  }

  function filterSettingsSidebarMenu(query = "") {
    const normalized = String(query || "").trim().toLowerCase();
    deps().document.querySelectorAll("#moduleSidebar .settings-sidebar-menu-item[data-settings-search]").forEach((button) => {
      const searchText = String(button.getAttribute("data-settings-search") || "").toLowerCase();
      const hidden = normalized && !searchText.includes(normalized);
      button.classList.toggle("hidden", Boolean(hidden));
    });
  }

  function renderSettingsDetailFocus() {
    const current = deps();
    renderSettingsDetailFocusForRuntime({ $: current.$, settingsState: current.settingsState });
  }

  function settingsPanelRuntimeDeps() {
    const current = deps();
    return {
      $: current.$,
      document: current.document,
      state: current.state,
      settingsState: current.settingsState,
      appVersion: current.appVersion,
      feedbackRepository: current.feedbackRepository,
      feedbackRepositoryReady: current.feedbackRepositoryReady,
      syncRailSelectionState: current.syncRailSelectionState,
      ensureSettingsWorkbenchLayout,
      mountSettingsAutomationWorkspace: current.mountSettingsAutomationWorkspace,
      renderSettingsWorkbenchChrome,
      renderSettingsSidebarColumn,
      renderSettingsDetailFocus,
      settingsLeafLabel,
      settingsVaultPathMissing,
      formatSettingsUserError,
      feedbackBaseUrl: current.feedbackBaseUrl,
      renderUpdateSettingsCard: current.renderUpdateSettingsCard,
      renderMobileAccessSettingsCard: current.renderMobileAccessSettingsCard,
      renderNoteTemplateSettingsCard: current.renderNoteTemplateSettingsCard,
      renderVaultBackupPanel: () => renderVaultBackupPanel({
        $: current.$,
        settingsState: current.settingsState,
        escapeHtml: current.escapeHtml
      }),
      renderAiLocalModelControls: current.renderAiLocalModelControls,
      renderAiSettingsExperience: current.renderAiSettingsExperience,
      renderAiProviderConfigControls: current.renderAiProviderConfigControls,
      renderAiRoutePreview: current.renderAiRoutePreview,
      renderScheduledTasksWorkspace: current.renderScheduledTasksWorkspace,
      renderAiSuggestionsWorkspace: current.renderAiSuggestionsWorkspace,
      aiTestBlockedReason: current.aiTestBlockedReason,
      renderAiCanonicalDebugPanel: current.renderAiCanonicalDebugPanel,
      renderSidebarTitle: current.renderSidebarTitle,
      renderModuleWorkspaceHeader: current.renderModuleWorkspaceHeader,
      escapeHtml: current.escapeHtml
    };
  }

  function renderSettingsPanel() {
    renderSettingsPanelForRuntime(settingsPanelRuntimeDeps());
    if (deps().settingsState.activeItem === "import-export") {
      deps().renderImportPageShell?.();
    }
  }

  return {
    ensureSettingsWorkbenchLayout,
    filterSettingsSidebarMenu,
    formatSettingsUserError,
    renderSettingsDetailFocus,
    renderSettingsPanel,
    renderSettingsSidebarColumn,
    renderSettingsWorkbenchChrome,
    setSettingsItem,
    setSettingsSection,
    settingsAiAdvancedRuntimeModeLabel,
    settingsAiModelPackDisplayLabel,
    settingsAiOverviewSummary,
    settingsAiProviderDisplayLabel,
    settingsAiRuntimeModeLabel,
    settingsAiUserModeDisplayLabel,
    settingsItemSummary,
    settingsLeafLabel,
    settingsMobileItemOptionsHtml,
    settingsModuleHeaderCopy,
    settingsPanelRuntimeDeps,
    settingsSectionChromeMap,
    settingsSectionGuidanceMap,
    settingsSidebarNavigationHtml,
    settingsVaultPathMissing
  };
}
