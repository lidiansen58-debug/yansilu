import {
  isAiLocalFlowActive,
  normalizeAiRuntimeMode,
  providerPresetForModelPack,
  shouldUseOllamaLocalRuntimeForSelection
} from "./ai-settings-state.js";
import {
  isBuiltInOllamaModel,
  isRemoteConfigurableProviderId,
  modelNameExistsInList
} from "./prototype-ai-settings-controller.js";

export function currentOllamaModelTiersForState(aiState = {}) {
  return Array.isArray(aiState.localRuntimeModelTiers) ? aiState.localRuntimeModelTiers : [];
}

export function installedLocalModelReadyForState(aiState = {}, modelName = aiState.localModel) {
  const localModel = String(modelName || "").trim();
  return String(aiState.localRuntimeStatus || "").trim() === "available"
    && Boolean(localModel)
    && isBuiltInOllamaModel(localModel, currentOllamaModelTiersForState(aiState))
    && modelNameExistsInList(localModel, aiState.localRuntimeModels);
}

export function aiProviderIdForSettingsState(aiState = {}) {
  return String(aiState.routePreview?.provider?.providerId || aiState.providerId || providerPresetForModelPack(aiState.modelPack)).trim();
}

export function authModeForAiTestReadiness(aiState = {}, providerId = aiProviderIdForSettingsState(aiState)) {
  const authMode = String(aiState.routePreview?.access?.authMode || "").trim();
  if (authMode) return authMode;
  if (providerId === "platform_managed_openai") return "platform_managed";
  if (["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(providerId)) {
    return aiState.secretRef ? "enterprise_secret" : "local_no_key";
  }
  return aiState.authMode || "workspace_managed";
}

export function aiTestBlockedReasonForState(aiState = {}, options = {}) {
  const providerId = String(options.providerId || aiProviderIdForSettingsState(aiState)).trim();
  const runtimeMode = normalizeAiRuntimeMode(aiState.runtimeMode);
  const localFlowActive = isAiLocalFlowActive({
    runtimeMode,
    modelPack: aiState.modelPack,
    providerId
  });
  const shouldUseOllamaLocalRuntime = Object.hasOwn(options, "shouldUseOllamaLocalRuntime")
    ? options.shouldUseOllamaLocalRuntime === true
    : shouldUseOllamaLocalRuntimeForSelection({
        runtimeMode,
        modelPack: aiState.modelPack,
        providerPreset: providerId
      });

  if (localFlowActive && shouldUseOllamaLocalRuntime) {
    const localStatus = String(aiState.localRuntimeStatus || "").trim();
    const localModel = String(aiState.localModel || "").trim();
    const models = Array.isArray(aiState.localRuntimeModels) ? aiState.localRuntimeModels : [];
    if (aiState.localRuntimeStarting) return "请等待本地 AI 启动完成";
    if (aiState.localRuntimeChecking) return "请等待本地 AI 检测完成";
    if (aiState.localRuntimePulling) return "请等待本地模型下载完成";
    if (localStatus !== "available") return "请先启动或检测本地 AI";
    if (!models.length) return "请先下载一个本地模型";
    if (!localModel) return "请先选择本地模型";
    if (!installedLocalModelReadyForState(aiState, localModel)) return "请先下载或选择已安装的本地模型";
    return "";
  }

  if (!isRemoteConfigurableProviderId(providerId)) return "";
  const endpointUrl = String(aiState.providerEndpointUrl || "").trim();
  const remoteRuntimeModel = String(aiState.remoteRuntimeModel || "").trim();
  const secretRef = String(aiState.secretRef || "").trim();
  const draftTouched = aiState.providerDraftTouched || {};
  const access = aiState.routePreview?.access || {};
  const authMode = options.authMode || authModeForAiTestReadiness(aiState, providerId);
  const requiresSecret = ["workspace_managed", "byok_advanced", "enterprise_secret"].includes(authMode);
  const secretReady = !requiresSecret
    ? true
    : draftTouched.secretRef
      ? Boolean(secretRef)
      : access.ready === true || (access.ready !== false && Boolean(secretRef));
  if (!endpointUrl && !remoteRuntimeModel) return "请先填写远程服务地址和远程模型";
  if (!endpointUrl) return "请先填写远程服务地址";
  if (!remoteRuntimeModel) return "请先填写远程模型";
  if (!secretReady) return "请先填写密钥名称";
  return "";
}
