export async function applyAiRuntimeModeChangeForRuntime(nextMode = "auto", deps = {}) {
  const {
    settingsState = { ai: {} },
    normalizeAiRuntimeMode = (value = "auto") => String(value || "auto").trim() || "auto",
    aiDefaultsForRuntimeMode = () => ({}),
    reconcileAiSelectionState = () => {},
    persistAiSettingsToStorage = () => {},
    syncAiSettingsToApi = async () => {},
    isAiLocalFlowActive = () => false,
    shouldUseOllamaLocalRuntime = () => false,
    previewOllamaLocalAiBootstrapFromUi = async () => {},
    localAiPreviewOptionsForAction = (action) => ({ action }),
    refreshAiRoutePreview = async () => {},
    renderSettingsPanel = () => {},
    setStatus = () => {},
    currentAiProviderId = () => "",
    settingsAiAdvancedRuntimeModeLabel = (mode) => mode
  } = deps || {};

  if (!settingsState.ai) settingsState.ai = {};
  const next = normalizeAiRuntimeMode(nextMode || "auto");
  const defaults = aiDefaultsForRuntimeMode(next) || {};
  settingsState.ai.runtimeMode = next;
  settingsState.ai.userMode = defaults.userMode;
  settingsState.ai.modelPack = defaults.modelPack;
  reconcileAiSelectionState({ syncUserMode: true, resetProviderState: true });
  persistAiSettingsToStorage();
  await syncAiSettingsToApi();
  if (isAiLocalFlowActive({
    runtimeMode: settingsState.ai.runtimeMode,
    modelPack: settingsState.ai.modelPack,
    providerId: currentAiProviderId()
  }) && shouldUseOllamaLocalRuntime()) {
    await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("runtime_mode_change"));
  }
  await refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(`AI 浣跨敤鏂瑰紡宸插垏鎹负锛?{settingsAiAdvancedRuntimeModeLabel(settingsState.ai.runtimeMode)}`, "ok");
  return {
    runtimeMode: settingsState.ai.runtimeMode,
    userMode: settingsState.ai.userMode,
    modelPack: settingsState.ai.modelPack
  };
}
