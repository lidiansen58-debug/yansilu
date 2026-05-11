import test from "node:test";
import assert from "node:assert/strict";

import {
  getProviderPreset,
  normalizeProviderHealth,
  providerHealthSummary,
  resolveModelRoute,
  selectProviderForRoute
} from "../../packages/ai-orchestrator/src/index.mjs";

function route(input = {}) {
  return resolveModelRoute({
    agent: {
      agentId: input.agentId || "research_agent",
      defaultModelTier: input.defaultModelTier || "standard",
      requiredCapabilities: input.requiredCapabilities || ["structured_output"]
    },
    providerDescriptor: input.providerDescriptor || getProviderPreset(input.providerPreset || "openai_compatible_gateway"),
    modelPack: input.modelPack || "Global Optimized",
    userMode: input.userMode || "Auto",
    privacyMode: input.privacyMode || "normal",
    fallbackPolicy: input.fallbackPolicy || {}
  });
}

function provider(providerId, health = {}, extra = {}) {
  return {
    ...getProviderPreset(providerId),
    ...extra,
    health: {
      providerId,
      ...health
    }
  };
}

test("provider health normalizes unknown and degraded statuses", () => {
  const unknown = normalizeProviderHealth({ providerId: "gateway", status: "surprising_status" });
  const degraded = normalizeProviderHealth({ provider_id: "gateway", status: "degraded", latency_ms: 2400, retryable: true });

  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.providerId, "gateway");
  assert.equal(degraded.status, "degraded");
  assert.equal(degraded.latencyMs, 2400);
  assert.equal(degraded.retryable, true);
});

test("health policy uses the primary provider when it is healthy", () => {
  const modelRoute = route({ providerPreset: "openai_compatible_gateway" });
  const selection = selectProviderForRoute({
    route: modelRoute,
    primaryProvider: provider("openai_compatible_gateway", { status: "healthy" }),
    candidates: [provider("platform_managed_openai", { status: "healthy" })]
  });

  assert.equal(selection.action, "use_primary");
  assert.equal(selection.fallbackUsed, false);
  assert.equal(selection.selectedProviderId, "openai_compatible_gateway");
  assert.equal(providerHealthSummary(selection).fallbackReason, "none");
});

test("health policy falls back to an allowed healthy provider when primary is down", () => {
  const modelRoute = route({ providerPreset: "openai_compatible_gateway" });
  const selection = selectProviderForRoute({
    route: modelRoute,
    primaryProvider: provider("openai_compatible_gateway", { status: "down", errorType: "provider_unavailable" }),
    candidates: [provider("platform_managed_openai", { status: "healthy" })]
  });

  assert.equal(selection.action, "fallback");
  assert.equal(selection.fallbackUsed, true);
  assert.equal(selection.fallbackReason, "provider_down");
  assert.equal(selection.selectedProviderId, "platform_managed_openai");
  assert.equal(selection.selectedModelRef, "platform_managed_openai:standard");
});

test("health policy skips scheduled tasks when no allowed provider is healthy", () => {
  const modelRoute = route({
    providerPreset: "openai_compatible_gateway",
    fallbackPolicy: {
      allowCrossProviderFallback: false,
      allowCloudFallback: false
    }
  });
  const selection = selectProviderForRoute({
    route: modelRoute,
    trigger: "scheduled_task",
    primaryProvider: provider("openai_compatible_gateway", { status: "down" }),
    candidates: [provider("platform_managed_openai", { status: "healthy" })]
  });

  assert.equal(selection.action, "skip_scheduled");
  assert.equal(selection.fallbackUsed, false);
  assert.equal(selection.selectedProviderId, "");
  assert.ok(selection.evaluations.some((candidate) => candidate.reasons.includes("cross_provider_fallback_disabled")));
});

