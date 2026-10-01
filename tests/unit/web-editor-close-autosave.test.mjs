import test from "node:test";
import assert from "node:assert/strict";
import { applyEditorPaneStateMethods } from "../../apps/web/src/editor-dirty-state.js";
import { AUTO_SAVE_IDLE_MS } from "../../apps/web/src/editor-autosave-drafts.js";

function setup(t, { activeDirty = true, otherDirty = false } = {}) {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  class Pane {}
  applyEditorPaneStateMethods(Pane);
  const first = { id: "tab-first", noteId: "first", body: "Latest first", dirty: activeDirty };
  const second = { id: "tab-second", noteId: "second", body: "Latest second", dirty: otherDirty };
  const writes = [], discarded = [];
  const pane = Object.assign(new Pane(), {
    state: { tabs: [first, second], activeTabId: first.id },
    activeTab() { return this.state.tabs.find(tab => tab.id === this.state.activeTabId); },
    confirmDiscardTab: () => true,
    confirmDiscardDirtyTabs: () => true,
    clearDraft: id => discarded.push(id),
    fillEditorFromTab() {},
    onStateChange() {},
    async autoSaveActiveNote() {
      const tab = this.activeTab();
      writes.push({ noteId: tab.noteId, body: tab.body });
      tab.dirty = false;
    }
  });
  pane.scheduleAutoSave();
  return { pane, first, second, writes, discarded };
}

for (const operation of ["closeTab", "closeAllTabs"]) {
  test(`cancelling ${operation} preserves the pending autosave deadline`, t => {
    const { pane, first, writes, discarded } = setup(t);
    pane.confirmDiscardTab = pane.confirmDiscardDirtyTabs = () => false;
    t.mock.timers.tick(AUTO_SAVE_IDLE_MS - 1000);
    assert.equal(pane[operation](first.id), false);
    t.mock.timers.tick(1000);
    assert.deepEqual(writes, [{ noteId: first.noteId, body: first.body }]);
    assert.equal(pane.state.tabs.length, 2);
    assert.deepEqual(discarded, []);
  });
}

test("closing an inactive tab preserves the active note's autosave deadline", t => {
  const { pane, first, second, writes } = setup(t);
  t.mock.timers.tick(AUTO_SAVE_IDLE_MS - 1000);
  assert.equal(pane.closeTab(second.id), true);
  t.mock.timers.tick(1000);
  assert.deepEqual(writes, [{ noteId: first.noteId, body: first.body }]);
  assert.equal(pane.state.activeTabId, first.id);
});

test("closing the active tab schedules autosave for the remaining dirty note", t => {
  const { pane, first, second, writes } = setup(t, { activeDirty: false, otherDirty: true });
  assert.equal(pane.closeTab(first.id), true);
  t.mock.timers.tick(AUTO_SAVE_IDLE_MS);
  assert.deepEqual(writes, [{ noteId: second.noteId, body: second.body }]);
  assert.equal(pane.state.activeTabId, second.id);
});

test("confirmed close-all cancels pending writes and removes discarded drafts", t => {
  const { pane, first, writes, discarded } = setup(t);
  assert.equal(pane.closeAllTabs(), true);
  t.mock.timers.tick(AUTO_SAVE_IDLE_MS * 2);
  assert.deepEqual(writes, []);
  assert.deepEqual(discarded, [first.noteId]);
  assert.equal(pane.state.tabs.length, 0);
  assert.equal(pane.state.activeTabId, null);
});
