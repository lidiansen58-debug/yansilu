import { renderAiLocalModelRecommendationsForRuntime } from "./settings-ai-local-model-recommendations-view.js";
import {
  remoteConnectionReadyForProvider,
  remoteHealthBelongsToAiConfig,
  remoteHealthMatchesAiConfig,
  remoteTestFailedForAiConfig,
  remoteTestMatchesAiConfig
} from "./settings-ai-remote-readiness.js";

export { renderAiLocalModelRecommendationsForRuntime };

export function renderAiLocalModelControlsForRuntime(deps = {}) {
  const {
    $ = () => null,
    escapeHtml = (value = "") => String(value ?? ""),
    settingsState = {},
    normalizeAiRuntimeMode = (value = "auto") => String(value || "auto"),
    isAiLocalFlowActive = () => false,
    currentAiProviderId = () => "",
    isLocalModelPack = () => false,
    ollamaModelRecommendationProfiles = () => [],
    currentOllamaModelTiers = () => [],
    currentOllamaSetupGuide = () => null,
    ollamaPullModelName = () => "",
    ollamaRecommendationForModel = () => null,
    hasLocalModel = () => false,
    renderAiLocalModelRecommendations = renderAiLocalModelRecommendationsForRuntime
  } = deps;
  const ai = settingsState.ai || {};
  const runtimeMode = normalizeAiRuntimeMode(ai.runtimeMode);
  const runtimeSelect = $("settingsAiRuntimeMode");
  const primaryRuntimeMode = runtimeMode === "hybrid" ? "auto" : runtimeMode;
  if (runtimeSelect && runtimeSelect.value !== primaryRuntimeMode) runtimeSelect.value = primaryRuntimeMode;

  const providerId = currentAiProviderId();
  const showLocalModel = isAiLocalFlowActive({ runtimeMode, modelPack: ai.modelPack, providerId });
  const localSetupActive = showLocalModel && (runtimeMode === "local_only" || runtimeMode === "hybrid" || isLocalModelPack(ai.modelPack));
  const runtimeAvailable = ai.localRuntimeStatus === "available";
  const runtimeBusy = ai.localRuntimeChecking || ai.localRuntimeStarting || ai.localRuntimeStopping || ai.localRuntimePulling;
  $("settingsAiLocalOptions")?.classList.toggle("hidden", !showLocalModel);
  renderLocalModelSelect({ $, escapeHtml, ai, showLocalModel, ollamaModelRecommendationProfiles, currentOllamaModelTiers });
  renderAutoPrepareLocalToggle({ $, ai, showLocalModel });
  renderLocalRuntimeButtons({
    $,
    ai,
    localSetupActive,
    runtimeAvailable,
    runtimeBusy,
    currentOllamaSetupGuide,
    ollamaPullModelName,
    ollamaRecommendationForModel,
    currentOllamaModelTiers,
    hasLocalModel
  });
  renderAiLocalModelRecommendations(deps);
}

function renderAutoPrepareLocalToggle({ $, ai, showLocalModel }) {
  const toggle = $("settingsAiAutoPrepareLocal");
  if (!toggle) return;
  toggle.checked = ai.autoPrepareLocalAi === true;
  toggle.disabled = !showLocalModel;
}

function renderLocalModelSelect({ $, escapeHtml, ai, showLocalModel, ollamaModelRecommendationProfiles, currentOllamaModelTiers }) {
  const modelSelect = $("settingsAiLocalModel");
  const modelLabel = $("settingsAiLocalModelLabel");
  modelSelect?.classList.toggle("hidden", !showLocalModel);
  modelLabel?.classList.toggle("hidden", !showLocalModel);
  if (!modelSelect) return;
  const selectedModel = String(ai.localModel || "").trim();
  const catalogNames = new Set(ollamaModelRecommendationProfiles(currentOllamaModelTiers()).map((item) => item.name.toLowerCase()));
  const names = (Array.isArray(ai.localRuntimeModels) ? ai.localRuntimeModels : [])
    .map((model) => String(model?.name || "").trim())
    .filter((name) => name && catalogNames.has(name.toLowerCase()));
  const optionNames = selectedModel && !names.includes(selectedModel) ? [selectedModel, ...names] : names;
  if (ai.localRuntimeChecking) {
    modelSelect.innerHTML = `<option value="">正在检测本地模型...</option>`;
  } else if (optionNames.length) {
    modelSelect.innerHTML = [
      `<option value="">自动选择本地模型</option>`,
      ...optionNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    ].join("");
    modelSelect.value = selectedModel;
  } else {
    modelSelect.innerHTML = `<option value="">还没有检测到本地模型</option>`;
  }
  modelSelect.disabled = !showLocalModel || ai.localRuntimeChecking;
}

