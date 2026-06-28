import test from "node:test";
import assert from "node:assert/strict";
import {
  renderAiLocalModelControlsForRuntime,
  renderAiLocalModelRecommendationsForRuntime,
  renderAiProviderConfigControlsForRuntime
} from "../../apps/web/src/settings-ai-controls-view.js";

function createElement() {
  const toggles = [];
  const attrs = {};
  return {
    textContent: "",
    innerHTML: "",
    value: "",
    disabled: false,
    placeholder: "",
    dataset: {},
    toggles,
    attrs,
    classList: {
      remove: (name) => toggles.push([name, false]),
      toggle: (name, force) => toggles.push([name, force])
    },
    getAttribute: (name) => attrs[name] || "",
    setAttribute: (name, value) => {
      attrs[name] = value;
    }
  };
}

function elementMap() {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, createElement());
    return elements.get(id);
  };
  return { elements, get };
}

function baseLocalDeps(get, overrides = {}) {
  return {
    $: get,
    escapeHtml: (value = "") => String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"),
    settingsState: {
      ai: {
        runtimeMode: "local_only",
        modelPack: "Privacy First",
        localRuntimeStatus: "available",
        localRuntimeModels: [{ name: "qwen3:4b" }],
        localModel: "qwen3:4b",
        ...overrides.ai
      }
    },
    normalizeAiRuntimeMode: (value) => value || "auto",
    isAiLocalFlowActive: () => true,
    currentAiProviderId: () => "ollama_local_gateway",
    isLocalModelPack: () => true,
    ollamaModelRecommendationProfiles: () => [{ name: "qwen3:4b" }, { name: "llama3.2" }],
    currentOllamaModelTiers: () => [],
    currentOllamaSetupGuide: () => ({ installUrl: "https://ollama.example/download", commands: ["brew install ollama"] }),
    ollamaPullModelName: () => "llama3.2",
    ollamaRecommendationForModel: () => ({ label: "轻量" }),
    hasLocalModel: (name) => String(name).toLowerCase() === "qwen3:4b",
    localModelDisplayProfile: (name) => ({
      name,
      label: name,
      role: name === "qwen3:4b" ? "日常整理" : "备用",
      note: `${name} note`,
      verified: true,
      sizeHint: "4B"
    }),
    renderAiLocalModelRecommendations: () => {
      get("recommendationRenderMarker").textContent = "called";
    },
    ...overrides.deps
  };
}

test("settings AI local controls render available local model state", () => {
  const { get } = elementMap();

  renderAiLocalModelControlsForRuntime(baseLocalDeps(get));

  assert.equal(get("settingsAiRuntimeMode").value, "local_only");
  assert.match(get("settingsAiLocalModel").innerHTML, /qwen3:4b/);
  assert.equal(get("settingsAiLocalModel").value, "qwen3:4b");
  assert.deepEqual(get("settingsAiUseLocalSetup").toggles.find((item) => item[0] === "hidden"), ["hidden", true]);
  assert.equal(get("settingsAiDetectOllama").textContent, "重新检测本地 AI");
  assert.deepEqual(get("settingsAiStopOllama").toggles.find((item) => item[0] === "hidden"), ["hidden", false]);
  assert.equal(get("settingsAiPullOllamaModel").textContent, "下载 llama3.2（轻量）");
  assert.equal(get("recommendationRenderMarker").textContent, "called");
});

test("settings AI local recommendations show selected installed and download actions", () => {
  const { get } = elementMap();

  renderAiLocalModelRecommendationsForRuntime(baseLocalDeps(get));

  const html = get("settingsAiLocalModelRecommendations").innerHTML;
  assert.match(html, /已检测到 1 个可用模型/);
  assert.match(html, /当前使用/);
  assert.match(html, /data-settings-ai-pull-local-model="llama3.2"/);
  assert.match(html, /data-settings-ai-copy-command="ollama pull llama3.2"/);
});

test("settings AI provider controls render health and action states", () => {
  const { get } = elementMap();

  renderAiProviderConfigControlsForRuntime({
    $: get,
    settingsState: {
      ai: {
        remoteRuntimeModel: "deepseek-chat",
        providerEndpointUrl: "https://api.example/v1/chat",
        providerHealthEndpointUrl: "",
        providerHealthResult: { record: { status: "healthy", latencyMs: 42 } }
      }
    },
    currentAiProviderId: () => "openai_compatible_gateway",
    isRemoteConfigurableProviderId: () => true,
    activeAiProviderConfig: () => ({
      endpointUrl: "https://api.example/v1/chat",
      runtimeModelMap: { default: "deepseek-chat" }
    }),
    remoteRuntimeModelFromMap: () => "deepseek-chat",
    defaultProviderEndpointUrl: () => "https://api.example/v1/chat",
    defaultProviderHealthEndpointUrl: () => "https://api.example/health"
  });

  assert.equal(get("settingsAiRemoteRuntimeModel").value, "deepseek-chat");
  assert.equal(get("settingsAiRemoteRuntimeModel").disabled, false);
  assert.equal(get("settingsAiProviderConfigBadge").textContent, "健康 42ms");
  assert.equal(get("settingsAiSaveProviderConfig").textContent, "保存服务连接");
  assert.equal(get("settingsAiCheckProviderHealth").textContent, "测试服务连接");
  assert.equal(get("settingsAiCheckProviderHealth").disabled, false);
});

test("settings AI provider controls disable platform managed provider actions", () => {
  const { get } = elementMap();

  renderAiProviderConfigControlsForRuntime({
    $: get,
    settingsState: { ai: {} },
    currentAiProviderId: () => "platform_managed_openai",
    isRemoteConfigurableProviderId: () => false,
    activeAiProviderConfig: () => null
  });

  assert.equal(get("settingsAiRemoteRuntimeModel").disabled, true);
  assert.equal(get("settingsAiProviderConfigBadge").textContent, "平台托管");
  assert.equal(get("settingsAiSaveProviderConfig").disabled, true);
  assert.equal(get("settingsAiSaveProviderConfig").textContent, "默认服务无需保存");
  assert.equal(get("settingsAiCheckProviderHealth").disabled, true);
  assert.equal(get("settingsAiCheckProviderHealth").textContent, "平台托管");
});
