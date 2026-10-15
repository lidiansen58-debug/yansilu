import test from "node:test";
import assert from "node:assert/strict";
import { createSettingsAiRuntimeController } from "../../apps/web/src/settings-ai-runtime-controller.js";
import { createScheduledTasksRuntimeController } from "../../apps/web/src/scheduled-tasks-runtime-controller.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(kind) {
  const decision = deferred(), action = deferred(), started = deferred(), calls = [], messages = [], renders = [];
  const state = { module: "settings", noteMoveVaultScope: {} };
  const ai = { runtimeMode: "hybrid", localModel: "old-model", localRuntimeModels: ["old-model"],
    scheduledTasks: [{ scheduledTaskId: "rule", name: "我的规则", status: "paused", scope: {} }],
    scheduledTaskTemplates: [{ templateId: "reflection_reminder" }], scheduledTaskFilters: { limit: 50 },
    scheduledTaskForm: { templateId: "reflection_reminder" }, scheduledTaskFormOpen: true };
  const settingsState = { ai }; let vault = "original", prompts = 0, name = "我的规则", status = "active", notes = "";
  const deps = { state, settingsState, getVaultPath: () => vault,
    window: { confirm: () => { prompts++; return decision.promise; } }, setStatus: (...args) => messages.push(args),
    render: () => renders.push("tasks"), renderSettingsPanel: () => renders.push("models"),
    getElement: id => ({ value: ({ scheduledTaskNameInput: name, scheduledTaskStatusSelect: status,
      scheduledTaskNoteIdsInput: notes, scheduledTaskTemplateSelect: "reflection_reminder" })[id] }),
    saveAiScheduledTask: async payload => { calls.push(["save", payload]); started.resolve(); await action.promise; return { ...payload, scheduledTaskId: "rule" }; },
    updateAiScheduledTaskStatusWithOptions: async (...args) => { calls.push(["activate", ...args]); started.resolve(); await action.promise; return { scheduledTaskId: "rule", status: "active" }; },
    runDueAiScheduledTasks: async payload => { calls.push(["run", payload]); started.resolve(); await action.promise; return { succeeded: 1 }; },
    refreshScheduledTasks: async () => calls.push(["refresh"]),
    ollamaPullModelName: () => "download-model", currentOllamaModelTiers: () => [],
    pullOllamaModel: async (...args) => { calls.push(["pull", ...args]); started.resolve(); await action.promise; return { runtime: { status: "available", models: ["download-model"] } }; },
    stopOllamaRuntime: async () => { calls.push(["stop"]); started.resolve(); await action.promise; return { runtime: { status: "unavailable", models: [] } }; },
    applyOllamaRuntimePreview: result => { calls.push(["preview"]); return result.models; },
    persistAiSettingsToStorage: () => calls.push(["persist"]), refreshAiRoutePreview: async () => calls.push(["route"]) };
  const controller = kind === "model" ? createSettingsAiRuntimeController(() => deps) : createScheduledTasksRuntimeController(() => deps);
  return { state, ai, settingsState, deps, controller, decision, action, started, calls, messages, renders,
    prompts: () => prompts, changeVault: () => { vault = "new"; }, changeName: () => { name = "确认之后的新名称"; },
    scopeForm: () => { notes = "note1"; }, pauseForm: () => { status = "paused"; },
    invoke: key => key === "save" ? controller.saveFromUi() : key === "activate" ? controller.setTaskStatus("rule", "active")
      : key === "run" ? controller.runDueFromUi() : key === "pull" ? controller.pullRecommendedOllamaModel() : controller.stopOllamaRuntimeFromUi() };
}

