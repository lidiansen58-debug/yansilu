export function renderSettingsPanelForRuntime(deps = {}) {
  const {
    $ = () => null,
    document = globalThis.document,
    state = {},
    settingsState = {},
    appVersion = "",
    syncRailSelectionState = () => {},
    ensureSettingsWorkbenchLayout = () => {},
    mountSettingsAutomationWorkspace = () => {},
    renderSettingsWorkbenchChrome = () => {},
    renderSettingsSidebarColumn = () => {},
    renderSettingsDetailFocus = () => {},
    settingsLeafLabel = (value = "", fallback = "默认笔记库") => String(value || fallback).trim() || fallback,
    settingsVaultPathMissing = () => false,
    formatSettingsUserError = (value = "") => String(value || ""),
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

  renderSettingsFeedbackCard({ $, appVersion });
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
  appVersion = ""
} = {}) {
  const feedbackBadge = $("settingsFeedbackBadge");
  const feedbackDetail = $("settingsFeedbackDetail");
  if (feedbackBadge) {
    feedbackBadge.textContent = "邮件反馈";
    feedbackBadge.classList.toggle("ok", true);
  }
  if (feedbackDetail) {
    feedbackDetail.textContent = `会打开邮件，并填入版本 ${String(appVersion || "未知版本")}、系统、当前页面和所在模块。`;
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
      ? "测试中，请稍等"
      : testSucceeded
        ? "测试成功"
        : ai.testMeta || testBlockedReason || "还没有测试";
    testMeta.classList.toggle("warn", ai.testRunning || Boolean(testBlockedReason) || testFailed || testBlocked);
  }

  const testOutput = $("settingsAiTestChatOutput");
  if (testOutput) {
    testOutput.textContent = ai.testRunning
      ? (ai.testOutput || "正在等待 AI 回复，可能需要一点时间。请先停留在这里查看测试结果。")
      : ai.testOutput || "还没有测试结果";
  }
}
