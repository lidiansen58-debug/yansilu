import { normalizeProviderDescriptor } from "./provider-adapter.mjs";
import { resolveAiUserSettings } from "./model-packs.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

const BASE_CAPABILITIES = {
  tool_calling: "model_dependent",
  structured_output: "model_dependent",
  streaming: "yes",
  long_context: "model_dependent",
  embeddings: "model_dependent",
  multimodal: "model_dependent",
  local_execution: "no",
  routing_fallback: "via_policy",
  budget_controls: "via_product"
};

const PROVIDER_PRESETS = {
  platform_managed_openai: {
    providerId: "platform_managed_openai",
    displayName: "Platform Managed OpenAI",
    adapterType: "direct_provider",
    status: "enabled",
    authModes: ["platform_managed"],
    regions: ["global"],
    noviceVisible: false,
    capabilities: {
      ...BASE_CAPABILITIES,
      agents_sdk_native: "yes",
      openai_compatible: "yes",
      tool_calling: "yes",
      structured_output: "yes",
      local_execution: "no"
    },
    modelMap: {
      router_fast: "platform_managed_openai:router_fast",
      cheap_fast: "platform_managed_openai:cheap_fast",
      standard: "platform_managed_openai:standard",
      strong_reasoning: "platform_managed_openai:strong_reasoning",
      guardrail: "platform_managed_openai:guardrail"
    },
    runtimeModelMap: {
      "platform_managed_openai:router_fast": "gpt-5.4-mini",
      "platform_managed_openai:cheap_fast": "gpt-5.4-mini",
      "platform_managed_openai:standard": "gpt-5.4",
      "platform_managed_openai:strong_reasoning": "gpt-5.5",
      "platform_managed_openai:guardrail": "gpt-5.4-mini"
    }
  },
  openai_compatible_gateway: {
    providerId: "openai_compatible_gateway",
    displayName: "OpenAI-Compatible Gateway",
    adapterType: "aggregated_gateway",
    status: "experimental",
    authModes: ["workspace_managed", "byok_advanced"],
    regions: ["global"],
    noviceVisible: false,
    capabilities: {
      ...BASE_CAPABILITIES,
      openai_compatible: "yes",
      routing_fallback: "yes",
      budget_controls: "partial"
    },
    modelMap: {
      router_fast: "openai_compatible_gateway:router_fast",
      cheap_fast: "openai_compatible_gateway:cheap_fast",
      standard: "openai_compatible_gateway:standard",
      strong_reasoning: "openai_compatible_gateway:strong_reasoning",
      guardrail: "openai_compatible_gateway:guardrail"
    },
    runtimeModelMap: {}
  },
  china_optimized_gateway: {
    providerId: "china_optimized_gateway",
    displayName: "China Optimized Gateway",
    adapterType: "aggregated_gateway",
    status: "experimental",
    authModes: ["workspace_managed", "byok_advanced"],
    regions: ["china", "global"],
    noviceVisible: false,
    capabilities: {
      ...BASE_CAPABILITIES,
      openai_compatible: "yes",
      region_fit: "china",
      routing_fallback: "via_policy"
    },
    modelMap: {
      router_fast: "china_optimized_gateway:router_fast",
      cheap_fast: "china_optimized_gateway:cheap_fast",
      standard: "china_optimized_gateway:standard",
      strong_reasoning: "china_optimized_gateway:strong_reasoning",
      guardrail: "china_optimized_gateway:guardrail"
    },
    runtimeModelMap: {}
  },
  local_private_gateway: {
    providerId: "local_private_gateway",
    displayName: "Local / Private Gateway",
    adapterType: "local_gateway",
    status: "experimental",
    authModes: ["local_no_key", "enterprise_secret"],
    regions: ["local", "enterprise_private"],
    noviceVisible: false,
    localExecution: true,
    supportsUsageReporting: false,
    supportsCostEstimation: false,
    capabilities: {
      ...BASE_CAPABILITIES,
      openai_compatible: "partial",
      structured_output: "model_dependent",
      tool_calling: "model_dependent",
      local_execution: "yes",
      local_private: "yes",
      budget_controls: "local_free"
    },
    modelMap: {
      router_fast: "local_private_gateway:router_fast",
      cheap_fast: "local_private_gateway:cheap_fast",
      standard: "local_private_gateway:standard",
      strong_reasoning: "local_private_gateway:strong_reasoning",
      guardrail: "local_private_gateway:guardrail",
      local_private: "local_private_gateway:local_private"
    },
    runtimeModelMap: {}
  }
};

function resolvePresetId(input = {}) {
  const presetId = cleanText(input.providerPreset || input.provider_preset || input.presetId || input.preset_id || input.providerId || input.provider_id);
  if (presetId) return presetId;

  return resolveAiUserSettings(input).providerPreset;
}

export function providerPresetIds() {
  return Object.keys(PROVIDER_PRESETS);
}

export function getProviderPreset(id = "platform_managed_openai") {
  const presetId = cleanText(id);
  const preset = PROVIDER_PRESETS[presetId];
  if (!preset) {
    const error = new Error(`provider preset not found: ${presetId}`);
    error.code = "AI_PROVIDER_PRESET_NOT_FOUND";
    throw error;
  }
  return normalizeProviderDescriptor(preset);
}

export function resolveProviderDescriptor(input = {}) {
  if (input.providerDescriptor || input.provider_descriptor) {
    return normalizeProviderDescriptor(input.providerDescriptor || input.provider_descriptor);
  }
  const userSettings = resolveAiUserSettings(input);
  const base = getProviderPreset(resolvePresetId(input));
  return normalizeProviderDescriptor({
    ...base,
    authMode: cleanText(input.authMode || input.auth_mode) || userSettings.authMode,
    secretRef: cleanText(input.secretRef || input.secret_ref),
    endpointUrl: cleanText(input.endpointUrl || input.endpoint_url),
    runtimeModelMap: {
      ...(base.runtimeModelMap || {}),
      ...(input.runtimeModelMap || input.runtime_model_map || {})
    }
  });
}

export function listProviderPresets() {
  return providerPresetIds().map((id) => getProviderPreset(id));
}
