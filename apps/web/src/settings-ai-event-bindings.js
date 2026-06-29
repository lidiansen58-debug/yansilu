export function installSettingsAiEventBindings(deps = {}) {
  const {
    $ = () => null,
    settingsState = { ai: {} },
    documentRef = globalThis.document,
    clipboard = globalThis.navigator?.clipboard,
    normalizeAiRuntimeMode = (value) => value,
    applyAiRuntimeModeChange = async () => {},
    persistAiSettingsToStorage = () => {},
    syncAiSettingsToApi = () => {},
    refreshAiRoutePreview = () => {},
    renderSettingsPanel = () => {},
    setStatus = () => {},
    applyAiModelPackChange = () => {},
    selectInstalledLocalModelFromUi = async () => {},
    markAiProviderDraftTouched = () => {},
    syncAiProviderConfigToApi = async () => true,
    aiTestBlockedReason = () => "",
    currentAiProviderId = () => "",
    aiSettingsPayload = () => ({}),
    authModeForProvider = () => "",
    runAiTestChat = async () => ({}),
    checkCurrentAiProviderHealth = async () => {},
    detectOllamaModels = async () => {},
    startOllamaRuntimeFromUi = async () => {},
    stopOllamaRuntimeFromUi = async () => {},
    pullRecommendedOllamaModel = async () => {},
    copyTextToClipboard = async () => {},
    applySettingsAiQuickSetup = async () => {},
    openSettingsAiDialog = () => {},
    closeSettingsAiDialogs = () => {}
  } = deps;

  async function writeClipboardText(text) {
    if (!clipboard?.writeText) throw new Error("clipboard unavailable");
    await clipboard.writeText(text);
  }
$("settingsAiRuntimeMode")?.addEventListener("change", async (event) => {
  await applyAiRuntimeModeChange(event?.target?.value || "auto");
});

$("settingsAiHybridToggle")?.addEventListener("click", async () => {
  const current = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  await applyAiRuntimeModeChange(current === "hybrid" ? "auto" : "hybrid");
});

$("settingsAiUserMode")?.addEventListener("change", (event) => {
  const next = String(event?.target?.value || "Auto").trim() || "Auto";
  settingsState.ai.userMode = next;
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(`AI 模式已切换为：${next}`, "ok");
});

$("settingsAiModelPack")?.addEventListener("change", (event) => {
  const next = String(event?.target?.value || "Starter Auto").trim() || "Starter Auto";
  applyAiModelPackChange(next, { source: "settings" });
});

$("settingsAiLocalModel")?.addEventListener("change", async (event) => {
  await selectInstalledLocalModelFromUi(event?.target?.value || "");
});

$("settingsAiAdvancedModelRef")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  settingsState.ai.advancedModelRef = next;
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(next ? "指定模型已保存" : "指定模型已清空（恢复自动选择）", "ok");
});

$("settingsAiSecretRef")?.addEventListener("blur", async (event) => {
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("secretRef");
  settingsState.ai.secretRef = next;
  persistAiSettingsToStorage();
  const saved = await syncAiProviderConfigToApi();
  if (!saved) {
    renderSettingsPanel();
    return;
  }
  renderSettingsPanel();
  setStatus(next ? "密钥名称已保存到服务连接" : "密钥名称已清空，服务连接已停用", "ok");
});

$("settingsAiSecretRef")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("secretRef");
  settingsState.ai.secretRef = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiRemoteRuntimeModel")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("remoteRuntimeModel");
  settingsState.ai.remoteRuntimeModel = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiRemoteRuntimeModel")?.addEventListener("blur", async (event) => {
  markAiProviderDraftTouched("remoteRuntimeModel");
  settingsState.ai.remoteRuntimeModel = String(event?.target?.value || "").trim();
  persistAiSettingsToStorage();
  const saved = await syncAiProviderConfigToApi();
  if (!saved) {
    renderSettingsPanel();
    return;
  }
  renderSettingsPanel();
  setStatus(settingsState.ai.remoteRuntimeModel ? "远程模型已保存到服务连接" : "远程模型已清空，服务连接已停用", "ok");
});

