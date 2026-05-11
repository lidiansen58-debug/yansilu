import { getProviderPreset } from "./provider-presets.mjs";

export const AI_PROVIDER_CONFIG_ADAPTER_TYPES = ["direct_provider", "aggregated_gateway", "self_hosted_gateway", "local_gateway"];
export const AI_PROVIDER_CONFIG_STATUSES = ["enabled", "disabled", "experimental", "deprecated"];
export const AI_PROVIDER_CONFIG_AUTH_MODES = ["platform_managed", "workspace_managed", "byok_advanced", "local_no_key", "enterprise_secret"];
export const AI_PROVIDER_CONFIG_SECRET_AUTH_MODES = ["workspace_managed", "byok_advanced", "enterprise_secret"];
export const AI_PROVIDER_CONFIG_MODEL_TIERS = ["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail", "local_private"];
export const AI_PROVIDER_CONFIG_HEALTH_METHODS = ["GET", "POST"];

function cleanText(value) {
  return String(value || "").trim();
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function cleanObject(value = {}) {
  const result = {};
  for (const [key, item] of Object.entries(value || {})) {
    const cleanKey = cleanText(key);
    if (!cleanKey || item === undefined || item === null || item === "") continue;
    result[cleanKey] = String(item);
  }
  return result;
}

function providerConfigId(providerId) {
  return `provider_${cleanText(providerId)}`;
}

function basePreset(providerId) {
  try {
    return getProviderPreset(providerId);
  } catch {
    return {};
  }
}

function normalizeHealthCheck(input = {}, endpointUrl = "") {
  const enabled = input.enabled === true || input.enabled === "true";
  return {
    enabled,
    endpointUrl: cleanText(input.endpointUrl || input.endpoint_url) || endpointUrl,
    method: cleanText(input.method || "GET").toUpperCase(),
    timeoutMs: Number(input.timeoutMs ?? input.timeout_ms ?? 5000),
    expectedStatus: Number(input.expectedStatus ?? input.expected_status ?? 200),
    intervalSeconds: Number(input.intervalSeconds ?? input.interval_seconds ?? 300)
  };
}

export function normalizeAiProviderConfig(input = {}, existing = {}) {
  const providerId = cleanText(input.providerId || input.provider_id || existing.providerId);
  if (!providerId) {
    const error = new Error("providerId is required for AI provider config");
    error.code = "AI_PROVIDER_CONFIG_PROVIDER_ID_REQUIRED";
    throw error;
  }

  const now = new Date().toISOString();
  const base = basePreset(providerId);
  const capabilities = cleanObject(input.capabilities || existing.capabilities || {});
  const modelMap = cleanObject(input.modelMap || input.model_map || existing.modelMap || {});
  const headers = cleanObject(input.headers || input.headers_json || existing.headers || {});
  const endpointUrl = cleanText(input.endpointUrl || input.endpoint_url || existing.endpointUrl);

  const normalized = {
    id: cleanText(input.id || input.configId || input.config_id || existing.id) || providerConfigId(providerId),
    providerId,
    displayName: cleanText(input.displayName || input.display_name || existing.displayName) || base.displayName || providerId,
    adapterType: cleanText(input.adapterType || input.adapter_type || existing.adapterType) || base.adapterType || "aggregated_gateway",
    status: cleanText(input.status || existing.status) || "enabled",
    authMode: cleanText(input.authMode || input.auth_mode || existing.authMode) || base.authMode || base.authModes?.[0] || "",
    secretRef: cleanText(input.secretRef || input.secret_ref || existing.secretRef),
    endpointUrl,
    headers,
    capabilities,
    modelMap,
    healthCheck: normalizeHealthCheck(input.healthCheck || input.health_check || existing.healthCheck || existing.health_check || {}, endpointUrl),
    createdAt: cleanText(existing.createdAt || existing.created_at || input.createdAt || input.created_at) || now,
    updatedAt: cleanText(input.updatedAt || input.updated_at) || now
  };

  return normalized;
}

export function providerConfigToDescriptorInput(config = null) {
  if (!config) return null;
  const base = basePreset(config.providerId);
  return {
    ...base,
    providerId: config.providerId,
    displayName: config.displayName || base.displayName,
    adapterType: config.adapterType || base.adapterType,
    status: config.status || base.status,
    authModes: base.authModes || [],
    authMode: config.authMode || base.authMode,
    secretRef: config.secretRef || base.secretRef,
    endpointUrl: config.endpointUrl || base.endpointUrl,
    regions: base.regions || [],
    noviceVisible: base.noviceVisible === true,
    supportsHealthCheck: base.supportsHealthCheck !== false,
    supportsUsageReporting: config.supportsUsageReporting ?? base.supportsUsageReporting,
    supportsCostEstimation: config.supportsCostEstimation ?? base.supportsCostEstimation,
    localExecution: base.localExecution === true,
    headers: {
      ...(base.headers || {}),
      ...(config.headers || {})
    },
    capabilities: {
      ...(base.capabilities || {}),
      ...(config.capabilities || {})
    },
    modelMap: Object.keys(config.modelMap || {}).length ? config.modelMap : base.modelMap || {},
    healthCheck: config.healthCheck,
    configId: config.id
  };
}

export function providerConfigToSettingsInput(config = null) {
  if (!config) return {};
  const descriptor = providerConfigToDescriptorInput(config);
  return {
    providerDescriptor: descriptor,
    providerConfigId: config.id,
    providerId: config.providerId,
    authMode: config.authMode,
    secretRef: config.secretRef,
    endpointUrl: config.endpointUrl,
    headers: jsonClone(config.headers || {}),
    healthCheck: jsonClone(config.healthCheck || {})
  };
}

export function aiProviderConfigToSchemaConfig(input = {}) {
  const config = normalizeAiProviderConfig(input);
  return {
    id: config.id,
    provider_id: config.providerId,
    display_name: config.displayName,
    adapter_type: config.adapterType,
    status: config.status,
    auth_mode: config.authMode,
    secret_ref: config.secretRef,
    endpoint_url: config.endpointUrl,
    headers: { ...(config.headers || {}) },
    capabilities: { ...(config.capabilities || {}) },
    model_map: { ...(config.modelMap || {}) },
    health_check: {
      enabled: config.healthCheck.enabled,
      endpoint_url: config.healthCheck.endpointUrl,
      method: config.healthCheck.method,
      timeout_ms: config.healthCheck.timeoutMs,
      expected_status: config.healthCheck.expectedStatus,
      interval_seconds: config.healthCheck.intervalSeconds
    },
    created_at: config.createdAt,
    updated_at: config.updatedAt
  };
}

function addError(errors, path, code, message) {
  errors.push({ path, code, message });
}

function requireEnum(errors, value, allowed, path) {
  if (!allowed.includes(value)) addError(errors, path, "invalid_enum", `${path} must be one of: ${allowed.join(", ")}`);
}

function requiresSecretRef(authMode = "") {
  return AI_PROVIDER_CONFIG_SECRET_AUTH_MODES.includes(cleanText(authMode));
}

function isLocalUrl(value = "") {
  const text = cleanText(value).toLowerCase();
  return text.startsWith("http://localhost") || text.startsWith("http://127.0.0.1") || text.startsWith("http://[::1]");
}

function isHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validateEndpoint(errors, endpointUrl, path, { required = false, allowLocalHttp = true } = {}) {
  const value = cleanText(endpointUrl);
  if (!value) {
    if (required) addError(errors, path, "endpoint_url_required", "endpoint_url is required for enabled gateway providers");
    return;
  }
  if (!isHttpUrl(value)) {
    addError(errors, path, "endpoint_url_invalid", "endpoint_url must be an http or https URL");
    return;
  }
  if (value.toLowerCase().startsWith("http://") && !(allowLocalHttp && isLocalUrl(value))) {
    addError(errors, path, "endpoint_url_insecure", "non-local provider endpoints must use https");
  }
}

function validateSecretBoundary(errors, input = {}, config = {}) {
  const forbiddenKeys = ["apiKey", "api_key", "secret", "secretValue", "secret_value", "rawSecret", "raw_secret", "token"];
  for (const key of forbiddenKeys) {
    if (input[key] !== undefined && cleanText(input[key])) {
      addError(errors, key, "raw_secret_forbidden", "raw provider secrets must not be stored in provider config");
    }
  }

  for (const [headerName, headerValue] of Object.entries(config.headers || {})) {
    const lowerName = cleanText(headerName).toLowerCase();
    const lowerValue = cleanText(headerValue).toLowerCase();
    if (["authorization", "x-api-key", "api-key"].includes(lowerName)) {
      addError(errors, `headers.${headerName}`, "secret_header_forbidden", "auth headers must be derived from secret_ref at request time");
    }
    if (/^(sk-|sk_|ak-|bearer\s+)/i.test(lowerValue)) {
      addError(errors, `headers.${headerName}`, "raw_secret_forbidden", "headers must not contain raw provider secrets");
    }
  }

  if (requiresSecretRef(config.authMode) && !config.secretRef) {
    addError(errors, "secretRef", "secret_ref_required", `${config.authMode} provider configs must reference a secret`);
  }

  if (config.authMode === "local_no_key" && config.secretRef) {
    addError(errors, "secretRef", "local_no_key_secret_forbidden", "local_no_key provider configs should not reference cloud secrets");
  }
}

function validateHealthCheck(errors, config = {}) {
  const health = config.healthCheck || {};
  if (typeof health.enabled !== "boolean") addError(errors, "healthCheck.enabled", "invalid_boolean", "healthCheck.enabled must be boolean");
  requireEnum(errors, health.method, AI_PROVIDER_CONFIG_HEALTH_METHODS, "healthCheck.method");

  if (!Number.isFinite(health.timeoutMs) || health.timeoutMs < 100) {
    addError(errors, "healthCheck.timeoutMs", "invalid_timeout", "healthCheck.timeoutMs must be at least 100");
  }
  if (!Number.isFinite(health.expectedStatus) || health.expectedStatus < 100 || health.expectedStatus > 599) {
    addError(errors, "healthCheck.expectedStatus", "invalid_expected_status", "healthCheck.expectedStatus must be an HTTP status code");
  }
  if (!Number.isFinite(health.intervalSeconds) || health.intervalSeconds < 10) {
    addError(errors, "healthCheck.intervalSeconds", "invalid_interval", "healthCheck.intervalSeconds must be at least 10 seconds");
  }

  validateEndpoint(errors, health.endpointUrl, "healthCheck.endpointUrl", {
    required: health.enabled === true,
    allowLocalHttp: config.adapterType === "local_gateway"
  });
}

export function validateAiProviderConfig(input = {}) {
  const errors = [];
  let config = null;
  try {
    config = normalizeAiProviderConfig(input);
  } catch (error) {
    return {
      valid: false,
      errors: [{ path: "providerId", code: error.code || "provider_id_required", message: error.message }],
      config: null
    };
  }

  const base = basePreset(config.providerId);
  requireEnum(errors, config.adapterType, AI_PROVIDER_CONFIG_ADAPTER_TYPES, "adapterType");
  requireEnum(errors, config.status, AI_PROVIDER_CONFIG_STATUSES, "status");
  requireEnum(errors, config.authMode, AI_PROVIDER_CONFIG_AUTH_MODES, "authMode");

  if (base.authModes?.length && !base.authModes.includes(config.authMode)) {
    addError(errors, "authMode", "auth_mode_not_supported", `${config.authMode} is not allowed by ${config.providerId}`);
  }

  if (config.adapterType === "local_gateway" && base.localExecution !== true && config.capabilities.local_execution !== "yes") {
    addError(errors, "adapterType", "local_gateway_requires_local_execution", "local_gateway configs must be backed by a local/private preset");
  }

  const endpointRequired = config.status === "enabled" && ["aggregated_gateway", "self_hosted_gateway", "local_gateway"].includes(config.adapterType);
  validateEndpoint(errors, config.endpointUrl, "endpointUrl", {
    required: endpointRequired,
    allowLocalHttp: config.adapterType === "local_gateway"
  });

  for (const tier of Object.keys(config.modelMap || {})) {
    requireEnum(errors, tier, AI_PROVIDER_CONFIG_MODEL_TIERS, `modelMap.${tier}`);
  }

  validateSecretBoundary(errors, input, config);
  validateHealthCheck(errors, config);

  return { valid: errors.length === 0, errors, config };
}

export function assertValidAiProviderConfig(input = {}) {
  const result = validateAiProviderConfig(input);
  if (!result.valid) {
    const error = new Error(`Invalid AI provider config: ${result.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
    error.code = "AI_PROVIDER_CONFIG_INVALID";
    error.errors = result.errors;
    throw error;
  }
  return result.config;
}

export function createInMemoryAiProviderConfigStore(options = {}) {
  const configs = new Map();
  const providerIdIndex = new Map();
  const initialConfigs = Array.isArray(options.configs || options.providerConfigs || options.provider_configs)
    ? options.configs || options.providerConfigs || options.provider_configs
    : [];

  function setProviderConfig(input = {}) {
    const lookup = cleanText(input.id || input.configId || input.config_id);
    const existing = lookup ? configs.get(lookup) : providerIdIndex.get(cleanText(input.providerId || input.provider_id));
    const normalized = assertValidAiProviderConfig(normalizeAiProviderConfig(input, existing || {}));
    configs.set(normalized.id, normalized);
    providerIdIndex.set(normalized.providerId, normalized);
    return jsonClone(normalized);
  }

  for (const config of initialConfigs) {
    setProviderConfig(config);
  }

  return {
    setProviderConfig,
    upsertProviderConfig: setProviderConfig,
    getProviderConfig(input = {}) {
      const id = cleanText(input.id || input.configId || input.config_id);
      const providerId = cleanText(input.providerId || input.provider_id);
      const config = id ? configs.get(id) : providerIdIndex.get(providerId);
      return config ? jsonClone(config) : null;
    },
    listProviderConfigs(filter = {}) {
      const status = cleanText(filter.status);
      return [...configs.values()]
        .filter((config) => !status || config.status === status)
        .map((config) => jsonClone(config));
    },
    deleteProviderConfig(input = {}) {
      const config = this.getProviderConfig(input);
      if (!config) return false;
      configs.delete(config.id);
      providerIdIndex.delete(config.providerId);
      return true;
    },
    close() {}
  };
}
