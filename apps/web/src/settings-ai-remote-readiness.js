const LOCAL_PROVIDER_IDS = new Set([
  "local_private_gateway",
  "ollama_local_gateway",
  "minicpm_local_gateway"
]);

function clean(value = "") {
  return String(value || "").trim();
}

export function isRemoteAiProvider(providerId = "") {
  const id = clean(providerId);
  return Boolean(id && !LOCAL_PROVIDER_IDS.has(id));
}

export function remoteTestMatchesAiConfig(ai = {}, providerId = "") {
  if (!isRemoteAiProvider(providerId) || ai.testStatus !== "success") return false;
  return clean(ai.testProviderId) === clean(providerId)
    && clean(ai.testEndpointUrl) === clean(ai.providerEndpointUrl)
    && clean(ai.testRemoteModel) === clean(ai.remoteRuntimeModel)
    && clean(ai.testSecretRef) === clean(ai.secretRef);
}

export function remoteTestFailedForAiConfig(ai = {}, providerId = "") {
  if (!isRemoteAiProvider(providerId) || ai.testStatus !== "failed") return false;
  return clean(ai.testProviderId) === clean(providerId)
    && clean(ai.testEndpointUrl) === clean(ai.providerEndpointUrl)
    && clean(ai.testRemoteModel) === clean(ai.remoteRuntimeModel)
    && clean(ai.testSecretRef) === clean(ai.secretRef);
}

export function remoteHealthBelongsToAiConfig(ai = {}, providerId = "") {
  if (!isRemoteAiProvider(providerId) || !ai.providerHealthResult?.record) return false;
  return clean(ai.providerHealthProviderId) === clean(providerId)
    && clean(ai.providerHealthEndpointUrlSnapshot) === clean(ai.providerEndpointUrl)
    && clean(ai.providerHealthCheckEndpointUrlSnapshot) === clean(ai.providerHealthEndpointUrl)
    && clean(ai.providerHealthRemoteModel) === clean(ai.remoteRuntimeModel)
    && clean(ai.providerHealthSecretRef) === clean(ai.secretRef);
}

export function remoteHealthMatchesAiConfig(ai = {}, providerId = "") {
  return ai.providerHealthResult?.record?.status === "healthy"
    && remoteHealthBelongsToAiConfig(ai, providerId);
}

export function remoteConnectionReadyForProvider(ai = {}, providerId = "") {
  if (remoteTestFailedForAiConfig(ai, providerId)) return false;
  return remoteTestMatchesAiConfig(ai, providerId) || remoteHealthMatchesAiConfig(ai, providerId);
}
