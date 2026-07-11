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
    currentAiProviderId: () => ai.providerId ?? "",
    isRemoteConfigurableProviderId: (providerId) => providerId === "openai_compatible_gateway",
    isAiLocalFlowActive: ({ runtimeMode }) => ["local_only", "hybrid"].includes(runtimeMode),
    installedLocalModelReady: (name) => String(name || "").trim() === "qwen3:4b",
    ollamaRecommendationHintText: () => "qwen3:4b"
  };
}

test("settings AI experience view renders clear first screen when AI is not configured", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get));

  assert.equal(get("settingsAiTopStatus").textContent, "未配置");
  assert.equal(get("settingsAiTopMode").textContent, "未启用");
  assert.equal(get("settingsAiTopAction").textContent, "配置本地 AI");
  assert.equal(get("settingsAiTopAction").dataset.settingsAiPrimaryAction, "local");
  assert.deepEqual(get("settingsAiOffAction").toggles.at(-1), ["hidden", false]);
  assert.match(get("settingsAiSetupBadges").innerHTML, /未启用/);
  assert.equal(get("settingsAiSetupTitle").textContent, "AI 未配置");
  assert.equal(get("settingsAiSetupBody").textContent, "");
  assert.deepEqual(get("settingsAiSetupBody").toggles.at(-1), ["hidden", true]);
  assert.equal(get("settingsAiAdvancedBadge").textContent, "通常不用改");
  assert.equal(get("settingsAiLabBadge").textContent, "未测试");
  assert.equal(get("settingsAiHybridToggle").textContent, "本地优先");
});

test("settings AI experience view keeps empty remote setup on remote path", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get, {
    runtimeMode: "cloud_only",
    modelPack: "Global Optimized",
    providerId: "openai_compatible_gateway",
    providerEndpointUrl: "",
    remoteRuntimeModel: "",
    secretRef: ""
  }));

  assert.equal(get("settingsAiTopStatus").textContent, "未配置");
  assert.equal(get("settingsAiTopMode").textContent, "远程 AI");
  assert.equal(get("settingsAiTopAction").textContent, "配置远程 AI");
  assert.equal(get("settingsAiTopAction").dataset.settingsAiPrimaryAction, "remote");
  assert.equal(get("settingsAiSecondaryAction").textContent, "配置本地 AI");
  assert.equal(get("settingsAiSecondaryAction").dataset.settingsAiPrimaryAction, "local");
});

test("settings AI experience view hides pause action when AI is already off", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get, {
    runtimeMode: "off"
  }));

  assert.equal(get("settingsAiTopMode").textContent, "已停用");
  assert.deepEqual(get("settingsAiOffAction").toggles.at(-1), ["hidden", true]);
});

test("settings AI experience view points installed Ollama users to start local AI", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get, {
    runtimeMode: "local_only",
    modelPack: "Ollama Local",
    localRuntimeStatus: "unavailable",
    localRuntimeReadinessStatus: "installed_not_running"
  }));

  assert.equal(get("settingsAiTopStatus").textContent, "模型运行工具未启动");
  assert.equal(get("settingsAiTopMode").textContent, "本地 AI");
  assert.equal(get("settingsAiTopAction").textContent, "启动本地模型");
  assert.equal(get("settingsAiTopAction").dataset.settingsAiPrimaryAction, "start-local");
  assert.equal(get("settingsAiSecondaryAction").textContent, "重新检测");
  assert.equal(get("settingsAiSecondaryAction").dataset.settingsAiPrimaryAction, "detect-local");
});

test("settings AI experience view asks for recommended model download only after local runtime is available", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get, {
    runtimeMode: "local_only",
    modelPack: "Ollama Local",
    localRuntimeStatus: "available",
    localRuntimeModels: [],
    localModel: ""
  }));

  assert.equal(get("settingsAiTopStatus").textContent, "模型未下载");
  assert.equal(get("settingsAiTopAction").textContent, "下载模型");
  assert.equal(get("settingsAiTopAction").dataset.settingsAiPrimaryAction, "download-local-model");
  assert.equal(get("settingsAiSetupBody").textContent, "qwen3:4b");
  assert.equal(get("settingsAiTopHint").textContent, "下载前需确认");
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

  assert.equal(get("settingsAiTopStatus").textContent, "AI 可用");
  assert.equal(get("settingsAiTopAction").textContent, "已完成");
  assert.equal(get("settingsAiSetupTitle").textContent, "本地 AI 可用");
  assert.equal(get("settingsAiLabBadge").textContent, "测试成功");
  assert.deepEqual(get("settingsAiSetupBody").toggles.at(-1), ["hidden", true]);
});

test("settings AI experience view does not report a stopped local runtime as ready", () => {
  const { get } = elementMap();

  renderAiSettingsExperienceForRuntime(baseDeps(get, {
    runtimeMode: "local_only",
    modelPack: "Ollama Local",
    localRuntimeStatus: "unavailable",
    localRuntimeReadinessStatus: "installed_not_running",
    localRuntimeModels: [{ name: "qwen3:4b" }],
    localModel: "qwen3:4b"
  }));

  assert.equal(get("settingsAiSetupTitle").textContent, "模型运行工具未运行");
  assert.equal(get("settingsAiTopAction").textContent, "启动本地模型");
});
