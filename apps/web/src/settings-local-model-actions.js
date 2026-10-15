import { ollamaPullModelPlan, ollamaRuntimePreviewFromPullResult } from "./settings-ai-runtime-actions.js";
import { ollamaStopRuntimeUiOutcome } from "./ai-local-runtime-ui-model.js";
import { captureActionConfirmationContext, confirmCurrentAction } from "./action-confirmation-context.js";

export function createSettingsLocalModelActions(runtimeDeps, clearAiTestResult) {
  const contextFor = ai => captureActionConfirmationContext(runtimeDeps, current => current.settingsState?.ai === ai);
  const busy = ai => ai.localRuntimePulling || ai.localRuntimeStopping || ai.localRuntimeStarting;
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
    const ai = settingsState.ai, currentContext = contextFor(ai);
    const selection = () => JSON.stringify([ai.runtimeMode, ai.localModel, ai.advancedModelRef, ollamaPullModelName()]);
    const before = selection();
    if (!await confirmCurrentAction(ai, {
      confirm: window?.confirm?.bind(window),
      message: `下载 ${modelNameToPull} 会获取大模型文件，可能需要较长时间和数 GB 磁盘空间。\n\n命令：${command}\n\n确认开始下载吗？`,
      isCurrent: () => currentContext() && !busy(ai) && selection() === before,
      onError: error => setStatus(`确认未完成：${String(error?.message || error)}`, "warn")
    })) return null;
    settingsState.ai.localRuntimePulling = true;
    settingsState.ai.localRuntimeError = "";
    renderSettingsPanel();
    setStatus(`正在下载本地模型：${modelNameToPull}。这可能需要几分钟。`, "warn");
    try {
      const result = await pullOllamaModel(modelNameToPull, {
        enable: pullPlan.shouldEnable,
        runtimeMode: pullPlan.runtimeMode
      });
      if (!currentContext() || selection() !== before) return null;
      const runtime = result?.runtime || await fetchOllamaModels();
      if (!currentContext() || selection() !== before) return null;
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
      if (!currentContext()) return null;
      const readyModel = String(settingsState.ai.localModel || "").trim();
      setStatus(
        installedLocalModelReady(readyModel)
          ? `本地模型已就绪：${readyModel}`
          : `模型下载已完成，但还没有在本地模型列表里检测到 ${modelNameToPull}。请稍后重新检测。`,
        installedLocalModelReady(readyModel) ? "ok" : "warn"
      );
      return result;
    } catch (error) {
      if (!currentContext()) return null;
      settingsState.ai.localRuntimeError = String(error?.message || error);
      setStatus(`本地模型下载失败：${settingsState.ai.localRuntimeError}`, "warn");
      return null;
    } finally {
      ai.localRuntimePulling = false;
      if (currentContext()) renderSettingsPanel();
    }
  }

  async function stopOllamaRuntimeFromUi() {
    const {
      applyOllamaRuntimePreview = () => [],
      fetchOllamaModels = async () => null,
      persistAiSettingsToStorage = () => {},
      renderSettingsPanel = () => {},
      setStatus = () => {},
      settingsState = {},
      stopOllamaRuntime = async () => null,
      window = globalThis.window
    } = runtimeDeps();
    const ai = settingsState.ai, currentContext = contextFor(ai);
    const selection = () => JSON.stringify([ai.runtimeMode, ai.localModel, ai.advancedModelRef]);
    const before = selection();
    if (!await confirmCurrentAction(ai, {
      confirm: window?.confirm?.bind(window),
      message: "停止本地模型会结束模型运行工具，可能影响其他正在使用本地模型的软件。确定停止吗？",
      isCurrent: () => currentContext() && !busy(ai) && selection() === before,
      onError: error => setStatus(`确认未完成：${String(error?.message || error)}`, "warn")
    })) return null;
    settingsState.ai.localRuntimeStopping = true;
    settingsState.ai.localRuntimeError = "";
    renderSettingsPanel();
    setStatus("正在停止本地 AI...", "warn");
    try {
      const result = await stopOllamaRuntime();
      if (!currentContext() || selection() !== before) return null;
      const runtime = result?.runtime || await fetchOllamaModels();
      if (!currentContext() || selection() !== before) return null;
      const stopOutcome = ollamaStopRuntimeUiOutcome(result, runtime);
      applyOllamaRuntimePreview(runtime);
      settingsState.ai.localRuntimeManagedStopPending = stopOutcome.managedStopPending;
      if (stopOutcome.status === "manual_stop_required") {
        settingsState.ai.localRuntimeError = stopOutcome.error;
        setStatus("模型运行工具由其他程序启动，请在系统中停止后重新检测。", "warn");
      } else if (stopOutcome.status === "stopped") {
        settingsState.ai.localRuntimeModels = [];
        settingsState.ai.localRuntimeError = stopOutcome.error;
        clearAiTestResult(settingsState.ai);
        persistAiSettingsToStorage();
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
      if (!currentContext()) return null;
      settingsState.ai.localRuntimeError = String(error?.message || error);
      setStatus(`停止本地 AI 失败：${settingsState.ai.localRuntimeError}`, "warn");
      return null;
    } finally {
      ai.localRuntimeStopping = false;
      if (currentContext()) renderSettingsPanel();
    }
  }

  return { pullRecommendedOllamaModel, stopOllamaRuntimeFromUi };
}
