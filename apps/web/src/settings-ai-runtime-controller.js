import {
  buildAiSettingsPayload,
  ollamaPullModelPlan,
  ollamaRuntimePreviewFromPullResult,
  providerHealthCheckPlan,
  providerHealthResultStatus
} from "./settings-ai-runtime-actions.js";

export function createSettingsAiRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};

  function aiSettingsPayload() {
    const {
      installedLocalModelReady = () => false,
      preferredLocalProviderPresetForSelection = () => "",
      settingsState = {}
    } = runtimeDeps();
    return buildAiSettingsPayload(settingsState.ai || {}, {
      preferredLocalProviderPreset: preferredLocalProviderPresetForSelection(),
      installedLocalModelReady
    });
  }

  async function pullRecommendedOllamaModel(modelName = "") {
    const {
      applyAiPreferencesToSettingsState = () => {},
      applyOllamaLocalModelDefaults = () => {},
      applyOllamaRuntimePreview = () => [],
      clearLocalOllamaSelectionState = () => {},
      currentOllamaModelTiers = () => [],
      fetchOllamaModels = async () => null,
      installedLocalModelReady = () => false,
      ollamaPullModelName = () => "",
      persistAiSettingsToStorage = () => {},
      persistOllamaRuntimeSelectionAfterPreview = async () => false,
      pullOllamaModel = async () => null,
      refreshAiRoutePreview = async () => null,
      renderSettingsPanel = () => {},
      selectedLocalModelNameForInstalledModels = (_model, models = []) => models[0] || "",
      setStatus = () => {},
      settingsState = {},
      window = globalThis.window,
      upsertAiProviderConfig = () => {}
    } = runtimeDeps();
    const pullPlan = ollamaPullModelPlan({
      requestedModel: modelName,
      fallbackModelName: ollamaPullModelName(),
      modelTiers: currentOllamaModelTiers(),
      runtimeMode: settingsState.ai?.runtimeMode
    });
    const modelNameToPull = pullPlan.modelName;
    const command = pullPlan.command;
    const confirmed = typeof window === "undefined" || typeof window.confirm !== "function"
      ? true
      : window.confirm(`下载 ${modelNameToPull} 会获取大模型文件，可能需要较长时间和数 GB 磁盘空间。\n\n命令：${command}\n\n确认开始下载吗？`);
    if (!confirmed) return null;
    settingsState.ai.localRuntimePulling = true;
    settingsState.ai.localRuntimeError = "";
    renderSettingsPanel();
    setStatus(`正在下载本地模型：${modelNameToPull}。这可能需要几分钟。`, "warn");
    try {
      const result = await pullOllamaModel(modelNameToPull, {
        enable: pullPlan.shouldEnable,
        runtimeMode: pullPlan.runtimeMode
      });
      const runtime = result?.runtime || await fetchOllamaModels();
      const runtimePreview = ollamaRuntimePreviewFromPullResult(result, runtime);
      const models = applyOllamaRuntimePreview(runtimePreview);
      if (result?.enabled?.preferences) {
        applyAiPreferencesToSettingsState(result.enabled.preferences);
      } else {
        settingsState.ai.localModel = selectedLocalModelNameForInstalledModels(modelNameToPull, models, currentOllamaModelTiers());
      }
      if (!installedLocalModelReady()) clearLocalOllamaSelectionState();
      else applyOllamaLocalModelDefaults();
      if (result?.enabled?.providerConfig) upsertAiProviderConfig(result.enabled.providerConfig);
      persistAiSettingsToStorage();
      if (pullPlan.shouldEnable) await persistOllamaRuntimeSelectionAfterPreview();
      else await refreshAiRoutePreview({ render: false });
      const readyModel = String(settingsState.ai.localModel || "").trim();
      setStatus(
        installedLocalModelReady(readyModel)
          ? `本地模型已就绪：${readyModel}`
          : `模型下载已完成，但还没有在本地模型列表里检测到 ${modelNameToPull}。请稍后重新检测。`,
        installedLocalModelReady(readyModel) ? "ok" : "warn"
      );
      return result;
    } catch (error) {
      settingsState.ai.localRuntimeError = String(error?.message || error);
      setStatus(`本地模型下载失败：${settingsState.ai.localRuntimeError}`, "warn");
      return null;
    } finally {
      settingsState.ai.localRuntimePulling = false;
      renderSettingsPanel();
    }
  }

  async function checkCurrentAiProviderHealth() {
    const {
      aiProviderConfigPayload = () => ({}),
      applyActiveAiProviderConfigToState = () => {},
      checkAiProviderHealth = async () => null,
      currentAiProviderId = () => "",
      renderSettingsPanel = () => {},
      resetAiProviderDraftTouched = () => {},
      saveAiProviderConfig = async () => null,
      setStatus = () => {},
      settingsState = {},
      upsertAiProviderConfig = () => {}
    } = runtimeDeps();
    const providerId = currentAiProviderId();
    const healthPlan = providerHealthCheckPlan({
      providerId,
      endpointUrl: settingsState.ai?.providerEndpointUrl,
      healthEndpointUrl: settingsState.ai?.providerHealthEndpointUrl
    });
    if (healthPlan.reason === "unsupported_provider") return false;
    if (healthPlan.reason === "missing_health_endpoint") {
      settingsState.ai.providerConfigError = "";
      settingsState.ai.providerHealthResult = null;
      renderSettingsPanel();
      setStatus("未填写检测地址；请用 AI 试运行确认远程服务是否可用。", "warn");
      return false;
    }
    settingsState.ai.providerHealthChecking = true;
    settingsState.ai.providerConfigError = "";
    renderSettingsPanel();
    try {
      const saved = await saveAiProviderConfig(aiProviderConfigPayload());
      upsertAiProviderConfig(saved);
      resetAiProviderDraftTouched();
      applyActiveAiProviderConfigToState();
      const result = await checkAiProviderHealth(healthPlan.providerId, healthPlan.request);
      settingsState.ai.providerHealthResult = result;
      const healthStatus = providerHealthResultStatus(result);
      setStatus(`AI 服务 ${healthStatus.label}`, healthStatus.healthy ? "ok" : "warn");
      return true;
    } catch (error) {
      settingsState.ai.providerHealthResult = null;
      settingsState.ai.providerConfigError = String(error?.message || error);
      setStatus(`AI 服务连接测试失败：${settingsState.ai.providerConfigError}`, "bad");
      return false;
    } finally {
      settingsState.ai.providerHealthChecking = false;
      renderSettingsPanel();
    }
  }

  return {
    aiSettingsPayload,
    checkCurrentAiProviderHealth,
    pullRecommendedOllamaModel
  };
}
