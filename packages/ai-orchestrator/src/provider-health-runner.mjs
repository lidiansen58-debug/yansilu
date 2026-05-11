import { normalizeAiProviderConfig } from "./ai-provider-configs.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function generatedId(prefix = "health_check") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function headers(input = {}) {
  const result = {};
  for (const [key, value] of Object.entries(input || {})) {
    const name = cleanText(key);
    if (!name || value === undefined || value === null || value === "") continue;
    result[name.toLowerCase()] = String(value);
  }
  return result;
}

function safeErrorType(error = {}) {
  const code = cleanText(error.code || error.error_type || error.type);
  const status = Number(error.status || error.statusCode || error.provider_status_code || 0);
  if (code === "network_disabled") return "network_disabled";
  if (code === "timeout" || error.name === "AbortError") return "timeout";
  if ([401, 403].includes(status) || ["auth_error", "missing_secret", "invalid_api_key"].includes(code)) return "auth_error";
  if (status === 429 || code === "rate_limit") return "rate_limit";
  if (status >= 500 || code === "provider_unavailable") return "provider_unavailable";
  return code || "unknown";
}

function statusFromResponse(response = {}, expectedStatus = 200) {
  const status = Number(response.status || 0);
  if (status === Number(expectedStatus)) return "healthy";
  if (status >= 500 || status === 429 || status === 408) return "down";
  if (status >= 400) return "degraded";
  return "degraded";
}

function messageFromResponse(response = {}, expectedStatus = 200) {
  const status = Number(response.status || 0);
  if (status === Number(expectedStatus)) return "Provider health check succeeded.";
  return `Provider health check returned HTTP ${status || "unknown"}; expected ${expectedStatus}.`;
}

function networkDisabledResult(config = {}, trigger = "") {
  return {
    providerId: config.providerId,
    providerConfigId: config.id,
    status: "unknown",
    latencyMs: 0,
    checkedAt: nowIso(),
    source: "health_check",
    trigger,
    message: "Provider health check did not run because network execution is disabled.",
    errorType: "network_disabled",
    retryable: false,
    payload: {
      endpointUrl: config.healthCheck.endpointUrl,
      method: config.healthCheck.method
    }
  };
}

function disabledHealthCheckResult(config = {}, trigger = "") {
  return {
    providerId: config.providerId,
    providerConfigId: config.id,
    status: "unknown",
    latencyMs: 0,
    checkedAt: nowIso(),
    source: "health_check",
    trigger,
    message: "Provider health check is disabled.",
    errorType: "health_check_disabled",
    retryable: false,
    payload: {
      endpointUrl: config.healthCheck.endpointUrl,
      method: config.healthCheck.method
    }
  };
}

function timeoutSignal(timeoutMs = 5000) {
  if (typeof AbortController !== "function") return {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(100, Number(timeoutMs) || 5000));
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeout);
    }
  };
}

export function buildProviderHealthCheckRequest(input = {}) {
  const config = normalizeAiProviderConfig(input.providerConfig || input.provider_config || input);
  const healthCheck = config.healthCheck || {};
  return {
    providerId: config.providerId,
    providerConfigId: config.id,
    url: healthCheck.endpointUrl,
    init: {
      method: cleanText(healthCheck.method) || "GET",
      headers: headers(config.headers || {})
    },
    expectedStatus: Number(healthCheck.expectedStatus || 200),
    timeoutMs: Number(healthCheck.timeoutMs || 5000),
    enabled: healthCheck.enabled === true,
    metadata: {
      providerId: config.providerId,
      providerConfigId: config.id,
      endpointUrl: healthCheck.endpointUrl,
      source: "health_check"
    }
  };
}

