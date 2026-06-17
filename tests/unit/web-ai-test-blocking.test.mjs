import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const helperSource = extractFunctionSource(source, "function aiTestBlockedReason(");
  return new Function(
    "settingsState",
    "currentAiProviderId",
    "normalizeAiRuntimeMode",
    "isAiLocalFlowActive",
    "shouldUseOllamaLocalRuntime",
    "hasLocalModel",
    "isRemoteConfigurableProviderId",
    "authModeForProvider",
    `${helperSource}\nreturn aiTestBlockedReason;`
  )(
    state,
    () => state.ai.providerId || "",
    (value = "") => String(value || "auto").trim().toLowerCase().replace(/[\s/-]+/g, "_"),
    ({ runtimeMode, modelPack }) => ["local_only", "hybrid"].includes(runtimeMode) || ["Ollama Local", "Privacy First"].includes(modelPack),
    () => state.ai.useOllama !== false,
    (modelName = "") => (state.ai.localRuntimeModels || []).some((item) => String(item.name || item || "") === String(modelName || "")),
    (providerId = "") => providerId === "openai_compatible_gateway",
    () => state.ai.authMode || "workspace_managed"
  );
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
  const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8");
  const helperSource = extractFunctionSource(appSource, "function settingsSupportedModelPack(");
  const settingsSupportedModelPack = new Function(
    "localProviderPresetForModelPack",
    `${helperSource}\nreturn settingsSupportedModelPack;`
  )((modelPack = "") => String(modelPack || "") === "MiniCPM Local" ? "minicpm_local_gateway" : "");

  assert.equal(settingsSupportedModelPack("MiniCPM Local"), "Starter Auto");
  assert.equal(settingsSupportedModelPack("Ollama Local"), "Ollama Local");
  assert.doesNotMatch(htmlSource, /<option value="MiniCPM Local">/);
  assert.match(appSource, /modelPack: settingsSupportedModelPack\(settingsState\.ai\.modelPack\)/);
  assert.match(appSource, /previousProviderPreset === "minicpm_local_gateway"/);
  assert.match(appSource, /settingsState\.ai\.localModel = "";/);
  assert.match(appSource, /settingsState\.ai\.advancedModelRef = "";/);
});

test("local AI bootstrap is wired into settings and graph entry points", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const previewSource = extractFunctionSource(appSource, "async function previewOllamaLocalAiBootstrapFromUi(");
  const helperSource = extractFunctionSource(appSource, "async function bootstrapOllamaLocalAiFromUi(");
  const quickSetupSource = extractFunctionSource(appSource, "async function applySettingsAiQuickSetup(");
  const refreshSettingsSource = extractFunctionSource(appSource, "async function refreshVaultSettings(");
  const runtimeModeSource = extractFunctionSource(appSource, "async function applyAiRuntimeModeChange(");
  const graphAnalysisSource = extractFunctionSource(appSource, "async function runGraphAiAnalysis(");

  assert.match(appSource, /fetchOllamaBootstrapStatus,/);
  assert.match(appSource, /bootstrapOllamaLocalAi,/);
  assert.match(previewSource, /await fetchOllamaBootstrapStatus\(\{ model, runtimeMode \}\);/);
  assert.match(helperSource, /await bootstrapOllamaLocalAi\(/);
  assert.match(helperSource, /\n\s*model,/);
  assert.match(helperSource, /pullModel:\s*options\.pullModel !== false/);
  assert.match(quickSetupSource, /localBootstrapResult = await bootstrapOllamaLocalAiFromUi\(\);/);
  assert.match(quickSetupSource, /ollamaBootstrapStatusText\(localBootstrapResult\)/);
  assert.match(refreshSettingsSource, /await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);/);
  assert.match(runtimeModeSource, /await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);/);
  assert.match(appSource, /targetModule === "graph"[\s\S]*await previewOllamaLocalAiBootstrapFromUi\(\{ silent: true, render: false \}\);[\s\S]*await refreshDirectoryGraph\(\);/);
  assert.match(graphAnalysisSource, /const bootstrapResult = await bootstrapOllamaLocalAiFromUi\(\{ render: false \}\);/);
  assert.match(graphAnalysisSource, /bootstrapResult\?\.ready !== true/);
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
  const helperSource = [
    extractFunctionSource(appSource, "function preferredLocalModelName("),
    extractFunctionSource(appSource, "function modelNameExistsInList("),
    extractFunctionSource(appSource, "function selectedLocalModelNameForInstalledModels("),
    extractFunctionSource(appSource, "function installedLocalModelReady(")
  ].join("\n");
  const helpers = new Function(
    "settingsState",
    "hasLocalModel",
    "OLLAMA_RECOMMENDED_MODEL",
    `${helperSource}\nreturn { selectedLocalModelNameForInstalledModels, installedLocalModelReady };`
  );
  const selectedLocalModelNameForInstalledModels = helpers(
    { ai: { localRuntimeStatus: "available" } },
    () => false,
    "qwen3:8b"
  ).selectedLocalModelNameForInstalledModels;

  assert.equal(
    selectedLocalModelNameForInstalledModels("qwen3:8b", [{ name: "qwen2.5:7b" }]),
    ""
  );
  assert.equal(
    selectedLocalModelNameForInstalledModels("qwen3:8b", [{ name: "qwen3:8b" }, { name: "qwen2.5:7b" }]),
    "qwen3:8b"
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
  assert.match(appSource, /const localModelReady = installedLocalModelReady\(\);/);
  assert.match(appSource, /detectButton\.classList\.toggle\("hidden", localSetupActive && localModelReady\);/);
  assert.match(appSource, /重新检测 Ollama/);
  assert.doesNotMatch(appSource, /Boolean\(models\.length && localModel\)/);
  assert.match(appSource, /模型下载已完成，但还没有在 Ollama 列表里检测到/);

  assert.equal(helpers(
    { ai: { localRuntimeStatus: "available", localModel: "qwen2.5:7b" } },
    (modelName = "") => modelName === "qwen2.5:7b"
  ).installedLocalModelReady(), true);
  assert.equal(helpers(
    { ai: { localRuntimeStatus: "available", localModel: "qwen3:8b" } },
    (modelName = "") => modelName === "qwen2.5:7b"
  ).installedLocalModelReady(), false);
});

test("AI test run is blocked until local Ollama runtime and model are ready", () => {
  let state = createAiState();
  let blockedReason = loadAiTestBlockedReason(state);
  assert.equal(blockedReason(), "请先启动或检测 Ollama");

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
    localRuntimeModels: [{ name: "qwen2.5:7b" }],
    localModel: "qwen2.5:7b"
  });
  blockedReason = loadAiTestBlockedReason(state);
  assert.equal(blockedReason(), "");
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
