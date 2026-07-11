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
    checked: false,
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
  return { get };
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
        autoPrepareLocalAi: true,
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
  assert.deepEqual(get("settingsAiLocalOptions").toggles.find((item) => item[0] === "hidden"), ["hidden", false]);
  assert.equal(get("settingsAiAutoPrepareLocal").checked, true);
  assert.equal(get("settingsAiAutoPrepareLocal").disabled, false);
  assert.deepEqual(get("settingsAiUseLocalSetup").toggles.find((item) => item[0] === "hidden"), ["hidden", true]);
  assert.equal(get("settingsAiDetectOllama").textContent, "重新检测");
  assert.deepEqual(get("settingsAiRuntimeToggle").toggles.find((item) => item[0] === "hidden"), ["hidden", false]);
  assert.equal(get("settingsAiRuntimeToggle").textContent, "停止本地模型");
  assert.equal(get("settingsAiPullOllamaModel").textContent, "下载 llama3.2（轻量）");
  assert.equal(get("recommendationRenderMarker").textContent, "called");
});

test("settings AI local controls hide the local toolbar outside local mode", () => {
  const { get } = elementMap();

  renderAiLocalModelControlsForRuntime(baseLocalDeps(get, {
    ai: {
      runtimeMode: "cloud_only",
      modelPack: "Global Optimized"
    },
    deps: {
      isAiLocalFlowActive: () => false,
      isLocalModelPack: () => false
    }
  }));

  assert.deepEqual(get("settingsAiLocalOptions").toggles.find((item) => item[0] === "hidden"), ["hidden", true]);
});

test("settings AI local controls keep the Ollama runtime action visible when stopped", () => {
  const { get } = elementMap();

  renderAiLocalModelControlsForRuntime(baseLocalDeps(get, {
    ai: {
      localRuntimeStatus: "unavailable",
      localRuntimeReadinessStatus: "installed_not_running"
    }
  }));

  assert.deepEqual(get("settingsAiRuntimeToggle").toggles.find((item) => item[0] === "hidden"), ["hidden", false]);
  assert.equal(get("settingsAiRuntimeToggle").textContent, "启动本地模型");
});

