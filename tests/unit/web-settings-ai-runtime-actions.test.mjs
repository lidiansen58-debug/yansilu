import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAiSettingsPayload,
  isLocalAdvancedModelRefForSettings,
  ollamaPullModelPlan,
  ollamaRuntimePreviewFromPullResult,
  providerHealthCheckPlan,
  providerHealthResultStatus
} from "../../apps/web/src/settings-ai-runtime-actions.js";

test("AI settings runtime payload includes ready local model details only when local runtime is ready", () => {
  const payload = buildAiSettingsPayload({
    runtimeMode: "local_only",
    modelPack: "Privacy First",
    userMode: "Local / Private",
    localModel: "qwen3:8b",
    advancedModelRef: "ollama_local_gateway:qwen3:8b",
    providerDraftTouched: {}
  }, {
    preferredLocalProviderPreset: "ollama_local_gateway",
    installedLocalModelReady: () => true
  });

  assert.equal(payload.providerPreset, "local_private_gateway");
  assert.equal(payload.advancedSettings.runtimeMode, "local_only");
  assert.equal(payload.advancedSettings.localModel, "qwen3:8b");
  assert.equal(payload.advancedSettings.localProviderPreset, "ollama_local_gateway");
  assert.equal(payload.advancedSettings.modelRef, "ollama_local_gateway:qwen3:8b");
  assert.equal(isLocalAdvancedModelRefForSettings(payload.advancedSettings.modelRef), true);

  const blocked = buildAiSettingsPayload({
    runtimeMode: "local_only",
    modelPack: "Privacy First",
    userMode: "Local / Private",
    localModel: "qwen3:8b",
    advancedModelRef: "ollama_local_gateway:qwen3:8b",
    providerDraftTouched: {}
  }, {
    preferredLocalProviderPreset: "ollama_local_gateway",
    installedLocalModelReady: () => false
  });

  assert.equal(blocked.advancedSettings.localModel, undefined);
  assert.equal(blocked.advancedSettings.modelRef, undefined);
});

test("AI settings runtime payload includes touched remote provider configuration", () => {
  const payload = buildAiSettingsPayload({
    runtimeMode: "cloud_only",
    modelPack: "Global Optimized",
    userMode: "Balanced",
    providerEndpointUrl: " https://ai.example/v1 ",
    remoteRuntimeModel: " deepseek-chat ",
    secretRef: " ai-secret ",
    providerDraftTouched: {
      providerEndpointUrl: true,
      remoteRuntimeModel: true,
      secretRef: true
    }
  }, {
    installedLocalModelReady: () => false
  });

  assert.equal(payload.providerPreset, "openai_compatible_gateway");
  assert.equal(payload.endpointUrl, "https://ai.example/v1");
  assert.equal(payload.runtimeModelMap["openai_compatible_gateway:standard"], "deepseek-chat");
  assert.equal(payload.advancedSettings.secretRef, "ai-secret");
  assert.equal(payload.advancedSettings.runtimeMode, "cloud_only");
});

test("Ollama pull plan derives model command and enable flag from runtime mode", () => {
  const hybrid = ollamaPullModelPlan({
    fallbackModelName: "qwen3:8b",
    modelTiers: [{ name: "qwen3:8b", downloadCommand: "ollama pull qwen3:8b" }],
    runtimeMode: "hybrid"
  });
  assert.deepEqual(hybrid, {
    modelName: "qwen3:8b",
    command: "ollama pull qwen3:8b",
    runtimeMode: "hybrid",
    shouldEnable: true
  });

  const cloud = ollamaPullModelPlan({
    requestedModel: "custom:7b",
    runtimeMode: "cloud_only"
  });
  assert.equal(cloud.command, "ollama pull custom:7b");
  assert.equal(cloud.shouldEnable, false);
});

test("Ollama runtime preview normalizes pull result status", () => {
  assert.deepEqual(ollamaRuntimePreviewFromPullResult({ runtime: { models: ["m1"] } }), {
    models: ["m1"],
    status: "available"
  });
  assert.deepEqual(ollamaRuntimePreviewFromPullResult(null, { status: "offline" }), {
    status: "offline"
  });
});

test("provider health plan builds health-check request and skips unsupported providers", () => {
  assert.equal(providerHealthCheckPlan({ providerId: "platform_managed_openai" }).reason, "unsupported_provider");
  assert.equal(providerHealthCheckPlan({ providerId: "custom_provider" }).reason, "missing_health_endpoint");

  const plan = providerHealthCheckPlan({
    providerId: "ollama_local_gateway",
    endpointUrl: "http://127.0.0.1:11434/v1/chat/completions"
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.request.networkEnabled, true);
  assert.equal(plan.request.healthCheck.endpointUrl, "http://127.0.0.1:11434/api/tags");
  assert.equal(plan.request.healthCheck.timeoutMs, 5000);
});

test("provider health result status maps record status without API side effects", () => {
  assert.equal(providerHealthResultStatus({ record: { status: "healthy" } }).healthy, true);
  assert.equal(providerHealthResultStatus({ record: { status: "degraded" } }).healthy, false);
  assert.match(providerHealthResultStatus({ record: { status: "degraded" } }).label, /degraded/);
});
