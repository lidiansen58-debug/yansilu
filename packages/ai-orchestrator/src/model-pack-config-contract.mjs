import { listModelPacks } from "./model-packs.mjs";
import { listProviderPresets } from "./provider-presets.mjs";

export const MODEL_PACK_CONFIG_VERSION = "model_pack_config.v1";

export const MODEL_PACK_USER_MODES = ["Auto", "Economy", "Balanced", "Deep Thinking", "Local / Private"];
export const MODEL_PACK_TIERS = ["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail", "local_private"];
export const MODEL_PACK_AUTH_MODES = ["platform_managed", "workspace_managed", "byok_advanced", "local_no_key", "enterprise_secret"];
export const MODEL_PACK_PROVIDER_VISIBILITIES = ["hidden", "advanced", "admin"];
export const MODEL_PACK_ADAPTER_TYPES = ["direct_provider", "aggregated_gateway", "self_hosted_gateway", "local_gateway"];
export const MODEL_PACK_STATUSES = ["enabled", "disabled", "experimental", "deprecated"];

const DEFAULT_FALLBACK_POLICY = {
  allow_same_provider_fallback: false,
  allow_cross_provider_fallback: false,
  allow_cloud_fallback: false,
  allow_cloud_fallback_for_private: false,
  requires_confirmation_for_cloud: false,
  requires_confirmation_for_strong_reasoning: false,
  requires_confirmation_for_broad_context: false,
  requires_confirmation_for_international_fallback: false
};

function cleanText(value) {
  return String(value || "").trim();
}

function toSnakeFallbackPolicy(input = {}) {
  return {
    ...DEFAULT_FALLBACK_POLICY,
    allow_same_provider_fallback: input.allowSameProviderFallback === true || input.allow_same_provider_fallback === true,
    allow_cross_provider_fallback: input.allowCrossProviderFallback === true || input.allow_cross_provider_fallback === true,
    allow_cloud_fallback: input.allowCloudFallback === true || input.allow_cloud_fallback === true,
    allow_cloud_fallback_for_private: input.allowCloudFallbackForPrivate === true || input.allow_cloud_fallback_for_private === true,
    requires_confirmation_for_cloud: input.requiresConfirmationForCloud === true || input.requires_confirmation_for_cloud === true,
    requires_confirmation_for_strong_reasoning:
      input.requiresConfirmationForStrongReasoning === true || input.requires_confirmation_for_strong_reasoning === true,
    requires_confirmation_for_broad_context:
      input.requiresConfirmationForBroadContext === true || input.requires_confirmation_for_broad_context === true,
    requires_confirmation_for_international_fallback:
      input.requiresConfirmationForInternationalFallback === true || input.requires_confirmation_for_international_fallback === true
  };
}

function toSnakeBudget(input = {}) {
  return {
    monthly_limit: Number(input.monthlyLimit ?? input.monthly_limit ?? 0),
    confirmation_threshold_per_run: Number(input.confirmationThresholdPerRun ?? input.confirmation_threshold_per_run ?? 0),
    scheduled_task_hard_cap: Number(input.scheduledTaskHardCap ?? input.scheduled_task_hard_cap ?? 0),
    currency: cleanText(input.currency) || "USD"
  };
}

function toSnakePrivacy(input = {}) {
  return {
    default_mode: cleanText(input.defaultMode || input.default_mode) || "normal",
    allow_cloud: input.allowCloud !== false && input.allow_cloud !== false,
    local_preferred: input.localPreferred === true || input.local_preferred === true
  };
}

