import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  selectedLocalModelNameForInstalledModels
} from "../../apps/web/src/prototype-ai-settings-controller.js";
import {
  localAiGraphActionRequiresReady,
  localAiPreviewOptionsForAction,
  ollamaStopRuntimeUiOutcome
} from "../../apps/web/src/ai-local-runtime-ui-model.js";
import {
  supportedAiSettingsModelPack
} from "../../apps/web/src/ai-settings-state.js";
import {
  aiTestBlockedReasonForState,
  installedLocalModelReadyForState
} from "../../apps/web/src/ai-test-readiness.js";

function loadAiTestBlockedReason(state) {
  return () => aiTestBlockedReasonForState(state.ai, {
    providerId: state.ai.providerId || "",
    shouldUseOllamaLocalRuntime: state.ai.useOllama !== false,
    authMode: state.ai.authMode || "workspace_managed"
  });
}

function createAiState(overrides = {}) {
  return {
    ai: {
      runtimeMode: "local_only",
      modelPack: "Ollama Local",
      providerId: "ollama_local_gateway",
      localRuntimeStatus: "unknown",
      localRuntimeModels: [],
      localModel: "",
      localRuntimeStarting: false,
      localRuntimeChecking: false,
      localRuntimePulling: false,
      providerEndpointUrl: "",
      remoteRuntimeModel: "",
      secretRef: "",
      providerDraftTouched: {},
      routePreview: null,
      ...overrides
    }
  };
}

test("AI settings hides unsupported MiniCPM local setup entry", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const htmlSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8");

  assert.equal(supportedAiSettingsModelPack("MiniCPM Local"), "Starter Auto");
  assert.equal(supportedAiSettingsModelPack("Ollama Local"), "Ollama Local");
  assert.doesNotMatch(htmlSource, /<option value="MiniCPM Local">/);
});

test("local AI setup keeps bootstrap behind explicit settings actions", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const htmlSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8");

  for (const action of [
    "settings_quick_setup",
    "settings_refresh",
    "runtime_mode_change",
    "graph_module_open",
    "graph_analysis",
    "graph_connect",
    "theme_index",
    "note_analysis",
    "writing_check",
    "ai_summary"
  ]) {
    assert.deepEqual(localAiPreviewOptionsForAction(action), { silent: true, render: false });
  }
  assert.deepEqual(localAiPreviewOptionsForAction("explicit_bootstrap"), {});
  assert.equal(localAiGraphActionRequiresReady("graph_analysis"), true);
  assert.equal(localAiGraphActionRequiresReady("graph_connect"), true);
  assert.equal(localAiGraphActionRequiresReady("settings_refresh"), false);

  assert.match(htmlSource, /id="settingsAiLocalOptions"/);
  assert.match(htmlSource, /id="settingsAiDetectOllama"/);
  assert.match(htmlSource, /id="settingsAiDownloadOllama"/);
  assert.match(htmlSource, /id="settingsAiPullOllamaModel"/);
  assert.doesNotMatch(htmlSource, /id="settingsAiLocalDialog"/);
  assert.match(htmlSource, /settingsMobileItemSelect/);
  assert.match(htmlSource, /settings-ai-local-panel/);
  assert.doesNotMatch(htmlSource, /data-settings-support-item="desktop-help"/);
  assert.doesNotMatch(htmlSource, /data-settings-support-item="feedback"/);
  assert.doesNotMatch(htmlSource, /settingsAiCopyOllamaInstallCommand/);
});
test("local Ollama eval prefers qwen3 8b by default", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const evalSource = fs.readFileSync(path.join(repoRoot, "scripts/eval-local-ollama.mjs"), "utf8");
  const smokeSource = fs.readFileSync(path.join(repoRoot, "scripts/smoke-local-ollama.mjs"), "utf8");

  assert.match(evalSource, /\/qwen3\.\*8b\/i, \/qwen2\\\.5\.\*7b\/i, \/qwen3\\\.5\.\*9b\/i/);
  assert.match(smokeSource, /\/qwen3\.\*8b\/i, \/qwen2\\\.5\.\*7b\/i, \/qwen3\\\.5\.\*9b\/i/);
});

