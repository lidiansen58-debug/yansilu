import test from "node:test";
import assert from "node:assert/strict";
import { applyAiInboxRecommendedActionForRuntime } from "../../apps/web/src/ai-inbox-runtime-controller.js";
import { runConfirmedSmartNotesDemoImport } from "../../apps/web/src/smart-notes-demo-import-flow.js";
import { createPrototypeUpdateController } from "../../apps/web/src/prototype-update-controller.js";
import { createUpdateState } from "../../apps/web/src/update-state.js";
import { buildAppShellStateChangeDeps } from "../../apps/web/src/app-shell-state-change-deps.js";
import { routeAppShellStateChange } from "../../apps/web/src/app-shell-state-change-router.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function inboxFixture() {
  const decision = deferred(), state = { module: "aiInbox", noteMoveVaultScope: {} };
  const aiInboxState = { selectedArtifactId: "a1", detailRequestToken: 1, aiSummaryRequestToken: 1,
    detail: { item: { artifactId: "a1" }, suggestion: { id: "s1", status: "proposed" } }, actionLoading: false };
  const calls = [], messages = [];
  let prompts = 0, vault = "original", comment = "原评论";
  const deps = { state, aiInboxState, getVaultPath: () => vault, decisionCommentText: () => comment,
    confirm: () => { prompts++; return decision.promise; }, setStatus: (...args) => messages.push(args),
    acceptLink: async id => calls.push(["link", id]), adoptFieldSuggestion: async (...args) => calls.push(["field", ...args]),
    promoteNote: async id => calls.push(["promote", id]), recordDecision: async id => calls.push(["decision", id]),
    appendDecisionComment: value => calls.push(["comment", value]) };
  return { deps, state, aiInboxState, decision, calls, messages, prompts: () => prompts,
    changeVault: () => { vault = "new"; }, changeComment: () => { comment = "新评论"; } };
}
for (const action of ["accept_link", "adopt_field_suggestion", "promote_note", "ignore", "needs_more_context"]) {
  for (const accepted of [false, true]) {
    test(`AI recommended ${action} waits for explicit async decision (${accepted})`, async () => {
      const h = inboxFixture(), pending = applyAiInboxRecommendedActionForRuntime(h.deps, action);
      assert.deepEqual(h.calls, []);
      assert.equal(await applyAiInboxRecommendedActionForRuntime(h.deps, action), false);
      assert.equal(h.prompts(), 1);
      h.decision.resolve(accepted); await pending;
      assert.equal(h.calls.length, accepted ? action === "needs_more_context" ? 2 : 1 : 0);
      if (accepted && action === "adopt_field_suggestion") assert.deepEqual(h.calls, [["field", "a1", "s1"]]);
    });
  }
}
for (const change of ["selection", "detail", "summary", "comment", "busy", "scope", "path", "module", "uncertain"]) {
  test(`late AI approval cannot execute after ${change} changes`, async () => {
    const h = inboxFixture(), pending = applyAiInboxRecommendedActionForRuntime(h.deps, "ignore");
    if (change === "selection") h.aiInboxState.selectedArtifactId = "a2";
    if (change === "detail") h.aiInboxState.detail = { item: { artifactId: "a1" }, suggestion: { id: "s2" } };
    if (change === "summary") h.aiInboxState.aiSummaryRequestToken++;
    if (change === "comment") h.changeComment();
    if (change === "busy") h.aiInboxState.actionLoading = true;
    if (change === "scope") h.state.noteMoveVaultScope = {};
    if (change === "path") h.changeVault();
    if (change === "module") h.state.module = "writing";
    if (change === "uncertain") h.state.noteMoveVaultUncertain = true;
    h.decision.resolve(true); assert.equal(await pending, false);
    assert.deepEqual(h.calls, []); assert.deepEqual(h.messages, []);
  });
}
test("AI confirmation rejection keeps the item unchanged and allows retry", async () => {
  const h = inboxFixture(), pending = applyAiInboxRecommendedActionForRuntime(h.deps, "promote_note");
  h.decision.reject(new Error("dialog unavailable")); assert.equal(await pending, false);
  assert.deepEqual(h.calls, []); assert.match(h.messages[0][0], /确认未完成/);
  h.deps.confirm = async () => true;
  await applyAiInboxRecommendedActionForRuntime(h.deps, "promote_note");
  assert.deepEqual(h.calls, [["promote", "a1"]]);
});

