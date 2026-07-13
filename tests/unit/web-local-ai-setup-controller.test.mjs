import test from "node:test";
import assert from "node:assert/strict";

import {
  createLocalAiSetupController
} from "../../apps/web/src/local-ai-setup-controller.js";
import {
  localAiSetupStatusMessage
} from "../../apps/web/src/local-ai-setup-view.js";

test("local AI setup message explains missing Ollama, model choice, and non-AI continuity", () => {
  const message = localAiSetupStatusMessage({
    feature: "graph_connect",
    result: {
      status: "needs_install",
      model: "qwen3:8b",
      message: "请先安装本地 AI 运行环境"
    },
    modelProfile: {
      name: "qwen3:8b",
      role: "默认推荐",
      note: "适合观点提纯、潜在关联和 AI 建议",
      hardwareHint: "普通 16GB 内存电脑优先尝试"
    }
  });

  assert.match(message, /AI 建联推荐需要本地 AI/);
  assert.match(message, /先安装模型运行工具/);
  assert.match(message, /qwen3:8b/);
  assert.match(message, /普通 16GB 内存电脑/);
  assert.match(message, /不影响继续写笔记、手工整理关系和进入写作中心/);
});

test("local AI setup controller opens AI settings and blocks model feature when recommended model is missing", async () => {
  const calls = [];
  const controller = createLocalAiSetupController(() => ({
    localOllamaSetupActive: () => true,
    shouldUseOllamaLocalRuntime: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: (action) => {
      calls.push(["preview-options", action]);
      return { silent: true, render: false };
    },
    previewOllamaLocalAiBootstrapFromUi: async (request) => {
      calls.push(["preview", request]);
      return {
        ready: false,
        status: "needs_model",
        model: "qwen3:8b",
        message: "qwen3:8b is not installed in Ollama yet."
      };
    },
    ollamaBootstrapStatusText: () => "请先下载本地模型：ollama pull qwen3:8b",
    ollamaRecommendationForModel: () => ({
      name: "qwen3:8b",
      role: "默认推荐",
      note: "质量与速度均衡",
      sizeHint: "约 5-6GB"
    }),
    currentOllamaModelTiers: () => [{ name: "qwen3:8b" }],
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    setSettingsItem: (itemId, options) => calls.push(["settings-item", itemId, options]),
    renderSettingsPanel: () => calls.push(["render-settings"]),
    setStatus: (...args) => calls.push(["status", ...args])
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "writing_check" });

  assert.equal(readiness.ready, false);
  assert.deepEqual(calls.find((call) => call[0] === "preview-options"), ["preview-options", "writing_check"]);
  assert.deepEqual(calls.find((call) => call[0] === "module"), ["module", "settings"]);
  assert.deepEqual(calls.find((call) => call[0] === "settings-item"), ["settings-item", "ai-settings", { render: false }]);
  const status = calls.find((call) => call[0] === "status");
  assert.equal(status[2], "warn");
  assert.match(status[1], /AI 写作检查需要本地 AI/);
  assert.match(status[1], /先下载推荐模型 qwen3:8b/);
});

test("local AI setup controller maps material distill to local summary readiness", async () => {
  const calls = [];
  let tested = false;
  const controller = createLocalAiSetupController(() => ({
    localAiFeatureReady: () => tested,
    localOllamaSetupActive: () => true,
    shouldUseOllamaLocalRuntime: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: (action) => {
      calls.push(["preview-options", action]);
      return { silent: true, render: false };
    },
    previewOllamaLocalAiBootstrapFromUi: async (request) => {
      calls.push(["preview", request]);
      tested = true;
      return { ready: true, status: "ready", model: "qwen3:8b" };
    }
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "distill_material" });

  assert.equal(readiness.ready, true);
  assert.deepEqual(calls.find((call) => call[0] === "preview-options"), ["preview-options", "ai_summary"]);
});

test("local AI setup controller requires a successful local AI test after bootstrap is ready", async () => {
  const calls = [];
  const controller = createLocalAiSetupController(() => ({
    localAiFeatureReady: () => false,
    localOllamaSetupActive: () => true,
    shouldUseOllamaLocalRuntime: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: () => ({ silent: true, render: false }),
    previewOllamaLocalAiBootstrapFromUi: async () => ({ ready: true, status: "ready", model: "qwen3:8b" }),
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    setSettingsItem: (itemId, options) => calls.push(["settings-item", itemId, options]),
    renderSettingsPanel: () => calls.push(["render-settings"]),
    setStatus: (...args) => calls.push(["status", ...args])
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "distill_material" });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, "local_ai_needs_test");
  assert.deepEqual(calls.find((call) => call[0] === "module"), ["module", "settings"]);
  assert.deepEqual(calls.find((call) => call[0] === "settings-item"), ["settings-item", "ai-settings", { render: false }]);
  assert.match(calls.find((call) => call[0] === "status")[1], /测试 AI/);
});

test("local AI setup controller trusts an already tested local model", async () => {
  let previewCalled = false;
  const controller = createLocalAiSetupController(() => ({
    localAiFeatureReady: () => true,
    localOllamaSetupActive: () => true,
    shouldUseOllamaLocalRuntime: () => true,
    previewOllamaLocalAiBootstrapFromUi: async () => {
      previewCalled = true;
      return null;
    }
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "note_analysis" });

  assert.equal(readiness.ready, true);
  assert.equal(readiness.reason, "local_ai_ready");
  assert.equal(previewCalled, false);
});

test("local AI setup controller does not block features outside local Ollama mode", async () => {
  let previewCalled = false;
  const controller = createLocalAiSetupController(() => ({
    localAiFeatureReady: () => true,
    localOllamaSetupActive: () => false,
    shouldUseOllamaLocalRuntime: () => false,
    previewOllamaLocalAiBootstrapFromUi: async () => {
      previewCalled = true;
      return null;
    }
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "ai_summary" });

  assert.equal(readiness.ready, true);
  assert.equal(readiness.skipped, true);
  assert.equal(previewCalled, false);
});

test("local AI setup controller guides default auto mode when no provider route is ready", async () => {
  const calls = [];
  const controller = createLocalAiSetupController(() => ({
    localOllamaSetupActive: () => false,
    shouldUseOllamaLocalRuntime: () => false,
    shouldGuideLocalAiSetupForFeature: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: () => ({ silent: true, render: false }),
    previewOllamaLocalAiBootstrapFromUi: async (request) => {
      calls.push(["preview", request]);
      return {
      ready: false,
      status: "needs_install",
      model: "qwen3:8b"
      };
    },
    ollamaBootstrapStatusText: () => "请先安装本地 AI 运行环境",
    ollamaRecommendationForModel: () => ({ name: "qwen3:8b", role: "默认推荐" }),
    activateLocalAiSetupFlow: (options) => {
      calls.push(["activate-local", options]);
      return false;
    },
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    setSettingsItem: (itemId) => calls.push(["settings-item", itemId]),
    renderSettingsPanel: () => calls.push(["render-settings"]),
    setStatus: (...args) => calls.push(["status", ...args])
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "note_analysis" });

  assert.equal(readiness.ready, false);
  assert.equal(calls.find((call) => call[0] === "preview")[1].allowLocalSetupPreview, true);
  assert.deepEqual(calls.find((call) => call[0] === "activate-local"), ["activate-local", { restoreOnFailure: false }]);
  assert.deepEqual(calls.find((call) => call[0] === "module"), ["module", "settings"]);
  assert.match(calls.find((call) => call[0] === "status")[1], /当前笔记 AI 分析需要本地 AI/);
});

test("local AI setup controller activates local setup before allowing ready auto-mode AI features", async () => {
  const calls = [];
  let tested = false;
  const controller = createLocalAiSetupController(() => ({
    localAiFeatureReady: () => tested,
    localOllamaSetupActive: () => false,
    shouldUseOllamaLocalRuntime: () => false,
    shouldGuideLocalAiSetupForFeature: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: () => ({ silent: true, render: false }),
    previewOllamaLocalAiBootstrapFromUi: async (request) => {
      calls.push(["preview", request]);
      tested = true;
      return {
        ready: true,
        status: "ready",
        model: "qwen3:8b"
      };
    },
    activateLocalAiSetupFlow: async () => {
      calls.push(["activate-local-start"]);
      await Promise.resolve();
      calls.push(["activate-local-done"]);
    },
    setStatus: (...args) => calls.push(["status", ...args])
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "graph_connect" });

  assert.equal(readiness.ready, true);
  assert.equal(calls.find((call) => call[0] === "preview")[1].allowLocalSetupPreview, true);
  assert.deepEqual(calls.map((call) => call[0]), ["preview", "activate-local-start", "activate-local-done"]);
});

test("local AI setup controller blocks ready auto-mode AI features when local setup save fails", async () => {
  const calls = [];
  const controller = createLocalAiSetupController(() => ({
    localOllamaSetupActive: () => false,
    shouldUseOllamaLocalRuntime: () => false,
    shouldGuideLocalAiSetupForFeature: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: () => ({ silent: true, render: false }),
    previewOllamaLocalAiBootstrapFromUi: async () => ({
      ready: true,
      status: "ready",
      model: "qwen3:8b"
    }),
    activateLocalAiSetupFlow: async (options) => {
      calls.push(["activate-local", options]);
      return false;
    },
    setStatus: (...args) => calls.push(["status", ...args])
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "ai_summary" });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, "local_ai_setup_save_failed");
  assert.deepEqual(calls.find((call) => call[0] === "activate-local"), ["activate-local", { restoreOnFailure: true }]);
  const status = calls.find((call) => call[0] === "status");
  assert.equal(status[2], "warn");
  assert.match(status[1], /保存为当前 AI 设置失败/);
  assert.match(status[1], /不影响继续写笔记/);
});

test("local AI setup controller retries pending local setup sync before allowing ready local features", async () => {
  const calls = [];
  const controller = createLocalAiSetupController(() => ({
    localAiFeatureReady: () => true,
    localOllamaSetupActive: () => true,
    shouldUseOllamaLocalRuntime: () => true,
    localAiSetupSyncPending: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: () => ({ silent: true, render: false }),
    previewOllamaLocalAiBootstrapFromUi: async () => ({
      ready: true,
      status: "ready",
      model: "qwen3:8b"
    }),
    activateLocalAiSetupFlow: async (options) => {
      calls.push(["activate-local", options]);
      return false;
    },
    setStatus: (...args) => calls.push(["status", ...args])
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "graph_connect" });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, "local_ai_setup_save_failed");
  assert.deepEqual(calls.find((call) => call[0] === "activate-local"), ["activate-local", { restoreOnFailure: true }]);
});

test("local AI setup controller allows ready local features after pending setup sync succeeds", async () => {
  const calls = [];
  const controller = createLocalAiSetupController(() => ({
    localAiFeatureReady: () => true,
    localOllamaSetupActive: () => true,
    shouldUseOllamaLocalRuntime: () => true,
    localAiSetupSyncPending: () => true,
    primaryRecommendedOllamaModelName: () => "qwen3:8b",
    localAiPreviewOptionsForAction: () => ({ silent: true, render: false }),
    previewOllamaLocalAiBootstrapFromUi: async () => ({
      ready: true,
      status: "ready",
      model: "qwen3:8b"
    }),
    activateLocalAiSetupFlow: async (options) => {
      calls.push(["activate-local", options]);
      return true;
    }
  }));

  const readiness = await controller.ensureReadyForAiFeature({ feature: "graph_connect" });

  assert.equal(readiness.ready, true);
  assert.deepEqual(calls.find((call) => call[0] === "activate-local"), ["activate-local", { restoreOnFailure: true }]);
});
