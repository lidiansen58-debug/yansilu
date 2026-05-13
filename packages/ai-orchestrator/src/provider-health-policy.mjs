import { normalizeProviderDescriptor } from "./provider-adapter.mjs";

export const PROVIDER_HEALTH_STATUSES = ["healthy", "degraded", "down", "unknown"];
export const PROVIDER_HEALTH_TRIGGER_TYPES = ["user_command", "background_task", "scheduled_task"];

function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "health") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeHealthStatus(value = "unknown") {
  const status = cleanText(value).toLowerCase();
  return PROVIDER_HEALTH_STATUSES.includes(status) ? status : "unknown";
}

function normalizeTrigger(value = "user_command") {
  const trigger = cleanText(value) || "user_command";
  return PROVIDER_HEALTH_TRIGGER_TYPES.includes(trigger) ? trigger : "user_command";
}

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function providerIdOf(input = {}) {
  return cleanText(input.providerId || input.provider_id || input.descriptor?.providerId || input.descriptor?.provider_id);
}

function capabilityKey(value = "") {
  return cleanText(value).replace(/^supports_/, "");
}

function capabilitySupports(candidate = {}, requiredCapability = "") {
  const key = capabilityKey(requiredCapability);
  const value = cleanText(candidate.capabilities?.[key]).toLowerCase();
  return value !== "no";
}

function providerModelRefForTier(candidate = {}, tier = "") {
  return cleanText(candidate.modelRef || candidate.model_ref || candidate.modelMap?.[tier] || candidate.model_map?.[tier]);
}