for (const key of ["save", "activate", "run", "pull", "stop"]) {
  for (const accepted of [false, true]) {
    test(`${key} waits for a single asynchronous approval before starting (${accepted})`, async () => {
      const h = fixture(["pull", "stop"].includes(key) ? "model" : "task");
      const pending = h.invoke(key);
      assert.deepEqual(h.calls, []);
      assert.equal(await h.invoke(key), null);
      assert.equal(h.prompts(), 1);
      h.decision.resolve(accepted);
      if (accepted) {
        await h.started.promise;
        assert.equal(await h.invoke(key), null, "Loading guard persists through the action");
      }
      h.action.resolve(); await pending;
      assert.equal(h.calls.filter(call => call[0] === key).length, accepted ? 1 : 0);
    });
  }
  for (const change of ["scope", "path", "module", "uncertain", "state-record"]) {
    test(`${key} ignores approval after ${change} changes`, async () => {
      const h = fixture(["pull", "stop"].includes(key) ? "model" : "task"), pending = h.invoke(key);
      if (change === "scope") h.state.noteMoveVaultScope = {};
      if (change === "path") h.changeVault();
      if (change === "module") h.state.module = "writing";
      if (change === "uncertain") h.state.noteMoveVaultUncertain = true;
      if (change === "state-record") h.settingsState.ai = { ...h.ai };
      h.decision.resolve(true); assert.equal(await pending, null); assert.deepEqual(h.calls, []);
    });
  }
  test(`${key} drops late results after switching vault without replacing new state or feedback`, async () => {
    const h = fixture(["pull", "stop"].includes(key) ? "model" : "task"), pending = h.invoke(key);
    h.decision.resolve(true); await h.started.promise;
    h.state.noteMoveVaultScope = {}; h.settingsState.ai = { ...h.ai, localModel: "new-vault-model", scheduledTaskActionLoading: false };
    h.messages.length = 0; h.renders.length = 0;
    h.action.resolve(); assert.equal(await pending, null);
    assert.deepEqual(h.calls.map(call => call[0]), [key]);
    assert.deepEqual(h.messages, []); assert.deepEqual(h.renders, []);
    assert.equal(h.settingsState.ai.localModel, "new-vault-model");
    assert.equal(h.settingsState.ai.scheduledTaskActionLoading, false);
  });
  test(`${key} confirmation failure permits retry and missing confirmation cannot authorize work`, async () => {
    const h = fixture(["pull", "stop"].includes(key) ? "model" : "task"), pending = h.invoke(key);
    h.decision.reject(new Error("native dialog failed")); assert.equal(await pending, null);
    assert.deepEqual(h.calls, []);
    h.deps.window = {}; assert.equal(await h.invoke(key), null); assert.deepEqual(h.calls, []);
    h.deps.window = { confirm: async () => true }; h.action.resolve(); await h.invoke(key);
    assert.equal(h.calls.filter(call => call[0] === key).length, 1);
  });
}

for (const key of ["pull", "stop"]) {
  for (const phase of ["confirmation", "action"]) {
    test(`${key} never applies old model results after a new selection during ${phase}`, async () => {
      const h = fixture("model"), pending = h.invoke(key);
      if (phase === "action") { h.decision.resolve(true); await h.started.promise; }
      h.ai.runtimeMode = "remote_only"; h.ai.localModel = "new-choice";
      h.decision.resolve(true); h.action.resolve(); assert.equal(await pending, null);
      assert.equal(h.ai.localModel, "new-choice");
      assert.equal(h.calls.some(call => call[0] === "preview" || call[0] === "persist"), false);
    });
  }
}
test("editing an unlimited rule while confirming preserves its new draft and submits nothing", async () => {
  const h = fixture("task"), pending = h.invoke("save");
  h.changeName(); h.decision.resolve(true); assert.equal(await pending, null); assert.deepEqual(h.calls, []);
});
test("new rule input typed after saving starts is preserved when the old save succeeds", async () => {
  const h = fixture("task"), pending = h.invoke("save");
  h.decision.resolve(true); await h.started.promise; h.changeName(); h.action.resolve();
  await pending;
  assert.equal(h.ai.scheduledTaskForm.name, "确认之后的新名称");
  assert.equal(h.ai.scheduledTaskFormOpen, true);
  assert.equal(h.calls.some(call => call[0] === "refresh"), false);
  assert.match(h.messages.at(-1)[0], /原规则已保存.*新增的输入已保留/);
});
for (const change of ["removed", "scope", "status"]) {
  test(`unlimited rule activation is invalidated if its record is ${change}`, async () => {
    const h = fixture("task"), pending = h.invoke("activate");
    if (change === "removed") h.ai.scheduledTasks = [];
    if (change === "scope") h.ai.scheduledTasks[0].scope.noteIds = ["new-note"];
    if (change === "status") h.ai.scheduledTasks[0].status = "active";
    h.decision.resolve(true); assert.equal(await pending, null); assert.deepEqual(h.calls, []);
  });
}
test("fee confirmation is invalidated by changing filters or the remote model", async () => {
  for (const change of ["filters", "model"]) {
    const h = fixture("task"), pending = h.invoke("run");
    if (change === "filters") h.ai.scheduledTaskFilters.limit = 5; else h.ai.remoteRuntimeModel = "new-paid-model";
    h.decision.resolve(true); assert.equal(await pending, null); assert.deepEqual(h.calls, []);
  }
});
for (const method of ["refreshTemplates", "refreshTasks"]) {
  test(`${method} cannot apply an old-vault response or render over a new record`, async () => {
    const h = fixture("task"), read = deferred();
    h.deps.fetchAiScheduledTasks = () => read.promise; h.deps.fetchAiScheduledTaskTemplates = () => read.promise;
    const pending = h.controller[method]();
    h.state.noteMoveVaultScope = {}; h.settingsState.ai = { ...h.ai }; const newer = structuredClone(h.settingsState.ai);
    h.renders.length = 0;
    read.resolve({ items: [{ scheduledTaskId: "old" }] }); assert.equal(await pending, null);
    assert.deepEqual(h.settingsState.ai, newer); assert.deepEqual(h.renders, []);
  });
}