$("settingsAiProviderEndpointUrl")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("providerEndpointUrl");
  settingsState.ai.providerEndpointUrl = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiProviderEndpointUrl")?.addEventListener("blur", async (event) => {
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("providerEndpointUrl");
  settingsState.ai.providerEndpointUrl = next;
  persistAiSettingsToStorage();
  const saved = await syncAiProviderConfigToApi();
  if (!saved) {
    renderSettingsPanel();
    return;
  }
  renderSettingsPanel();
});

$("settingsAiTestPrompt")?.addEventListener("input", (event) => {
  settingsState.ai.testPrompt = String(event?.target?.value || "");
  if (settingsState.ai.testMeta === "需要测试内容") {
    settingsState.ai.testMeta = "";
    settingsState.ai.testOutput = "";
    const meta = $("settingsAiTestChatMeta");
    const output = $("settingsAiTestChatOutput");
    if (meta) meta.textContent = "等待运行";
    if (output) output.textContent = "（空）";
  }
  persistAiSettingsToStorage();
});

$("btnAiTestChatRun")?.addEventListener("click", async () => {
  const promptInput = $("settingsAiTestPrompt");
  const prompt = String(promptInput?.value || settingsState.ai.testPrompt || "").trim();
  if (!prompt) {
    settingsState.ai.testMeta = "需要测试内容";
    settingsState.ai.testOutput = "请先输入一句不含敏感内容的测试内容。例如：请用一句话总结“研究笔记应该先记录问题，再整理结论”。";
    renderSettingsPanel();
    $("settingsAiTestPrompt")?.focus();
    return setStatus("先输入一条测试内容", "warn");
  }
  const blockedReason = aiTestBlockedReason();
  if (blockedReason) {
    settingsState.ai.testMeta = blockedReason;
    settingsState.ai.testOutput = `${blockedReason}，再试运行。`;
    renderSettingsPanel();
    return setStatus(`${blockedReason}，再试运行`, "warn");
  }
  settingsState.ai.testRunning = true;
  settingsState.ai.testMeta = "";
  settingsState.ai.testOutput = "";
  renderSettingsPanel();
  try {
    const providerId = currentAiProviderId();
    const settingsPayload = aiSettingsPayload();
    const advancedSettings = settingsPayload.advancedSettings || {};
    const result = await runAiTestChat({
      ...settingsPayload,
      prompt,
      authMode: authModeForProvider(providerId, settingsState.ai.routePreview),
      ...(advancedSettings.secretRef ? { secretRef: advancedSettings.secretRef } : {}),
      ...(advancedSettings.modelRef ? { modelRef: advancedSettings.modelRef } : {}),
      modelTier: "standard",
      privacyMode: settingsState.ai.routePreview?.privacy?.mode || ""
    });
    settingsState.ai.testMeta = `${result?.providerId || "服务"} / ${result?.modelRef || "模型"} (${result?.status || "未检测"})`;
    settingsState.ai.testOutput = String(result?.output?.content || "").trim() || JSON.stringify(result?.output?.json || result || {}, null, 2);
    setStatus("AI 试运行已完成", "ok");
  } catch (error) {
    settingsState.ai.testMeta = "运行失败";
    settingsState.ai.testOutput = String(error?.message || error);
    setStatus(`AI 试运行失败：${settingsState.ai.testOutput}`, "bad");
  } finally {
    settingsState.ai.testRunning = false;
    renderSettingsPanel();
  }
});

$("btnAiTestChatCopy")?.addEventListener("click", async () => {
  const text = String(settingsState.ai.testOutput || "").trim();
  if (!text) return setStatus("没有可复制的输出", "warn");
  try {
    await writeClipboardText(text);
    setStatus("已复制输出", "ok");
  } catch {
    setStatus("复制失败（浏览器权限限制）", "warn");
  }
});

$("settingsAiProviderHealthEndpointUrl")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("providerHealthEndpointUrl");
  settingsState.ai.providerHealthEndpointUrl = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
});

