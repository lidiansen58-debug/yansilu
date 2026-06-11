const LOCAL_MODEL_PACKS = new Set(["Privacy First", "Ollama Local", "MiniCPM Local"]);
const LOCAL_PROVIDER_IDS = new Set(["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"]);
const MODEL_PACK_PROVIDER_PRESETS = {
  "Low Cost Research": "openai_compatible_gateway",
  "Global Optimized": "openai_compatible_gateway",
  "China Optimized": "china_optimized_gateway",
  "Privacy First": "local_private_gateway",
  "Ollama Local": "ollama_local_gateway",
  "MiniCPM Local": "minicpm_local_gateway",
  "MiniCPM Remote": "minicpm_remote_gateway"
};
export const DEFAULT_AI_SETTINGS_SELECTION = Object.freeze({
  runtimeMode: "auto",
  userMode: "Auto",
  modelPack: "Starter Auto",
  localModel: "",
  advancedModelRef: "",
  secretRef: ""
});

export function normalizeAiRuntimeMode(value = "") {
  const mode = String(value || "").trim().toLowerCase().replace(/[\s/-]+/g, "_");
  if (["local", "local_only", "private"].includes(mode)) return "local_only";
  if (["cloud", "cloud_only", "remote"].includes(mode)) return "cloud_only";
  if (["hybrid", "mixed", "local_cloud"].includes(mode)) return "hybrid";
  return "auto";
}

export function isLocalModelPack(modelPack = "") {
  return LOCAL_MODEL_PACKS.has(String(modelPack || "").trim());
}

export function isLocalProviderId(providerId = "") {
  return LOCAL_PROVIDER_IDS.has(String(providerId || "").trim());
}

export function providerPresetForModelPack(modelPack = "") {
  return MODEL_PACK_PROVIDER_PRESETS[String(modelPack || "").trim()] || "platform_managed_openai";
}

export function localProviderPresetForModelPack(modelPack = "") {
  const providerId = providerPresetForModelPack(modelPack);
  return isLocalProviderId(providerId) ? providerId : "";
}

export function shouldUseOllamaLocalRuntimeForSelection(input = {}) {
  const runtimeMode = normalizeAiRuntimeMode(input.runtimeMode || input.runtime_mode);
  const providerId = String(
    input.providerPreset ||
      input.provider_preset ||
      localProviderPresetForModelPack(input.modelPack || input.model_pack) ||
      ""
  ).trim();
  if (providerId === "ollama_local_gateway") return true;
  return providerId === "local_private_gateway" && ["local_only", "hybrid"].includes(runtimeMode);
}

function defaultModelPackForRuntimeMode(runtimeMode = "auto") {
  const mode = normalizeAiRuntimeMode(runtimeMode);
  if (mode === "local_only") return "Privacy First";
  return "Starter Auto";
}

function defaultUserModeForSelection({ runtimeMode = "auto", modelPack = "" } = {}) {
  if (isLocalModelPack(modelPack) || normalizeAiRuntimeMode(runtimeMode) === "local_only") return "Local / Private";
  if (normalizeAiRuntimeMode(runtimeMode) === "cloud_only") return "Balanced";
  return "Auto";
}

export function canonicalizeAiSettingsSelection(input = {}, options = {}) {
  let runtimeMode = normalizeAiRuntimeMode(input.runtimeMode);
  let modelPack = String(input.modelPack || "").trim() || defaultModelPackForRuntimeMode(runtimeMode);
  const requestedModelPack = modelPack;
  const syncUserMode = options.syncUserMode === true;

  if (runtimeMode === "local_only" && !isLocalModelPack(modelPack)) {
    modelPack = "Privacy First";
  } else if (["hybrid", "cloud_only"].includes(runtimeMode) && isLocalModelPack(modelPack)) {
    modelPack = "Starter Auto";
  } else if (runtimeMode === "auto" && isLocalModelPack(modelPack)) {
    runtimeMode = "local_only";
  }

  if (!modelPack) modelPack = defaultModelPackForRuntimeMode(runtimeMode);

  const derivedProviderPreset = providerPresetForModelPack(modelPack);
  const explicitProviderPreset = String(input.providerPreset || input.provider_preset || "").trim();
  const providerPreset = explicitProviderPreset && modelPack === requestedModelPack
    ? explicitProviderPreset
    : derivedProviderPreset;
  const userMode = syncUserMode
    ? defaultUserModeForSelection({ runtimeMode, modelPack })
    : String(input.userMode || "").trim() || defaultUserModeForSelection({ runtimeMode, modelPack });

  return {
    runtimeMode,
    modelPack,
    userMode,
    providerPreset,
    localFlowActive:
      runtimeMode === "local_only" ||
      runtimeMode === "hybrid" ||
      isLocalModelPack(modelPack) ||
      isLocalProviderId(providerPreset)
  };
}

export function isAiLocalFlowActive(input = {}) {
  return canonicalizeAiSettingsSelection(input).localFlowActive;
}

export function aiSettingsSelectionFromPreferences(preferences = null) {
  const prefs = preferences || {};
  const advancedSettings = prefs.advancedSettings || prefs.advanced_settings || {};
  const selection = canonicalizeAiSettingsSelection({
    runtimeMode: advancedSettings.runtimeMode || advancedSettings.runtime_mode || DEFAULT_AI_SETTINGS_SELECTION.runtimeMode,
    modelPack: prefs.modelPack || prefs.model_pack || DEFAULT_AI_SETTINGS_SELECTION.modelPack,
    userMode: prefs.userMode || prefs.user_mode || DEFAULT_AI_SETTINGS_SELECTION.userMode
  });

  return {
    ...selection,
    localModel: String(advancedSettings.localModel || advancedSettings.local_model || "").trim(),
    advancedModelRef: String(advancedSettings.modelRef || advancedSettings.model_ref || "").trim(),
    secretRef: String(advancedSettings.secretRef || advancedSettings.secret_ref || "").trim()
  };
}