function renderLocalRuntimeButtons(input) {
  const { $, ai, localSetupActive, runtimeAvailable, runtimeBusy } = input;
  const useLocalButton = $("settingsAiUseLocalSetup");
  if (useLocalButton) {
    useLocalButton.classList.toggle("hidden", localSetupActive);
    useLocalButton.disabled = localSetupActive || runtimeBusy;
    useLocalButton.textContent = "使用本地模型";
    useLocalButton.classList.toggle("primary", !localSetupActive);
    useLocalButton.classList.toggle("is-subtle", localSetupActive);
  }
  const detectButton = $("settingsAiDetectOllama");
  if (detectButton) {
    const showDetectButton = localSetupActive && runtimeAvailable;
    detectButton.classList.toggle("hidden", !showDetectButton);
    detectButton.disabled = !showDetectButton || runtimeBusy;
    detectButton.textContent = !localSetupActive
      ? "先启用本地模型"
      : ai.localRuntimeChecking
        ? "正在检测本地模型..."
        : runtimeAvailable
          ? "重新检测"
          : "检测本地模型";
  }
  renderLocalStartStopButtons(input);
  renderDownloadControls(input);
}

function renderLocalStartStopButtons({ $, ai, localSetupActive, runtimeAvailable, runtimeBusy }) {
  const managedStopPending = ai.localRuntimeManagedStopPending === true;
  const runtimeToggle = $("settingsAiRuntimeToggle");
  if (!runtimeToggle) return;
  const canStartOllama = ai.localRuntimeReadinessStatus === "installed_not_running";
  const canOperate = runtimeAvailable || canStartOllama;
  runtimeToggle.classList.toggle("hidden", !localSetupActive || managedStopPending || !canOperate);
  runtimeToggle.disabled = !localSetupActive || managedStopPending || !canOperate || runtimeBusy;
  runtimeToggle.textContent = runtimeAvailable
    ? ai.localRuntimeStopping ? "正在停止..." : "停止本地模型"
    : ai.localRuntimeStarting ? "正在启动..." : "启动本地模型";
}

function renderDownloadControls({
  $,
  ai,
  localSetupActive,
  runtimeAvailable,
  runtimeBusy,
  currentOllamaSetupGuide,
  ollamaPullModelName,
  ollamaRecommendationForModel,
  currentOllamaModelTiers,
  hasLocalModel
}) {
  const downloadLink = $("settingsAiDownloadOllama");
  downloadLink?.classList.toggle("hidden", true);
  if (downloadLink) {
    const guide = currentOllamaSetupGuide();
    const installUrl = String(guide?.installUrl || "https://ollama.com/download").trim() || "https://ollama.com/download";
    if (downloadLink.getAttribute("href") !== installUrl) downloadLink.setAttribute("href", installUrl);
  }
  const copyInstallCommandButton = $("settingsAiCopyOllamaInstallCommand");
  if (copyInstallCommandButton) {
    const guide = currentOllamaSetupGuide();
    const installCommand = Array.isArray(guide?.commands) ? String(guide.commands[0] || "").trim() : "";
    copyInstallCommandButton.classList.toggle("hidden", !localSetupActive || runtimeAvailable || !installCommand);
    copyInstallCommandButton.disabled = !localSetupActive || runtimeAvailable || !installCommand || runtimeBusy;
    if (installCommand) copyInstallCommandButton.dataset.command = installCommand;
  }
  const pullButton = $("settingsAiPullOllamaModel");
  if (!pullButton) return;
  const modelName = ollamaPullModelName();
  const recommendation = ollamaRecommendationForModel(modelName, currentOllamaModelTiers());
  const installed = hasLocalModel(modelName);
  const hasAnyLocalModel = (Array.isArray(ai.localRuntimeModels) ? ai.localRuntimeModels : []).length > 0;
  pullButton.classList.toggle("hidden", !localSetupActive || !runtimeAvailable || installed);
  pullButton.classList.toggle("primary", !hasAnyLocalModel);
  pullButton.classList.toggle("is-subtle", hasAnyLocalModel);
  pullButton.disabled = !localSetupActive || !runtimeAvailable || runtimeBusy || installed;
  pullButton.textContent = ai.localRuntimePulling
    ? `正在下载 ${modelName}...`
    : installed
      ? `已安装 ${modelName}`
      : hasAnyLocalModel
        ? `下载 ${modelName}${recommendation ? `（${recommendation.label}）` : ""}`
        : `下载推荐模型 ${modelName}`;
}

export function renderAiProviderConfigControlsForRuntime(deps = {}) {
  const {
    $ = () => null,
    settingsState = {},
    currentAiProviderId = () => "",
    isRemoteConfigurableProviderId = () => false,
    activeAiProviderConfig = () => null,
    remoteRuntimeModelFromMap = () => "",
    defaultProviderEndpointUrl = () => "",
    defaultProviderHealthEndpointUrl = () => ""
  } = deps;
  const ai = settingsState.ai || {};
  const providerId = currentAiProviderId();
  const remoteConfigurable = isRemoteConfigurableProviderId(providerId);
  const remoteModelInput = $("settingsAiRemoteRuntimeModel");
  if (remoteModelInput) {
    const stored = String(ai.remoteRuntimeModel || "").trim();
    if (String(remoteModelInput.value || "") !== stored) remoteModelInput.value = stored;
    remoteModelInput.disabled = !remoteConfigurable;
    remoteModelInput.placeholder = remoteConfigurable ? "填写服务商提供的模型名" : "当前不需要填写";
  }
  syncInput($("settingsAiProviderEndpointUrl"), ai.providerEndpointUrl);
  syncInput($("settingsAiSecretRef"), ai.remoteApiKey);
  syncInput($("settingsAiProviderHealthEndpointUrl"), ai.providerHealthEndpointUrl);
  renderProviderBadge({ $, ai, providerId, remoteConfigurable, activeAiProviderConfig, remoteRuntimeModelFromMap });
  renderProviderButtons({ $, ai, providerId, defaultProviderEndpointUrl, defaultProviderHealthEndpointUrl });
}

