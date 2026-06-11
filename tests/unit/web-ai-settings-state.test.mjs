import test from "node:test";
import assert from "node:assert/strict";

import {
  aiSettingsSelectionFromPreferences,
  canonicalizeAiSettingsSelection,
  isAiLocalFlowActive,
  isLocalModelPack,
  localProviderPresetForModelPack,
  normalizeAiRuntimeMode,
  providerPresetForModelPack,
  shouldUseOllamaLocalRuntimeForSelection
} from "../../apps/web/src/ai-settings-state.js";

test("AI settings state normalizes runtime aliases and local pack detection", () => {
  assert.equal(normalizeAiRuntimeMode("local"), "local_only");
  assert.equal(normalizeAiRuntimeMode("mixed"), "hybrid");
  assert.equal(normalizeAiRuntimeMode("remote"), "cloud_only");
  assert.equal(isLocalModelPack("Privacy First"), true);
  assert.equal(isLocalModelPack("MiniCPM Local"), true);
  assert.equal(isLocalModelPack("Starter Auto"), false);
  assert.equal(providerPresetForModelPack("Global Optimized"), "openai_compatible_gateway");
  assert.equal(providerPresetForModelPack("China Optimized"), "china_optimized_gateway");
  assert.equal(providerPresetForModelPack("MiniCPM Remote"), "minicpm_remote_gateway");
});

test("AI settings state promotes explicit local packs into local-only flow", () => {
  assert.deepEqual(
    canonicalizeAiSettingsSelection({
      runtimeMode: "auto",
      modelPack: "Ollama Local"
    }),
    {
      runtimeMode: "local_only",
      modelPack: "Ollama Local",
      userMode: "Local / Private",
      providerPreset: "ollama_local_gateway",
      localFlowActive: true
    }
  );
});

test("AI settings state keeps local-only mode on a local pack", () => {
  assert.deepEqual(
    canonicalizeAiSettingsSelection({
      runtimeMode: "local_only",
      modelPack: "Starter Auto",
      userMode: "Balanced"
    }),
    {
      runtimeMode: "local_only",
      modelPack: "Privacy First",
      userMode: "Balanced",
      providerPreset: "local_private_gateway",
      localFlowActive: true
    }
  );
});

test("AI settings state preserves remote provider presets", () => {
  assert.deepEqual(
    canonicalizeAiSettingsSelection({
      runtimeMode: "auto",
      modelPack: "MiniCPM Remote"
    }),
    {
      runtimeMode: "auto",
      modelPack: "MiniCPM Remote",
      userMode: "Auto",
      providerPreset: "minicpm_remote_gateway",
      localFlowActive: false
    }
  );

  assert.deepEqual(
    canonicalizeAiSettingsSelection({
      runtimeMode: "cloud_only",
      modelPack: "Global Optimized",
      providerPreset: "openai_compatible_gateway"
    }),
    {
      runtimeMode: "cloud_only",
      modelPack: "Global Optimized",
      userMode: "Balanced",
      providerPreset: "openai_compatible_gateway",
      localFlowActive: false
    }
  );
});

test("AI settings state removes local-only packs from hybrid and cloud-only routes", () => {
  assert.equal(
    canonicalizeAiSettingsSelection({
      runtimeMode: "hybrid",
      modelPack: "Privacy First"
    }).modelPack,
    "Starter Auto"
  );
  assert.equal(
    canonicalizeAiSettingsSelection({
      runtimeMode: "cloud_only",
      modelPack: "MiniCPM Local"
    }).modelPack,
    "Starter Auto"
  );
});

test("AI settings state can sync user mode and derive local flow badges", () => {
  const hybrid = canonicalizeAiSettingsSelection(
    {
      runtimeMode: "hybrid",
      modelPack: "Starter Auto",
      userMode: "Deep Thinking"
    },
    { syncUserMode: true }
  );

  assert.equal(hybrid.userMode, "Auto");
  assert.equal(isAiLocalFlowActive({ runtimeMode: "hybrid", modelPack: "Starter Auto" }), true);
  assert.equal(localProviderPresetForModelPack("Ollama Local"), "ollama_local_gateway");
});

test("AI settings state allows Ollama runtime saves for local private routes without touching MiniCPM", () => {
  assert.equal(shouldUseOllamaLocalRuntimeForSelection({
    runtimeMode: "local_only",
    modelPack: "Privacy First"
  }), true);
  assert.equal(shouldUseOllamaLocalRuntimeForSelection({
    runtimeMode: "hybrid",
    modelPack: "Starter Auto",
    providerPreset: "local_private_gateway"
  }), true);
  assert.equal(shouldUseOllamaLocalRuntimeForSelection({
    runtimeMode: "local_only",
    modelPack: "MiniCPM Local"
  }), false);
});

test("AI settings state rebuilds vault preferences and clears missing overrides", () => {
  assert.deepEqual(aiSettingsSelectionFromPreferences(null), {
    runtimeMode: "auto",
    modelPack: "Starter Auto",
    userMode: "Auto",
    providerPreset: "platform_managed_openai",
    localFlowActive: false,
    localModel: "",
    advancedModelRef: "",
    secretRef: ""
  });

  assert.deepEqual(
    aiSettingsSelectionFromPreferences({
      userMode: "Local / Private",
      modelPack: "Ollama Local",
      advancedSettings: {
        runtimeMode: "local",
        localModel: "qwen2.5:7b",
        modelRef: "ollama_local_gateway:qwen2.5:7b",
        secretRef: "secret_local_lab"
      }
    }),
    {
      runtimeMode: "local_only",
      modelPack: "Ollama Local",
      userMode: "Local / Private",
      providerPreset: "ollama_local_gateway",
      localFlowActive: true,
      localModel: "qwen2.5:7b",
      advancedModelRef: "ollama_local_gateway:qwen2.5:7b",
      secretRef: "secret_local_lab"
    }
  );
});
