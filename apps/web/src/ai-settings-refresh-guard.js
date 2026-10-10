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
  const [preferences, configs] = await Promise.all([
    fetchPreferences().catch(() => null), fetchProviderConfigs().catch(() => null)
  ]);
  if (preferences && Array.isArray(configs) && aiRefresh.canApplyPreferences()) {
    applyPreferences(preferences);
    aiRefresh.capture();
    persist();
  }
  if (Array.isArray(configs)) {
    settingsState.ai.providerConfigs = configs;
    if (aiRefresh.isCurrent()) {
      applyProviderConfig();
      aiRefresh.capture();
    }
    persist();
  }
}
