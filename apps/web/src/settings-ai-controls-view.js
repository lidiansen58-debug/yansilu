export function renderAiLocalModelRecommendationsForRuntime(deps = {}) {
  const {
    $ = () => null,
    escapeHtml = (value = "") => String(value ?? ""),
    settingsState = {},
    normalizeAiRuntimeMode = (value = "auto") => String(value || "auto"),
    isAiLocalFlowActive = () => false,
    currentAiProviderId = () => "",
    ollamaModelRecommendationProfiles = () => [],
    currentOllamaModelTiers = () => [],
    localModelDisplayProfile = (name = "") => ({ name }),
    hasLocalModel = () => false,
    primaryRecommendedOllamaModelName = () => "qwen3:4b"
  } = deps;
  const recommendationsEl = $("settingsAiLocalModelRecommendations");
  if (!recommendationsEl) return;

  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai?.runtimeMode);
  const showLocalModel = isAiLocalFlowActive({
    runtimeMode,
    modelPack: settingsState.ai?.modelPack,
    providerId: currentAiProviderId()
  });
  const runtimeAvailable = settingsState.ai?.localRuntimeStatus === "available";
  const runtimeBusy = settingsState.ai?.localRuntimeChecking
    || settingsState.ai?.localRuntimeStarting
    || settingsState.ai?.localRuntimeStopping
    || settingsState.ai?.localRuntimePulling;
  recommendationsEl.classList.remove("hidden");

  const models = Array.isArray(settingsState.ai?.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
  const installedNames = models.map((model) => String(model?.name || model || "").trim()).filter(Boolean);
  const tiers = currentOllamaModelTiers();
  const catalogProfiles = ollamaModelRecommendationProfiles(tiers);
  const recommendedNames = new Set(catalogProfiles.map((item) => item.name.toLowerCase()));
  const extraInstalledProfiles = installedNames
    .filter((name) => !recommendedNames.has(name.toLowerCase()))
    .map((name) => localModelDisplayProfile(name, tiers));
  const profiles = [
    ...catalogProfiles.map((item) => localModelDisplayProfile(item.name, tiers)),
    ...extraInstalledProfiles
  ];
  const installedCount = profiles.filter((item) => hasLocalModel(item.name)).length;
  const selectedModel = String(settingsState.ai?.localModel || "").trim();
  const summaryText = !showLocalModel
    ? "可选本地模型"
    : runtimeAvailable
      ? installedCount
        ? `已检测到 ${installedCount} 个可用模型`
        : `建议先下载 ${primaryRecommendedOllamaModelName()}`
      : "先检测本地 AI，再下载或切换模型";
  const helperText = !showLocalModel
    ? "先启用本地模式，之后在这里下载、选择和试运行。"
    : runtimeAvailable
      ? "当前按内置模型目录展示；以后可按语言、模型来源和本机配置自动调整推荐。"
      : "本地 AI 连接后，这些模型会直接变成下载或切换按钮。";

  recommendationsEl.innerHTML = `
    <div class="settings-ai-local-recommendations-head">
      <span>${escapeHtml(summaryText)}</span>
      <small>${escapeHtml(helperText)}</small>
    </div>
    <div class="settings-ai-local-recommendation-list">
      ${profiles.map((item) => {
        const installed = hasLocalModel(item.name);
        const selected = installed && selectedModel.toLowerCase() === item.name.toLowerCase();
        let action = "";
        if (runtimeBusy) {
          action = `<button class="mini-btn is-subtle" type="button" disabled>处理中</button>`;
        } else if (!showLocalModel) {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-quick-setup="local">启用本地</button>`;
        } else if (!runtimeAvailable) {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-detect-ollama>检测本地 AI</button>`;
        } else if (installed && selected) {
          action = `<span class="settings-ai-local-recommendation-current">当前使用</span>`;
        } else if (installed && item.verified) {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-select-local-model="${escapeHtml(item.name)}">切换</button>`;
        } else if (installed) {
          action = `<span class="settings-ai-local-recommendation-current">仅检测</span>`;
        } else {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-pull-local-model="${escapeHtml(item.name)}">下载</button>`;
        }
        const command = item.downloadCommand || `ollama pull ${item.name}`;
        return `
          <div class="settings-ai-local-recommendation ${installed ? "is-installed" : ""} ${selected ? "is-selected" : ""} ${item.verified ? "" : "is-unverified"} ${!runtimeAvailable ? "is-preview" : ""}">
            <div class="settings-ai-local-recommendation-main">
              <div class="settings-ai-local-recommendation-title">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.role || item.label)}</span>
              </div>
              <div class="settings-ai-local-recommendation-note">${escapeHtml(item.note)}</div>
              <div class="settings-ai-local-recommendation-meta">
                <span>${escapeHtml(installed ? "已安装" : runtimeAvailable ? "未安装" : "待检测")}</span>
                <span>${escapeHtml(item.sizeHint || item.resource || (item.verified ? "已推荐" : "未验证"))}</span>
                ${item.resource && item.resource !== item.sizeHint ? `<span>${escapeHtml(item.resource)}</span>` : ""}
                ${item.hardwareHint ? `<span>${escapeHtml(item.hardwareHint)}</span>` : ""}
                <button class="settings-ai-command-copy" type="button" data-settings-ai-copy-command="${escapeHtml(command)}" aria-label="复制 ${escapeHtml(item.name)} 下载命令">复制命令</button>
              </div>
            </div>
            <div class="settings-ai-local-recommendation-action">${action}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

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
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai?.runtimeMode);
  const runtimeSelect = $("settingsAiRuntimeMode");
  const primaryRuntimeMode = runtimeMode === "hybrid" ? "auto" : runtimeMode;
  if (runtimeSelect && runtimeSelect.value !== primaryRuntimeMode) runtimeSelect.value = primaryRuntimeMode;

  const modelSelect = $("settingsAiLocalModel");
  const modelLabel = $("settingsAiLocalModelLabel");
  const providerId = currentAiProviderId();
  const showLocalModel = isAiLocalFlowActive({
    runtimeMode,
    modelPack: settingsState.ai?.modelPack,
    providerId
  });
  const localSetupActive = showLocalModel && (runtimeMode === "local_only" || runtimeMode === "hybrid" || isLocalModelPack(settingsState.ai?.modelPack));
  const runtimeAvailable = settingsState.ai?.localRuntimeStatus === "available";
  modelSelect?.classList.toggle("hidden", !showLocalModel);
  modelLabel?.classList.toggle("hidden", !showLocalModel);
  if (modelSelect) {
    const models = Array.isArray(settingsState.ai?.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
    const selectedModel = String(settingsState.ai?.localModel || "").trim();
    const catalogNames = new Set(ollamaModelRecommendationProfiles(currentOllamaModelTiers()).map((item) => item.name.toLowerCase()));
    const names = models
      .map((model) => String(model?.name || "").trim())
      .filter((name) => name && catalogNames.has(name.toLowerCase()));
    const optionNames = selectedModel && !names.includes(selectedModel) ? [selectedModel, ...names] : names;
    if (settingsState.ai?.localRuntimeChecking) {
      modelSelect.innerHTML = `<option value="">正在检测本地 AI...</option>`;
    } else if (optionNames.length) {
      modelSelect.innerHTML = [
        `<option value="">自动选择本地模型</option>`,
        ...optionNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      ].join("");
      modelSelect.value = selectedModel;
    } else {
      modelSelect.innerHTML = `<option value="">未检测到本地模型</option>`;
    }
    modelSelect.disabled = !showLocalModel || settingsState.ai?.localRuntimeChecking;
  }

  const managedStopPending = settingsState.ai?.localRuntimeManagedStopPending === true;
  const runtimeBusy = settingsState.ai?.localRuntimeChecking
    || settingsState.ai?.localRuntimeStarting
    || settingsState.ai?.localRuntimeStopping
    || settingsState.ai?.localRuntimePulling;
  const useLocalButton = $("settingsAiUseLocalSetup");
  if (useLocalButton) {
    useLocalButton.classList.toggle("hidden", localSetupActive);
    useLocalButton.disabled = localSetupActive || runtimeBusy;
    useLocalButton.textContent = "使用本地大模型";
    useLocalButton.classList.toggle("primary", !localSetupActive);
    useLocalButton.classList.toggle("is-subtle", localSetupActive);
  }
  const detectButton = $("settingsAiDetectOllama");
  if (detectButton) {
    detectButton.classList.toggle("hidden", !localSetupActive);
    detectButton.disabled = !localSetupActive || runtimeBusy;
    detectButton.textContent = !localSetupActive
      ? "先启用本地模式"
      : settingsState.ai?.localRuntimeChecking
        ? "正在检测本地 AI..."
        : runtimeAvailable
          ? "重新检测本地 AI"
          : "检测本地 AI";
  }
  const startButton = $("settingsAiStartOllama");
  if (startButton) {
    const canStartOllama = settingsState.ai?.localRuntimeReadinessStatus === "installed_not_running";
    startButton.classList.toggle("hidden", !localSetupActive || runtimeAvailable || managedStopPending || !canStartOllama);
    startButton.disabled = !localSetupActive || runtimeAvailable || managedStopPending || !canStartOllama || runtimeBusy;
    startButton.textContent = settingsState.ai?.localRuntimeStarting ? "正在启动..." : "启动本地 AI";
  }
  const stopButton = $("settingsAiStopOllama");
  if (stopButton) {
    const canStopOllama = runtimeAvailable || managedStopPending;
    stopButton.classList.toggle("hidden", !localSetupActive || !canStopOllama);
    stopButton.disabled = !localSetupActive || !canStopOllama || runtimeBusy;
    stopButton.textContent = settingsState.ai?.localRuntimeStopping
      ? "正在停止..."
      : managedStopPending
        ? "继续停止"
        : "停止本地 AI";
  }

  $("settingsAiDownloadOllama")?.classList.toggle("hidden", !localSetupActive || settingsState.ai?.localRuntimeStatus === "available");
  const downloadLink = $("settingsAiDownloadOllama");
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
  if (pullButton) {
    const modelName = ollamaPullModelName();
    const recommendation = ollamaRecommendationForModel(modelName, currentOllamaModelTiers());
    const installed = hasLocalModel(modelName);
    const hasAnyLocalModel = (Array.isArray(settingsState.ai?.localRuntimeModels) ? settingsState.ai.localRuntimeModels : []).length > 0;
    pullButton.classList.toggle("hidden", !localSetupActive || !runtimeAvailable || installed);
    pullButton.classList.toggle("primary", !hasAnyLocalModel);
    pullButton.classList.toggle("is-subtle", hasAnyLocalModel);
    pullButton.disabled = !localSetupActive || !runtimeAvailable || runtimeBusy || installed;
    pullButton.textContent = settingsState.ai?.localRuntimePulling
      ? `正在下载 ${modelName}...`
      : installed
        ? `已安装 ${modelName}`
        : hasAnyLocalModel
          ? `下载 ${modelName}${recommendation ? `（${recommendation.label}）` : ""}`
          : `下载推荐模型 ${modelName}`;
  }
  renderAiLocalModelRecommendations(deps);
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
  const providerId = currentAiProviderId();
  const remoteConfigurable = isRemoteConfigurableProviderId(providerId);
  const remoteModelInput = $("settingsAiRemoteRuntimeModel");
  if (remoteModelInput) {
    const stored = String(settingsState.ai?.remoteRuntimeModel || "").trim();
    if (String(remoteModelInput.value || "") !== stored) remoteModelInput.value = stored;
    remoteModelInput.disabled = !remoteConfigurable;
    remoteModelInput.placeholder = remoteConfigurable
      ? "服务商提供的模型名，例如：deepseek-chat、minicpm"
      : "当前方案不需要填写远程模型";
  }

  const endpointInput = $("settingsAiProviderEndpointUrl");
  if (endpointInput) {
    const stored = String(settingsState.ai?.providerEndpointUrl || "").trim();
    if (String(endpointInput.value || "") !== stored) endpointInput.value = stored;
  }
  const healthEndpointInput = $("settingsAiProviderHealthEndpointUrl");
  if (healthEndpointInput) {
    const stored = String(settingsState.ai?.providerHealthEndpointUrl || "").trim();
    if (String(healthEndpointInput.value || "") !== stored) healthEndpointInput.value = stored;
  }

  const config = activeAiProviderConfig();
  const healthRecord = settingsState.ai?.providerHealthResult?.record || null;
  const badge = $("settingsAiProviderConfigBadge");
  if (badge) {
    badge.classList.toggle("ok", Boolean(config));
    badge.classList.toggle("warn", !config && providerId !== "platform_managed_openai");
    if (healthRecord) {
      badge.classList.toggle("ok", healthRecord.status === "healthy");
      badge.classList.toggle("warn", healthRecord.status !== "healthy");
    }
    const draftTouched = settingsState.ai?.providerDraftTouched || {};
    const endpointValue = draftTouched.providerEndpointUrl
      ? settingsState.ai?.providerEndpointUrl
      : settingsState.ai?.providerEndpointUrl || config?.endpointUrl || config?.endpoint_url || "";
    const secretValue = draftTouched.secretRef
      ? settingsState.ai?.secretRef
      : settingsState.ai?.secretRef || config?.secretRef || config?.secret_ref || "";
    const remoteModelValue = draftTouched.remoteRuntimeModel
      ? settingsState.ai?.remoteRuntimeModel
      : settingsState.ai?.remoteRuntimeModel || remoteRuntimeModelFromMap(providerId, config?.runtimeModelMap || config?.runtime_model_map || {}) || "";
    const endpointReady = Boolean(String(endpointValue || "").trim());
    const secretReady = Boolean(String(secretValue || "").trim());
    const remoteModelReady = Boolean(String(remoteModelValue || "").trim());
    const configReady = remoteConfigurable
      ? endpointReady && remoteModelReady
      : endpointReady || secretReady || remoteModelReady;
    if (settingsState.ai?.providerHealthChecking) badge.textContent = "测试中";
    else if (healthRecord?.status === "healthy") badge.textContent = `健康 ${healthRecord.latencyMs || 0}ms`;
    else if (healthRecord) badge.textContent = `状态 ${healthRecord.status || "未检测"}`;
    else if (settingsState.ai?.providerConfigSaving) badge.textContent = "保存中";
    else if (settingsState.ai?.providerConfigError) badge.textContent = "配置失败";
    else if (providerId === "platform_managed_openai") badge.textContent = "平台托管";
    else if (config && String(config.status || "").trim() === "disabled") badge.textContent = "未启用";
    else if (config) badge.textContent = configReady ? "已配置" : "未完成";
    else badge.textContent = "未配置";
  }

  const saveButton = $("settingsAiSaveProviderConfig");
  if (saveButton) {
    const platformManaged = providerId === "platform_managed_openai";
    saveButton.disabled = settingsState.ai?.providerConfigSaving || settingsState.ai?.providerHealthChecking || !providerId || platformManaged;
    saveButton.textContent = settingsState.ai?.providerConfigSaving
      ? "保存中..."
      : platformManaged
        ? "默认服务无需保存"
        : "保存服务连接";
  }

  const checkButton = $("settingsAiCheckProviderHealth");
  if (checkButton) {
    const platformManaged = providerId === "platform_managed_openai";
    const endpointUrl = String(settingsState.ai?.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
    const healthEndpointUrl = String(
      settingsState.ai?.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || ""
    ).trim();
    checkButton.disabled =
      settingsState.ai?.providerConfigSaving ||
      settingsState.ai?.providerHealthChecking ||
      !providerId ||
      platformManaged ||
      !healthEndpointUrl;
    checkButton.textContent = settingsState.ai?.providerHealthChecking
      ? "测试中..."
      : platformManaged
        ? "平台托管"
        : !healthEndpointUrl
          ? "填写检测地址后测试"
          : "测试服务连接";
  }
}
