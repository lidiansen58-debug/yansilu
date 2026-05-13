import { resolveAiUserSettings } from "./model-packs.mjs";

const MODEL_TIERS = ["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail", "local_private"];
const USER_MODES = ["Auto", "Economy", "Balanced", "Deep Thinking", "Local / Private"];

function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "route") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase().replace(/[\s/-]+/g, "_");
}

export function normalizeUserMode(value) {
  const key = normalizeKey(value || "Auto");
  const aliases = {
    auto: "Auto",
    economy: "Economy",
    cheap: "Economy",
    low_cost: "Economy",
    balanced: "Balanced",
    standard: "Balanced",
    deep: "Deep Thinking",
    deep_thinking: "Deep Thinking",
    strong: "Deep Thinking",
    local: "Local / Private",
    private: "Local / Private",
    local_private: "Local / Private",
    local_and_private: "Local / Private"
  };
  const mode = aliases[key];
  if (!mode) {
    const error = new Error(`Unsupported AI user mode: ${value}`);
    error.code = "AI_USER_MODE_INVALID";
    throw error;
  }
  return mode;
}

export function normalizeModelTier(value) {
  const tier = normalizeKey(value || "standard");
  if (!MODEL_TIERS.includes(tier)) {
    const error = new Error(`Unsupported model tier: ${value}`);
    error.code = "AI_MODEL_TIER_INVALID";
    throw error;
  }
  return tier;
}

function tierForMode({ requestedTier, userMode, privacyMode }) {
  if (privacyMode === "local_only" || userMode === "Local / Private") return "local_private";
  if (requestedTier === "guardrail") return "guardrail";

  if (userMode === "Economy") {
    if (requestedTier === "strong_reasoning") return "standard";
    if (requestedTier === "standard") return "cheap_fast";
    return requestedTier;
  }

  if (userMode === "Balanced") {
    if (requestedTier === "strong_reasoning") return "standard";
    return requestedTier;
  }

  if (userMode === "Deep Thinking") {
    if (["router_fast", "cheap_fast", "standard", "strong_reasoning"].includes(requestedTier)) return "strong_reasoning";
  }

  return requestedTier;
}

function modelRefForTier(providerDescriptor = {}, tier, override = "") {
  const explicit = cleanText(override);
  if (explicit) return explicit;

  const providerId = cleanText(providerDescriptor.providerId || providerDescriptor.provider_id);
  const modelMap = providerDescriptor.modelMap || providerDescriptor.model_map || {};
  const mapped = cleanText(modelMap[tier]);
  return mapped || `${providerId}:${tier}`;
}

function mergeFallbackPolicy(base = {}, settingsFallbackPolicy = {}) {
  const result = { ...base };
  if (settingsFallbackPolicy.allowSameProviderFallback === false) result.allowSameProviderFallback = false;
  if (settingsFallbackPolicy.allowCrossProviderFallback === false) result.allowCrossProviderFallback = false;
  if (settingsFallbackPolicy.allowCloudFallback === false) result.allowCloudFallback = false;
  if (settingsFallbackPolicy.requiresConfirmationForCloud === true) result.requiresConfirmationForCloud = true;
  if (settingsFallbackPolicy.requiresConfirmationForStrongReasoning === true) result.requiresConfirmationForStrongReasoning = true;
  if (settingsFallbackPolicy.requiresConfirmationForBroadContext === true) result.requiresConfirmationForBroadContext = true;
  if (settingsFallbackPolicy.requiresConfirmationForInternationalFallback === true) result.requiresConfirmationForInternationalFallback = true;
  return result;
}

function fallbackPolicyForMode({ userMode, privacyMode, cloudAllowed, selectedTier, settingsFallbackPolicy }) {
  if (privacyMode === "local_only" || selectedTier === "local_private") {
    return mergeFallbackPolicy({
      allowSameProviderFallback: false,
      allowCrossProviderFallback: false,
      allowCloudFallback: false,
      requiresConfirmationForCloud: true
    }, settingsFallbackPolicy);
  }

  if (userMode === "Economy") {
    return mergeFallbackPolicy({
      allowSameProviderFallback: true,
      allowCrossProviderFallback: cloudAllowed,
      allowCloudFallback: cloudAllowed,
      requiresConfirmationForStrongReasoning: true
    }, settingsFallbackPolicy);
  }

  return mergeFallbackPolicy({
    allowSameProviderFallback: true,
    allowCrossProviderFallback: cloudAllowed,
    allowCloudFallback: cloudAllowed,
    requiresConfirmationForCloud: false
  }, settingsFallbackPolicy);
}

export function resolveModelRoute(input = {}) {
  const agent = input.agent || {};
  const contextPack = input.contextPack || {};
  const providerDescriptor = input.providerDescriptor || input.provider_descriptor || {};
  const userSettings = resolveAiUserSettings(input);
  const userMode = normalizeUserMode(input.userMode || input.user_mode || userSettings.userMode);
  const requestedTier = normalizeModelTier(input.modelTier || input.model_tier || agent.defaultModelTier || "standard");
  const privacyMode = cleanText(contextPack.privacy?.mode || input.privacyMode || input.privacy_mode) || userSettings.privacy.defaultMode || "normal";
  const selectedTier = normalizeModelTier(tierForMode({ requestedTier, userMode, privacyMode }));
  const cloudAllowed =
    userSettings.privacy.allowCloud !== false &&
    contextPack.privacy?.cloudAllowed !== false &&
    privacyMode !== "local_only" &&
    selectedTier !== "local_private";
  const providerId = cleanText(providerDescriptor.providerId || providerDescriptor.provider_id);
  const modelRef = modelRefForTier(providerDescriptor, selectedTier, input.modelRef || input.model_ref);
  const requiredCapabilities = Array.isArray(input.requiredCapabilities || input.required_capabilities || agent.requiredCapabilities)
    ? [...(input.requiredCapabilities || input.required_capabilities || agent.requiredCapabilities)]
    : [];
  const downgradedFrom = selectedTier !== requestedTier && selectedTier !== "strong_reasoning" ? requestedTier : "";
  const escalatedFrom = selectedTier === "strong_reasoning" && requestedTier !== "strong_reasoning" ? requestedTier : "";

  return {
    routeId: cleanText(input.routeId || input.route_id) || generatedId("route"),
    userMode,
    modelPackId: userSettings.modelPackId,
    modelPack: userSettings.modelPack,
    authMode: userSettings.authMode,
    providerPreset: userSettings.providerPreset,
    providerId,
    modelRef,
    requestedTier,
    selectedTier,
    privacyMode,
    cloudAllowed,
    localOnly: selectedTier === "local_private" || privacyMode === "local_only",
    requiredCapabilities,
    fallbackPolicy: fallbackPolicyForMode({
      userMode,
      privacyMode,
      cloudAllowed,
      selectedTier,
      settingsFallbackPolicy: userSettings.fallbackPolicy
    }),
    budget: userSettings.budget,
    noviceProviderDetailsHidden: userSettings.noviceProviderDetailsHidden,
    advancedOverride: Boolean(cleanText(input.modelRef || input.model_ref)),
    confirmationRequired:
      (userMode === "Economy" && requestedTier === "strong_reasoning") ||
      (userMode === "Local / Private" && !providerDescriptor.localExecution),
    downgradedFrom,
    escalatedFrom
  };
}

export function modelTiers() {
  return [...MODEL_TIERS];
}

export function userModes() {
  return [...USER_MODES];
}