test("health policy never uses cloud fallback for local-only routes", () => {
  const modelRoute = route({
    providerPreset: "local_private_gateway",
    modelPack: "Privacy First",
    userMode: "Local / Private",
    privacyMode: "local_only"
  });
  const selection = selectProviderForRoute({
    route: modelRoute,
    primaryProvider: provider("local_private_gateway", { status: "down" }),
    candidates: [provider("platform_managed_openai", { status: "healthy" })]
  });

  assert.equal(selection.action, "fail");
  assert.equal(selection.fallbackUsed, false);
  assert.equal(selection.selectedProviderId, "");
  assert.ok(selection.evaluations.some((candidate) => candidate.providerId === "platform_managed_openai" && candidate.reasons.includes("privacy_blocks_cloud")));
});

test("health policy can use a healthy private fallback for local-only routes", () => {
  const primary = provider("local_private_gateway", { status: "down" });
  const privateFallback = provider("local_private_gateway", { status: "healthy" }, {
    modelMap: {
      ...getProviderPreset("local_private_gateway").modelMap,
      local_private: "local_private_gateway:local_backup"
    },
    modelRef: "local_private_gateway:local_backup",
    priority: 1
  });
  const modelRoute = route({
    providerPreset: "local_private_gateway",
    modelPack: "Privacy First",
    userMode: "Local / Private",
    privacyMode: "local_only",
    fallbackPolicy: { allowSameProviderFallback: true }
  });
  const selection = selectProviderForRoute({
    route: modelRoute,
    primaryProvider: primary,
    candidates: [privateFallback],
    fallbackPolicy: { allowSameProviderFallback: true }
  });

  assert.equal(selection.action, "fallback");
  assert.equal(selection.fallbackUsed, true);
  assert.equal(selection.selectedProviderId, "local_private_gateway");
  assert.equal(selection.selectedModelRef, "local_private_gateway:local_backup");
});

test("health policy asks interactive users before cloud fallback when policy requires it", () => {
  const modelRoute = route({
    providerPreset: "openai_compatible_gateway",
    fallbackPolicy: {
      requiresConfirmationForCloud: true
    }
  });
  const selection = selectProviderForRoute({
    route: modelRoute,
    trigger: "user_command",
    primaryProvider: provider("openai_compatible_gateway", { status: "down" }),
    candidates: [provider("platform_managed_openai", { status: "healthy" })]
  });

  assert.equal(selection.action, "requires_confirmation");
  assert.equal(selection.confirmationRequired, true);
  assert.equal(selection.fallbackUsed, false);
  assert.equal(selection.selectedProviderId, "platform_managed_openai");
});

test("health policy skips scheduled cloud fallback when confirmation would be required", () => {
  const modelRoute = route({
    providerPreset: "openai_compatible_gateway",
    fallbackPolicy: {
      requiresConfirmationForCloud: true
    }
  });
  const selection = selectProviderForRoute({
    route: modelRoute,
    trigger: "scheduled_task",
    primaryProvider: provider("openai_compatible_gateway", { status: "down" }),
    candidates: [provider("platform_managed_openai", { status: "healthy" })]
  });

  assert.equal(selection.action, "skip_scheduled");
  assert.equal(selection.confirmationRequired, true);
  assert.equal(selection.fallbackUsed, false);
});

test("health policy rejects candidates missing required capabilities", () => {
  const modelRoute = route({
    providerPreset: "openai_compatible_gateway",
    requiredCapabilities: ["supports_tool_calling"],
    fallbackPolicy: {
      allowCrossProviderFallback: true,
      allowCloudFallback: true
    }
  });
  const selection = selectProviderForRoute({
    route: modelRoute,
    primaryProvider: provider("openai_compatible_gateway", { status: "down" }),
    candidates: [
      provider("platform_managed_openai", { status: "healthy" }, {
        capabilities: {
          ...getProviderPreset("platform_managed_openai").capabilities,
          tool_calling: "no"
        }
      })
    ]
  });

  assert.equal(selection.action, "fail");
  assert.ok(selection.evaluations.some((candidate) => candidate.reasons.includes("capability_missing:tool_calling")));
});