test("settings AI local controls hide runtime start before the first detection", () => {
  const { get } = elementMap();

  renderAiLocalModelControlsForRuntime(baseLocalDeps(get, {
    ai: {
      localRuntimeStatus: "unknown",
      localRuntimeReadinessStatus: "unknown"
    }
  }));

  assert.deepEqual(get("settingsAiRuntimeToggle").toggles.find((item) => item[0] === "hidden"), ["hidden", true]);
  assert.deepEqual(get("settingsAiDetectOllama").toggles.find((item) => item[0] === "hidden"), ["hidden", true]);
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

test("settings AI provider controls separate connection health from successful AI test", () => {
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
  assert.equal(get("settingsAiProviderConfigBadge").textContent, "连接正常");
  assert.ok(!get("settingsAiProviderConfigBadge").toggles.some(([name, force]) => name === "ok" && force === true));
  assert.equal(get("settingsAiSaveProviderConfig").textContent, "保存远程设置");
  assert.equal(get("settingsAiCheckProviderHealth").textContent, "测试连接");
  assert.equal(get("settingsAiCheckProviderHealth").disabled, false);
});

test("settings AI provider controls marks provider ready only after test output", () => {
  const { get } = elementMap();

  renderAiProviderConfigControlsForRuntime({
    $: get,
    settingsState: {
      ai: {
        remoteRuntimeModel: "deepseek-chat",
        providerEndpointUrl: "https://api.example/v1/chat",
        providerHealthEndpointUrl: "",
        secretRef: "AI_KEY",
        providerHealthResult: { record: { status: "healthy", latencyMs: 42 } },
        testStatus: "success",
        testOutput: "pong"
      }
    },
    currentAiProviderId: () => "openai_compatible_gateway",
    isRemoteConfigurableProviderId: () => true,
    activeAiProviderConfig: () => ({
      endpointUrl: "https://api.example/v1/chat",
      secretRef: "AI_KEY",
      runtimeModelMap: { default: "deepseek-chat" }
    }),
    remoteRuntimeModelFromMap: () => "deepseek-chat",
    defaultProviderEndpointUrl: () => "https://api.example/v1/chat",
    defaultProviderHealthEndpointUrl: () => "https://api.example/health"
  });

  assert.equal(get("settingsAiProviderConfigBadge").textContent, "测试成功");
  assert.ok(get("settingsAiProviderConfigBadge").toggles.some(([name, force]) => name === "ok" && force === true));
});

test("settings AI provider controls do not mark failed test output as successful", () => {
  const { get } = elementMap();

  renderAiProviderConfigControlsForRuntime({
    $: get,
    settingsState: {
      ai: {
        remoteRuntimeModel: "deepseek-chat",
        providerEndpointUrl: "https://api.example/v1/chat",
        providerHealthEndpointUrl: "",
        secretRef: "AI_KEY",
        providerHealthResult: { record: { status: "healthy", latencyMs: 42 } },
        testStatus: "failed",
        testOutput: "timeout"
      }
    },
    currentAiProviderId: () => "openai_compatible_gateway",
    isRemoteConfigurableProviderId: () => true,
    activeAiProviderConfig: () => ({
      endpointUrl: "https://api.example/v1/chat",
      secretRef: "AI_KEY",
      runtimeModelMap: { default: "deepseek-chat" }
    }),
    remoteRuntimeModelFromMap: () => "deepseek-chat",
    defaultProviderEndpointUrl: () => "https://api.example/v1/chat",
    defaultProviderHealthEndpointUrl: () => "https://api.example/health"
  });

  assert.equal(get("settingsAiProviderConfigBadge").textContent, "连接正常");
  assert.ok(!get("settingsAiProviderConfigBadge").toggles.some(([name, force]) => name === "ok" && force === true));
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
  assert.equal(get("settingsAiProviderConfigBadge").textContent, "可用");
  assert.equal(get("settingsAiSaveProviderConfig").disabled, true);
  assert.equal(get("settingsAiSaveProviderConfig").textContent, "无需保存");
  assert.equal(get("settingsAiCheckProviderHealth").disabled, true);
  assert.equal(get("settingsAiCheckProviderHealth").textContent, "已内置");
});

test("settings AI provider controls do not mark incomplete remote config as ready", () => {
  const { get } = elementMap();

  renderAiProviderConfigControlsForRuntime({
    $: get,
    settingsState: {
      ai: {
        remoteRuntimeModel: "deepseek-chat",
        providerEndpointUrl: "https://api.example/v1/chat",
        secretRef: ""
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

  assert.equal(get("settingsAiProviderConfigBadge").textContent, "未完成");
  assert.ok(get("settingsAiProviderConfigBadge").toggles.some(([name, force]) => name === "warn" && force === true));
  assert.ok(!get("settingsAiProviderConfigBadge").toggles.some(([name, force]) => name === "ok" && force === true));
});

test("settings AI provider controls require a successful remote test before saving", () => {
  const { get } = elementMap();

  renderAiProviderConfigControlsForRuntime({
    $: get,
    settingsState: {
      ai: {
        remoteRuntimeModel: "gpt-test",
        providerEndpointUrl: "https://api.example/v1/chat/completions",
        secretRef: "sk-test",
        testStatus: ""
      }
    },
    currentAiProviderId: () => "openai_compatible_gateway",
    isRemoteConfigurableProviderId: () => true,
    activeAiProviderConfig: () => null,
    remoteRuntimeModelFromMap: () => "",
    defaultProviderEndpointUrl: () => "",
    defaultProviderHealthEndpointUrl: () => ""
  });

  assert.equal(get("settingsAiSaveProviderConfig").disabled, true);
  assert.equal(get("settingsAiSaveProviderConfig").textContent, "先测试连接");
  assert.equal(get("settingsAiCheckProviderHealth").disabled, false);
  assert.equal(get("settingsAiCheckProviderHealth").textContent, "测试连接");
});

test("settings AI provider controls allow saving a cleared remote API key", () => {
  const { get } = elementMap();

  renderAiProviderConfigControlsForRuntime({
    $: get,
    settingsState: {
      ai: {
        remoteRuntimeModel: "gpt-test",
        providerEndpointUrl: "https://api.example/v1/chat/completions",
        remoteApiKey: "",
        providerDraftTouched: { secretRef: true },
        testStatus: ""
      }
    },
    currentAiProviderId: () => "openai_compatible_gateway",
    isRemoteConfigurableProviderId: () => true,
    activeAiProviderConfig: () => null,
    remoteRuntimeModelFromMap: () => "",
    defaultProviderEndpointUrl: () => "",
    defaultProviderHealthEndpointUrl: () => ""
  });

  assert.equal(get("settingsAiSaveProviderConfig").disabled, false);
  assert.equal(get("settingsAiSaveProviderConfig").textContent, "保存清空");
});
