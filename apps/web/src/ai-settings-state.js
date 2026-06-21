const LOCAL_MODEL_PACK_KEYS = new Set(["privacy", "privacy_first", "ollama", "ollama_local", "minicpm", "minicpm_local"]);
const LOCAL_PROVIDER_IDS = new Set(["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"]);
const MODEL_PACK_PROVIDER_PRESETS = {
  low_cost: "openai_compatible_gateway",
  low_cost_research: "openai_compatible_gateway",
  global: "openai_compatible_gateway",
  global_optimized: "openai_compatible_gateway",
  china: "china_optimized_gateway",
  china_optimized: "china_optimized_gateway",
  privacy: "local_private_gateway",
  privacy_first: "local_private_gateway",
  ollama: "ollama_local_gateway",
  ollama_local: "ollama_local_gateway",
  minicpm: "minicpm_local_gateway",
  minicpm_local: "minicpm_local_gateway",
  minicpm_remote: "minicpm_remote_gateway",
  minicpm_third_party: "minicpm_remote_gateway"
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
  return LOCAL_MODEL_PACK_KEYS.has(normalizedModelPackKey(modelPack));
}

export function isLocalProviderId(providerId = "") {
  return LOCAL_PROVIDER_IDS.has(String(providerId || "").trim());
}

function normalizedModelPackKey(modelPack = "") {
  return String(modelPack || "").trim().toLowerCase().replace(/[\s/-]+/g, "_");
}

export function providerPresetForModelPack(modelPack = "") {
  return MODEL_PACK_PROVIDER_PRESETS[normalizedModelPackKey(modelPack)] || "platform_managed_openai";
}

export function localProviderPresetForModelPack(modelPack = "") {
  const providerId = providerPresetForModelPack(modelPack);
  return isLocalProviderId(providerId) ? providerId : "";
}

export function supportedAiSettingsModelPack(modelPack = "") {
  const localProviderPreset = localProviderPresetForModelPack(modelPack);
  if (localProviderPreset === "minicpm_local_gateway") return "Starter Auto";
  return String(modelPack || "").trim();
}

export function shouldUseOllamaLocalRuntimeForSelection(input = {}) {
  const runtimeMode = normalizeAiRuntimeMode(input.runtimeMode || input.runtime_mode);
  const advancedSettings = input.advancedSettings || input.advanced_settings || {};
  const providerId = String(
    input.providerPreset ||
      input.provider_preset ||
      input.localProviderPreset ||
      input.local_provider_preset ||
      advancedSettings.localProviderPreset ||
      advancedSettings.local_provider_preset ||
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
