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

test("settings AI runtime controller clears a pending stop state when starting Ollama", async () => {
  const settingsState = {
    ai: {
      localRuntimeManagedStopPending: true,
      localRuntimeStarting: false
    }
  };
  const controller = createSettingsAiRuntimeController(() => ({
    applyOllamaRuntimePreview: (runtime) => runtime.models,
    persistOllamaRuntimeSelectionAfterPreview: async () => {},
    renderSettingsPanel: () => {},
    setStatus: () => {},
    settingsState,
    startOllamaRuntime: async () => ({
      runtime: { status: "available", models: ["qwen3:8b"] }
    })
  }));

  await controller.startOllamaRuntimeFromUi();

  assert.equal(settingsState.ai.localRuntimeManagedStopPending, false);
  assert.equal(settingsState.ai.localRuntimeStarting, false);
});

test("settings AI runtime controller previews Ollama bootstrap and clears unavailable selection", async () => {
  const calls = [];
  const settingsState = { ai: { runtimeMode: "local_only", localModel: "qwen3:8b" } };
  const controller = createSettingsAiRuntimeController(() => ({
    applyOllamaBootstrapResult: (result) => calls.push(["bootstrap", result.ready]),
    clearLocalOllamaSelectionState: () => {
      calls.push(["clear"]);
      settingsState.ai.localModel = "";
    },
    fetchOllamaBootstrapStatus: async (request) => {
      calls.push(["fetch", request]);
      return { ready: false, message: "missing model" };
    },
    installedLocalModelReady: () => false,
    ollamaBootstrapStatusText: (result) => result.message,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    renderSettingsPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState,
    shouldUseOllamaLocalRuntime: () => true
  }));

  const result = await controller.previewOllamaLocalAiBootstrapFromUi();

  assert.equal(result.ready, false);
  assert.equal(settingsState.ai.localRuntimeChecking, false);
  assert.equal(settingsState.ai.localRuntimeError, "missing model");
  assert.equal(settingsState.ai.localModel, "");
  assert.deepEqual(calls.find((call) => call[0] === "fetch"), ["fetch", { model: "qwen3:8b", runtimeMode: "local_only" }]);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "warn"), true);
});

test("settings AI runtime controller can preview Ollama bootstrap before local mode is persisted", async () => {
  const calls = [];
  const settingsState = { ai: { runtimeMode: "auto", localModel: "" } };
  const controller = createSettingsAiRuntimeController(() => ({
    applyOllamaBootstrapResult: (result) => calls.push(["bootstrap", result.status]),
    fetchOllamaBootstrapStatus: async (request) => {
      calls.push(["fetch", request]);
      return { ready: false, status: "needs_install", model: "qwen3:8b" };
    },
    ollamaBootstrapStatusText: () => "请先安装本地 AI 运行环境",
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    renderSettingsPanel: () => calls.push(["render"]),
    settingsState,
    shouldUseOllamaLocalRuntime: () => false
  }));

  const result = await controller.previewOllamaLocalAiBootstrapFromUi({
    allowLocalSetupPreview: true,
    silent: true,
    render: false
  });

  assert.equal(result.status, "needs_install");
  assert.deepEqual(calls.find((call) => call[0] === "fetch"), ["fetch", { model: "qwen3:8b", runtimeMode: "local_only" }]);
});

test("settings AI runtime controller detects Ollama models and persists runtime selection", async () => {
  const calls = [];
  const settingsState = { ai: { localRuntimeStatus: "", localRuntimeError: "" } };
  const controller = createSettingsAiRuntimeController(() => ({
    applyOllamaRuntimePreview: (runtime) => {
      settingsState.ai.localRuntimeStatus = runtime.status;
      settingsState.ai.localRuntimeModels = runtime.models;
      calls.push(["preview", runtime.models.length]);
      return runtime.models;
    },
    fetchOllamaModels: async () => ({ status: "available", models: ["qwen3:8b", "llama3.1:8b"] }),
    persistOllamaRuntimeSelectionAfterPreview: async () => calls.push(["persist-runtime"]),
    renderSettingsPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState
  }));

  const runtime = await controller.detectOllamaModels();

  assert.equal(runtime.status, "available");
  assert.deepEqual(settingsState.ai.localRuntimeModels, ["qwen3:8b", "llama3.1:8b"]);
  assert.equal(settingsState.ai.localRuntimeChecking, false);
  assert.deepEqual(calls.find((call) => call[0] === "preview"), ["preview", 2]);
  assert.equal(calls.some((call) => call[0] === "persist-runtime"), true);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "ok"), true);
});

