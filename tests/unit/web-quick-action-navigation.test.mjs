import test from 'node:test';
import assert from 'node:assert/strict';
import { installAppRailEventBindings } from '../../apps/web/src/app-rail-event-bindings.js';
import { installQuickActionEventBindings } from '../../apps/web/src/quick-action-event-bindings.js';

function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}

function navigationHarness(overrides = {}) {
  const handlers = {};
  const state = { module:'today', tabs:[], noteMoveVaultScope:{} };
  const messages = [], activations = [], renders = [], selections = [];
  let guardUntil = 0;
  const common = {
    state, now:() => 1000,
    documentRef: { querySelectorAll(selector) {
      const modules = selector === '.rail-btn[data-module]';
      const actions = selector === "[data-action^='quick-']";
      return (modules ? ['graph', 'writing'] : actions ? ['quick-fleeting', 'quick-literature', 'quick-original'] : [])
        .map(key => ({ dataset:modules ? { module:key } : { action:key },
          addEventListener(_event, handler) { handlers[key] = handler; } }));
    } },
    getGraphModuleActivationGuardUntil:() => guardUntil,
    setGraphModuleActivationGuardUntil:value => { guardUntil = value; },
    setStatus:message => messages.push(message)
  };
  installAppRailEventBindings({ ...common,
    activateModule:module => { activations.push(module); state.module = module; },
    ...overrides.rail
  });
  installQuickActionEventBindings({ ...common,
    folderById:(_state, root) => root, displayFolderName:root => root,
    syncRailSelectionState:() => selections.push(state.browserRootId),
    renderAll:() => renders.push(state.module), ...overrides.quick
  });
  return { state, messages, activations, renders, selections,
    guard:() => guardUntil,
    click:key => handlers[key]({ preventDefault() {}, stopPropagation() {} }) };
}

for (const [action, root] of [['quick-fleeting', 'dir_fleeting_default'], ['quick-literature', 'dir_literature_default']]) {
  for (const phase of ['preview', 'refresh']) {
    test(`${action} supersedes a graph open pending ${phase}`, async () => {
      const read = deferred();
      let refreshes = 0;
      const app = navigationHarness({ rail: {
        previewOllamaLocalAiBootstrapFromUi:() => phase === 'preview' ? read.promise : Promise.resolve(),
        refreshDirectoryGraph:() => { refreshes++; return phase === 'refresh' ? read.promise : Promise.resolve(); }
      } });
      const pending = app.click('graph');
      await Promise.resolve();
      await app.click(action);
      assert.equal(app.guard(), 0);
      read.resolve();
      await pending;
      assert.equal(app.state.module, 'explorer');
      assert.equal(app.state.browserRootId, root);
      assert.deepEqual(app.activations, ['graph']);
      assert.deepEqual(app.messages, [`已切换到 ${root} 入口`]);
      assert.equal(refreshes, phase === 'preview' ? 0 : 1);
    });
  }
}

test('a pending quick entry cannot overwrite later module feedback or render', async () => {
  const read = deferred();
  const app = navigationHarness({ quick: { syncNotesForDirectoryTree:() => read.promise } });
  const pending = app.click('quick-fleeting');
  await app.click('writing');
  read.resolve();
  await pending;
  assert.equal(app.state.module, 'writing');
  assert.deepEqual(app.messages, []);
  assert.deepEqual(app.renders, []);
  assert.deepEqual(app.selections, []);
});

test('a newer quick entry owns completion even while both entries use explorer', async () => {
  const read = deferred();
  const app = navigationHarness({ quick: {
    syncNotesForDirectoryTree:root => root === 'dir_fleeting_default' ? read.promise : Promise.resolve()
  } });
  const pending = app.click('quick-fleeting');
  await app.click('quick-literature');
  read.resolve();
  await pending;
  assert.equal(app.state.browserRootId, 'dir_literature_default');
  assert.deepEqual(app.messages, ['已切换到 dir_literature_default 入口']);
  assert.deepEqual(app.renders, ['explorer']);
  assert.deepEqual(app.selections, ['dir_literature_default']);
});

for (const change of ['scope', 'switching', 'uncertain']) {
  test(`quick entry completion is ignored when vault ${change} changes`, async () => {
    const read = deferred();
    const app = navigationHarness({ quick: { syncNotesForDirectoryTree:() => read.promise } });
    const pending = app.click('quick-literature');
    if (change === 'scope') app.state.noteMoveVaultScope = {};
    else app.state[change === 'switching' ? 'noteMoveVaultSwitching' : 'noteMoveVaultUncertain'] = true;
    read.resolve();
    await pending;
    assert.deepEqual(app.messages, []);
    assert.deepEqual(app.renders, []);
  });
}

test('a guarded permanent entry does not cancel the active graph opening', async () => {
  const read = deferred();
  const app = navigationHarness({ rail: { refreshDirectoryGraph:() => read.promise } });
  const pending = app.click('graph');
  await Promise.resolve();
  await app.click('quick-original');
  assert.equal(app.guard(), 2800);
  read.resolve();
  await pending;
  assert.equal(app.state.module, 'graph');
  assert.deepEqual(app.messages, ['已停留在关系图谱', '已打开永久笔记关系图谱']);
  assert.deepEqual(app.renders, []);
});

test('a new graph opening after a quick entry cannot revive the older graph continuation', async () => {
  const reads = [deferred(), deferred()];
  let requests = 0;
  const app = navigationHarness({ rail: { refreshDirectoryGraph:() => reads[requests++].promise } });
  const old = app.click('graph');
  await Promise.resolve();
  await app.click('quick-fleeting');
  const current = app.click('graph');
  await Promise.resolve();
  app.state.module = 'writing';
  reads[0].resolve();
  await old;
  assert.equal(app.state.module, 'writing');
  assert.deepEqual(app.activations, ['graph', 'graph']);
  await app.click('writing');
  reads[1].resolve();
  await current;
  assert.deepEqual(app.messages, ['已切换到 dir_fleeting_default 入口']);
});
