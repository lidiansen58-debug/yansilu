const LOCAL_MODEL_PACKS = new Set(["Privacy First", "Ollama Local", "MiniCPM Local"]);
const LOCAL_PROVIDER_IDS = new Set(["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"]);

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

export function localProviderPresetForModelPack(modelPack = "") {
  const pack = String(modelPack || "").trim();
  if (pack === "Ollama Local") return "ollama_local_gateway";
  if (pack === "MiniCPM Local") return "minicpm_local_gateway";
  if (pack === "Privacy First") return "local_private_gateway";
  return "";
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
  const syncUserMode = options.syncUserMode === true;

  if (runtimeMode === "local_only" && !isLocalModelPack(modelPack)) {
    modelPack = "Privacy First";
  } else if (["hybrid", "cloud_only"].includes(runtimeMode) && isLocalModelPack(modelPack)) {
    modelPack = "Starter Auto";
  } else if (runtimeMode === "auto" && isLocalModelPack(modelPack)) {
    runtimeMode = "local_only";
  }

  if (!modelPack) modelPack = defaultModelPackForRuntimeMode(runtimeMode);

  const providerPreset =
    String(input.providerPreset || "").trim() ||
    localProviderPresetForModelPack(modelPack) ||
    "platform_managed_openai";
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