test("settings AI runtime controller selects installed local model and refreshes route", async () => {
  const calls = [];
  const settingsState = { ai: { runtimeMode: "hybrid", localModel: "", localRuntimeModels: ["qwen3:8b"] } };
  const controller = createSettingsAiRuntimeController(() => ({
    applyOllamaLocalModelDefaults: () => calls.push(["defaults"]),
    clearLocalOllamaSelectionState: (options) => calls.push(["clear", options]),
    currentOllamaModelTiers: () => [{ name: "qwen3:8b" }],
    hasLocalModel: (model) => model === "qwen3:8b",
    installedLocalModelReady: () => true,
    persistAiSettingsToStorage: () => calls.push(["persist"]),
    refreshAiRoutePreview: async () => calls.push(["route"]),
    renderSettingsPanel: () => calls.push(["render"]),
    saveLocalOllamaProviderConfig: async () => calls.push(["save-local-provider"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState,
    shouldUseOllamaLocalRuntime: () => true,
    syncAiSettingsToApi: async () => calls.push(["sync"])
  }));

  const selected = await controller.selectInstalledLocalModelFromUi("qwen3:8b");

  assert.equal(selected, "qwen3:8b");
  assert.equal(settingsState.ai.localModel, "qwen3:8b");
  assert.equal(calls.some((call) => call[0] === "save-local-provider"), true);
  assert.equal(calls.some((call) => call[0] === "route"), true);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "ok"), true);
});

test("settings AI runtime controller refreshes route preview through injected API", async () => {
  const calls = [];
  const settingsState = { ai: { routePreview: null, routePreviewError: "" } };
  const controller = createSettingsAiRuntimeController(() => ({
    aiSettingsPayload: () => ({ runtimeMode: "hybrid" }),
    applyActiveAiProviderConfigToState: () => calls.push(["apply-active"]),
    previewAiRoute: async (payload) => {
      calls.push(["preview-route", payload.runtimeMode]);
      return { route: "local-first" };
    },
    renderSettingsPanel: () => calls.push(["render"]),
    settingsState
  }));

  const preview = await controller.refreshAiRoutePreview();

  assert.deepEqual(preview, { route: "local-first" });
  assert.equal(settingsState.ai.routePreviewLoading, false);
  assert.equal(settingsState.ai.routePreviewError, "");
  assert.deepEqual(calls.find((call) => call[0] === "preview-route"), ["preview-route", "hybrid"]);
  assert.equal(calls.some((call) => call[0] === "apply-active"), true);
});

test("settings AI runtime controller saves provider config and refreshes preview", async () => {
  const calls = [];
  const settingsState = { ai: { providerConfigSaving: false, providerConfigError: "" } };
  const controller = createSettingsAiRuntimeController(() => ({
    aiProviderConfigPayload: () => ({ providerId: "openai_compatible_gateway" }),
    applyActiveAiProviderConfigToState: () => calls.push(["apply-active"]),
    currentAiProviderId: () => "openai_compatible_gateway",
    persistAiSettingsToStorage: () => calls.push(["persist"]),
    refreshAiRoutePreview: async (options) => calls.push(["route", options]),
    renderSettingsPanel: () => calls.push(["render"]),
    resetAiProviderDraftTouched: () => calls.push(["reset"]),
    saveAiProviderConfig: async (payload) => {
      calls.push(["save", payload.providerId]);
      return { providerId: payload.providerId };
    },
    setStatus: (...args) => calls.push(["status", ...args]),
    settingsState,
    syncAiSettingsToApi: async () => calls.push(["sync"]),
    upsertAiProviderConfig: (config) => calls.push(["upsert", config.providerId])
  }));

  const ok = await controller.syncAiProviderConfigToApi();

  assert.equal(ok, true);
  assert.equal(settingsState.ai.providerConfigSaving, false);
  assert.equal(settingsState.ai.providerConfigError, "");
  assert.deepEqual(calls.find((call) => call[0] === "save"), ["save", "openai_compatible_gateway"]);
  assert.deepEqual(calls.find((call) => call[0] === "route"), ["route", { render: false }]);
  assert.equal(calls.some((call) => call[0] === "status" && call[2] === "ok"), true);
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