for (const accepted of [false, true]) {
  test(`Demo import waits, prevents duplicate prompts and stays guarded through the import (${accepted})`, async () => {
    const decision = deferred(), importDone = deferred(), started = deferred();
    const calls = [], state = { noteMoveVaultScope: {} }; let prompts = 0;
    const deps = { state, confirm: () => { prompts++; return decision.promise; },
      importSmartNotesDemo: async payload => { calls.push(payload); started.resolve(); await importDone.promise; return true; } };
    const pending = runConfirmedSmartNotesDemoImport({}, deps);
    assert.deepEqual(calls, []);
    assert.equal(await runConfirmedSmartNotesDemoImport({}, deps), false);
    assert.equal(prompts, 1);
    decision.resolve(accepted);
    if (accepted) {
      await started.promise;
      assert.equal(await runConfirmedSmartNotesDemoImport({ confirmed: true }, deps), false);
    }
    importDone.resolve(); assert.equal(await pending, accepted);
    assert.equal(calls.length, accepted ? 1 : 0);
  });
}
for (const change of ["scope", "path", "switching", "uncertain", "module"]) {
  test(`Demo import ignores a late approval after ${change} changes`, async () => {
    const decision = deferred(), calls = [], state = { module: "today", noteMoveVaultScope: {} }; let vault = "original";
    const deps = { state, getVaultPath: () => vault, confirm: () => decision.promise, importSmartNotesDemo: async payload => calls.push(payload) };
    const pending = runConfirmedSmartNotesDemoImport({}, deps);
    if (change === "scope") state.noteMoveVaultScope = {};
    if (change === "path") vault = "new";
    if (change === "switching") state.noteMoveVaultSwitching = true;
    if (change === "uncertain") state.noteMoveVaultUncertain = true;
    if (change === "module") state.module = "explorer";
    decision.resolve(true); assert.equal(await pending, false); assert.deepEqual(calls, []);
  });
}

for (const change of ["scope", "path", "module"]) {
  test(`assembled Demo route keeps actual host context when ${change} changes`, async () => {
    const decision = deferred(), calls = [], state = { module: "settings", noteMoveVaultScope: {} }; let vault = "original";
    const host = { state, getVaultPath: () => vault, confirm: () => decision.promise, importSmartNotesDemo: async payload => calls.push(payload) };
    const pending = routeAppShellStateChange("seed-smart-notes-demo", {}, buildAppShellStateChangeDeps(host));
    if (change === "scope") state.noteMoveVaultScope = {};
    if (change === "path") vault = "new";
    if (change === "module") state.module = "writing";
    decision.resolve(true); assert.equal(await pending, false); assert.deepEqual(calls, []);
  });
}

async function updateFixture(run) {
  const previousWindow = globalThis.window;
  const decision = deferred(), relaunchDone = deferred(), relaunchStarted = deferred();
  const state = { module: "settings", noteMoveVaultScope: {} }, settingsState = {
    update: createUpdateState({ status: "downloaded", latestVersion: "next", installReadyForRestart: true })
  };
  let prompts = 0, relaunches = 0, dirty = 0, workflows = [];
  const messages = [];
  globalThis.window = { confirm: () => { prompts++; return decision.promise; }, __TAURI__: {
    process: { relaunch: async () => { relaunches++; relaunchStarted.resolve(); await relaunchDone.promise; } }
  } };
  const controller = createPrototypeUpdateController({ state, settingsState, getDirtyTabCount: () => dirty,
    getRestartBlockers: () => workflows, setStatus: (...args) => messages.push(args) });
  try { await run({ controller, state, settingsState, decision, relaunchDone, relaunchStarted, messages,
    prompts: () => prompts, relaunches: () => relaunches, dirty: () => { dirty++; }, workflow: () => { workflows = ["正在保存文章"]; } }); }
  finally { relaunchDone.resolve(); if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
}
for (const change of ["cancel", "dirty", "workflow", "scope", "module", "candidate", "readiness", "error", "approve"]) {
  test(`update restart waits for async confirmation and rechecks ${change}`, async () => updateFixture(async h => {
    const pending = h.controller.relaunchAfterInstalledUpdate();
    assert.equal(h.relaunches(), 0);
    assert.equal(await h.controller.relaunchAfterInstalledUpdate(), false);
    assert.equal(h.prompts(), 1);
    if (change === "dirty") h.dirty();
    if (change === "workflow") h.workflow();
    if (change === "scope") h.state.noteMoveVaultScope = {};
    if (change === "module") h.state.module = "today";
    if (change === "candidate") h.settingsState.update = { ...h.settingsState.update };
    if (change === "readiness") h.settingsState.update.installReadyForRestart = false;
    if (change === "error") h.decision.reject(new Error("native failed")); else h.decision.resolve(change !== "cancel");
    if (change === "approve") {
      await h.relaunchStarted.promise;
      assert.equal(await h.controller.relaunchAfterInstalledUpdate(), false);
      h.relaunchDone.resolve();
    }
    assert.equal(await pending, change === "approve");
    assert.equal(h.relaunches(), change === "approve" ? 1 : 0);
    if (["dirty", "workflow"].includes(change)) assert.match(h.messages[0][0], /当前不重启/);
  }));
}
