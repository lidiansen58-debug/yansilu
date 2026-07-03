const LOCAL_AI_SETUP_SELECTION_KEYS = Object.freeze([
  "runtimeMode",
  "modelPack",
  "userMode",
  "advancedModelRef",
  "secretRef",
  "providerEndpointUrl",
  "providerHealthEndpointUrl",
  "remoteRuntimeModel",
  "localModel",
  "routePreview",
  "localAiSetupSyncPending"
]);

function localAiSetupSelectionSnapshot(aiState = {}) {
  const snapshot = {};
  for (const key of LOCAL_AI_SETUP_SELECTION_KEYS) {
    snapshot[key] = aiState[key];
  }
  snapshot.providerDraftTouched = { ...(aiState.providerDraftTouched || {}) };
  return snapshot;
}

function restoreLocalAiSetupSelection(aiState = {}, snapshot = {}) {
  for (const key of LOCAL_AI_SETUP_SELECTION_KEYS) {
    aiState[key] = snapshot[key];
  }
  aiState.providerDraftTouched = { ...(snapshot.providerDraftTouched || {}) };
}

export async function activateLocalAiSetupSelection(deps = {}) {
  const {
    aiState = {},
    restoreOnFailure = true,
    reconcileAiSelectionState = () => {},
    persistAiSettingsToStorage = () => {},
    syncAiSettingsToApi = async () => false
  } = deps;
  const previousSelection = localAiSetupSelectionSnapshot(aiState);
  aiState.runtimeMode = "local_only";
  aiState.modelPack = "Ollama Local";
  aiState.userMode = "Local / Private";
  reconcileAiSelectionState({ syncUserMode: true, resetProviderState: true });
  aiState.localAiSetupSyncPending = true;
  persistAiSettingsToStorage();
  try {
    if (await syncAiSettingsToApi()) {
      aiState.localAiSetupSyncPending = false;
      persistAiSettingsToStorage();
      return true;
    }
  } catch {
    // Restore below so the next AI click cannot bypass the setup gate with stale server settings.
  }
  if (!restoreOnFailure) return false;
  restoreLocalAiSetupSelection(aiState, previousSelection);
  persistAiSettingsToStorage();
  return false;
}
