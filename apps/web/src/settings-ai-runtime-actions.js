import {
  canonicalizeAiSettingsSelection,
  localProviderPresetForModelPack,
  normalizeAiRuntimeMode,
  providerPresetForModelPack
} from "./ai-settings-state.js";
import {
  aiFallbackPolicyForRuntimeMode,
  aiPrivacyPolicyForRuntimeMode,
  defaultProviderEndpointUrl,
  defaultProviderHealthEndpointUrl,
  ollamaRecommendationForModel,
  runtimeModelMapForRemoteModel
} from "./prototype-ai-settings-controller.js";
import {
  normalizeOpenAiCompatibleBaseUrl,
  remoteDeletedSecretsForPayload,
  remoteSecretRefForState,
  remoteSecretsForPayload
} from "./ai-settings-remote-config-model.js";

export function isLocalAdvancedModelRefForSettings(value = "") {
  return /^(local_private_gateway|ollama_local_gateway|minicpm_local_gateway):/i.test(String(value || "").trim());
}

export function buildAiSettingsPayload(aiState = {}, options = {}) {
  const selection = canonicalizeAiSettingsSelection({
    runtimeMode: aiState.runtimeMode,
    modelPack: aiState.modelPack,
    userMode: aiState.userMode,
    providerPreset: options.localProviderPreset || localProviderPresetForModelPack(aiState.modelPack)
  });
  const localProviderPreset = options.preferredLocalProviderPreset || localProviderPresetForModelPack(aiState.modelPack) || "local_private_gateway";
  const providerPreset = providerPresetForModelPack(selection.modelPack);
  const draftTouched = aiState.providerDraftTouched || {};
  const remoteSelected = selection.runtimeMode === "cloud_only" || providerPreset === "openai_compatible_gateway";
  const endpointUrl = remoteSelected
    ? normalizeOpenAiCompatibleBaseUrl(aiState.providerEndpointUrl)
    : String(aiState.providerEndpointUrl || "").trim();
  const secretRef = remoteSelected
    ? remoteSecretRefForState(aiState)
    : String(aiState.secretRef || "").trim();
  const secrets = remoteSelected ? remoteSecretsForPayload(aiState) : {};
  const deleteSecrets = remoteSelected ? remoteDeletedSecretsForPayload(aiState) : [];
  const remoteRuntimeModelMap = runtimeModelMapForRemoteModel(providerPreset, aiState.remoteRuntimeModel);
  const localModelAllowed = ["local_only", "hybrid"].includes(selection.runtimeMode);
  const localModelReady = localModelAllowed && options.installedLocalModelReady?.(aiState.localModel) === true;
  const advancedModelRef = String(aiState.advancedModelRef || "").trim();
  const advancedModelRefIsLocal = isLocalAdvancedModelRefForSettings(advancedModelRef);
  const modelRefAllowed = Boolean(advancedModelRef) && (advancedModelRefIsLocal ? localModelReady : selection.runtimeMode !== "local_only");
  return {
    userMode: aiState.userMode,
    modelPack: selection.modelPack,
    ...(providerPreset ? { providerPreset } : {}),
    ...(draftTouched.providerEndpointUrl || endpointUrl ? { endpointUrl } : {}),
    ...(draftTouched.remoteRuntimeModel || Object.keys(remoteRuntimeModelMap).length ? { runtimeModelMap: remoteRuntimeModelMap } : {}),
    ...(Object.keys(secrets).length ? { secrets } : {}),
    ...(deleteSecrets.length ? { deleteSecrets } : {}),
    privacy: aiPrivacyPolicyForRuntimeMode(selection.runtimeMode),
    fallbackPolicy: aiFallbackPolicyForRuntimeMode(selection.runtimeMode),
    advancedSettings: {
      runtimeMode: selection.runtimeMode,
      ...(localModelReady ? { localModel: aiState.localModel } : {}),
      ...(localModelReady ? { localProviderPreset } : {}),
      ...(modelRefAllowed ? { modelRef: advancedModelRef } : {}),
      ...(draftTouched.secretRef || secretRef ? { secretRef } : {})
    }
  };
}

export function ollamaPullModelPlan({
  requestedModel = "",
  fallbackModelName = "",
  modelTiers = [],
  runtimeMode = "auto"
} = {}) {
  const modelName = String(requestedModel || "").trim() || String(fallbackModelName || "").trim();
  const recommendation = ollamaRecommendationForModel(modelName, modelTiers);
  const mode = normalizeAiRuntimeMode(runtimeMode);
  return {
    modelName,
    command: recommendation?.downloadCommand || `ollama pull ${modelName}`,
    runtimeMode: mode,
    shouldEnable: ["local_only", "hybrid"].includes(mode)
  };
}

export function ollamaRuntimePreviewFromPullResult(result = null, fallbackRuntime = null) {
  const runtime = result?.runtime || fallbackRuntime || {};
  return {
    ...runtime,
    status: runtime?.status || "available"
  };
}

export function providerHealthCheckPlan({
  providerId = "",
  endpointUrl = "",
  healthEndpointUrl = ""
} = {}) {
  const id = String(providerId || "").trim();
  if (!id || id === "platform_managed_openai") return { ok: false, reason: "unsupported_provider" };
  const endpoint = String(endpointUrl || defaultProviderEndpointUrl(id) || "").trim();
  const healthEndpoint = String(healthEndpointUrl || defaultProviderHealthEndpointUrl(id, endpoint) || "").trim();
  if (!healthEndpoint) return { ok: false, reason: "missing_health_endpoint" };
  return {
    ok: true,
    providerId: id,
    healthEndpointUrl: healthEndpoint,
    request: {
      networkEnabled: true,
      healthCheck: {
        enabled: true,
        endpointUrl: healthEndpoint,
        method: "GET",
        timeoutMs: 5000,
        expectedStatus: 200,
        intervalSeconds: 300
      }
    }
  };
}

export function providerHealthResultStatus(result = null) {
  const record = result?.record || {};
  const status = String(record.status || "").trim();
  return {
    status,
    healthy: status === "healthy",
    label: status === "healthy" ? "连接正常" : `连接状态：${status || "未检测"}`
  };
}
