import test from "node:test";
import assert from "node:assert/strict";
import { createOverlayDismissalCallbacks } from "../../apps/web/src/app-overlay-dismissal-controller.js";
import { installAppRailEventBindings } from "../../apps/web/src/app-rail-event-bindings.js";
import { installQuickActionEventBindings } from "../../apps/web/src/quick-action-event-bindings.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const state = { module: "today", activeTabId: "tab_source", tabs: [], noteMoveVaultScope: {} };
  const graphState = { selection: { kind: "node", noteId: "source" }, workbenchPanelOpen: true, utilityDrawerOpen: true };
  let workspace = { open: true, dirty: true, mode: "manual", sourceNoteId: "source", relationComposerSessionId: "session1",
    selectedTargetNoteId: "target", rationale: "未保存的关联理由。", manualQuery: "目标" };
  let vaultPath = "C:/synthetic/original", systemOpen = true;
  const decisions = [], prompts = [], messages = [], effects = [], handlers = {}, activations = [];
  const callbacks = createOverlayDismissalCallbacks({
    state, graphState, getVaultPath: () => vaultPath, getPermanentRelationWorkspaceState: () => workspace,
    confirm: message => { const decision = deferred(); decisions.push(decision); prompts.push(message); return decision.promise; },
    closePermanentRelationWorkspace: () => { effects.push("workspace"); workspace = { ...workspace, open: false }; },
    closeSystemMessages: () => { effects.push("system"); systemOpen = false; },
    isSystemMessageModalOpen: () => systemOpen,
    renderGraphPanel: () => effects.push("render"), setStatus: (...message) => messages.push(message)
  });
  const documentRef = { querySelectorAll(selector) {
    const modules = selector === ".rail-btn[data-module]";
    return (modules ? ["writing", "settings"] : selector === "[data-action^='quick-']" ? ["quick-literature"] : [])
      .map(key => ({ dataset: modules ? { module: key } : { action: key }, addEventListener(_name, fn) { handlers[key] = fn; } }));
  } };
  installAppRailEventBindings({ documentRef, state, ...callbacks, activateModule: module => { state.module = module; activations.push(module); } });
  installQuickActionEventBindings({ documentRef, state, ...callbacks, renderAll: () => effects.push("quick-render") });
  const event = () => ({ prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  return { state, graphState, decisions, prompts, messages, effects, activations, callbacks, event,
    workspace: () => workspace, replaceWorkspace: changes => { workspace = { ...workspace, ...changes }; },
    changeVault: value => { vaultPath = value; }, changeSystem: value => { systemOpen = value; },
    click: key => handlers[key](event()) };
}

for (const accepted of [false, true]) {
  test(`navigation waits for explicit ${accepted ? "approval" : "decline"} before closing any overlay`, async () => {
    const app = harness();
    const pending = app.click("writing");
    assert.equal(app.prompts.length, 1);
    assert.deepEqual(app.effects, []);
    assert.equal(app.workspace().open, true);
    assert.equal(app.state.module, "today");
    app.decisions[0].resolve(accepted);
    await pending;
    if (accepted) {
      assert.deepEqual(app.effects, ["system", "workspace", "render"]);
      assert.equal(app.graphState.selection, null);
      assert.deepEqual(app.activations, ["writing"]);
    } else {
      assert.deepEqual(app.effects, []);
      assert.equal(app.workspace().rationale, "未保存的关联理由。");
      assert.deepEqual(app.activations, []);
      assert.deepEqual(app.messages, [["已保留关联输入。", "warn"]]);
    }
  });
}

for (const accepted of [false, true]) {
  test(`latest navigation shares one pending decision (${accepted}) and alone owns activation`, async () => {
    const app = harness();
    const first = app.click("writing"), second = app.click("settings"), third = app.click("quick-literature");
    assert.equal(app.prompts.length, 1);
    assert.deepEqual(app.effects, []);
    app.decisions[0].resolve(accepted);
    await Promise.all([first, second, third]);
    assert.deepEqual(app.activations, []);
    assert.equal(app.state.module, accepted ? "explorer" : "today");
    assert.equal(app.state.browserRootId, accepted ? "dir_literature_default" : undefined);
    assert.equal(app.effects.filter(effect => effect === "workspace").length, accepted ? 1 : 0);
  });
}

test("repeated navigation to the same module asks and activates once", async () => {
  const app = harness();
  const first = app.click("writing"), second = app.click("writing");
  assert.equal(app.prompts.length, 1);
  app.decisions[0].resolve(true);
  await Promise.all([first, second]);
  assert.deepEqual(app.activations, ["writing"]);
});

for (const change of ["rationale", "query", "target", "type", "session", "selection", "graph-input", "tab", "module", "scope", "vault-path", "switching", "uncertain", "system-modal"]) {
  test(`late approval preserves overlays and blocks navigation after ${change} changes`, async () => {
    const app = harness();
    if (change === "graph-input") {
      app.graphState.selection = { kind: "isolated", noteId: "source" };
      app.graphState.isolatedRelationDraftByNoteId = { source: { rationale: "原输入" } };
    }
    const pending = app.click("writing");
    if (change === "rationale") app.replaceWorkspace({ rationale: "确认等待期间的新理由。" });
    if (change === "query") app.replaceWorkspace({ manualQuery: "新的搜索词" });
    if (change === "target") app.replaceWorkspace({ selectedTargetNoteId: "another" });
    if (change === "type") app.replaceWorkspace({ relationType: "contradicts" });
    if (change === "session") app.replaceWorkspace({ relationComposerSessionId: "session2" });
    if (change === "selection") app.graphState.selection = { kind: "node", noteId: "another" };
    if (change === "graph-input") app.graphState.isolatedRelationDraftByNoteId.source.rationale = "新输入";
    if (change === "tab") app.state.activeTabId = "tab_another";
    if (change === "module") app.state.module = "graph";
    if (change === "scope") app.state.noteMoveVaultScope = {};
    if (change === "vault-path") app.changeVault("C:/synthetic/new");
    if (change === "switching") app.state.noteMoveVaultSwitching = true;
    if (change === "uncertain") app.state.noteMoveVaultUncertain = true;
    if (change === "system-modal") app.changeSystem(false);
    app.decisions[0].resolve(true);
    await pending;
    assert.deepEqual(app.effects, []);
    assert.deepEqual(app.messages, []);
    assert.deepEqual(app.activations, []);
    assert.equal(app.workspace().open, true);
  });
}

test("background relation preview hydration does not invalidate unchanged user input", async () => {
  const app = harness();
  const pending = app.click("writing");
  app.replaceWorkspace({ pairPreview: { status: "ready" }, manualSearchItems: [{ id: "target" }] });
  app.decisions[0].resolve(true);
  await pending;
  assert.deepEqual(app.activations, ["writing"]);
});

test("Escape consumes the event immediately and shares no duplicate prompt with bubbling handlers", async () => {
  const app = harness(), event = app.event();
  const first = app.callbacks.dismissSafeOverlaysForEscape(event);
  const second = app.callbacks.dismissSafeOverlaysForEscape(app.event());
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(app.prompts.length, 1);
  assert.match(app.prompts[0], /收起面板/);
  assert.deepEqual(app.effects, []);
  assert.equal((await second).reason, "confirmation-pending");
  app.decisions[0].resolve(false);
  assert.equal((await first).ok, false);
  assert.deepEqual(app.effects, []);
  const retry = app.callbacks.dismissSafeOverlaysForEscape(app.event());
  assert.equal(app.prompts.length, 2);
  app.decisions[1].resolve(true);
  assert.equal((await retry).ok, true);
  assert.equal(app.workspace().open, false);
});

for (const composition of [{ isComposing: true }, { keyCode: 229 }]) {
  test(`IME Escape does not dismiss relation input (${JSON.stringify(composition)})`, async () => {
    const app = harness(), event = Object.assign(app.event(), composition);
    await app.callbacks.dismissSafeOverlaysForEscape(event);
    assert.equal(event.prevented, false);
    assert.equal(event.stopped, false);
    assert.deepEqual(app.prompts, []);
    assert.deepEqual(app.effects, []);
  });
}

test("confirmation rejection keeps input and permits a later retry", async () => {
  const app = harness();
  const pending = app.click("writing");
  app.decisions[0].reject(new Error("native dialog failed"));
  await pending;
  assert.deepEqual(app.effects, []);
  assert.match(app.messages[0][0], /确认未完成/);
  const retry = app.click("writing");
  app.decisions[1].resolve(true);
  await retry;
  assert.deepEqual(app.activations, ["writing"]);
});

test("two dirty relation surfaces are closed only after both explicit approvals", async () => {
  const app = harness();
  app.graphState.selection = { kind: "isolated", noteId: "source" };
  app.graphState.isolatedRelationDraftByNoteId = { source: { rationale: "未保存的图谱关联" } };
  const pending = app.click("writing");
  app.decisions[0].resolve(true);
  for (let i = 0; i < 10 && app.decisions.length < 2; i++) await Promise.resolve();
  assert.equal(app.decisions.length, 2);
  assert.deepEqual(app.effects, []);
  app.decisions[1].resolve(false);
  await pending;
  assert.equal(app.workspace().open, true);
  assert.deepEqual(app.graphState.selection, { kind: "isolated", noteId: "source" });
  assert.deepEqual(app.effects, []);
});
