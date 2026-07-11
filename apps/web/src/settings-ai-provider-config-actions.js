import {
  defaultProviderEndpointUrl,
  defaultProviderHealthEndpointUrl,
  runtimeModelMapForRemoteModel
} from "./prototype-ai-settings-controller.js";
import {
  normalizeOpenAiCompatibleBaseUrl,
  remoteDeletedSecretsForPayload,
  remoteSecretRefForState,
  remoteSecretsForPayload
} from "./ai-settings-remote-config-model.js";

export function buildAiProviderConfigPayload(aiState = {}, options = {}) {
  const providerId = String(options.providerId || "").trim();
  const remoteConfigurableProvider = options.isRemoteConfigurableProvider?.(providerId) === true;
  const rawEndpointUrl = String(aiState.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
  const endpointUrl = remoteConfigurableProvider
    ? normalizeOpenAiCompatibleBaseUrl(rawEndpointUrl)
    : rawEndpointUrl;
  const healthEndpointUrl = String(aiState.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || "").trim();
  const secretRef = remoteConfigurableProvider
    ? remoteSecretRefForState(aiState)
    : String(aiState.secretRef || "").trim();
  const localModel = String(aiState.localModel || "").trim();
  const remoteRuntimeModel = String(aiState.remoteRuntimeModel || "").trim();
  const localProviderConfig = Boolean(localModel) && ["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(providerId);
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
    ...(remoteConfigurableProvider && Object.keys(remoteSecretsForPayload(aiState)).length
      ? { secrets: remoteSecretsForPayload(aiState) }
      : {}),
    ...(remoteConfigurableProvider && remoteDeletedSecretsForPayload(aiState).length
      ? { deleteSecrets: remoteDeletedSecretsForPayload(aiState) }
      : {}),
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
