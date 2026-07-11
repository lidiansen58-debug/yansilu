import {
  displayOpenAiCompatibleBaseUrl,
  remoteApiKeySecretRef
} from "./ai-settings-remote-config-model.js";

export function installSettingsAiEventBindings(deps = {}) {
  const {
    $ = () => null,
    settingsState = { ai: {} },
    documentRef = globalThis.document,
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
    applySettingsAiQuickSetup = async () => {},
    openSettingsAiDialog = () => {},
    closeSettingsAiDialogs = () => {},
    confirmRemoteAiUse = () => true
  } = deps;

  function clearAiTestResultForSettingsChange() {
    settingsState.ai.testMeta = "";
    settingsState.ai.testOutput = "";
    settingsState.ai.testStatus = "";
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

$("settingsAiAutoPrepareLocal")?.addEventListener("change", (event) => {
  settingsState.ai.autoPrepareLocalAi = event?.target?.checked === true;
  persistAiSettingsToStorage();
  renderSettingsPanel();
  setStatus(
    settingsState.ai.autoPrepareLocalAi
      ? "已开启：研思录启动时会尝试准备本地 AI。"
      : "已关闭启动时自动准备本地 AI。",
    settingsState.ai.autoPrepareLocalAi ? "ok" : "warn"
  );
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
  const previous = String(settingsState.ai.remoteApiKey || "").trim();
  markAiProviderDraftTouched("secretRef");
  settingsState.ai.remoteApiKey = next;
  settingsState.ai.secretRef = next ? remoteApiKeySecretRef() : "";
  if (previous !== next) clearAiTestResultForSettingsChange();
  persistAiSettingsToStorage();
  renderSettingsPanel();
  setStatus(next ? "API Key 已暂存；测试连接后再保存远程设置。" : "API Key 已清空。", next ? "warn" : "ok");
});

$("settingsAiSecretRef")?.addEventListener("input", (event) => {
  const previous = String(settingsState.ai.remoteApiKey || "").trim();
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("secretRef");
  settingsState.ai.remoteApiKey = next;
  settingsState.ai.secretRef = next ? remoteApiKeySecretRef() : "";
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  if (previous !== next) clearAiTestResultForSettingsChange();
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiRemoteRuntimeModel")?.addEventListener("input", (event) => {
  const previous = String(settingsState.ai.remoteRuntimeModel || "").trim();
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("remoteRuntimeModel");
  settingsState.ai.remoteRuntimeModel = next;
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  if (previous !== next) clearAiTestResultForSettingsChange();
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiRemoteRuntimeModel")?.addEventListener("blur", async (event) => {
  const previous = String(settingsState.ai.remoteRuntimeModel || "").trim();
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("remoteRuntimeModel");
  settingsState.ai.remoteRuntimeModel = next;
  if (previous !== next) clearAiTestResultForSettingsChange();
  persistAiSettingsToStorage();
  renderSettingsPanel();
  setStatus(settingsState.ai.remoteRuntimeModel ? "模型名称已暂存；测试连接后再保存远程设置。" : "模型名称已清空。", settingsState.ai.remoteRuntimeModel ? "warn" : "ok");
});

$("settingsAiProviderEndpointUrl")?.addEventListener("input", (event) => {
  const previous = String(settingsState.ai.providerEndpointUrl || "").trim();
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("providerEndpointUrl");
  settingsState.ai.providerEndpointUrl = next;
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  if (previous !== next) clearAiTestResultForSettingsChange();
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiProviderEndpointUrl")?.addEventListener("blur", async (event) => {
  const next = displayOpenAiCompatibleBaseUrl(event?.target?.value || "");
  const previous = String(settingsState.ai.providerEndpointUrl || "").trim();
  markAiProviderDraftTouched("providerEndpointUrl");
  settingsState.ai.providerEndpointUrl = next;
  if (previous !== next) clearAiTestResultForSettingsChange();
  persistAiSettingsToStorage();
  renderSettingsPanel();
  if (next) setStatus("API 地址已暂存；测试连接后再保存远程设置。", "warn");
});

$("settingsAiTestPrompt")?.addEventListener("input", (event) => {
  settingsState.ai.testPrompt = String(event?.target?.value || "");
  if (settingsState.ai.testMeta === "需要测试内容") {
    settingsState.ai.testMeta = "";
    settingsState.ai.testOutput = "";
    settingsState.ai.testStatus = "";
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
    settingsState.ai.testStatus = "blocked";
    renderSettingsPanel();
    $("settingsAiTestPrompt")?.focus();
    return setStatus("先输入一条测试内容", "warn");
  }
  const blockedReason = aiTestBlockedReason();
  if (blockedReason) {
    settingsState.ai.testMeta = blockedReason;
    settingsState.ai.testStatus = "blocked";
    settingsState.ai.testOutput = `${blockedReason}，再试运行。`;
    renderSettingsPanel();
    return setStatus(`${blockedReason}，再试运行`, "warn");
  }
  settingsState.ai.testRunning = true;
  settingsState.ai.testMeta = "";
  settingsState.ai.testOutput = "";
  settingsState.ai.testStatus = "running";
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
    settingsState.ai.testStatus = "success";
    setStatus("AI 试运行已完成", "ok");
  } catch (error) {
    settingsState.ai.testMeta = "运行失败";
    settingsState.ai.testOutput = String(error?.message || error);
    settingsState.ai.testStatus = "failed";
    setStatus(`AI 试运行失败：${settingsState.ai.testOutput}`, "bad");
  } finally {
    settingsState.ai.testRunning = false;
    renderSettingsPanel();
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
  const providerId = currentAiProviderId();
  const isRemote = providerId && !["platform_managed_openai", "local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(providerId);
  const tested = settingsState.ai.testStatus === "success" || settingsState.ai.providerHealthResult?.record?.status === "healthy";
  const remoteKeyCleared = isRemote && !String(settingsState.ai.remoteApiKey || "").trim() && settingsState.ai.providerDraftTouched?.secretRef === true;
  if (isRemote && !tested && !remoteKeyCleared) {
    openSettingsAiDialog("test");
    setStatus("先测试连接，确认远程 AI 能正常回复后再保存。", "warn");
    return;
  }
  if (isRemote && !remoteKeyCleared && confirmRemoteAiUse() === false) {
    setStatus("已取消启用远程 AI。", "warn");
    return;
  }
  await syncAiProviderConfigToApi();
});

$("settingsAiCheckProviderHealth")?.addEventListener("click", async () => {
  const healthEndpoint = String(settingsState.ai.providerHealthEndpointUrl || "").trim();
  if (!healthEndpoint) {
    openSettingsAiDialog("test");
    setStatus("用一句不含敏感内容的话测试远程 AI。", "warn");
    return;
  }
  if (confirmRemoteAiUse() === false) {
    setStatus("已取消测试远程 AI。", "warn");
    return;
  }
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

$("settingsAiRuntimeToggle")?.addEventListener("click", async () => {
  if (settingsState.ai.localRuntimeStatus === "available") await stopOllamaRuntimeFromUi();
  else await startOllamaRuntimeFromUi();
});

$("settingsAiPullOllamaModel")?.addEventListener("click", async () => {
  await pullRecommendedOllamaModel();
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
  const primaryActionButton = event.target.closest("[data-settings-ai-primary-action]");
  if (primaryActionButton) {
    const action = primaryActionButton.getAttribute("data-settings-ai-primary-action");
    if (action === "local") await applySettingsAiQuickSetup("local");
    else if (action === "remote") await applySettingsAiQuickSetup("remote");
    else if (action === "off") await applyAiRuntimeModeChange("off");
    else if (action === "install-ollama") $("settingsAiDownloadOllama")?.click?.();
    else if (action === "detect-local") await detectOllamaModels();
    else if (action === "start-local") await startOllamaRuntimeFromUi();
    else if (action === "download-local-model") await pullRecommendedOllamaModel();
    else if (action === "test" || action === "test-remote") openSettingsAiDialog("test");
    else if (action === "choose-local-model") {
      const selected = String(settingsState.ai.localModel || "").trim();
      const firstModel = Array.isArray(settingsState.ai.localRuntimeModels)
        ? String(settingsState.ai.localRuntimeModels[0]?.name || settingsState.ai.localRuntimeModels[0] || "").trim()
        : "";
      const model = selected || firstModel;
      if (model) await selectInstalledLocalModelFromUi(model);
      else $("settingsAiLocalModel")?.focus?.();
      openSettingsAiDialog("test");
    }
    else setStatus("AI 设置已完成。", "ok");
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
