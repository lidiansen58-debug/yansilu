const EDITABLE_FIELDS = [
  "runtimeMode", "userMode", "modelPack", "localModel", "advancedModelRef",
  "providerEndpointUrl", "providerHealthEndpointUrl", "remoteRuntimeModel",
  "secretRef", "remoteApiKey", "remoteConsentScope", "providerDraftTouched"
];

export function createAiSettingsRefreshGuard(readAiState) {
  const snapshot = () => {
    const ai = readAiState() || {};
    return JSON.stringify(EDITABLE_FIELDS.map(field => ai[field] ?? null));
  };
  let baseline = snapshot();
  return {
    isCurrent: () => baseline === snapshot(),
    canApplyPreferences: () => baseline === snapshot()
      && !Object.values(readAiState()?.providerDraftTouched || {}).some(Boolean),
    capture: () => { baseline = snapshot(); }
  };
}

export async function refreshAiSettingsReadback({
  aiRefresh, settingsState, fetchPreferences, applyPreferences,
  fetchProviderConfigs, applyProviderConfig, persist = () => {}
}) {
  const preferences = await fetchPreferences().catch(() => null);
  if (preferences && aiRefresh.canApplyPreferences()) {
    applyPreferences(preferences);
    aiRefresh.capture();
    persist();
  }
  const configs = await fetchProviderConfigs().catch(() => null);
  if (Array.isArray(configs)) {
    settingsState.ai.providerConfigs = configs;
    if (aiRefresh.isCurrent()) {
      applyProviderConfig();
      aiRefresh.capture();
    }
    persist();
  }
}
