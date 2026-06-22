import test from "node:test";
import assert from "node:assert/strict";
import { applyAiRuntimeModeChangeForRuntime } from "../../apps/web/src/ai-runtime-mode-controller.js";

function runtimeModeDeps(overrides = {}) {
  const calls = [];
  const settingsState = {
    ai: {
      runtimeMode: "auto",
      userMode: "Auto",
      modelPack: "Starter Auto"
    }
  };
  return {
    calls,
    settingsState,
    deps: {
      settingsState,
      normalizeAiRuntimeMode: (value) => String(value || "auto").trim().toLowerCase() || "auto",
      aiDefaultsForRuntimeMode: (mode) => ({
        userMode: mode === "hybrid" ? "Hybrid" : "Auto",
        modelPack: mode === "hybrid" ? "Local + Cloud" : "Starter Auto"
      }),
      reconcileAiSelectionState: (options) => calls.push(["reconcile", options]),
      persistAiSettingsToStorage: () => calls.push(["persist"]),
      syncAiSettingsToApi: async () => calls.push(["sync"]),
      isAiLocalFlowActive: (input) => {
        calls.push(["local-active", input]);
        return input.runtimeMode === "hybrid";
      },
      shouldUseOllamaLocalRuntime: () => true,
      previewOllamaLocalAiBootstrapFromUi: async (options) => calls.push(["bootstrap", options]),
      localAiPreviewOptionsForAction: (action) => ({ action }),
      refreshAiRoutePreview: async () => calls.push(["refresh-route"]),
      renderSettingsPanel: () => calls.push(["render"]),
      setStatus: (message, level) => calls.push(["status", level, message]),
      currentAiProviderId: () => "local_private_gateway",
      settingsAiAdvancedRuntimeModeLabel: (mode) => `mode:${mode}`,
      ...overrides
    }
  };
}

test("AI runtime mode controller applies defaults, syncs settings, and renders status", async () => {
  const { calls, settingsState, deps } = runtimeModeDeps();

  const result = await applyAiRuntimeModeChangeForRuntime("auto", deps);

  assert.deepEqual(result, {
    runtimeMode: "auto",
    userMode: "Auto",
    modelPack: "Starter Auto"
  });
  assert.equal(settingsState.ai.runtimeMode, "auto");
  assert.deepEqual(calls.map((call) => call[0]), ["reconcile", "persist", "sync", "local-active", "refresh-route", "render", "status"]);
  assert.deepEqual(calls[0][1], { syncUserMode: true, resetProviderState: true });
  assert.equal(calls.at(-1)[1], "ok");
});

test("AI runtime mode controller previews local bootstrap when hybrid local flow is active", async () => {
  const { calls, settingsState, deps } = runtimeModeDeps();

  await applyAiRuntimeModeChangeForRuntime("hybrid", deps);

  assert.equal(settingsState.ai.runtimeMode, "hybrid");
  assert.equal(settingsState.ai.userMode, "Hybrid");
  assert.equal(settingsState.ai.modelPack, "Local + Cloud");
  assert.deepEqual(calls.map((call) => call[0]), ["reconcile", "persist", "sync", "local-active", "bootstrap", "refresh-route", "render", "status"]);
  assert.deepEqual(calls.find((call) => call[0] === "bootstrap")[1], { action: "runtime_mode_change" });
});

test("AI runtime mode controller skips local bootstrap when runtime is unavailable", async () => {
  const { calls, deps } = runtimeModeDeps({
    shouldUseOllamaLocalRuntime: () => false
  });

  await applyAiRuntimeModeChangeForRuntime("hybrid", deps);

  assert.equal(calls.some((call) => call[0] === "bootstrap"), false);
  assert.deepEqual(calls.map((call) => call[0]), ["reconcile", "persist", "sync", "local-active", "refresh-route", "render", "status"]);
});
