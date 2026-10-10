import test from "node:test";
import assert from "node:assert/strict";
import { applyEditorPaneStateMethods } from "../../apps/web/src/editor-dirty-state.js";
import { installSettingsEventBindings } from "../../apps/web/src/settings-event-bindings.js";

function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function fixture(t) {
  const previous = globalThis.window;
  const decision = deferred(); let prompts = 0;
  globalThis.window = { confirm: () => { prompts++; return decision.promise; } };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  class Pane {}
  applyEditorPaneStateMethods(Pane);
  const note = { id: "n", title: "待确认笔记", body: "# 待确认笔记\n\n已保存正文", fileRevision: "revision-original" };
  const tab = { id: "tab_n", noteId: note.id, title: note.title, body: note.body, savedTitle: note.title, savedBody: note.body, dirty: true };
  const drafts = new Map([[note.id, { body: "# 上次草稿\n\n尚未完成 café 🌿", savedBody: "旧基线", savedTitle: "旧标题", savedFileRevision: "old-revision" }]]);
  const effects = [];
  const pane = Object.assign(new Pane(), {
    state: { notes: [note], tabs: [tab], activeTabId: tab.id, noteMoveVaultScope: {} },
    currentVaultPath: "E:/original", vaultScope: () => pane.currentVaultPath,
    activeTab: () => pane.state.tabs.find(item => item.id === pane.state.activeTabId),
    updateActiveTabFromEditor: () => pane.activeTab(),
    readDraft: id => drafts.get(id), clearDraft: id => { drafts.delete(id); effects.push(["clear-draft", id]); },
    clearAutoSaveTimer: () => effects.push(["clear-timer"]), scheduleAutoSave: () => effects.push(["autosave"]),
    fillEditorFromTab: () => effects.push(["fill"]), onStateChange: reason => effects.push(["state", reason]),
    onStatus: (...args) => effects.push(["status", ...args]), syncPlaceholderTitleArmed: () => {},
    closeTransientPanels: () => {}, defaultAuthorshipState: () => ({})
  });
  return { pane, tab, note, drafts, decision, effects, prompts: () => prompts };
}

for (const operation of ["closeTab", "closeAllTabs"]) {
  test(`${operation} waits for native confirmation, repeated clicks do not prompt, cancellation preserves draft and permits retry`, async t => {
    const { pane, tab, drafts, decision, effects, prompts } = fixture(t);
    const pending = pane[operation](tab.id);
    assert.deepEqual(effects, []);
    assert.equal(drafts.size, 1);
    assert.equal(pane.state.tabs.length, 1);
    assert.equal(await pane[operation](tab.id), false);
    assert.equal(prompts(), 1);
    decision.resolve(false);
    assert.equal(await pending, false);
    assert.deepEqual(effects, []);
    assert.equal(drafts.size, 1);
    window.confirm = async () => true;
    assert.equal(await pane[operation](tab.id), true);
    assert.equal(pane.state.tabs.length, 0);
    assert.equal(drafts.size, 0);
  });
  for (const [label, change] of [
    ["vault scope", pane => { pane.state.noteMoveVaultScope = {}; }],
    ["vault path", pane => { pane.currentVaultPath = "E:/other"; }],
    ["vault switching", pane => { pane.state.noteMoveVaultSwitching = true; }],
    ["vault uncertain", pane => { pane.state.noteMoveVaultUncertain = true; }],
    ["typed body", (_pane, tab) => { tab.body += "新输入"; }],
    ["active tab", pane => { pane.state.activeTabId = "other"; }],
    ["closed tab", pane => { pane.state.tabs = []; }]
  ]) {
    test(`${operation} aborts a late approval after ${label} changes`, async t => {
      const { pane, tab, decision, effects, drafts } = fixture(t);
      const pending = pane[operation](tab.id);
      change(pane, tab);
      decision.resolve(true);
      assert.equal(await pending, false);
      assert.deepEqual(effects, []);
      assert.equal(drafts.size, 1);
    });
  }
  test(`${operation} rejects a failed native dialog without discarding and allows a new attempt`, async t => {
    const { pane, tab, decision, drafts } = fixture(t);
    const pending = pane[operation](tab.id);
    decision.reject(new Error("dialog unavailable"));
    assert.equal(await pending, false);
    assert.equal(drafts.size, 1);
    window.confirm = () => true;
    assert.equal(await pane[operation](tab.id), true);
  });
}

test("close-all cannot silently discard a newly opened tab while awaiting approval", async t => {
  const { pane, decision, effects } = fixture(t);
  const pending = pane.closeAllTabs();
  pane.state.tabs.push({ id: "new", noteId: "new", body: "新笔记", dirty: true });
  decision.resolve(true);
  assert.equal(await pending, false);
  assert.equal(pane.state.tabs.length, 2);
  assert.deepEqual(effects, []);
});
test("an autosave completing during confirmation does not block closing unchanged input", async t => {
  const { pane, tab, decision } = fixture(t);
  const pending = pane.closeTab(tab.id);
  tab.dirty = false; tab.savedBody = tab.body; tab.savedFileRevision = "saved-revision";
  decision.resolve(true);
  assert.equal(await pending, true);
});