function syncInput(input, value) {
  if (!input) return;
  const stored = String(value || "").trim();
  if (String(input.value || "") !== stored) input.value = stored;
}

function renderProviderBadge({ $, ai, providerId, remoteConfigurable, activeAiProviderConfig, remoteRuntimeModelFromMap }) {
  const badge = $("settingsAiProviderConfigBadge");
  if (!badge) return;
  const config = activeAiProviderConfig();
  const healthRecord = ai.providerHealthResult?.record || null;
  const draftTouched = ai.providerDraftTouched || {};
  const endpointValue = draftTouched.providerEndpointUrl ? ai.providerEndpointUrl : ai.providerEndpointUrl || config?.endpointUrl || config?.endpoint_url || "";
  const secretValue = draftTouched.secretRef
    ? ai.remoteApiKey || ai.secretRef
    : ai.remoteApiKey || ai.secretRef || config?.secretRef || config?.secret_ref || "";
  const remoteModelValue = draftTouched.remoteRuntimeModel
    ? ai.remoteRuntimeModel
    : ai.remoteRuntimeModel || remoteRuntimeModelFromMap(providerId, config?.runtimeModelMap || config?.runtime_model_map || {}) || "";
  const configReady = remoteConfigurable
    ? Boolean(String(endpointValue || "").trim() && String(remoteModelValue || "").trim() && String(secretValue || "").trim())
    : Boolean(String(endpointValue || secretValue || remoteModelValue || "").trim());
  const currentHealth = Boolean(healthRecord) && remoteHealthBelongsToAiConfig(ai, providerId);
  const healthy = remoteHealthMatchesAiConfig(ai, providerId);
  const tested = remoteTestMatchesAiConfig(ai, providerId);
  const failedTest = remoteTestFailedForAiConfig(ai, providerId);
  const platformManaged = providerId === "platform_managed_openai";
  const disabled = config && String(config.status || "").trim() === "disabled";
  const ok = !failedTest && (tested || healthy || platformManaged);
  const warn = failedTest || disabled || (!ok && (!healthy || !configReady));
  badge.classList.toggle("ok", ok && !disabled);
  badge.classList.toggle("warn", warn);
  if (ai.providerHealthChecking) badge.textContent = "测试中";
  else if (tested) badge.textContent = "测试成功";
  else if (failedTest) badge.textContent = "需检查";
  else if (healthy) badge.textContent = "连接正常";
  else if (currentHealth) badge.textContent = "连接失败";
  else if (ai.providerConfigSaving) badge.textContent = "保存中";
  else if (ai.providerConfigError) badge.textContent = "需检查";
  else if (platformManaged) badge.textContent = "可用";
  else if (disabled) badge.textContent = "未启用";
  else if (config) badge.textContent = configReady ? "待测试" : "未完成";
  else badge.textContent = "未配置";
}

function renderProviderButtons({ $, ai, providerId, defaultProviderEndpointUrl, defaultProviderHealthEndpointUrl }) {
  const platformManaged = providerId === "platform_managed_openai";
  const remoteConfigurable = providerId && !platformManaged && !["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(providerId);
  const remoteTestPassed = remoteConnectionReadyForProvider(ai, providerId);
  const remoteKeyCleared = remoteConfigurable && !String(ai.remoteApiKey || "").trim() && ai.providerDraftTouched?.secretRef === true;
  const saveButton = $("settingsAiSaveProviderConfig");
  if (saveButton) {
    saveButton.disabled = ai.providerConfigSaving || ai.providerHealthChecking || !providerId || platformManaged || (remoteConfigurable && !remoteTestPassed && !remoteKeyCleared);
    saveButton.textContent = ai.providerConfigSaving
      ? "保存中..."
      : platformManaged
        ? "无需保存"
        : remoteKeyCleared
          ? "保存清空"
        : remoteConfigurable && !remoteTestPassed
          ? "先测试连接"
          : "保存远程设置";
  }
  const checkButton = $("settingsAiCheckProviderHealth");
  if (!checkButton) return;
  const endpointUrl = String(ai.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
  const healthEndpointUrl = String(ai.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || "").trim();
  checkButton.disabled = ai.providerConfigSaving || ai.providerHealthChecking || !providerId || platformManaged || !endpointUrl;
  checkButton.textContent = ai.providerHealthChecking
    ? "测试中..."
    : platformManaged
      ? "已内置"
      : !endpointUrl
        ? "填写后测试"
        : "测试连接";
}
