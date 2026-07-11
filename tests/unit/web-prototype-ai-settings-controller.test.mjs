import test from "node:test";
import assert from "node:assert/strict";

import {
  aiDefaultsForRuntimeMode,
  defaultProviderEndpointUrl,
  defaultProviderHealthEndpointUrl,
  isBuiltInOllamaModel,
  isRemoteConfigurableProviderId,
  localModelDisplayProfile,
  modelNameExistsInList,
  normalizeOllamaSetupGuide,
  ollamaBootstrapStatusText,
  ollamaModelRecommendationProfiles,
  preferredLocalModelName,
  runtimeModelMapForRemoteModel,
  selectedLocalModelNameForInstalledModels
} from "../../apps/web/src/prototype-ai-settings-controller.js";

test("prototype AI settings helpers keep provider defaults and runtime policies pure", () => {
  assert.equal(defaultProviderEndpointUrl("ollama_local_gateway"), "http://127.0.0.1:11434/v1/chat/completions");
  assert.equal(defaultProviderHealthEndpointUrl("ollama_local_gateway"), "http://127.0.0.1:11434/api/tags");
  assert.equal(isRemoteConfigurableProviderId("openai_compatible_gateway"), true);
  assert.equal(isRemoteConfigurableProviderId("ollama_local_gateway"), false);
  assert.deepEqual(runtimeModelMapForRemoteModel("openai_compatible_gateway", "deepseek-chat"), {
    "openai_compatible_gateway:router_fast": "deepseek-chat",
    "openai_compatible_gateway:cheap_fast": "deepseek-chat",
    "openai_compatible_gateway:standard": "deepseek-chat",
    "openai_compatible_gateway:strong_reasoning": "deepseek-chat",
    "openai_compatible_gateway:guardrail": "deepseek-chat"
  });
  assert.deepEqual(aiDefaultsForRuntimeMode("local"), {
    modelPack: "Privacy First",
    userMode: "Local / Private"
  });
});

test("prototype AI settings helpers select only built-in Ollama catalog models", () => {
  const models = [{ name: "qwen2.5:7b" }, { name: "qwen3:8b" }];

  assert.equal(preferredLocalModelName(models), "qwen3:8b");
  assert.equal(modelNameExistsInList("qwen3:8b", models), true);
  assert.equal(selectedLocalModelNameForInstalledModels("qwen3:8b", models), "qwen3:8b");
  assert.equal(selectedLocalModelNameForInstalledModels("llama3.2:3b", [{ name: "llama3.2:3b" }]), "");
  assert.equal(isBuiltInOllamaModel("qwen3:8b"), true);
  assert.equal(isBuiltInOllamaModel("llama3.2:3b"), false);
});

test("prototype AI settings helpers accept runtime Ollama tiers without app state", () => {
  const tiers = [{
    name: "custom-local:7b",
    tier: "default",
    scenario: "Local custom testing",
    downloadCommand: "ollama pull custom-local:7b"
  }];

  assert.equal(ollamaModelRecommendationProfiles(tiers)[0].name, "custom-local:7b");
  assert.equal(isBuiltInOllamaModel("custom-local:7b", tiers), true);
  assert.equal(localModelDisplayProfile("custom-local:7b", tiers).downloadCommand, "ollama pull custom-local:7b");
});

test("prototype AI settings helpers normalize setup guides and bootstrap status", () => {
  assert.deepEqual(normalizeOllamaSetupGuide({
    next_action: "install",
    install: { commands: ["brew install ollama"] },
    recommended_model: "qwen3:8b"
  }), {
    nextAction: "install",
    installUrl: "https://ollama.com/download",
    recommendedModel: "qwen3:8b",
    commands: ["brew install ollama"],
    steps: []
  });
  assert.match(ollamaBootstrapStatusText({ status: "needs_model", model: "qwen3:8b" }), /请先下载本地模型：qwen3:8b/);
});
