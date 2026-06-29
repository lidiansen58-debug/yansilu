import {
  defaultProviderEndpointUrl,
  defaultProviderHealthEndpointUrl,
  runtimeModelMapForRemoteModel
} from "./prototype-ai-settings-controller.js";

export function buildAiProviderConfigPayload(aiState = {}, options = {}) {
  const providerId = String(options.providerId || "").trim();
  const endpointUrl = String(aiState.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
  const healthEndpointUrl = String(aiState.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || "").trim();
  const secretRef = String(aiState.secretRef || "").trim();
  const localModel = String(aiState.localModel || "").trim();
  const remoteRuntimeModel = String(aiState.remoteRuntimeModel || "").trim();
  const localProviderConfig = Boolean(localModel) && ["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(providerId);
  const remoteConfigurableProvider = options.isRemoteConfigurableProvider?.(providerId) === true;
  const authMode = options.authMode || "none";
  const secretReady = options.providerAuthModeRequiresSecret?.(authMode) === true ? Boolean(secretRef) : true;
  const configRunnable = remoteConfigurableProvider
    ? Boolean(endpointUrl && remoteRuntimeModel && secretReady)
    : Boolean(endpointUrl);
  return {
    providerId,
    authMode,
    status: configRunnable ? "enabled" : "disabled",
    secretRef,
    endpointUrl,
    ...(localProviderConfig
      ? {
          runtimeModelMap: Object.fromEntries((options.localModelTiers || []).map((tier) => [`${providerId}:${tier}`, localModel]))
        }
      : {}),
    ...(!localProviderConfig && remoteConfigurableProvider
      ? {
          runtimeModelMap: runtimeModelMapForRemoteModel(providerId, remoteRuntimeModel)
        }
      : {}),
    healthCheck: healthEndpointUrl
      ? {
          enabled: true,
          endpointUrl: healthEndpointUrl,
          method: "GET",
          timeoutMs: 5000,
          expectedStatus: 200,
          intervalSeconds: 300
        }
      : {
          enabled: false,
          endpointUrl: "",
          method: "GET",
          timeoutMs: 5000,
          expectedStatus: 200,
          intervalSeconds: 300
        }
  };
}
