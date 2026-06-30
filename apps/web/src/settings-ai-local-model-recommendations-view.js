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

  const ai = settingsState.ai || {};
  const runtimeMode = normalizeAiRuntimeMode(ai.runtimeMode);
  const showLocalModel = isAiLocalFlowActive({
    runtimeMode,
    modelPack: ai.modelPack,
    providerId: currentAiProviderId()
  });
  const runtimeAvailable = ai.localRuntimeStatus === "available";
  const runtimeBusy = ai.localRuntimeChecking || ai.localRuntimeStarting || ai.localRuntimeStopping || ai.localRuntimePulling;
  recommendationsEl.classList.remove("hidden");

  const installedNames = (Array.isArray(ai.localRuntimeModels) ? ai.localRuntimeModels : [])
    .map((model) => String(model?.name || model || "").trim())
    .filter(Boolean);
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
  const selectedModel = String(ai.localModel || "").trim();
  const summaryText = !showLocalModel
    ? "可选本地模型"
    : runtimeAvailable
      ? installedCount
        ? `已检测到 ${installedCount} 个可用模型`
        : `建议先下载 ${primaryRecommendedOllamaModelName()}`
      : "先检测本地 AI，再下载或切换模型";
  const helperText = !showLocalModel
    ? "需要私密处理时再启用本地模型。"
    : runtimeAvailable
      ? "选择一个已安装模型后，用一句话测试是否可用。"
      : "本地 AI 连接后，这里会显示可下载或可切换的模型。";

  recommendationsEl.innerHTML = `
    <div class="settings-ai-local-recommendations-head">
      <span>${escapeHtml(summaryText)}</span>
      <small>${escapeHtml(helperText)}</small>
    </div>
    <div class="settings-ai-local-recommendation-list">
      ${profiles.map((item) => renderLocalModelProfile({
        item,
        escapeHtml,
        selectedModel,
        runtimeAvailable,
        runtimeBusy,
        showLocalModel,
        installed: hasLocalModel(item.name)
      })).join("")}
    </div>
  `;
}

function renderLocalModelProfile({
  item,
  escapeHtml,
  selectedModel,
  runtimeAvailable,
  runtimeBusy,
  showLocalModel,
  installed
}) {
  const selected = installed && selectedModel.toLowerCase() === item.name.toLowerCase();
  const command = item.downloadCommand || `ollama pull ${item.name}`;
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
    action = `<span class="settings-ai-local-recommendation-current">已检测</span>`;
  } else {
    action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-pull-local-model="${escapeHtml(item.name)}">下载</button>`;
  }
  return `
    <div class="settings-ai-local-recommendation ${installed ? "is-installed" : ""} ${selected ? "is-selected" : ""} ${item.verified ? "" : "is-unverified"} ${!runtimeAvailable ? "is-preview" : ""}">
      <div class="settings-ai-local-recommendation-main">
        <div class="settings-ai-local-recommendation-title">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.role || item.label || "")}</span>
        </div>
        <div class="settings-ai-local-recommendation-note">${escapeHtml(item.note || "")}</div>
        <div class="settings-ai-local-recommendation-meta">
          <span>${escapeHtml(installed ? "已安装" : runtimeAvailable ? "未安装" : "待检测")}</span>
          <span>${escapeHtml(item.sizeHint || item.resource || (item.verified ? "推荐" : "未验证"))}</span>
          <button class="settings-ai-command-copy" type="button" data-settings-ai-copy-command="${escapeHtml(command)}" aria-label="复制 ${escapeHtml(item.name)} 下载命令">复制命令</button>
        </div>
      </div>
      <div class="settings-ai-local-recommendation-action">${action}</div>
    </div>
  `;
}
