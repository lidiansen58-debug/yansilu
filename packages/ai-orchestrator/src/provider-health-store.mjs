import { normalizeProviderHealth } from "./provider-health-policy.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeLimit(value) {
  const limit = Number(value || 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(500, Math.floor(limit)));
}

function generatedId(prefix = "provider_health") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function timestamp(value = "") {
  return cleanText(value) || new Date().toISOString();
}

function normalizeProviderHealthRecord(input = {}) {
  const health = normalizeProviderHealth(input);
  const providerId = cleanText(health.providerId || input.providerId || input.provider_id);
  if (!providerId) {
    const error = new Error("providerId is required for provider health records");
    error.code = "AI_PROVIDER_HEALTH_PROVIDER_ID_REQUIRED";
    throw error;
  }

  return {
    id: cleanText(input.id || input.healthRecordId || input.health_record_id || health.healthCheckId) || generatedId(),
    providerId,
    providerConfigId: cleanText(input.providerConfigId || input.provider_config_id || input.configId || input.config_id),
    status: health.status,
    latencyMs: health.latencyMs,
    checkedAt: health.checkedAt,
    source: cleanText(input.source) || "health_check",
    trigger: cleanText(input.trigger) || "",
    agentRunId: cleanText(input.agentRunId || input.agent_run_id),
    message: health.message,
    errorType: health.errorType,
    retryable: health.retryable === true,
    payload: jsonClone(input.payload || input.details || {}),
    createdAt: timestamp(input.createdAt || input.created_at)
  };
}

function sortNewest(records = []) {
  return [...records].sort((a, b) => {
    const byCheckedAt = String(b.checkedAt).localeCompare(String(a.checkedAt));
    if (byCheckedAt !== 0) return byCheckedAt;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
}

export function createInMemoryProviderHealthStore(options = {}) {
  const records = new Map();

  function recordProviderHealth(input = {}) {
    const normalized = normalizeProviderHealthRecord(input);
    records.set(normalized.id, normalized);
    return jsonClone(normalized);
  }

  for (const record of Array.isArray(options.records || options.providerHealthRecords || options.provider_health_records)
    ? options.records || options.providerHealthRecords || options.provider_health_records
    : []) {
    recordProviderHealth(record);
  }

  function listProviderHealth(filter = {}) {
    const providerId = cleanText(filter.providerId || filter.provider_id);
    const status = cleanText(filter.status);
    const source = cleanText(filter.source);
    const limit = normalizeLimit(filter.limit);
    return sortNewest([...records.values()])
      .filter((record) => !providerId || record.providerId === providerId)
      .filter((record) => !status || record.status === status)
      .filter((record) => !source || record.source === source)
      .slice(0, limit)
      .map(jsonClone);
  }

  function getLatestProviderHealth(input = {}) {
    const providerId = cleanText(input.providerId || input.provider_id);
    if (!providerId) return null;
    return listProviderHealth({ providerId, limit: 1 })[0] || null;
  }

  function listLatestProviderHealth(filter = {}) {
    const status = cleanText(filter.status);
    const latest = new Map();
    for (const record of sortNewest([...records.values()])) {
      if (latest.has(record.providerId)) continue;
      if (status && record.status !== status) continue;
      latest.set(record.providerId, record);
    }
    return [...latest.values()].map(jsonClone);
  }

  return {
    recordProviderHealth,
    addProviderHealth: recordProviderHealth,
    getLatestProviderHealth,
    listProviderHealth,
    listLatestProviderHealth,
    deleteProviderHealth(input = {}) {
      const id = cleanText(input.id || input.healthRecordId || input.health_record_id);
      if (!id) return false;
      return records.delete(id);
    },
    close() {}
  };
}

export function providerHealthCandidateInput(providerDescriptor = {}, providerHealthStore = null) {
  const providerId = cleanText(providerDescriptor.providerId || providerDescriptor.provider_id);
  const health = providerHealthStore?.getLatestProviderHealth?.({ providerId }) || {};
  return {
    ...providerDescriptor,
    health
  };
}
