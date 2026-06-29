import test from "node:test";
import assert from "node:assert/strict";

import {
  createSettingsAiRuntimeController
} from "../../apps/web/src/settings-ai-runtime-controller.js";

test("settings AI runtime controller builds payload from injected state", () => {
  const controller = createSettingsAiRuntimeController(() => ({
    installedLocalModelReady: () => true,
    preferredLocalProviderPresetForSelection: () => "ollama_local_gateway",
    settingsState: {
      ai: {
        runtimeMode: "local_only",
        modelPack: "Privacy First",
        userMode: "Local",
        localModel: "qwen3:8b",
        advancedModelRef: "ollama_local_gateway:qwen3:8b",
        providerDraftTouched: {}
      }
    }
  }));

  const payload = controller.aiSettingsPayload();

  assert.equal(payload.advancedSettings.localModel, "qwen3:8b");
  assert.equal(payload.advancedSettings.localProviderPreset, "ollama_local_gateway");
});

test("settings AI runtime controller pulls recommended Ollama model and persists selection", async () => {
  const calls = [];
  const settingsState = { ai: { runtimeMode: "hybrid", localRuntimeModels: [], localModel: "" } };
  const controller = createSettingsAiRuntimeController(() => ({
    applyOllamaLocalModelDefaults: () => calls.push(["defaults"]),
    applyOllamaRuntimePreview: (runtime) => {
      calls.push(["preview", runtime.status]);
      settingsState.ai.localRuntimeModels = runtime.models;
      return runtime.models;
    },
    currentOllamaModelTiers: () => [{ name: "qwen3:8b", downloadCommand: "ollama pull qwen3:8b" }],
    fetchOllamaModels: async () => ({ models: ["qwen3:8b"], status: "available" }),
    installedLocalModelReady: (model = settingsState.ai.localModel) => model === "qwen3:8b",
    ollamaPullModelName: () => "qwen3:8b",
    persistAiSettingsToStorage: () => calls.push(["persist"]),
    persistOllamaRuntimeSelectionAfterPreview: async () => calls.push(["persist-runtime"]),
    pullOllamaModel: async (model, options) => {
      calls.push(["pull", model, options]);
      return { runtime: { models: ["qwen3:8b"], status: "available" } };
    },
    renderSettingsPanel: () => calls.push(["render"]),
    selectedLocalModelNameForInstalledModels: (model) => model,
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState,
    window: { confirm: () => true }
  }));

  const result = await controller.pullRecommendedOllamaModel();

  assert.equal(result.runtime.status, "available");
  assert.equal(settingsState.ai.localRuntimePulling, false);
  assert.equal(settingsState.ai.localModel, "qwen3:8b");
  assert.deepEqual(calls.find((call) => call[0] === "pull"), ["pull", "qwen3:8b", { enable: true, runtimeMode: "hybrid" }]);
  assert.equal(calls.some((call) => call[0] === "status" && /qwen3:8b/.test(call[1]) && call[2] === "ok"), true);
});

test("settings AI runtime controller handles missing provider health endpoint", async () => {
  const calls = [];
  const settingsState = { ai: { providerEndpointUrl: "", providerHealthEndpointUrl: "", providerHealthResult: { record: {} } } };
  const controller = createSettingsAiRuntimeController(() => ({
    currentAiProviderId: () => "custom_provider",
    renderSettingsPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState
  }));

  const ok = await controller.checkCurrentAiProviderHealth();

  assert.equal(ok, false);
  assert.equal(settingsState.ai.providerHealthResult, null);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "warn"), true);
});

test("settings AI runtime controller checks provider health through injected APIs", async () => {
  const calls = [];
  const settingsState = {
    ai: {
      providerEndpointUrl: "https://ai.example/v1",
      providerHealthEndpointUrl: "https://ai.example/health"
    }
  };
  const controller = createSettingsAiRuntimeController(() => ({
    aiProviderConfigPayload: () => ({ providerId: "openai_compatible_gateway" }),
    applyActiveAiProviderConfigToState: () => calls.push(["apply"]),
    checkAiProviderHealth: async (providerId, request) => {
      calls.push(["health", providerId, request.healthCheck.endpointUrl]);
      return { record: { status: "healthy" } };
    },
    currentAiProviderId: () => "openai_compatible_gateway",
    renderSettingsPanel: () => calls.push(["render"]),
    resetAiProviderDraftTouched: () => calls.push(["reset"]),
    saveAiProviderConfig: async (payload) => {
      calls.push(["save", payload.providerId]);
      return { providerId: payload.providerId };
    },
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState,
    upsertAiProviderConfig: (config) => calls.push(["upsert", config.providerId])
  }));

  const ok = await controller.checkCurrentAiProviderHealth();

  assert.equal(ok, true);
  assert.deepEqual(settingsState.ai.providerHealthResult, { record: { status: "healthy" } });
  assert.equal(settingsState.ai.providerHealthChecking, false);
  assert.deepEqual(calls.find((call) => call[0] === "health"), ["health", "openai_compatible_gateway", "https://ai.example/health"]);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "ok"), true);
});
