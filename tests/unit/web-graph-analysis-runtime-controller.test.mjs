import test from "node:test";
import assert from "node:assert/strict";
import { createGraphAnalysisRuntimeController } from "../../apps/web/src/graph-analysis-runtime-controller.js";

function harness(overrides = {}) {
  const graphState = { workbenchPanelTab: "clues", aiReviewSystemMessageId: "old" };
  const calls = [];
  const controller = createGraphAnalysisRuntimeController({
    graphState,
    graphScopeDirectoryId: () => "folder-a",
    ensureLocalAiReadyForFeature: async options => { calls.push(["ready", options]); return { ready: true }; },
    localOllamaSetupActive: () => false,
    ollamaBootstrapStatusText: () => "模型未就绪",
    analyzeDirectoryGraph: async (directory, options) => { calls.push(["analyze", directory, options]); return { reviewItems: { summary: { artifactCount: 2 } } }; },
    graphAiConnectRuntimeController: { runGraphAiConnectForNote: async id => { calls.push(["connect", id]); return true; } },
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args]),
    ...overrides
  });
  return { graphState, calls, ...controller };
}

test("analysis uses the current directory and actual counts while preserving the selected clue view", async () => {
  const h = harness();
  await h.runGraphAiAnalysis();
  assert.deepEqual(h.calls.find(([action]) => action === "analyze"), ["analyze", "folder-a", { includeDescendants: true, minScore: 0.05, persistArtifacts: true }]);
  assert.equal(h.graphState.aiAnalysis.reviewItems.summary.artifactCount, 2);
  assert.equal(h.graphState.aiAnalysisLoading, false);
  assert.equal(h.graphState.aiReviewSystemMessageId, "");
  assert.equal(h.graphState.thinkingPanelVisible, true);
  assert.equal(h.graphState.workbenchPanelTab, "clues");
  assert.ok(h.calls.some(call => call[1] === "已找到 2 条建议，请逐条确认"));
});

test("a blocked local model does not analyze and always releases the pending state", async () => {
  const h = harness({ ensureLocalAiReadyForFeature: async () => ({ ready: false, message: "请先下载模型" }) });
  await h.runGraphAiAnalysis();
  assert.equal(h.calls.some(([action]) => action === "analyze"), false);
  assert.equal(h.graphState.aiAnalysisError, "请先下载模型");
  assert.equal(h.graphState.aiAnalysisLoading, false);
});

test("analysis failures expose the cause without reporting recommendations", async () => {
  const h = harness({ analyzeDirectoryGraph: async () => { throw new Error("本地模型连接中断"); } });
  await h.runGraphAiAnalysis();
  assert.equal(h.graphState.aiAnalysisLoading, false);
  assert.equal(h.graphState.aiAnalysisError, "本地模型连接中断");
  assert.ok(h.calls.some(call => call[1] === "找缺口失败：本地模型连接中断" && call[2] === "warn"));
  assert.equal(h.graphState.aiAnalysis, undefined);
});

test("repeated analysis clicks do not start a second request", async () => {
  let finish;
  let calls = 0;
  const h = harness({ analyzeDirectoryGraph: async () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const pending = h.runGraphAiAnalysis();
  await new Promise(resolve => setImmediate(resolve));
  await h.runGraphAiAnalysis();
  assert.equal(calls, 1);
  finish({ reviewItems: { summary: { artifactCount: 0 } } });
  await pending;
  assert.ok(h.calls.some(call => call[1] === "当前没有新的建议"));
  assert.equal(h.graphState.aiAnalysisLoading, false);
});

test("note connection delegates only after the readiness check succeeds", async () => {
  const blocked = harness({ ensureLocalAiReadyForFeature: async () => ({ ready: false }) });
  assert.equal(await blocked.runGraphAiConnectForNote("n1"), false);
  assert.equal(blocked.calls.some(([action]) => action === "connect"), false);
  const ready = harness();
  assert.equal(await ready.runGraphAiConnectForNote("n1"), true);
  assert.deepEqual(ready.calls[0], ["ready", { feature: "graph_connect", openSettings: false }]);
  assert.deepEqual(ready.calls[1], ["connect", "n1"]);
});
