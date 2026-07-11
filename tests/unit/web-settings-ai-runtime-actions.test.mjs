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
import {
  buildAiProviderConfigPayload
} from "../../apps/web/src/settings-ai-provider-config-actions.js";

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
    remoteApiKey: " sk-test-key ",
    providerDraftTouched: {
      providerEndpointUrl: true,
      remoteRuntimeModel: true,
      secretRef: true
    }
  }, {
    installedLocalModelReady: () => false
  });

  assert.equal(payload.providerPreset, "openai_compatible_gateway");
  assert.equal(payload.endpointUrl, "https://ai.example/v1/chat/completions");
  assert.equal(payload.runtimeModelMap["openai_compatible_gateway:standard"], "deepseek-chat");
  assert.equal(payload.advancedSettings.secretRef, "local:settings-remote-api-key");
  assert.equal(payload.secrets["local:settings-remote-api-key"], "sk-test-key");
  assert.equal(payload.advancedSettings.runtimeMode, "cloud_only");
});

test("AI provider config payload enables local and remote configs from injected state", () => {
  const localPayload = buildAiProviderConfigPayload({
    localModel: "qwen3:8b",
    providerEndpointUrl: "http://127.0.0.1:11434/v1/chat/completions"
  }, {
    providerId: "ollama_local_gateway",
    authMode: "none",
    isRemoteConfigurableProvider: () => false,
    providerAuthModeRequiresSecret: () => false,
    localModelTiers: ["cheap_fast", "standard"]
  });

  assert.equal(localPayload.providerId, "ollama_local_gateway");
  assert.equal(localPayload.status, "enabled");
  assert.equal(localPayload.runtimeModelMap["ollama_local_gateway:cheap_fast"], "qwen3:8b");
  assert.equal(localPayload.healthCheck.enabled, true);

  const remotePayload = buildAiProviderConfigPayload({
    providerEndpointUrl: "https://ai.example/v1",
    providerHealthEndpointUrl: "https://ai.example/health",
    remoteRuntimeModel: "deepseek-chat",
    remoteApiKey: "sk-test-key"
  }, {
    providerId: "openai_compatible_gateway",
    authMode: "api_key",
    isRemoteConfigurableProvider: () => true,
    providerAuthModeRequiresSecret: () => true
  });

  assert.equal(remotePayload.status, "enabled");
  assert.equal(remotePayload.endpointUrl, "https://ai.example/v1/chat/completions");
  assert.equal(remotePayload.secretRef, "local:settings-remote-api-key");
  assert.equal(remotePayload.secrets["local:settings-remote-api-key"], "sk-test-key");
  assert.equal(remotePayload.runtimeModelMap["openai_compatible_gateway:standard"], "deepseek-chat");
  assert.equal(remotePayload.healthCheck.enabled, true);

  const disabledRemote = buildAiProviderConfigPayload({
    providerEndpointUrl: "https://ai.example/v1",
    remoteRuntimeModel: "deepseek-chat",
    remoteApiKey: "",
    providerDraftTouched: { secretRef: true }
  }, {
    providerId: "openai_compatible_gateway",
    authMode: "api_key",
    isRemoteConfigurableProvider: () => true,
    providerAuthModeRequiresSecret: () => true
  });

  assert.equal(disabledRemote.status, "disabled");
  assert.deepEqual(disabledRemote.deleteSecrets, ["local:settings-remote-api-key"]);
});

test("AI settings payload deletes the local remote API key when the key field is cleared", () => {
  const payload = buildAiSettingsPayload({
    runtimeMode: "cloud_only",
    modelPack: "Global Optimized",
    providerEndpointUrl: "https://ai.example/v1",
    remoteRuntimeModel: "deepseek-chat",
    remoteApiKey: "",
    providerDraftTouched: {
      providerEndpointUrl: true,
      remoteRuntimeModel: true,
      secretRef: true
    }
  }, {
    installedLocalModelReady: () => false
  });

  assert.equal(payload.advancedSettings.secretRef, "");
  assert.equal(payload.secrets, undefined);
  assert.deepEqual(payload.deleteSecrets, ["local:settings-remote-api-key"]);
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
