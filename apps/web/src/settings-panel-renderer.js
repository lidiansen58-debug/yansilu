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
    renderMobileAccessSettingsCard = () => {},
    renderNoteTemplateSettingsCard = () => {},
    renderAiLocalModelControls = () => {},
    renderAiSettingsExperience = () => {},
    renderVaultBackupPanel = () => {},
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
  if (vault?.vaultPath && document?.activeElement !== input && String(input.value || "") !== String(vault.vaultPath || "")) {
    input.value = vault.vaultPath;
  }
  if (vault) {
    switchHint.textContent = vault.vaultPath
      ? `当前使用：${settingsLeafLabel(vault.vaultPath)}${vault.initialized ? " · 已就绪" : ""}`
      : "选择一个真实存在的笔记库目录。";
    switchButton.textContent = "切换到这个目录";
  } else {
    switchHint.textContent = settingsVaultPathMissing()
      ? "当前路径已失效，请重新选择一个笔记库目录。"
      : (formatSettingsUserError(settingsState.error) || "选择一个真实存在的笔记库目录。");
    switchButton.textContent = "选好后切换";
  }

  renderSettingsFeedbackCard({ $, feedbackRepository, feedbackRepositoryReady, feedbackBaseUrl });
  renderUpdateSettingsCard({ $, escapeHtml, settingsState, appVersion });
  renderMobileAccessSettingsCard();
  renderNoteTemplateSettingsCard("permanent");
  renderNoteTemplateSettingsCard("literature");
  renderVaultBackupPanel();

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
      ? "会打开反馈页面，并带上版本、模块和当前页面信息。提交前请确认不含隐私内容。"
      : "填好反馈仓库后，这里会变成问题反馈入口。";
  }
  if (feedbackLink) {
    const href = feedbackRepositoryReady ? feedbackBaseUrl() : "#";
    feedbackLink.href = href;
    feedbackLink.textContent = feedbackRepositoryReady ? "打开反馈页面" : "等待填写反馈仓库";
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
    testRunButton.textContent = ai.testRunning ? "测试中..." : testBlockedReason ? "先完成设置" : "测试 AI";
    if (testBlockedReason) testRunButton.setAttribute("title", testBlockedReason);
    else testRunButton.removeAttribute("title");
  }

  const testMeta = $("settingsAiTestChatMeta");
  if (testMeta) {
    const testSucceeded = ai.testStatus === "success";
    const testFailed = ai.testStatus === "failed";
    const testBlocked = ai.testStatus === "blocked";
    testMeta.textContent = ai.testRunning
      ? "正在测试"
      : testSucceeded
        ? "测试成功"
        : ai.testMeta || testBlockedReason || "还没有测试";
    testMeta.classList.toggle("warn", ai.testRunning || Boolean(testBlockedReason) || testFailed || testBlocked);
  }

  const testOutput = $("settingsAiTestChatOutput");
  if (testOutput) testOutput.textContent = ai.testOutput || "还没有测试结果";
}
