import test from "node:test";
import assert from "node:assert/strict";
import { createSettingsAiStateRuntime } from "../../apps/web/src/settings-ai-state-runtime.js";

function fixture() {
  const settingsState = { ai: { localModel: "qwen2.5:7b" } };
  const runtime = createSettingsAiStateRuntime({
    settingsState,
    currentOllamaModelTiers: () => [],
    normalizeOllamaSetupGuide: value => value,
    selectedLocalModelNameForInstalledModels: (selected, models) => models.includes(selected) ? selected : models[0] || "",
    modelNameExistsInList: (name, models) => models.includes(name),
    applyOllamaLocalModelDefaults: () => {},
    clearLocalOllamaSelectionState: () => { settingsState.ai.localModel = ""; },
    persistAiSettingsToStorage: () => {},
    upsertAiProviderConfig: () => {},
    applyAiPreferencesToSettingsState: preferences => { settingsState.ai.localModel = preferences.advancedSettings.localModel; }
  });
  return { settingsState, runtime };
}

test("missing saved config fills defaults only when no endpoint draft exists", () => {
  const settingsState = { ai: { providerEndpointUrl: "https://draft.test/v1", providerHealthEndpointUrl: "", providerDraftTouched: { providerEndpointUrl: true, providerHealthEndpointUrl: true } } };
  const runtime = createSettingsAiStateRuntime({
    settingsState, currentAiProviderId: () => "openai_compatible_gateway", activeAiProviderConfig: () => null,
    defaultProviderEndpointUrl: () => "https://default.test/v1", defaultProviderHealthEndpointUrl: () => "https://default.test/health",
    isRemoteConfigurableProviderId: () => true
  });
  runtime.applyActiveAiProviderConfigToState();
  assert.equal(settingsState.ai.providerEndpointUrl, "https://draft.test/v1");
  assert.equal(settingsState.ai.providerHealthEndpointUrl, "");
  settingsState.ai.providerEndpointUrl = "";
  runtime.applyActiveAiProviderConfigToState();
  assert.equal(settingsState.ai.providerEndpointUrl, "");
  settingsState.ai.providerDraftTouched = {};
  runtime.applyActiveAiProviderConfigToState();
  assert.equal(settingsState.ai.providerEndpointUrl, "https://default.test/v1");
  assert.equal(settingsState.ai.providerHealthEndpointUrl, "https://default.test/health");
});

test("bootstrap preview retains the user's installed model instead of replacing it with the recommendation", () => {
  const { settingsState, runtime } = fixture();
  runtime.applyOllamaBootstrapResult({ model: "qwen3:8b", runtime: { status: "available", models: ["qwen3:8b", "qwen2.5:7b"] } });
  assert.equal(settingsState.ai.localModel, "qwen2.5:7b");
});

test("explicit bootstrap activation can switch to the newly enabled model", () => {
  const { settingsState, runtime } = fixture();
  runtime.applyOllamaBootstrapResult({ model: "qwen3:8b", runtime: { status: "available", models: ["qwen3:8b", "qwen2.5:7b"] },
    enabled: { preferences: { advancedSettings: { localModel: "qwen3:8b" } } } });
  assert.equal(settingsState.ai.localModel, "qwen3:8b");
});