export function toModelPackConfig(input = {}) {
  return {
    model_pack_id: cleanText(input.modelPackId || input.model_pack_id),
    model_pack: cleanText(input.modelPack || input.model_pack),
    description: cleanText(input.description),
    default_user_mode: cleanText(input.defaultUserMode || input.default_user_mode),
    provider_preset: cleanText(input.providerPreset || input.provider_preset),
    auth_mode: cleanText(input.authMode || input.auth_mode),
    provider_visibility: cleanText(input.providerVisibility || input.provider_visibility),
    byok_required: input.byokRequired === true || input.byok_required === true,
    fallback_policy: toSnakeFallbackPolicy(input.fallbackPolicy || input.fallback_policy || {}),
    budget: toSnakeBudget(input.budget || {}),
    privacy: toSnakePrivacy(input.privacy || {})
  };
}

export function toProviderPresetConfig(input = {}) {
  return {
    provider_preset: cleanText(input.providerPreset || input.provider_preset || input.providerId || input.provider_id),
    provider_id: cleanText(input.providerId || input.provider_id),
    display_name: cleanText(input.displayName || input.display_name),
    adapter_type: cleanText(input.adapterType || input.adapter_type),
    status: cleanText(input.status),
    auth_modes: Array.isArray(input.authModes || input.auth_modes) ? [...(input.authModes || input.auth_modes)] : [],
    regions: Array.isArray(input.regions) ? [...input.regions] : [],
    novice_visible: input.noviceVisible === true || input.novice_visible === true,
    local_execution: input.localExecution === true || input.local_execution === true,
    capabilities: { ...(input.capabilities || {}) },
    model_map: { ...(input.modelMap || input.model_map || {}) }
  };
}

export function createModelPackConfigBundle(input = {}) {
  const providerPresets = input.providerPresets || input.provider_presets || listProviderPresets();
  const modelPacks = input.modelPacks || input.model_packs || listModelPacks();

  return {
    version: MODEL_PACK_CONFIG_VERSION,
    user_modes: [...MODEL_PACK_USER_MODES],
    model_tiers: [...MODEL_PACK_TIERS],
    auth_modes: [...MODEL_PACK_AUTH_MODES],
    provider_presets: providerPresets.map((preset) => toProviderPresetConfig(preset)),
    model_packs: modelPacks.map((pack) => toModelPackConfig(pack))
  };
}

function addError(errors, path, code, message) {
  errors.push({ path, code, message });
}

function requireText(errors, object, key, path) {
  if (!cleanText(object?.[key])) addError(errors, `${path}.${key}`, "required_text", `${key} is required`);
}

function requireEnum(errors, value, allowed, path) {
  if (!allowed.includes(value)) addError(errors, path, "invalid_enum", `${path} must be one of: ${allowed.join(", ")}`);
}

