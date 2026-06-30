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
    installedLocalModelReady: (name) => String(name || "").trim() === "qwen3:4b",
    ollamaRecommendationHintText: () => "qwen3:4b"
  };
}

test("settings AI experience view renders simple remote setup state", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get));

  assert.equal(get("settingsAiQuickstartStatus").textContent, "未测试");
  assert.match(get("settingsAiSetupBadges").innerHTML, /自动选择/);
  assert.match(get("settingsAiSetupBadges").innerHTML, /远程模型/);
  assert.equal(get("settingsAiSetupTitle").textContent, "当前选择远程模型");
  assert.match(get("settingsAiSetupBody").textContent, /需要网络/);
  assert.match(get("settingsAiSetupBody").textContent, /自己的服务/);
  assert.equal(get("settingsAiAdvancedBadge").textContent, "通常不用改");
  assert.equal(get("settingsAiLabBadge").textContent, "未测试");
  assert.equal(get("settingsAiHybridToggle").textContent, "本地优先");
});

test("settings AI experience view hides setup guidance when local model is ready", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get, {
    runtimeMode: "local_only",
    modelPack: "Privacy First",
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "qwen3:4b" }],
    localModel: "qwen3:4b",
    testStatus: "success",
    testOutput: "pong"
  }));

  assert.equal(get("settingsAiQuickstartStatus").textContent, "测试成功");
  assert.equal(get("settingsAiLocalGuide").dataset.state, "ready");
  assert.equal(get("settingsAiSetupTitle").textContent, "本地模型已可用");
  assert.equal(get("settingsAiLabBadge").textContent, "测试成功");
  assert.deepEqual(get("settingsAiLocalHomeSteps").toggles.at(-1), ["hidden", true]);
  assert.deepEqual(get("settingsAiSetupSteps").toggles.at(-1), ["hidden", true]);
  assert.deepEqual(get("settingsAiLocalHint").toggles.at(-1), ["hidden", true]);
});