test("Ollama preview replaces a stale selected local model with an installed recommendation", () => {
  assert.equal(
    selectedLocalModelNameForInstalledModels("qwen3:8b", [{ name: "qwen2.5:7b" }]),
    ""
  );
  assert.equal(
    selectedLocalModelNameForInstalledModels("qwen3:8b", [{ name: "qwen3:8b" }, { name: "qwen2.5:7b" }]),
    "qwen3:8b"
  );
  assert.equal(
    selectedLocalModelNameForInstalledModels("llama3.2:3b", [{ name: "llama3.2:3b" }]),
    ""
  );
  assert.equal(selectedLocalModelNameForInstalledModels("qwen3:8b", []), "");

  assert.equal(installedLocalModelReadyForState({
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "qwen2.5:7b" }],
    localModel: "qwen2.5:7b"
  }), true);
  assert.equal(installedLocalModelReadyForState({
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "qwen2.5:7b" }],
    localModel: "qwen3:8b"
  }), false);
  assert.equal(installedLocalModelReadyForState({
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "llama3.2:3b" }],
    localModel: "llama3.2:3b"
  }), false);
});

test("AI test run is blocked until local Ollama runtime and model are ready", () => {
  let state = createAiState();
  let blockedReason = loadAiTestBlockedReason(state);
  assert.equal(blockedReason(), "请先启动或检测本地 AI");

  state = createAiState({ localRuntimeStatus: "available" });
  blockedReason = loadAiTestBlockedReason(state);
  assert.equal(blockedReason(), "请先下载一个本地模型");

  state = createAiState({ localRuntimeStatus: "available", localRuntimeModels: [{ name: "qwen2.5:7b" }] });
  blockedReason = loadAiTestBlockedReason(state);
  assert.equal(blockedReason(), "请先选择本地模型");

  state = createAiState({
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "qwen2.5:7b" }],
    localModel: "qwen3:8b"
  });
  blockedReason = loadAiTestBlockedReason(state);
  assert.equal(blockedReason(), "请先下载或选择已安装的本地模型");

  state = createAiState({
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "llama3.2:3b" }],
    localModel: "llama3.2:3b"
  });
  blockedReason = loadAiTestBlockedReason(state);
  assert.notEqual(blockedReason(), "");

  state = createAiState({
    localRuntimeStatus: "available",
    localRuntimeModels: [{ name: "qwen2.5:7b" }],
    localModel: "qwen2.5:7b"
  });
  blockedReason = loadAiTestBlockedReason(state);
  assert.equal(blockedReason(), "");
});

test("Ollama stop UI treats external runtimes as manual management", () => {
  assert.deepEqual(ollamaStopRuntimeUiOutcome({
    status: "manual_stop_required",
    message: "external runtime"
  }), {
    status: "manual_stop_required",
    managedStopPending: false,
    clearModels: false,
    error: "external runtime",
    messageKind: "manual_stop_required",
    tone: "warn"
  });

  assert.deepEqual(ollamaStopRuntimeUiOutcome({ status: "stopped" }), {
    status: "stopped",
    managedStopPending: false,
    clearModels: true,
    error: "",
    messageKind: "stopped",
    tone: "ok"
  });

  assert.deepEqual(ollamaStopRuntimeUiOutcome({
    status: "stopping",
    remainingManagedPids: [123],
    message: "waiting"
  }), {
    status: "stopping",
    managedStopPending: true,
    clearModels: false,
    error: "waiting",
    messageKind: "stopping",
    tone: "warn"
  });

  assert.deepEqual(ollamaStopRuntimeUiOutcome({ status: "unknown" }, { status: "unavailable" }), {
    status: "stopped",
    managedStopPending: false,
    clearModels: true,
    error: "",
    messageKind: "stopped",
    tone: "ok"
  });

  assert.deepEqual(ollamaStopRuntimeUiOutcome({
    status: "sent",
    remaining_managed_pids: [456],
    message: "still reachable"
  }, { status: "available" }), {
    status: "still_available",
    managedStopPending: true,
    clearModels: false,
    error: "still reachable",
    messageKind: "still_available",
    tone: "warn"
  });
});
test("AI test run keeps remote provider setup blocking", () => {
  const state = createAiState({
    runtimeMode: "cloud_only",
    modelPack: "Global Optimized",
    providerId: "openai_compatible_gateway"
  });
  const blockedReason = loadAiTestBlockedReason(state);

  assert.equal(blockedReason(), "请先填写远程服务地址和远程模型");
});