$("settingsAiProviderHealthEndpointUrl")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("providerHealthEndpointUrl");
  settingsState.ai.providerHealthEndpointUrl = next;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiSaveProviderConfig")?.addEventListener("click", async () => {
  await syncAiProviderConfigToApi();
});

$("settingsAiCheckProviderHealth")?.addEventListener("click", async () => {
  await checkCurrentAiProviderHealth();
});

$("settingsAiRemoteHelpToggle")?.addEventListener("click", () => {
  const help = $("settingsAiRemoteHelp");
  const toggle = $("settingsAiRemoteHelpToggle");
  if (!help || !toggle) return;
  const shouldShow = help.classList.contains("hidden");
  help.classList.toggle("hidden", !shouldShow);
  toggle.setAttribute("aria-expanded", shouldShow ? "true" : "false");
  toggle.textContent = shouldShow ? "收起帮助" : "帮助";
});

$("settingsAiDetectOllama")?.addEventListener("click", async () => {
  await detectOllamaModels();
});

$("settingsAiStartOllama")?.addEventListener("click", async () => {
  await startOllamaRuntimeFromUi();
});

$("settingsAiStopOllama")?.addEventListener("click", async () => {
  await stopOllamaRuntimeFromUi();
});

$("settingsAiPullOllamaModel")?.addEventListener("click", async () => {
  await pullRecommendedOllamaModel();
});

$("settingsAiCopyOllamaInstallCommand")?.addEventListener("click", async (event) => {
  const command = String(event?.currentTarget?.dataset?.command || "").trim();
  if (!command) return setStatus("当前没有可复制的安装命令", "warn");
  try {
    await copyTextToClipboard(command);
    setStatus("已复制安装命令", "ok");
  } catch {
    setStatus("复制失败，请手动复制安装命令", "warn");
  }
});

$("settingsCardAiSettings")?.addEventListener("click", async (event) => {
  const selectLocalModelButton = event.target.closest("[data-settings-ai-select-local-model]");
  if (selectLocalModelButton) {
    await selectInstalledLocalModelFromUi(selectLocalModelButton.getAttribute("data-settings-ai-select-local-model"));
    return;
  }
  const detectOllamaButton = event.target.closest("[data-settings-ai-detect-ollama]");
  if (detectOllamaButton) {
    await detectOllamaModels();
    return;
  }
  const pullLocalModelButton = event.target.closest("[data-settings-ai-pull-local-model]");
  if (pullLocalModelButton) {
    await pullRecommendedOllamaModel(pullLocalModelButton.getAttribute("data-settings-ai-pull-local-model"));
    return;
  }
  const copyLocalModelCommandButton = event.target.closest("[data-settings-ai-copy-command]");
  if (copyLocalModelCommandButton) {
    const command = String(copyLocalModelCommandButton.getAttribute("data-settings-ai-copy-command") || "").trim();
    if (!command) return;
    try {
      await copyTextToClipboard(command);
      setStatus("已复制模型下载命令", "ok");
    } catch {
      setStatus("复制失败，请手动选择命令文本", "warn");
    }
    return;
  }
  const quickSetupButton = event.target.closest("[data-settings-ai-quick-setup]");
  if (quickSetupButton) {
    await applySettingsAiQuickSetup(quickSetupButton.getAttribute("data-settings-ai-quick-setup"));
    return;
  }
  const openButton = event.target.closest("[data-settings-ai-dialog-open]");
  if (openButton) {
    openSettingsAiDialog(openButton.getAttribute("data-settings-ai-dialog-open"));
    return;
  }
  if (event.target.closest("[data-settings-ai-dialog-close]")) {
    closeSettingsAiDialogs();
    return;
  }
  const popover = event.target.closest(".settings-ai-popover");
  if (popover && event.target === popover) closeSettingsAiDialogs();
});

documentRef?.addEventListener?.("keydown", (event) => {
  if (event.key === "Escape") closeSettingsAiDialogs();
});


}