import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  selectedLocalModelNameForInstalledModels
} from "../../apps/web/src/prototype-ai-settings-controller.js";
import {
  supportedAiSettingsModelPack
} from "../../apps/web/src/ai-settings-state.js";
import {
  aiTestBlockedReasonForState,
  installedLocalModelReadyForState
} from "../../apps/web/src/ai-test-readiness.js";

function extractFunctionSource(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected ${signature} to exist`);
  const parenStart = source.indexOf("(", start);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let index = parenStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parenDepth += 1;
    if (char === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        bodyStart = source.indexOf("{", index);
        break;
      }
    }
  }
  assert.ok(bodyStart >= 0, `expected ${signature} body to exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`could not extract ${signature}`);
}

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
  const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8");
  const previewSource = extractFunctionSource(appSource, "async function previewOllamaLocalAiBootstrapFromUi(");
  const helperSource = extractFunctionSource(appSource, "async function bootstrapOllamaLocalAiFromUi(");
  const quickSetupSource = extractFunctionSource(appSource, "async function applySettingsAiQuickSetup(");
  const pullSource = extractFunctionSource(appSource, "async function pullRecommendedOllamaModel(");
  const refreshSettingsSource = extractFunctionSource(appSource, "async function refreshVaultSettings(");
  const runtimeModeSource = extractFunctionSource(appSource, "async function applyAiRuntimeModeChange(");
  const graphAnalysisSource = extractFunctionSource(appSource, "async function runGraphAiAnalysis(");
  const graphConnectSource = extractFunctionSource(appSource, "async function runGraphAiConnectForNote(");
  const graphLocalReadySource = extractFunctionSource(appSource, "async function ensureGraphLocalAiReadyForAnalysis(");
  const localRecommendationsSource = extractFunctionSource(appSource, "function renderAiLocalModelRecommendations(");

  assert.match(appSource, /fetchOllamaBootstrapStatus,/);
  assert.match(appSource, /bootstrapOllamaLocalAi,/);
  assert.match(previewSource, /await fetchOllamaBootstrapStatus\(\{ model, runtimeMode \}\);/);
  assert.match(helperSource, /await bootstrapOllamaLocalAi\(/);
  assert.match(helperSource, /\n\s*model,/);
  assert.match(helperSource, /pullModel:\s*options\.pullModel !== false/);
  assert.match(quickSetupSource, /await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);/);
  assert.doesNotMatch(quickSetupSource, /bootstrapOllamaLocalAiFromUi\(\)/);
  assert.match(pullSource, /await pullOllamaModel\(modelNameToPull,/);
  assert.match(refreshSettingsSource, /await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);/);
  assert.match(runtimeModeSource, /await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);/);
  assert.match(appSource, /targetModule === "graph"[\s\S]*await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);[\s\S]*await refreshDirectoryGraph\(\);/);
  assert.match(graphAnalysisSource, /const localAiReady = await ensureGraphLocalAiReadyForAnalysis\(\);/);
  assert.doesNotMatch(graphAnalysisSource, /bootstrapOllamaLocalAiFromUi\(\{ render: false \}\)/);
  assert.match(graphConnectSource, /const localAiReady = await ensureGraphLocalAiReadyForAnalysis\(\);/);
  assert.match(graphLocalReadySource, /await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);/);
  assert.match(graphLocalReadySource, /请先到 AI 设置完成安装、启动或模型下载/);
  assert.doesNotMatch(graphConnectSource, /bootstrapOllamaLocalAiFromUi\(/);
  assert.match(htmlSource, /本地 AI 控制台/);
  assert.match(htmlSource, /安装运行环境、启动或停止服务、下载模型、切换默认本地模型都在这里完成/);
  assert.match(htmlSource, /settings-ai-local-control-console/);
  assert.doesNotMatch(htmlSource, /id="settingsAiLocalDialog"/);
  assert.match(appSource, /当前按内置模型目录展示/);
  assert.match(htmlSource, /settingsMobileItemSelect/);
  assert.match(appSource, /settingsMobileItemOptionsHtml/);
  assert.match(appSource, /在线 AI 已就绪/);
  assert.match(appSource, /模型档位/);
  assert.match(appSource, /数据位置：试运行内容会发送到在线 AI 服务/);
  assert.match(htmlSource, /settings-ai-topline/);
  assert.match(htmlSource, /不确定时保持自动；处理私密材料时切到仅本地/);
  assert.doesNotMatch(htmlSource, /需要帮助时，从这三件事开始/);
  assert.doesNotMatch(htmlSource, /data-settings-support-item="desktop-help"/);
  assert.doesNotMatch(htmlSource, /data-settings-support-item="feedback"/);
  assert.match(htmlSource, /Markdown 文件是主内容源/);
  assert.match(htmlSource, /复制版本、模块、页面和当前选中对象，不直接带笔记库路径/);
  assert.match(appSource, /当前会打开公开反馈页，并自动带上版本、模块和页面上下文/);
  assert.match(appSource, /data-settings-ai-select-local-model/);
  assert.match(appSource, /data-settings-ai-pull-local-model/);
  assert.match(appSource, /data-settings-ai-detect-ollama/);
  assert.match(appSource, /data-settings-ai-copy-command/);
  assert.match(appSource, /已复制模型下载命令/);
  assert.match(appSource, /window\.confirm\(`下载 \$\{modelNameToPull\}/);
  assert.match(appSource, /const catalogNames = new Set\(ollamaModelRecommendationProfiles\(currentOllamaModelTiers\(\)\)/);
  assert.match(appSource, /这个模型不在研思录内置本地模型目录里/);
  assert.match(localRecommendationsSource, /recommendationsEl\.classList\.remove\("hidden"\)/);
  assert.match(localRecommendationsSource, /先启用本地模式，之后在这里下载、选择和试运行/);
  assert.match(localRecommendationsSource, /先检测本地 AI，再下载或切换模型/);
  assert.match(localRecommendationsSource, /本地 AI 连接后，这些模型会直接变成下载或切换按钮/);
  assert.match(localRecommendationsSource, /data-settings-ai-quick-setup="local"/);
  assert.match(localRecommendationsSource, /data-settings-ai-detect-ollama/);
  assert.match(localRecommendationsSource, /data-settings-ai-pull-local-model/);
  assert.match(localRecommendationsSource, /data-settings-ai-select-local-model/);
  assert.match(localRecommendationsSource, /settings-ai-command-copy/);
  assert.match(localRecommendationsSource, /仅检测/);
  assert.match(localRecommendationsSource, />切换<\/button>/);
  assert.match(htmlSource, /settingsAiCopyOllamaInstallCommand/);
  assert.match(appSource, /已复制安装命令/);
  assert.match(appSource, /localRuntimeReadinessStatus === "installed_not_running"/);
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

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
  assert.match(appSource, /settingsState\.ai\.localModel = "";/);
  assert.match(appSource, /settingsState\.ai\.routePreview = null;/);
  assert.match(appSource, /function persistOllamaRuntimeSelectionAfterPreview\(/);
  assert.match(appSource, /await persistOllamaRuntimeSelectionAfterPreview\(\);/);
  assert.match(appSource, /const localModelAllowed = \["local_only", "hybrid"\]\.includes\(selection\.runtimeMode\);/);
  assert.match(appSource, /const localModelReady = localModelAllowed && installedLocalModelReady\(settingsState\.ai\.localModel\);/);
  assert.match(appSource, /const advancedModelRefIsLocal = isLocalAdvancedModelRef\(advancedModelRef\);/);
  assert.match(appSource, /selection\.runtimeMode !== "local_only"/);
  assert.match(appSource, /nextSelection\.runtimeMode === "local_only" && settingsState\.ai\.advancedModelRef && !isLocalAdvancedModelRef\(settingsState\.ai\.advancedModelRef\)/);
  assert.match(appSource, /\.\.\.\(localModelReady \? \{ localModel: settingsState\.ai\.localModel \} : \{\}\)/);
  assert.match(appSource, /\.\.\.\(modelRefAllowed \? \{ modelRef: advancedModelRef \} : \{\}\)/);
  assert.doesNotMatch(appSource, /modelRef: settingsState\.ai\.advancedModelRef/);
  assert.match(appSource, /installedLocalModelReady\(localModel\)/);
  assert.match(appSource, /detectButton\.classList\.toggle\("hidden", !localSetupActive\);/);
  assert.match(appSource, /重新检测本地 AI/);
  assert.doesNotMatch(appSource, /Boolean\(models\.length && localModel\)/);
  assert.match(appSource, /模型下载已完成，但还没有在本地模型列表里检测到/);

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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const stopSource = extractFunctionSource(source, "async function stopOllamaRuntimeFromUi(");
  const controlsSource = extractFunctionSource(source, "function renderAiLocalModelControls(");

  assert.match(stopSource, /stopStatus === "manual_stop_required"/);
  assert.match(stopSource, /stopStatus === "stopped"/);
  assert.match(stopSource, /stopStatus === "stopping"/);
  assert.match(stopSource, /remainingManagedPids/);
  assert.match(stopSource, /localRuntimeManagedStopPending = stopStatus === "stopping" \|\| remainingManagedPids\.length > 0/);
  assert.match(stopSource, /需要手动管理本地 AI/);
  assert.match(stopSource, /不是由研思录启动/);
  assert.match(stopSource, /正在等待确认/);
  assert.match(controlsSource, /const managedStopPending = settingsState\.ai\.localRuntimeManagedStopPending === true/);
  assert.match(controlsSource, /const canStopOllama = runtimeAvailable \|\| managedStopPending/);
  assert.match(controlsSource, /继续停止/);
  assert.match(controlsSource, /runtimeAvailable \|\| managedStopPending \|\| !canStartOllama/);
  assert.ok(
    stopSource.indexOf('stopStatus === "manual_stop_required"') < stopSource.indexOf("已发送停止命令"),
    "manual stop result should be handled before the generic stop-sent warning"
  );
  assert.ok(
    stopSource.indexOf('stopStatus === "stopping"') < stopSource.indexOf('runtime?.status === "unavailable"'),
    "stopping result should not fall through to the unavailable-runtime success branch"
  );
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