for (const accepted of [false, true]) {
  test(`draft restoration waits for explicit ${accepted ? "acceptance and preserves its old baseline" : "decline before clearing the old draft"}`, async t => {
    const { pane, tab, note, decision, drafts, effects } = fixture(t);
    tab.dirty = false;
    const draft = drafts.get(note.id);
    const pending = pane.maybeRestoreDraft(tab, note);
    assert.equal(tab.body, note.body);
    assert.deepEqual(effects, []);
    assert.equal(drafts.size, 1);
    decision.resolve(accepted);
    await pending;
    assert.equal(tab.body, accepted ? draft.body : note.body);
    if (accepted) {
      assert.equal(tab.savedBody, draft.savedBody);
      assert.equal(tab.savedFileRevision, draft.savedFileRevision);
      assert.equal(tab.dirty, true);
      assert.ok(effects.some(item => item[0] === "fill"));
      assert.ok(effects.some(item => item[0] === "autosave"));
    } else assert.equal(drafts.size, 0);
  });
}
for (const [label, change] of [
  ["vault", ({ pane }) => { pane.state.noteMoveVaultScope = {}; }],
  ["closed tab", ({ pane }) => { pane.state.tabs = []; }],
  ["new input", ({ tab }) => { tab.body = "更新的输入"; tab.dirty = true; }],
  ["changed source", ({ note }) => { note.fileRevision = "external-revision"; }],
  ["newer stored draft", ({ drafts }) => { drafts.set("n", { body: "更新的草稿" }); }]
]) for (const accepted of [false, true]) {
  test(`late draft decision ${accepted} preserves content after ${label} changes`, async t => {
    const context = fixture(t);
    context.tab.dirty = false;
    const pending = context.pane.maybeRestoreDraft(context.tab, context.note);
    change(context);
    const expectedBody = context.tab.body;
    context.decision.resolve(accepted);
    assert.equal(await pending, false);
    assert.equal(context.tab.body, expectedBody);
    assert.equal(context.drafts.size, 1);
    assert.deepEqual(context.effects, []);
  });
}
test("opening another note cannot be undone by late draft recovery", async t => {
  const { pane, note, decision, drafts } = fixture(t);
  pane.state.tabs = []; pane.state.activeTabId = null;
  const other = { id: "other", title: "另一个笔记", body: "# 另一个笔记\n\n其他正文" };
  pane.state.notes.push(other);
  pane.openNoteTab(note.id);
  assert.equal(pane.activeTab().body, note.body, "Opening renders saved content while awaiting recovery");
  pane.openNoteTab(other.id);
  decision.resolve(true);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(pane.state.activeTabId, "tab_other");
  assert.equal(pane.state.tabs.find(tab => tab.noteId === note.id).body, note.body);
  assert.equal(drafts.has(note.id), true);
});
test("a rejected native restoration dialog retains the draft and permits a later recovery", async t => {
  const { pane, tab, note, decision, drafts } = fixture(t);
  tab.dirty = false;
  const pending = pane.maybeRestoreDraft(tab, note);
  decision.reject(new Error("native dialog failed"));
  assert.equal(await pending, false);
  assert.equal(tab.body, note.body);
  assert.equal(drafts.size, 1);
  window.confirm = () => true;
  assert.equal(await pane.maybeRestoreDraft(tab, note), true);
  assert.equal(tab.body, drafts.get(note.id).body);
});

for (const restored of [false, true]) test(`${restored ? "restore" : "switch"} vault settings await cancellation and acceptance`, async () => {
  let click, switches = 0;
  let gate = deferred();
  const elements = new Map([
    [restored ? "settingsOpenRestoredVault" : "settingsSwitchVault", { addEventListener: (_event, handler) => { click = handler; } }],
    ["settingsVaultPath", { value: "next-vault" }]
  ]);
  installSettingsEventBindings({ $: id => elements.get(id), state: { tabs: [] },
    settingsState: { backup: { lastRestore: { vaultPath: "restored-vault" } } },
    editor: { confirmDiscardDirtyTabs: () => gate.promise },
    desktopCommands: { switchVault: async vaultPath => { switches++; return { vaultPath }; } }
  });
  const cancelled = click();
  assert.equal(switches, 0);
  gate.resolve(false); await cancelled;
  assert.equal(switches, 0);
  gate = deferred();
  const accepted = click();
  assert.equal(switches, 0);
  gate.resolve(true); await accepted;
  assert.equal(switches, 1);
});
