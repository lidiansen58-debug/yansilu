import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createSaveRacePane({ dirty = true, inFlightResult = true } = {}) {
  const tab = {
    id: "tab-1",
    noteId: "note-1",
    body: "# Updated note",
    dirty
  };
  const pane = Object.assign(Object.create(EditorPane.prototype), {
    state: {
      activeTabId: tab.id,
      tabs: [tab],
      notes: [{ id: tab.noteId, body: "# Old note", title: "Old note", folderId: "permanent" }]
    },
    savingPromise: Promise.resolve(inFlightResult),
    closeLinkPickerCount: 0,
    closeTagPickerCount: 0,
    saveAttempts: 0,
    autoSaveScheduled: 0,
    clearAutoSaveTimer() {},
    closeLinkPicker() {
      this.closeLinkPickerCount += 1;
    },
    closeTagPicker() {
      this.closeTagPickerCount += 1;
    },
    setSaveUiState() {},
    scheduleAutoSave() {
      this.autoSaveScheduled += 1;
    },
    async performSaveActiveNote() {
      this.saveAttempts += 1;
      tab.dirty = false;
      return true;
    }
  });
  return { pane, tab };
}

test("manual save waits for an in-flight save and then saves the latest dirty tab", async () => {
  const { pane, tab } = createSaveRacePane();

  const result = await pane.saveActiveNote();

  assert.equal(result, true);
  assert.equal(pane.saveAttempts, 1);
  assert.equal(tab.dirty, false);
  assert.equal(pane.closeLinkPickerCount, 1);
  assert.equal(pane.closeTagPickerCount, 1);
  assert.equal(pane.savingPromise, null);
});

test("autosave keeps sharing an in-flight save instead of starting another request", async () => {
  const { pane, tab } = createSaveRacePane({ inFlightResult: "in-flight" });

  const result = await pane.saveActiveNote({ autoSave: true });

  assert.equal(result, "in-flight");
  assert.equal(pane.saveAttempts, 0);
  assert.equal(tab.dirty, true);
});
