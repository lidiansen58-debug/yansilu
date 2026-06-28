import test from "node:test";
import assert from "node:assert/strict";
import { renderAiSettingsExperienceForRuntime } from "../../apps/web/src/settings-ai-experience-view.js";

function createElement() {
  const toggles = [];
  return {
    textContent: "",
    innerHTML: "",
    dataset: {},
    toggles,
    classList: {
      toggle: (name, force) => toggles.push([name, force])
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
        localRuntimeStatus: "unknown",
        localRuntimeModels: [],
        routePreview: { provider: { displayName: "Platform" }, route: {} },
        ...ai
      }
    },
    normalizeAiRuntimeMode: (value) => value || "auto",
    currentOllamaSetupGuide: () => ({ steps: [], installUrl: "https://ollama.example/download" }),
    primaryRecommendedOllamaModelName: () => "qwen3:4b",
    currentAiProviderId: () => "platform_managed_openai",
    isAiLocalFlowActive: ({ runtimeMode }) => ["local_only", "hybrid"].includes(runtimeMode),
    preferredLocalProviderPresetForSelection: () => "ollama_local_gateway",
    defaultProviderEndpointUrl: () => "",
    OLLAMA_CHAT_ENDPOINT_URL: "http://localhost:11434/api/chat",
    defaultProviderHealthEndpointUrl: () => "",
    OLLAMA_HEALTH_ENDPOINT_URL: "http://localhost:11434/api/tags",
    isLocalModelPack: (modelPack) => String(modelPack).includes("Privacy"),
    ollamaRuntimeStateLabel: () => "本地 AI 待检测",
    installedLocalModelReady: (name) => String(name || "").trim() === "qwen3:4b",
    ollamaRecommendationHintText: () => "qwen3:4b"
  };
}

test("settings AI experience view renders automatic setup state", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get));

  assert.equal(get("settingsAiQuickstartStatus").textContent, "自动推荐");
  assert.match(get("settingsAiSetupBadges").innerHTML, /使用方式 自动选择/);
  assert.match(get("settingsAiSetupBadges").innerHTML, /平台托管 OpenAI/);
  assert.equal(get("settingsAiAdvancedBadge").textContent, "保持默认");
  assert.equal(get("settingsAiLabBadge").textContent, "等待运行");
  assert.equal(get("settingsAiHybridToggle").textContent, "启用本地优先");
});

test("settings AI experience view hides setup guidance when local model is ready", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get, {
    runtimeMode: "local_only",
    modelPack: "Privacy First",
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "qwen3:4b" }],
    localModel: "qwen3:4b",
    testOutput: "pong"
  }));

  assert.equal(get("settingsAiQuickstartStatus").textContent, "本地已就绪");
  assert.equal(get("settingsAiLocalGuide").dataset.state, "ready");
  assert.equal(get("settingsAiLabBadge").textContent, "已有结果");
  assert.deepEqual(get("settingsAiLocalHomeSteps").toggles.at(-1), ["hidden", true]);
  assert.deepEqual(get("settingsAiSetupSteps").toggles.at(-1), ["hidden", true]);
  assert.deepEqual(get("settingsAiLocalHint").toggles.at(-1), ["hidden", true]);
});
