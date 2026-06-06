import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalizeAiSettingsSelection,
  isAiLocalFlowActive,
  isLocalModelPack,
  localProviderPresetForModelPack,
  normalizeAiRuntimeMode
} from "../../apps/web/src/ai-settings-state.js";

test("AI settings state normalizes runtime aliases and local pack detection", () => {
  assert.equal(normalizeAiRuntimeMode("local"), "local_only");
  assert.equal(normalizeAiRuntimeMode("mixed"), "hybrid");
  assert.equal(normalizeAiRuntimeMode("remote"), "cloud_only");
  assert.equal(isLocalModelPack("Privacy First"), true);
  assert.equal(isLocalModelPack("MiniCPM Local"), true);
  assert.equal(isLocalModelPack("Starter Auto"), false);
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
