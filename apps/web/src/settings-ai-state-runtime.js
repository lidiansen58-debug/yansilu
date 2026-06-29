export function createSettingsAiStateRuntime(deps = {}) {
  const {
    applyAiPreferencesToSettingsState,
    activeAiProviderConfig,
    applyOllamaLocalModelDefaults,
    clearLocalOllamaSelectionState,
    currentAiProviderId,
    currentOllamaModelTiers,
    defaultProviderEndpointUrl,
    defaultProviderHealthEndpointUrl,
    enabledProviderHealthEndpointUrl,
    isRemoteConfigurableProviderId,
    modelNameExistsInList,
    normalizeOllamaSetupGuide,
    persistAiSettingsToStorage,
    remoteRuntimeModelFromMap,
    selectedLocalModelNameForInstalledModels,
    settingsState,
    upsertAiProviderConfig
  } = deps;

  function applyActiveAiProviderConfigToState() {
    const providerId = currentAiProviderId();
    const config = activeAiProviderConfig();
    const draftTouched = settingsState.ai.providerDraftTouched || {};
    if (!config) {
      const endpointUrl = defaultProviderEndpointUrl(providerId);
      const healthEndpointUrl = defaultProviderHealthEndpointUrl(providerId, endpointUrl);
      if (endpointUrl) settingsState.ai.providerEndpointUrl = endpointUrl;
      if (healthEndpointUrl) settingsState.ai.providerHealthEndpointUrl = healthEndpointUrl;
      if (!isRemoteConfigurableProviderId(providerId)) settingsState.ai.remoteRuntimeModel = "";
      return;
    }
    const configuredEndpointUrl = String(config.endpointUrl || config.endpoint_url || "").trim();
    const configuredHealthEndpointUrl = enabledProviderHealthEndpointUrl(config);
    const configuredSecretRef = String(config.secretRef || config.secret_ref || "").trim();
    if (!draftTouched.providerEndpointUrl && !settingsState.ai.providerEndpointUrl && configuredEndpointUrl) {
      settingsState.ai.providerEndpointUrl = configuredEndpointUrl;
    }
    if (!draftTouched.providerHealthEndpointUrl && !settingsState.ai.providerHealthEndpointUrl && configuredHealthEndpointUrl) {
      settingsState.ai.providerHealthEndpointUrl = configuredHealthEndpointUrl;
    }
    if (!draftTouched.secretRef && !settingsState.ai.secretRef && configuredSecretRef) {
      settingsState.ai.secretRef = configuredSecretRef;
    }
    if (isRemoteConfigurableProviderId(providerId)) {
      const configuredRemoteModel = remoteRuntimeModelFromMap(
        providerId,
        config.runtimeModelMap || config.runtime_model_map || {}
      );
      if (!draftTouched.remoteRuntimeModel && !settingsState.ai.remoteRuntimeModel && configuredRemoteModel) {
        settingsState.ai.remoteRuntimeModel = configuredRemoteModel;
      }
    } else {
      settingsState.ai.remoteRuntimeModel = "";
    }
  }

  function applyOllamaRuntimePreview(runtime = null) {
    const models = Array.isArray(runtime?.models) ? runtime.models : [];
    settingsState.ai.localRuntimeStatus = String(runtime?.status || "unknown");
    settingsState.ai.localRuntimeReadinessStatus = String(runtime?.readinessStatus || runtime?.readiness_status || "unknown").trim() || "unknown";
    settingsState.ai.localRuntimeApiReachable = runtime?.apiReachable === true || runtime?.api_reachable === true;
    settingsState.ai.localRuntimeDefaultModelInstalled = runtime?.defaultModelInstalled === true || runtime?.default_model_installed === true;
    settingsState.ai.localRuntimeModels = models;
    settingsState.ai.localRuntimeModelTiers = Array.isArray(runtime?.modelTiers || runtime?.model_tiers)
      ? (runtime.modelTiers || runtime.model_tiers)
      : settingsState.ai.localRuntimeModelTiers;
    settingsState.ai.localRuntimeSetupGuide = normalizeOllamaSetupGuide(runtime?.setupGuide || runtime?.setup_guide);
    settingsState.ai.localRuntimeChatEndpointUrl = String(runtime?.chatEndpointUrl || runtime?.chat_endpoint_url || settingsState.ai.localRuntimeChatEndpointUrl || "").trim();
    settingsState.ai.localRuntimeHealthEndpointUrl = String(runtime?.healthEndpointUrl || runtime?.health_endpoint_url || settingsState.ai.localRuntimeHealthEndpointUrl || "").trim();
    settingsState.ai.localRuntimeError = settingsState.ai.localRuntimeStatus === "available" ? "" : String(runtime?.message || "");
    if (settingsState.ai.localRuntimeStatus === "available") {
      settingsState.ai.localRuntimeManagedStopPending = false;
      const nextLocalModel = selectedLocalModelNameForInstalledModels(settingsState.ai.localModel, models, currentOllamaModelTiers());
      settingsState.ai.localModel = nextLocalModel;
      if (!nextLocalModel) clearLocalOllamaSelectionState();
    }
    if (settingsState.ai.localModel) applyOllamaLocalModelDefaults();
    persistAiSettingsToStorage();
    return models;
  }

  function applyOllamaBootstrapResult(result = null) {
    if (!result || typeof result !== "object") return [];
    const runtime = result.runtime || null;
    const models = runtime ? applyOllamaRuntimePreview(runtime) : [];
    if (result.enabled?.preferences) {
      applyAiPreferencesToSettingsState(result.enabled.preferences, {
        applyProviderConfig: false
      });
    }
    if (result.enabled?.providerConfig) upsertAiProviderConfig(result.enabled.providerConfig);
    if (result.providerConfig) upsertAiProviderConfig(result.providerConfig);
    if (result.health && String(result.health.status || "").trim() !== "unknown") {
      settingsState.ai.providerHealthResult = { record: result.health };
    }
    const model = String(result.model || "").trim();
    if (model && modelNameExistsInList(model, settingsState.ai.localRuntimeModels)) {
      settingsState.ai.localModel = model;
      applyOllamaLocalModelDefaults();
    }
    persistAiSettingsToStorage();
    return models;
  }

  return {
    applyActiveAiProviderConfigToState,
    applyOllamaRuntimePreview,
    applyOllamaBootstrapResult
  };
}
