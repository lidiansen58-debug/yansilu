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

  assert.match(get("settingsAiRouteStats").innerHTML, /正在预览/);
  assert.equal(get("settingsAiRoutePreview").textContent, "正在根据当前选择判断会使用的服务和模型...");
});

test("settings AI route preview falls back to local ready state when preview errored", () => {
  const { get } = elementMap();

  renderAiRoutePreviewForRuntime(baseDeps(get, {
    routePreviewError: "offline",
    runtimeMode: "local_only",
    localModel: "qwen3:4b"
  }));

  assert.match(get("settingsAiRouteStats").innerHTML, /本地模型已就绪/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /本地 AI 已就绪/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /qwen3:4b/);
});

test("settings AI route preview renders remote ready route", () => {
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

  assert.match(get("settingsAiRouteStats").innerHTML, /在线 AI 已就绪/);
  assert.match(get("settingsAiRouteStats").innerHTML, /已连通/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /服务来源/);
  assert.match(get("settingsAiRoutePreview").innerHTML, /平台托管 OpenAI/);
});