function healthScore(health = {}) {
  if (health.status === "healthy") return 0;
  if (health.status === "unknown") return 25;
  if (health.status === "degraded") return 50 + Math.min(Math.floor(numberOr(health.latencyMs, 0) / 1000), 10);
  return 10000;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export function normalizeProviderHealth(input = {}, fallbackProviderId = "") {
  return {
    providerId: providerIdOf(input) || cleanText(fallbackProviderId),
    status: normalizeHealthStatus(input.status),
    latencyMs: numberOr(input.latencyMs ?? input.latency_ms, 0),
    checkedAt: cleanText(input.checkedAt || input.checked_at) || new Date().toISOString(),
    message: cleanText(input.message),
    errorType: cleanText(input.errorType || input.error_type),
    retryable: input.retryable === true,
    healthCheckId: cleanText(input.healthCheckId || input.health_check_id) || generatedId("provider_health")
  };
}

export function normalizeProviderCandidate(input = {}) {
  const descriptorInput = input.providerDescriptor || input.provider_descriptor || input.descriptor || input;
  const descriptor = normalizeProviderDescriptor(descriptorInput);
  return {
    providerId: descriptor.providerId,
    displayName: descriptor.displayName,
    adapterType: descriptor.adapterType,
    status: descriptor.status,
    authMode: descriptor.authMode,
    localExecution: descriptor.localExecution === true,
    regions: [...(descriptor.regions || [])],
    capabilities: { ...(descriptor.capabilities || {}) },
    modelMap: { ...(descriptor.modelMap || {}) },
    modelRef: cleanText(input.modelRef || input.model_ref),
    source: cleanText(input.source),
    priority: numberOr(input.priority, 100),
    health: normalizeProviderHealth(input.health || input.providerHealth || input.provider_health || {}, descriptor.providerId)
  };
}

function fallbackPolicyValue(policy = {}, camelKey = "", snakeKey = "", fallback = false) {
  if (policy[camelKey] !== undefined) return policy[camelKey] === true;
  if (policy[snakeKey] !== undefined) return policy[snakeKey] === true;
  return fallback;
}

function routeFallbackPolicy(route = {}, override = {}) {
  const policy = { ...(route.fallbackPolicy || route.fallback_policy || {}), ...(override || {}) };
  return {
    allowSameProviderFallback: fallbackPolicyValue(policy, "allowSameProviderFallback", "allow_same_provider_fallback", false),
    allowCrossProviderFallback: fallbackPolicyValue(policy, "allowCrossProviderFallback", "allow_cross_provider_fallback", false),
    allowCloudFallback: fallbackPolicyValue(policy, "allowCloudFallback", "allow_cloud_fallback", false),
    requiresConfirmationForCloud: fallbackPolicyValue(policy, "requiresConfirmationForCloud", "requires_confirmation_for_cloud", false),
    requiresConfirmationForInternationalFallback: fallbackPolicyValue(
      policy,
      "requiresConfirmationForInternationalFallback",
      "requires_confirmation_for_international_fallback",
      false
    )
  };
}

function isPrimaryCandidate(candidate = {}, route = {}) {
  if (candidate.providerId !== cleanText(route.providerId || route.provider_id)) return false;
  const tier = cleanText(route.selectedTier || route.selected_tier || route.modelTier || route.model_tier) || "standard";
  const candidateModelRef = providerModelRefForTier(candidate, tier);
  const routeModelRef = cleanText(route.modelRef || route.model_ref);
  return !candidateModelRef || !routeModelRef || candidateModelRef === routeModelRef;
}

function evaluateCandidate(candidate = {}, route = {}, options = {}) {
  const selectedTier = cleanText(route.selectedTier || route.selected_tier || route.modelTier || route.model_tier) || "standard";
  const requiredCapabilities = Array.isArray(route.requiredCapabilities || route.required_capabilities)
    ? route.requiredCapabilities || route.required_capabilities
    : [];
  const fallbackPolicy = routeFallbackPolicy(route, options.fallbackPolicy || options.fallback_policy || {});
  const trigger = normalizeTrigger(options.trigger || route.trigger);
  const localOnly = route.localOnly === true || route.local_only === true || cleanText(route.privacyMode || route.privacy_mode) === "local_only";
  const cloudAllowed = route.cloudAllowed !== false && route.cloud_allowed !== false && !localOnly;
  const primary = isPrimaryCandidate(candidate, route);
  const reasons = [];

  if (localOnly && !candidate.localExecution) reasons.push("privacy_blocks_cloud");
  if (!localOnly && !candidate.localExecution && !cloudAllowed) reasons.push("cloud_not_allowed");

  const fallbackKind = primary ? "primary" : candidate.providerId === cleanText(route.providerId || route.provider_id) ? "same_provider" : "cross_provider";
  if (!primary && fallbackKind === "same_provider" && fallbackPolicy.allowSameProviderFallback !== true) reasons.push("same_provider_fallback_disabled");
  if (!primary && fallbackKind === "cross_provider") {
    if (fallbackPolicy.allowCrossProviderFallback !== true) reasons.push("cross_provider_fallback_disabled");
    if (!candidate.localExecution && fallbackPolicy.allowCloudFallback !== true) reasons.push("cloud_fallback_disabled");
  }

  const modelRef = providerModelRefForTier(candidate, selectedTier);
  if (!modelRef) reasons.push("model_tier_unavailable");

  for (const capability of requiredCapabilities) {
    if (!capabilitySupports(candidate, capability)) reasons.push(`capability_missing:${capabilityKey(capability)}`);
  }

  if (candidate.health.status === "down") reasons.push(trigger === "scheduled_task" ? "provider_down_for_scheduled_task" : "provider_down");

  const confirmationRequired =
    !primary &&
    !candidate.localExecution &&
    (fallbackPolicy.requiresConfirmationForCloud === true || fallbackPolicy.requiresConfirmationForInternationalFallback === true);

  return {
    providerId: candidate.providerId,
    modelRef,
    fallbackKind,
    healthStatus: candidate.health.status,
    health: clone(candidate.health),
    eligible: reasons.length === 0,
    confirmationRequired,
    score: candidate.priority + healthScore(candidate.health) + (fallbackKind === "primary" ? 0 : fallbackKind === "same_provider" ? 5 : 10),
    reasons
  };
}

function primaryHealthReason(primaryEvaluation = null) {
  if (!primaryEvaluation) return "primary_unavailable";
  if (primaryEvaluation.healthStatus === "down") return "provider_down";
  if (primaryEvaluation.healthStatus === "degraded") return "provider_degraded";
  if (primaryEvaluation.reasons.includes("provider_down_for_scheduled_task")) return "provider_down";
  if (primaryEvaluation.reasons.includes("privacy_blocks_cloud")) return "privacy_blocks_cloud";
  return "provider_unavailable";
}

function isInteractiveTrigger(trigger = "") {
  return normalizeTrigger(trigger) === "user_command";
}

export function selectProviderForRoute(input = {}) {
  const route = input.route || input.modelRoute || input.model_route || {};
  const trigger = normalizeTrigger(input.trigger || route.trigger);
  const primaryInput = input.primaryProvider || input.primary_provider;
  const fallbackInput = input.candidates || input.providerCandidates || input.provider_candidates;
  const primaryCandidates = Array.isArray(primaryInput) ? primaryInput : [primaryInput].filter(Boolean);
  const fallbackCandidates = Array.isArray(fallbackInput) ? fallbackInput : [fallbackInput].filter(Boolean);
  const candidatesInput = [...primaryCandidates, ...fallbackCandidates];
  const seen = new Set();
  const candidates = candidatesInput
    .map(normalizeProviderCandidate)
    .filter((candidate) => {
      const key = `${candidate.providerId}:${providerModelRefForTier(candidate, cleanText(route.selectedTier || route.selected_tier || "standard")) || "*"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const evaluations = candidates.map((candidate) => evaluateCandidate(candidate, route, { ...input, trigger }));
  const primaryProviderId = cleanText(route.providerId || route.provider_id);
  const primaryEvaluation = evaluations.find((candidate) => candidate.providerId === primaryProviderId) || null;
  const eligible = evaluations.filter((candidate) => candidate.eligible).sort((a, b) => a.score - b.score);
  const best = eligible[0] || null;

  if (primaryEvaluation?.eligible && primaryEvaluation.healthStatus !== "degraded") {
    return {
      action: "use_primary",
      fallbackUsed: false,
      fallbackReason: "none",
      confirmationRequired: false,
      trigger,
      selectedProviderId: primaryEvaluation.providerId,
      selectedModelRef: primaryEvaluation.modelRef,
      primaryProviderId,
      evaluations
    };
  }

  if (primaryEvaluation?.eligible && primaryEvaluation.healthStatus === "degraded" && (!best || best.providerId === primaryEvaluation.providerId)) {
    return {
      action: trigger === "scheduled_task" ? "use_degraded_primary" : "use_primary",
      fallbackUsed: false,
      fallbackReason: "provider_degraded",
      confirmationRequired: false,
      trigger,
      selectedProviderId: primaryEvaluation.providerId,
      selectedModelRef: primaryEvaluation.modelRef,
      primaryProviderId,
      evaluations
    };
  }

  if (best) {
    if (best.confirmationRequired) {
      return {
        action: isInteractiveTrigger(trigger) ? "requires_confirmation" : "skip_scheduled",
        fallbackUsed: false,
        fallbackReason: primaryHealthReason(primaryEvaluation),
        confirmationRequired: true,
        trigger,
        selectedProviderId: best.providerId,
        selectedModelRef: best.modelRef,
        primaryProviderId,
        evaluations
      };
    }

    return {
      action: "fallback",
      fallbackUsed: true,
      fallbackReason: primaryHealthReason(primaryEvaluation),
      confirmationRequired: false,
      trigger,
      selectedProviderId: best.providerId,
      selectedModelRef: best.modelRef,
      primaryProviderId,
      evaluations
    };
  }

  return {
    action: trigger === "scheduled_task" ? "skip_scheduled" : "fail",
    fallbackUsed: false,
    fallbackReason: primaryHealthReason(primaryEvaluation),
    confirmationRequired: false,
    trigger,
    selectedProviderId: "",
    selectedModelRef: "",
    primaryProviderId,
    evaluations
  };
}

export function providerHealthSummary(selection = {}) {
  return {
    action: cleanText(selection.action),
    fallbackUsed: selection.fallbackUsed === true,
    fallbackReason: cleanText(selection.fallbackReason),
    confirmationRequired: selection.confirmationRequired === true,
    selectedProviderId: cleanText(selection.selectedProviderId),
    selectedModelRef: cleanText(selection.selectedModelRef),
    primaryProviderId: cleanText(selection.primaryProviderId),
    trigger: cleanText(selection.trigger)
  };
}
