import test from "node:test";
import assert from "node:assert/strict";
import { installAppRailEventBindings } from "../../apps/web/src/app-rail-event-bindings.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('late graph opening cannot replace a newer writing navigation', async () => {
  const read = deferred();
  const handlers = {};
  const state = { module: 'today', noteMoveVaultScope: {} };
  const activations = [];
  let guardUntil = 0;
  installAppRailEventBindings({
    documentRef: { querySelectorAll: () => ['graph', 'writing'].map(module => ({
      dataset: { module }, addEventListener(_event, handler) { handlers[module] = handler; }
    })) }, state, now: () => 1000,
    getGraphModuleActivationGuardUntil: () => guardUntil,
    setGraphModuleActivationGuardUntil: value => { guardUntil = value; },
    activateModule: module => { activations.push(module); state.module = module; },
    refreshDirectoryGraph: () => read.promise
  });
  const event = { preventDefault() {}, stopPropagation() {} };
  const pending = handlers.graph(event);
  await Promise.resolve();
  await handlers.writing(event);
  read.resolve();
  await pending;
  assert.equal(state.module, 'writing');
  assert.deepEqual(activations, ['graph', 'writing']);
});

test('leaving during graph AI preparation does not start a stale graph refresh', async () => {
  const preview = deferred();
  const handlers = {};
  const state = { module: 'today' };
  let refreshes = 0;
  installAppRailEventBindings({
    documentRef: { querySelectorAll: () => ['graph', 'writing'].map(module => ({
      dataset: { module }, addEventListener(_event, handler) { handlers[module] = handler; }
    })) }, state,
    activateModule: module => { state.module = module; },
    previewOllamaLocalAiBootstrapFromUi: () => preview.promise,
    refreshDirectoryGraph: async () => { refreshes++; }
  });
  const event = { preventDefault() {}, stopPropagation() {} };
  const pending = handlers.graph(event);
  await handlers.writing(event);
  preview.resolve();
  await pending;
  assert.equal(state.module, 'writing');
  assert.equal(refreshes, 0);
});

test('a superseded graph open cannot restore the graph using a newer guard window', async () => {
  for (const change of ['navigation', 'vault']) {
    const reads = [deferred(), deferred()];
    const handlers = {};
    const state = { module: 'today', noteMoveVaultScope: {} };
    let guardUntil = 0, requests = 0;
    const messages = [];
    installAppRailEventBindings({
      documentRef: { querySelectorAll: () => ['graph', 'writing'].map(module => ({
        dataset: { module }, addEventListener(_event, handler) { handlers[module] = handler; }
      })) }, state, now: () => 1000,
      getGraphModuleActivationGuardUntil: () => guardUntil,
      setGraphModuleActivationGuardUntil: value => { guardUntil = value; },
      activateModule: module => { state.module = module; },
      refreshDirectoryGraph: () => reads[requests++].promise,
      setStatus: message => messages.push(message)
    });
    const event = { preventDefault() {}, stopPropagation() {} };
    const old = handlers.graph(event);
    await Promise.resolve();
    let current;
    if (change === 'navigation') { current = handlers.graph(event); await Promise.resolve(); }
    else state.noteMoveVaultScope = {};
    state.module = 'writing';
    reads[0].resolve();
    await old;
    assert.equal(state.module, 'writing', change);
    assert.deepEqual(messages, []);
    if (current) { await handlers.writing(event); reads[1].resolve(); await current; }
  }
});

function settingsRail(refreshVaultSettings) {
  let click;
  let revision = 7;
  const state = { module: "today", noteMoveVaultScope: {} };
  const messages = [];
  const button = { dataset: { module: "settings" }, addEventListener(_name, listener) { click = listener; } };
  const setStatus = (text, tone, options = {}) => {
    if (options.skipIfStaleSince && options.skipIfStaleSince !== revision) return false;
    revision += 1;
    messages.push({ text, tone });
    return true;
  };
  installAppRailEventBindings({
    documentRef: { querySelectorAll: () => [button] }, state,
    activateModule: module => { state.module = module; },
    refreshVaultSettings, getStatusRevision: () => revision, setStatus
  });
  return { state, messages, setStatus, click: () => click({ preventDefault() {}, stopPropagation() {} }) };
}

test("settings refresh does not replace feedback from a newer user action", async () => {
  const read = deferred();
  const rail = settingsRail(() => read.promise);
  const pending = rail.click();
  rail.setStatus("已打开笔记库：新库", "ok");
  read.resolve();
  await pending;
  assert.deepEqual(rail.messages, [{ text: "已打开笔记库：新库", tone: "ok" }]);
});

test("a late old-vault settings refresh failure does not override the new vault", async () => {
  const read = deferred();
  const rail = settingsRail(() => read.promise);
  const pending = rail.click();
  rail.state.noteMoveVaultScope = {};
  read.reject(new Error("old vault unavailable"));
  await pending;
  assert.deepEqual(rail.messages, []);
});

test("current settings success and failure remain visible", async () => {
  const success = settingsRail(async () => {});
  await success.click();
  assert.deepEqual(success.messages, [{ text: "已打开设置", tone: "ok" }]);
  const failure = settingsRail(async () => { throw new Error("读取失败"); });
  await failure.click();
  assert.deepEqual(failure.messages, [{ text: "设置刷新失败：读取失败", tone: "warn" }]);
});