export async function runProviderHealthCheck(input = {}) {
  const config = normalizeAiProviderConfig(input.providerConfig || input.provider_config || input);
  const trigger = cleanText(input.trigger);
  const recordId = cleanText(input.id || input.healthRecordId || input.health_record_id) || generatedId();
  const store = input.providerHealthStore || input.provider_health_store;
  const shouldRecord = input.record !== false && store && typeof store.recordProviderHealth === "function";

  let record = null;
  if (config.healthCheck.enabled !== true) {
    record = { id: recordId, ...disabledHealthCheckResult(config, trigger) };
    if (shouldRecord) record = store.recordProviderHealth(record);
    return { status: "skipped", record, request: null };
  }

  if (input.networkEnabled !== true && input.network_enabled !== true && typeof input.fetchImpl !== "function" && typeof input.fetch_impl !== "function") {
    record = { id: recordId, ...networkDisabledResult(config, trigger) };
    if (shouldRecord) record = store.recordProviderHealth(record);
    return { status: "skipped", record, request: null };
  }

  const request = buildProviderHealthCheckRequest(config);
  const fetchImpl = input.fetchImpl || input.fetch_impl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    record = {
      id: recordId,
      providerId: config.providerId,
      providerConfigId: config.id,
      status: "unknown",
      latencyMs: 0,
      checkedAt: nowIso(),
      source: "health_check",
      trigger,
      message: "No fetch implementation is available for provider health check.",
      errorType: "fetch_unavailable",
      retryable: false,
      payload: {
        endpointUrl: request.url,
        method: request.init.method
      }
    };
    if (shouldRecord) record = store.recordProviderHealth(record);
    return { status: "failed", record, request };
  }

  const startedAt = Date.now();
  const timer = timeoutSignal(request.timeoutMs);
  try {
    const response = await fetchImpl(request.url, {
      ...request.init,
      signal: timer.signal
    });
    timer.clear?.();
    const latencyMs = Date.now() - startedAt;
    record = {
      id: recordId,
      providerId: config.providerId,
      providerConfigId: config.id,
      status: statusFromResponse(response, request.expectedStatus),
      latencyMs,
      checkedAt: nowIso(),
      source: "health_check",
      trigger,
      message: messageFromResponse(response, request.expectedStatus),
      errorType: response.status === request.expectedStatus ? "" : "unexpected_status",
      retryable: Number(response.status || 0) >= 500 || Number(response.status || 0) === 429 || Number(response.status || 0) === 408,
      payload: {
        endpointUrl: request.url,
        method: request.init.method,
        expectedStatus: request.expectedStatus,
        actualStatus: Number(response.status || 0)
      }
    };
    if (shouldRecord) record = store.recordProviderHealth(record);
    return { status: record.status === "healthy" ? "succeeded" : "failed", record, request };
  } catch (error) {
    timer.clear?.();
    const latencyMs = Date.now() - startedAt;
    const errorType = safeErrorType(error);
    record = {
      id: recordId,
      providerId: config.providerId,
      providerConfigId: config.id,
      status: errorType === "timeout" || errorType === "provider_unavailable" ? "down" : "degraded",
      latencyMs,
      checkedAt: nowIso(),
      source: "health_check",
      trigger,
      message: cleanText(error.message) || "Provider health check failed.",
      errorType,
      retryable: ["timeout", "rate_limit", "provider_unavailable", "unknown"].includes(errorType),
      payload: {
        endpointUrl: request.url,
        method: request.init.method,
        expectedStatus: request.expectedStatus
      }
    };
    if (shouldRecord) record = store.recordProviderHealth(record);
    return { status: "failed", record, request, error };
  }
}

export async function runProviderHealthChecks(input = {}) {
  const configs = Array.isArray(input.providerConfigs || input.provider_configs || input.configs)
    ? input.providerConfigs || input.provider_configs || input.configs
    : [];
  const results = [];
  for (const providerConfig of configs) {
    results.push(await runProviderHealthCheck({ ...input, providerConfig }));
  }
  return {
    results,
    summary: {
      total: results.length,
      healthy: results.filter((result) => result.record?.status === "healthy").length,
      degraded: results.filter((result) => result.record?.status === "degraded").length,
      down: results.filter((result) => result.record?.status === "down").length,
      unknown: results.filter((result) => result.record?.status === "unknown").length
    }
  };
}