function requireNumber(errors, value, path) {
  if (!Number.isFinite(value) || value < 0) addError(errors, path, "invalid_number", `${path} must be a non-negative number`);
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateProviderPresets(errors, providerPresets) {
  if (!Array.isArray(providerPresets) || providerPresets.length === 0) {
    addError(errors, "provider_presets", "required_array", "provider_presets must contain at least one preset");
    return new Map();
  }

  const providerPresetMap = new Map();
  const ids = providerPresets.map((preset) => cleanText(preset.provider_preset));
  for (const duplicate of duplicateValues(ids)) {
    addError(errors, "provider_presets", "duplicate_provider_preset", `duplicate provider preset: ${duplicate}`);
  }

  providerPresets.forEach((preset, index) => {
    const path = `provider_presets[${index}]`;
    requireText(errors, preset, "provider_preset", path);
    requireText(errors, preset, "provider_id", path);
    requireText(errors, preset, "display_name", path);
    requireEnum(errors, preset.adapter_type, MODEL_PACK_ADAPTER_TYPES, `${path}.adapter_type`);
    requireEnum(errors, preset.status, MODEL_PACK_STATUSES, `${path}.status`);

    if (!Array.isArray(preset.auth_modes) || preset.auth_modes.length === 0) {
      addError(errors, `${path}.auth_modes`, "required_array", "auth_modes must contain at least one auth mode");
    } else {
      preset.auth_modes.forEach((authMode, authIndex) => {
        requireEnum(errors, authMode, MODEL_PACK_AUTH_MODES, `${path}.auth_modes[${authIndex}]`);
      });
    }

    if (!Array.isArray(preset.regions) || preset.regions.length === 0) {
      addError(errors, `${path}.regions`, "required_array", "regions must contain at least one region");
    }

    if (typeof preset.novice_visible !== "boolean") {
      addError(errors, `${path}.novice_visible`, "invalid_boolean", "novice_visible must be boolean");
    }

    if (!preset.capabilities || typeof preset.capabilities !== "object" || Array.isArray(preset.capabilities)) {
      addError(errors, `${path}.capabilities`, "invalid_object", "capabilities must be an object");
    }

    const modelMap = preset.model_map || {};
    if (!modelMap.standard) addError(errors, `${path}.model_map.standard`, "required_model_tier", "standard model tier is required");
    for (const tier of Object.keys(modelMap)) {
      requireEnum(errors, tier, MODEL_PACK_TIERS, `${path}.model_map.${tier}`);
      if (!cleanText(modelMap[tier])) addError(errors, `${path}.model_map.${tier}`, "required_model_ref", "model ref is required");
    }

    if (preset.adapter_type === "local_gateway" && preset.local_execution !== true) {
      addError(errors, `${path}.local_execution`, "local_gateway_requires_local_execution", "local_gateway must set local_execution true");
    }

    providerPresetMap.set(cleanText(preset.provider_preset), preset);
  });

  return providerPresetMap;
}

function validateModelPacks(errors, modelPacks, providerPresetMap) {
  if (!Array.isArray(modelPacks) || modelPacks.length === 0) {
    addError(errors, "model_packs", "required_array", "model_packs must contain at least one pack");
    return;
  }

  const ids = modelPacks.map((pack) => cleanText(pack.model_pack_id));
  for (const duplicate of duplicateValues(ids)) {
    addError(errors, "model_packs", "duplicate_model_pack", `duplicate model pack: ${duplicate}`);
  }

  modelPacks.forEach((pack, index) => {
    const path = `model_packs[${index}]`;
    requireText(errors, pack, "model_pack_id", path);
    requireText(errors, pack, "model_pack", path);
    requireText(errors, pack, "provider_preset", path);
    requireEnum(errors, pack.default_user_mode, MODEL_PACK_USER_MODES, `${path}.default_user_mode`);
    requireEnum(errors, pack.auth_mode, MODEL_PACK_AUTH_MODES, `${path}.auth_mode`);
    requireEnum(errors, pack.provider_visibility, MODEL_PACK_PROVIDER_VISIBILITIES, `${path}.provider_visibility`);

    if (typeof pack.byok_required !== "boolean") {
      addError(errors, `${path}.byok_required`, "invalid_boolean", "byok_required must be boolean");
    }

    const providerPreset = providerPresetMap.get(cleanText(pack.provider_preset));
    if (!providerPreset) {
      addError(errors, `${path}.provider_preset`, "unknown_provider_preset", `unknown provider preset: ${pack.provider_preset}`);
    } else if (!providerPreset.auth_modes.includes(pack.auth_mode)) {
      addError(errors, `${path}.auth_mode`, "auth_mode_not_supported", `${pack.auth_mode} is not allowed by ${pack.provider_preset}`);
    }

    const fallbackPolicy = pack.fallback_policy || {};
    if (fallbackPolicy.allow_cloud_fallback_for_private === true) {
      addError(errors, `${path}.fallback_policy.allow_cloud_fallback_for_private`, "private_cloud_fallback_forbidden", "private cloud fallback must default to false");
    }

    const budget = pack.budget || {};
    requireNumber(errors, budget.monthly_limit, `${path}.budget.monthly_limit`);
    requireNumber(errors, budget.confirmation_threshold_per_run, `${path}.budget.confirmation_threshold_per_run`);
    requireNumber(errors, budget.scheduled_task_hard_cap, `${path}.budget.scheduled_task_hard_cap`);
    requireText(errors, budget, "currency", `${path}.budget`);

    if (Number.isFinite(budget.monthly_limit) && budget.monthly_limit === 0 && budget.confirmation_threshold_per_run > 0) {
      addError(errors, `${path}.budget.confirmation_threshold_per_run`, "threshold_exceeds_disabled_budget", "disabled budgets cannot keep positive confirmation thresholds");
    } else if (Number.isFinite(budget.monthly_limit) && budget.monthly_limit > 0 && budget.confirmation_threshold_per_run > budget.monthly_limit) {
      addError(errors, `${path}.budget.confirmation_threshold_per_run`, "threshold_exceeds_monthly_limit", "per-run threshold cannot exceed monthly limit");
    }

    const privacy = pack.privacy || {};
    requireEnum(errors, privacy.default_mode, ["normal", "private_project", "local_only", "enterprise_restricted"], `${path}.privacy.default_mode`);
    if (typeof privacy.allow_cloud !== "boolean") addError(errors, `${path}.privacy.allow_cloud`, "invalid_boolean", "allow_cloud must be boolean");
    if (typeof privacy.local_preferred !== "boolean") addError(errors, `${path}.privacy.local_preferred`, "invalid_boolean", "local_preferred must be boolean");

    if (privacy.default_mode === "local_only" && privacy.allow_cloud !== false) {
      addError(errors, `${path}.privacy.allow_cloud`, "local_only_blocks_cloud", "local_only privacy must set allow_cloud false");
    }

    if (pack.default_user_mode === "Local / Private" || privacy.default_mode === "local_only") {
      if (fallbackPolicy.allow_cloud_fallback !== false) {
        addError(errors, `${path}.fallback_policy.allow_cloud_fallback`, "local_private_cloud_fallback_forbidden", "Local / Private cannot silently fall back to cloud");
      }
      if (fallbackPolicy.allow_cross_provider_fallback !== false) {
        addError(errors, `${path}.fallback_policy.allow_cross_provider_fallback`, "local_private_cross_provider_fallback_forbidden", "Local / Private fallback must stay constrained");
      }
    }

    if (pack.provider_visibility === "hidden" && providerPreset?.novice_visible === true) {
      addError(errors, `${path}.provider_visibility`, "hidden_pack_has_visible_provider", "hidden packs cannot expose novice-visible providers");
    }
  });
}

export function validateModelPackConfigBundle(input = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: [{ path: "$", code: "invalid_object", message: "config bundle must be an object" }] };
  }

  if (input.version !== MODEL_PACK_CONFIG_VERSION) {
    addError(errors, "version", "invalid_version", `version must be ${MODEL_PACK_CONFIG_VERSION}`);
  }

  for (const [key, allowed] of [
    ["user_modes", MODEL_PACK_USER_MODES],
    ["model_tiers", MODEL_PACK_TIERS],
    ["auth_modes", MODEL_PACK_AUTH_MODES]
  ]) {
    const values = input[key];
    if (!Array.isArray(values)) {
      addError(errors, key, "required_array", `${key} must be an array`);
      continue;
    }
    for (const requiredValue of allowed) {
      if (!values.includes(requiredValue)) {
        addError(errors, key, "missing_required_enum", `${key} must include ${requiredValue}`);
      }
    }
  }

  const providerPresetMap = validateProviderPresets(errors, input.provider_presets);
  validateModelPacks(errors, input.model_packs, providerPresetMap);

  return { valid: errors.length === 0, errors };
}

export function assertValidModelPackConfigBundle(input = {}) {
  const result = validateModelPackConfigBundle(input);
  if (!result.valid) {
    const error = new Error(`Invalid model pack config: ${result.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
    error.code = "AI_MODEL_PACK_CONFIG_INVALID";
    error.errors = result.errors;
    throw error;
  }
  return input;
}
