function scope(ai = {}, providerId = "") {
  return JSON.stringify([providerId, ai.providerEndpointUrl || "", ai.remoteRuntimeModel || "", ai.secretRef || ""]);
}

export function setRemoteAiConfigurationConsent(ai, providerId, confirmed) {
  ai.remoteConsentScope = confirmed === true ? scope(ai, providerId) : "";
}

export function remoteAiConfigurationConsented(ai = {}, providerId = "") {
  return Boolean(providerId && ai.remoteConsentScope && ai.remoteConsentScope === scope(ai, providerId));
}
