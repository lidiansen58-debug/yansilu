export function renderSettingsPanelForRuntime(deps = {}) {
  const {
    $ = () => null,
    document = globalThis.document,
    state = {},
    settingsState = {},
    appVersion = "",
    feedbackRepository = "",
    feedbackRepositoryReady = false,
    syncRailSelectionState = () => {},
    ensureSettingsWorkbenchLayout = () => {},
    mountSettingsAutomationWorkspace = () => {},
    renderSettingsWorkbenchChrome = () => {},
    renderSettingsSidebarColumn = () => {},
    renderSettingsDetailFocus = () => {},
    settingsLeafLabel = (value = "", fallback = "默认笔记库") => String(value || fallback).trim() || fallback,
    settingsVaultPathMissing = () => false,
    formatSettingsUserError = (value = "") => String(value || ""),
    feedbackBaseUrl = () => "#",
    renderUpdateSettingsCard = () => {},
    renderNoteTemplateSettingsCard = () => {},
    renderAiLocalModelControls = () => {},
    renderAiSettingsExperience = () => {},
    renderAiProviderConfigControls = () => {},
    renderAiRoutePreview = () => {},
    renderScheduledTasksWorkspace = () => {},
    renderAiSuggestionsWorkspace = () => {},
    aiTestBlockedReason = () => "",
    renderAiCanonicalDebugPanel = () => {},
    renderSidebarTitle = () => {},
    renderModuleWorkspaceHeader = () => {},
    escapeHtml = (value = "") => String(value ?? "")
  } = deps;

  syncRailSelectionState();
  ensureSettingsWorkbenchLayout();
  mountSettingsAutomationWorkspace(document);
  renderSettingsWorkbenchChrome();
  renderSettingsSidebarColumn();
  renderSettingsDetailFocus();

  const input = $("settingsVaultPath");
  const switchHint = $("settingsVaultSwitchHint");
  const switchButton = $("settingsSwitchVault");
  if (!input || !switchHint || !switchButton) return;

  const vault = settingsState.vault;
  if (vault?.vaultPath && !String(input.value || "").trim()) input.value = vault.vaultPath;
  if (vault) {
    switchHint.textContent = vault.vaultPath
      ? `当前使用：${settingsLeafLabel(vault.vaultPath)}${vault.initialized ? " · 已就绪" : ""}`
      : "选择一个真实存在的笔记库目录。";
    switchButton.textContent = "切换到这个路径";
  } else {
    switchHint.textContent = settingsVaultPathMissing()
      ? "当前路径已失效，请重新选一个笔记库目录。"
      : (formatSettingsUserError(settingsState.error) || "选择一个真实存在的笔记库目录。");
    switchButton.textContent = "选好后切换";
  }

  renderSettingsFeedbackCard({ $, feedbackRepository, feedbackRepositoryReady, feedbackBaseUrl });
  renderUpdateSettingsCard({ $, escapeHtml, settingsState, appVersion });
  renderNoteTemplateSettingsCard("permanent");
  renderNoteTemplateSettingsCard("literature");

  renderAiLocalModelControls();
  renderAiSettingsExperience();
  syncSettingsAiInputs({ $, settingsState });
  renderAiProviderConfigControls();
  renderAiRoutePreview();
  renderScheduledTasksWorkspace();
  renderAiSuggestionsWorkspace();
  renderSettingsAiTestPanel({ $, settingsState, aiTestBlockedReason });
  renderAiCanonicalDebugPanel();
  renderSettingsWorkbenchChrome();
  if (state.module === "settings") renderSidebarTitle();
  renderModuleWorkspaceHeader();
}

export function renderSettingsFeedbackCard({
  $ = () => null,
  feedbackRepository = "",
  feedbackRepositoryReady = false,
  feedbackBaseUrl = () => "#"
} = {}) {
  const feedbackBadge = $("settingsFeedbackRepoBadge");
  const feedbackDetail = $("settingsFeedbackDetail");
  const feedbackLink = $("settingsFeedbackLink");
  if (feedbackBadge) {
    feedbackBadge.textContent = feedbackRepositoryReady ? feedbackRepository : "待绑定仓库";
    feedbackBadge.classList.toggle("ok", feedbackRepositoryReady);
    feedbackBadge.classList.toggle("warn", !feedbackRepositoryReady);
  }
  if (feedbackDetail) {
    feedbackDetail.textContent = feedbackRepositoryReady
      ? "当前会打开公开反馈页，并自动带上版本、模块和页面上下文；提交前请检查是否包含私人信息。"
      : "仓库名已经建议为 yansilu-feedback。把 prototype-app.js 里的 GitHub owner 补上后即可启用。";
  }
  if (feedbackLink) {
    const href = feedbackRepositoryReady ? feedbackBaseUrl() : "#";
    feedbackLink.href = href;
    feedbackLink.textContent = feedbackRepositoryReady ? "打开反馈页" : "等待填写真实 GitHub 仓库";
    feedbackLink.setAttribute("aria-disabled", feedbackRepositoryReady ? "false" : "true");
  }
}

export function syncSettingsAiInputs({ $ = () => null, settingsState = {} } = {}) {
  const ai = settingsState.ai || {};
  const inputValues = [
    ["settingsAiUserMode", String(ai.userMode || "Auto").trim() || "Auto"],
    ["settingsAiModelPack", String(ai.modelPack || "Starter Auto").trim() || "Starter Auto"],
    ["settingsAiAdvancedModelRef", String(ai.advancedModelRef || "").trim()],
    ["settingsAiSecretRef", String(ai.secretRef || "").trim()]
  ];
  inputValues.forEach(([id, stored]) => {
    const input = $(id);
    if (input && String(input.value || "") !== stored) input.value = stored;
  });
}

export function renderSettingsAiTestPanel({
  $ = () => null,
  settingsState = {},
  aiTestBlockedReason = () => ""
} = {}) {
  const ai = settingsState.ai || {};
  const testPrompt = $("settingsAiTestPrompt");
  if (testPrompt) {
    const stored = String(ai.testPrompt || "").trim();
    if (String(testPrompt.value || "") !== stored) testPrompt.value = stored;
  }

  const testBlockedReason = aiTestBlockedReason();
  const testRunButton = $("btnAiTestChatRun");
  if (testRunButton) {
    testRunButton.disabled = ai.testRunning || Boolean(testBlockedReason);
    testRunButton.textContent = ai.testRunning ? "运行中..." : testBlockedReason ? "先完成设置" : "运行";
    if (testBlockedReason) testRunButton.setAttribute("title", testBlockedReason);
    else testRunButton.removeAttribute("title");
  }

  const testMeta = $("settingsAiTestChatMeta");
  if (testMeta) {
    testMeta.textContent = ai.testRunning ? "运行中..." : ai.testMeta || testBlockedReason || "等待运行";
    testMeta.classList.toggle("warn", ai.testRunning || Boolean(testBlockedReason));
  }

  const testOutput = $("settingsAiTestChatOutput");
  if (testOutput) testOutput.textContent = ai.testOutput || "（空）";
}
