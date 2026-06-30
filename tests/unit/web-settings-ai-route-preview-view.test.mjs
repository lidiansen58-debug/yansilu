import test from "node:test";
import assert from "node:assert/strict";
import { renderAiRoutePreviewForRuntime } from "../../apps/web/src/settings-ai-route-preview-view.js";

function createElement() {
  return {
    textContent: "",
    innerHTML: ""
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

function baseDeps(get, ai = {}) {
  return {
    $: get,
    escapeHtml: (value = "") => String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"),
    settingsState: {
      ai: {
        runtimeMode: "auto",
        modelPack: "Starter Auto",
        routePreview: null,
        ...ai
      }
    },
    normalizeAiRuntimeMode: (value) => value || "auto",
    installedLocalModelReady: (model) => String(model || "").trim() === "qwen3:4b",
    currentAiProviderId: () => "platform_managed_openai",
    activeAiProviderConfig: () => null,
    isRemoteConfigurableProviderId: () => false,
    remoteRuntimeModelFromMap: () => ""
  };
}

test("settings AI route preview renders loading state", () => {
  const { get } = elementMap();

  renderAiRoutePreviewForRuntime(baseDeps(get, { routePreviewLoading: true }));

  assert.match(get("settingsAiRouteStats").innerHTML, /正在检查/);
  assert.equal(get("settingsAiRoutePreview").textContent, "正在确认当前 AI 是否可用。");
});

test("settings AI route preview falls back to local ready state when preview errored", () => {
  const { get } = elementMap();

  renderAiRoutePreviewForRuntime(baseDeps(get, {
    routePreviewError: "offline",
    runtimeMode: "local_only",
    localModel: "qwen3:4b"
  }));

  assert.match(get("settingsAiRouteStats").innerHTML, /使用本地模型/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /本地模型可用/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /测试一句话/);
});

test("settings AI route preview renders remote ready route in plain language", () => {
  const { get } = elementMap();

  renderAiRoutePreviewForRuntime(baseDeps(get, {
    runtimeMode: "cloud_only",
    routePreview: {
      modelPack: "Starter Auto",
      provider: { providerId: "platform_managed_openai", displayName: "Platform Managed OpenAI" },
      route: { localOnly: false, modelRef: "openai:gpt-test" },
      access: { ready: true },
      health: { status: "healthy" }
    }
  }));

  assert.match(get("settingsAiRouteStats").innerHTML, /使用远程模型/);
  assert.match(get("settingsAiRouteStats").innerHTML, /可用/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /需要网络/);
  assert.doesNotMatch(get("settingsAiRoutePreview").innerHTML, /需要网络和密钥/);
  assert.doesNotMatch(get("settingsAiRoutePreview").innerHTML, /模型档位|AI 方案|Platform Managed/);
});

test("settings AI route preview keeps configurable remote route unavailable without secret", () => {
  const { get } = elementMap();

  renderAiRoutePreviewForRuntime({
    ...baseDeps(get, {
      runtimeMode: "cloud_only",
      providerEndpointUrl: "https://api.example/v1/chat",
      remoteRuntimeModel: "deepseek-chat",
      secretRef: "",
      providerDraftTouched: { secretRef: true },
      routePreview: {
        provider: { providerId: "openai_compatible_gateway", displayName: "Custom Gateway" },
        route: { localOnly: false, modelRef: "gateway:deepseek-chat" },
        access: { ready: true },
        health: { status: "healthy" }
      }
    }),
    currentAiProviderId: () => "openai_compatible_gateway",
    activeAiProviderConfig: () => ({ endpointUrl: "https://api.example/v1/chat" }),
    isRemoteConfigurableProviderId: () => true,
    remoteRuntimeModelFromMap: () => "deepseek-chat"
  });

  assert.match(get("settingsAiRouteStats").innerHTML, /待测试/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /使用远程模型还不能用/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /补齐设置后测试一句话/);
});

test("settings AI route preview accepts backend-ready remote access when secret was not edited locally", () => {
  const { get } = elementMap();

  renderAiRoutePreviewForRuntime({
    ...baseDeps(get, {
      runtimeMode: "cloud_only",
      providerEndpointUrl: "https://api.example/v1/chat",
      remoteRuntimeModel: "deepseek-chat",
      secretRef: "",
      providerDraftTouched: { secretRef: false },
      routePreview: {
        provider: { providerId: "openai_compatible_gateway", displayName: "Custom Gateway" },
        route: { localOnly: false, modelRef: "gateway:deepseek-chat" },
        access: { ready: true },
        health: { status: "healthy" }
      }
    }),
    currentAiProviderId: () => "openai_compatible_gateway",
    activeAiProviderConfig: () => ({ endpointUrl: "https://api.example/v1/chat" }),
    isRemoteConfigurableProviderId: () => true,
    remoteRuntimeModelFromMap: () => "deepseek-chat"
  });

  assert.match(get("settingsAiRouteStats").innerHTML, /可用/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /使用远程模型可用/);
});
