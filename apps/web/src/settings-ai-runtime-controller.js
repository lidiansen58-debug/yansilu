import {
  buildAiSettingsPayload,
  ollamaPullModelPlan,
  ollamaRuntimePreviewFromPullResult,
  providerHealthCheckPlan,
  providerHealthResultStatus
} from "./settings-ai-runtime-actions.js";
import {
  normalizeAiRuntimeMode
} from "./ai-settings-state.js";
import {
  ollamaStopRuntimeUiOutcome
} from "./ai-local-runtime-ui-model.js";
import {
  ollamaRecommendationForModel
} from "./prototype-ai-settings-controller.js";

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

  async function previewOllamaLocalAiBootstrapFromUi(options = {}) {
    const {
      applyOllamaBootstrapResult = () => [],
      clearLocalOllamaSelectionState = () => {},
      fetchOllamaBootstrapStatus = async () => null,
      installedLocalModelReady = () => false,
      ollamaBootstrapStatusText = () => "",
      primaryRecommendedOllamaModelName = () => "",
      renderSettingsPanel = () => {},
      setStatus = () => {},
      settingsState = {},
      shouldUseOllamaLocalRuntime = () => false
    } = runtimeDeps();
    const runtimeMode = normalizeAiRuntimeMode(settingsState.ai?.runtimeMode);
    const allowLocalSetupPreview = options.allowLocalSetupPreview === true;
    if (!allowLocalSetupPreview && (!["local_only", "hybrid"].includes(runtimeMode) || !shouldUseOllamaLocalRuntime())) return null;
    const model = String(options.model || primaryRecommendedOllamaModelName()).trim();
    settingsState.ai.localRuntimeChecking = true;
    settingsState.ai.localRuntimeError = "";
    if (options.render !== false) renderSettingsPanel();
    try {
      const result = await fetchOllamaBootstrapStatus({ model, runtimeMode: allowLocalSetupPreview ? "local_only" : runtimeMode });
      applyOllamaBootstrapResult(result);
      if (result?.ready !== true) {
        settingsState.ai.localRuntimeError = ollamaBootstrapStatusText(result);
        if (!installedLocalModelReady()) clearLocalOllamaSelectionState();
      }
      if (options.silent !== true) {
        setStatus(ollamaBootstrapStatusText(result), result?.ready === true ? "ok" : "warn");
      }
      return result;
    } catch (error) {
      settingsState.ai.localRuntimeError = String(error?.message || error);
      if (options.silent !== true) setStatus(`本地 AI 检查失败：${settingsState.ai.localRuntimeError}`, "warn");
      return null;
    } finally {
      settingsState.ai.localRuntimeChecking = false;
      if (options.render !== false) renderSettingsPanel();
    }
  }

  async function bootstrapOllamaLocalAiFromUi(options = {}) {
    const {
      applyOllamaBootstrapResult = () => [],
      bootstrapOllamaLocalAi = async () => null,
      clearLocalOllamaSelectionState = () => {},
      installedLocalModelReady = () => false,
      ollamaBootstrapStatusText = () => "",
      primaryRecommendedOllamaModelName = () => "",
      refreshAiRoutePreview = async () => null,
      renderSettingsPanel = () => {},
      setStatus = () => {},
      settingsState = {},
      shouldUseOllamaLocalRuntime = () => false
    } = runtimeDeps();
    const runtimeMode = normalizeAiRuntimeMode(settingsState.ai?.runtimeMode);
    if (!["local_only", "hybrid"].includes(runtimeMode) || !shouldUseOllamaLocalRuntime()) return null;
    const model = String(options.model || primaryRecommendedOllamaModelName()).trim();
    settingsState.ai.localRuntimeChecking = true;
    settingsState.ai.localRuntimePulling = options.pullModel === false ? false : true;
    settingsState.ai.localRuntimeError = "";
    if (options.render !== false) renderSettingsPanel();
    if (options.silent !== true) setStatus(`正在准备本地 AI：${model}`, "warn");
    try {
      const result = await bootstrapOllamaLocalAi({
        model,
        runtimeMode,
        autoStart: options.autoStart !== false,
        pullModel: options.pullModel !== false,
        enableConfig: options.enableConfig !== false,
        healthCheck: options.healthCheck !== false
      });
      applyOllamaBootstrapResult(result);
      if (result?.ready === true) {
        await refreshAiRoutePreview({ render: false });
      } else {
        settingsState.ai.localRuntimeError = ollamaBootstrapStatusText(result);
        if (!installedLocalModelReady()) clearLocalOllamaSelectionState();
      }
      if (options.silent !== true) {
        setStatus(ollamaBootstrapStatusText(result), result?.ready === true ? "ok" : "warn");
      }
      return result;
    } catch (error) {
      settingsState.ai.localRuntimeError = String(error?.message || error);
      if (options.silent !== true) setStatus(`本地 AI 引导失败：${settingsState.ai.localRuntimeError}`, "warn");
      return null;
    } finally {
      settingsState.ai.localRuntimeChecking = false;
      settingsState.ai.localRuntimePulling = false;
      if (options.render !== false) renderSettingsPanel();
    }
  }

  async function persistOllamaRuntimeSelectionAfterPreview() {
    const {
      clearLocalOllamaSelectionState = () => {},
      installedLocalModelReady = () => false,
      localOllamaSetupActive = () => false,
      refreshAiRoutePreview = async () => null,
      saveLocalOllamaProviderConfig = async () => null,
      settingsState = {},
      syncAiSettingsToApi = async () => false
    } = runtimeDeps();
    if (!localOllamaSetupActive() || String(settingsState.ai?.localRuntimeStatus || "").trim() !== "available") return false;
    await syncAiSettingsToApi();
    if (installedLocalModelReady()) {
      await saveLocalOllamaProviderConfig();
      await refreshAiRoutePreview({ render: false });
    } else {
      clearLocalOllamaSelectionState();
    }
    return true;
  }

  async function detectOllamaModels(options = {}) {
    const {
      applyOllamaRuntimePreview = () => [],
      fetchOllamaModels = async () => null,
      persistOllamaRuntimeSelectionAfterPreview = async () => false,
      renderSettingsPanel = () => {},
      setStatus = () => {},
      settingsState = {}
    } = runtimeDeps();
    settingsState.ai.localRuntimeChecking = true;
    settingsState.ai.localRuntimeError = "";
    if (options.render !== false) renderSettingsPanel();
    try {
      const runtime = await fetchOllamaModels();
      const models = applyOllamaRuntimePreview(runtime);
      await persistOllamaRuntimeSelectionAfterPreview();
      if (options.silent !== true) {
        const count = models.length;
        if (settingsState.ai.localRuntimeStatus === "available") {
          setStatus(count ? `已检测到 ${count} 个本地模型。` : "本地 AI 可连接，但还没有本地模型。", count ? "ok" : "warn");
        } else {
          const message = settingsState.ai.localRuntimeError || "本地 AI 当前不可用。";
          setStatus(`未检测到本地 AI：${message}。请先下载安装并启动本地 AI。`, "warn");
        }
      }
      return runtime;
    } catch (error) {
      settingsState.ai.localRuntimeStatus = "unavailable";
      settingsState.ai.localRuntimeModels = [];
      settingsState.ai.localRuntimeReadinessStatus = "check_failed";
      settingsState.ai.localRuntimeApiReachable = false;
      settingsState.ai.localRuntimeDefaultModelInstalled = false;
      settingsState.ai.localRuntimeSetupGuide = null;
      settingsState.ai.localRuntimeChatEndpointUrl = "";
      settingsState.ai.localRuntimeHealthEndpointUrl = "";
      settingsState.ai.localRuntimeError = String(error?.message || error);
      if (options.silent !== true) setStatus(`本地 AI 检测失败：${settingsState.ai.localRuntimeError}。请先下载安装并启动本地 AI。`, "warn");
      return null;
    } finally {
      settingsState.ai.localRuntimeChecking = false;
      if (options.render !== false) renderSettingsPanel();
    }
  }

  async function startOllamaRuntimeFromUi() {
    const {
      applyOllamaRuntimePreview = () => [],
      fetchOllamaModels = async () => null,
      persistOllamaRuntimeSelectionAfterPreview = async () => false,
      renderSettingsPanel = () => {},
      setStatus = () => {},
      settingsState = {},
      startOllamaRuntime = async () => null
    } = runtimeDeps();
    settingsState.ai.localRuntimeStarting = true;
    settingsState.ai.localRuntimeError = "";
    renderSettingsPanel();
    setStatus("正在启动本地 AI...", "warn");
    try {
      const result = await startOllamaRuntime();
      const runtime = result?.runtime || await fetchOllamaModels();
      const models = applyOllamaRuntimePreview(runtime);
      await persistOllamaRuntimeSelectionAfterPreview();
      if (runtime?.status === "available") {
        setStatus(models.length ? `本地 AI 已启动，检测到 ${models.length} 个本地模型。` : "本地 AI 已启动，但还没有本地模型。", models.length ? "ok" : "warn");
      } else {
        settingsState.ai.localRuntimeError = String(runtime?.message || result?.message || "本地 AI 还没有响应。");
        setStatus(`已尝试启动本地 AI：${settingsState.ai.localRuntimeError}`, "warn");
      }
      return result;
    } catch (error) {
      settingsState.ai.localRuntimeStatus = "unavailable";
      settingsState.ai.localRuntimeModels = [];
      settingsState.ai.localRuntimeReadinessStatus = "check_failed";
      settingsState.ai.localRuntimeApiReachable = false;
      settingsState.ai.localRuntimeDefaultModelInstalled = false;
      settingsState.ai.localRuntimeError = String(error?.message || error);
      setStatus(`启动本地 AI 失败：${settingsState.ai.localRuntimeError}。如果还没安装，请先下载本地 AI 运行环境。`, "warn");
      return null;
    } finally {
      settingsState.ai.localRuntimeStarting = false;
      renderSettingsPanel();
    }
  }

  async function stopOllamaRuntimeFromUi() {
    const {
      applyOllamaRuntimePreview = () => [],
      fetchOllamaModels = async () => null,
      renderSettingsPanel = () => {},
      setStatus = () => {},
      settingsState = {},
      stopOllamaRuntime = async () => null,
      window = globalThis.window
    } = runtimeDeps();
    const confirmed = typeof window === "undefined" || typeof window.confirm !== "function"
      ? true
      : window.confirm("停止本地 AI 会结束这台电脑上的本地模型服务，可能影响其他正在使用本地模型的软件。确定停止吗？");
    if (!confirmed) return null;
    settingsState.ai.localRuntimeStopping = true;
    settingsState.ai.localRuntimeError = "";
    renderSettingsPanel();
    setStatus("正在停止本地 AI...", "warn");
    try {
      const result = await stopOllamaRuntime();
      const runtime = result?.runtime || await fetchOllamaModels();
      const stopOutcome = ollamaStopRuntimeUiOutcome(result, runtime);
      applyOllamaRuntimePreview(runtime);
      settingsState.ai.localRuntimeManagedStopPending = stopOutcome.managedStopPending;
      if (stopOutcome.status === "manual_stop_required") {
        settingsState.ai.localRuntimeError = stopOutcome.error;
        setStatus(`需要手动管理本地 AI：${settingsState.ai.localRuntimeError}`, "warn");
      } else if (stopOutcome.status === "stopped") {
        settingsState.ai.localRuntimeModels = [];
        settingsState.ai.localRuntimeError = stopOutcome.error;
        setStatus("本地 AI 已停止。需要本地模型时可以再启动。", "ok");
      } else if (stopOutcome.status === "stopping") {
        settingsState.ai.localRuntimeError = stopOutcome.error;
        setStatus(`停止命令已发送，正在等待确认：${settingsState.ai.localRuntimeError}`, "warn");
      } else {
        settingsState.ai.localRuntimeError = stopOutcome.error;
        setStatus(`已发送停止命令，但本地 AI 仍可连接：${settingsState.ai.localRuntimeError}`, "warn");
      }
      return result;
    } catch (error) {
      settingsState.ai.localRuntimeError = String(error?.message || error);
      setStatus(`停止本地 AI 失败：${settingsState.ai.localRuntimeError}`, "warn");
      return null;
    } finally {
      settingsState.ai.localRuntimeStopping = false;
      renderSettingsPanel();
    }
  }

  async function selectInstalledLocalModelFromUi(modelName = "") {
    const {
      applyOllamaLocalModelDefaults = () => {},
      clearLocalOllamaSelectionState = () => {},
      currentOllamaModelTiers = () => [],
      hasLocalModel = () => false,
      installedLocalModelReady = () => false,
      persistAiSettingsToStorage = () => {},
      refreshAiRoutePreview = async () => null,
      renderSettingsPanel = () => {},
      saveLocalOllamaProviderConfig = async () => null,
      setStatus = () => {},
      settingsState = {},
      shouldUseOllamaLocalRuntime = () => false,
      syncAiSettingsToApi = async () => false
    } = runtimeDeps();
    const requested = String(modelName || "").trim();
    const inCatalog = Boolean(ollamaRecommendationForModel(requested, currentOllamaModelTiers()));
    const next = requested && inCatalog && hasLocalModel(requested) ? requested : "";
    settingsState.ai.localModel = next;
    clearLocalOllamaSelectionState({ clearModel: false });
    if (next) applyOllamaLocalModelDefaults();
    persistAiSettingsToStorage();
    await syncAiSettingsToApi();
    if (installedLocalModelReady() && ["local_only", "hybrid"].includes(normalizeAiRuntimeMode(settingsState.ai.runtimeMode)) && shouldUseOllamaLocalRuntime()) {
      await saveLocalOllamaProviderConfig();
      await refreshAiRoutePreview();
    } else {
      await refreshAiRoutePreview();
    }
    renderSettingsPanel();
    setStatus(
      next
        ? `本地模型已选择：${next}。建议再试运行一次。`
        : requested
          ? inCatalog
            ? "这个本地模型没有检测到，请先下载或重新检测本地 AI。"
            : "这个模型不在研思录内置本地模型目录里，不能设为默认模型。"
          : "本地模型选择已清空。",
      next || !requested ? "ok" : "warn"
    );
    return next;
  }

  async function refreshAiRoutePreview(options = {}) {
    const {
      aiSettingsPayload = () => ({}),
      applyActiveAiProviderConfigToState = () => {},
      previewAiRoute = async () => null,
      renderSettingsPanel = () => {},
      settingsState = {}
    } = runtimeDeps();
    settingsState.ai.routePreviewLoading = true;
    settingsState.ai.routePreviewError = "";
    if (options.render !== false) renderSettingsPanel();
    try {
      settingsState.ai.routePreview = await previewAiRoute(aiSettingsPayload());
      applyActiveAiProviderConfigToState();
    } catch (error) {
      settingsState.ai.routePreview = null;
      settingsState.ai.routePreviewError = String(error?.message || error);
    } finally {
      settingsState.ai.routePreviewLoading = false;
      if (options.render !== false) renderSettingsPanel();
    }
    return settingsState.ai.routePreview;
  }

  async function syncAiProviderConfigToApi() {
    const {
      aiProviderConfigPayload = () => ({}),
      applyActiveAiProviderConfigToState = () => {},
      currentAiProviderId = () => "",
      persistAiSettingsToStorage = () => {},
      refreshAiRoutePreview = async () => null,
      renderSettingsPanel = () => {},
      resetAiProviderDraftTouched = () => {},
      saveAiProviderConfig = async () => null,
      setStatus = () => {},
      settingsState = {},
      syncAiSettingsToApi = async () => false,
      upsertAiProviderConfig = () => {}
    } = runtimeDeps();
    const providerId = currentAiProviderId();
    if (!providerId) return false;
    settingsState.ai.providerConfigSaving = true;
    settingsState.ai.providerConfigError = "";
    renderSettingsPanel();
    try {
      const saved = await saveAiProviderConfig(aiProviderConfigPayload());
      upsertAiProviderConfig(saved);
      applyActiveAiProviderConfigToState();
      persistAiSettingsToStorage();
      await syncAiSettingsToApi();
      resetAiProviderDraftTouched();
      await refreshAiRoutePreview({ render: false });
      setStatus(`AI 服务配置已保存：${providerId}`, "ok");
      return true;
    } catch (error) {
      settingsState.ai.providerConfigError = String(error?.message || error);
      setStatus(`AI 服务配置保存失败：${settingsState.ai.providerConfigError}`, "bad");
      return false;
    } finally {
      settingsState.ai.providerConfigSaving = false;
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
    bootstrapOllamaLocalAiFromUi,
    checkCurrentAiProviderHealth,
    detectOllamaModels,
    persistOllamaRuntimeSelectionAfterPreview,
    previewOllamaLocalAiBootstrapFromUi,
    pullRecommendedOllamaModel,
    refreshAiRoutePreview,
    selectInstalledLocalModelFromUi,
    startOllamaRuntimeFromUi,
    stopOllamaRuntimeFromUi,
    syncAiProviderConfigToApi
  };
}
