function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeProviderDescriptor(input = {}) {
  const providerId = cleanText(input.providerId || input.provider_id);
  if (!providerId) throw new Error("providerId is required");
  return {
    providerId,
    displayName: cleanText(input.displayName || input.display_name) || providerId,
    adapterType: cleanText(input.adapterType || input.adapter_type) || "direct_provider",
    status: cleanText(input.status) || "enabled",
    authModes: Array.isArray(input.authModes || input.auth_modes) ? [...(input.authModes || input.auth_modes)] : [],
    regions: Array.isArray(input.regions) ? [...input.regions] : [],
    noviceVisible: input.noviceVisible === true || input.novice_visible === true,
    supportsHealthCheck: input.supportsHealthCheck !== false && input.supports_health_check !== false,
    supportsUsageReporting: input.supportsUsageReporting !== false && input.supports_usage_reporting !== false,
    supportsCostEstimation: input.supportsCostEstimation !== false && input.supports_cost_estimation !== false,
    localExecution: input.localExecution === true || input.local_execution === true
  };
}

export function normalizeModelResponse(input = {}, request = {}) {
  const status = cleanText(input.status) || "succeeded";
  if (!["succeeded", "failed", "partial"].includes(status)) {
    const error = new Error(`Unsupported provider response status: ${status}`);
    error.code = "AI_PROVIDER_RESPONSE_STATUS_INVALID";
    throw error;
  }

  return {
    requestId: cleanText(input.requestId || input.request_id || request.requestId),
    agentRunId: cleanText(input.agentRunId || input.agent_run_id || request.agentRunId),
    status,
    providerId: cleanText(input.providerId || input.provider_id),
    modelRef: cleanText(input.modelRef || input.model_ref || request.modelRef),
    output: input.output || { type: "text", content: "", json: null, toolCalls: [] },
    usage: {
      inputTokens: Number(input.usage?.inputTokens ?? input.usage?.input_tokens ?? 0),
      outputTokens: Number(input.usage?.outputTokens ?? input.usage?.output_tokens ?? 0),
      cachedInputTokens: Number(input.usage?.cachedInputTokens ?? input.usage?.cached_input_tokens ?? 0),
      totalTokens: Number(input.usage?.totalTokens ?? input.usage?.total_tokens ?? 0),
      estimatedCost: Number(input.usage?.estimatedCost ?? input.usage?.estimated_cost ?? 0),
      currency: cleanText(input.usage?.currency) || "USD",
      usageSource: cleanText(input.usage?.usageSource || input.usage?.usage_source) || "locally_estimated"
    },
    timing: input.timing || {
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 0
    },
    error: input.error || null,
    rawRef: cleanText(input.rawRef || input.raw_ref)
  };
}

export function assertProviderAllowedForContext(providerDescriptor, contextPack) {
  const descriptor = normalizeProviderDescriptor(providerDescriptor);
  const privacyMode = cleanText(contextPack?.privacy?.mode) || "normal";
  if (privacyMode === "local_only" && !descriptor.localExecution) {
    const error = new Error("local_only context cannot be sent to a cloud provider");
    error.code = "AI_PRIVACY_CLOUD_PROVIDER_BLOCKED";
    throw error;
  }
  return true;
}
