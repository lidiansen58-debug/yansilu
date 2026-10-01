import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { createInitialState } from "../../apps/web/src/prototype-store.js";

function createNormalizedSavePane() {
  const rawBody = "# Normalized note\n\n## 核心观点\nAn independent judgment.\n\n## 为什么成立\nA concrete reason.";
  const note = { id: "normalized-note", title: "Normalized note", folderId: "dir_original_default", noteType: "permanent", status: "draft", body: "# Normalized note\n\nold" };
  const tab = { id: "normalized-tab", noteId: note.id, title: note.title, body: rawBody, savedTitle: note.title, savedBody: note.body, dirty: true };
  const state = createInitialState();
  Object.assign(state, { notes: [note], tabs: [tab], activeTabId: tab.id });
  const editor = { value: rawBody, repaints: [], drafts: [], cleared: [] };
  const pane = Object.assign(Object.create(EditorPane.prototype), {
    state, els: {},
    getEditorValue: () => editor.value,
    setEditorValue(value) { editor.value = value; editor.repaints.push(value); },
    onStatus() {}, renderSaveHint() {}, renderRelated() {}, renderTabs() {}, renderThinkingStatus() {},
    writeDraft(draft) { editor.drafts.push(draft.body); },
    clearDraft(id) { editor.cleared.push(id); },
    async runOriginalityCheck() { return { status: "warning", similarity: 0 }; },
    async onStateChange(_reason, payload) { return { ...note, body: payload.body }; }
  });
  return { pane, note, tab, editor, rawBody };
}

test("normalizing permanent-note Markdown does not leave a saved editor dirty", async () => {
  const { pane, note, tab, editor, rawBody } = createNormalizedSavePane();
  const normalized = pane.normalizePermanentBodyForSave(rawBody);
  assert.notEqual(normalized, rawBody);

  await pane.performSaveActiveNote();

  assert.equal(tab.dirty, false);
  assert.equal(tab.body, normalized);
  assert.equal(tab.savedBody, normalized);
  assert.equal(editor.value, normalized);
  assert.deepEqual(editor.repaints, [normalized]);
  assert.deepEqual(editor.drafts, []);
  assert.deepEqual(editor.cleared, [note.id]);
});

test("normalization still preserves real editor changes made during save", async () => {
  const { pane, note, tab, editor, rawBody } = createNormalizedSavePane();
  const normalized = pane.normalizePermanentBodyForSave(rawBody);
  const latest = `${rawBody}\n\nA new judgment typed during save.`;
  pane.onStateChange = async (_reason, payload) => {
    editor.value = latest;
    return { ...note, body: payload.body };
  };

  await pane.performSaveActiveNote();

  assert.equal(tab.dirty, true);
  assert.equal(tab.body, latest);
  assert.equal(tab.savedBody, normalized);
  assert.equal(editor.value, latest);
  assert.deepEqual(editor.repaints, []);
  assert.deepEqual(editor.drafts, [latest]);
  assert.deepEqual(editor.cleared, []);
});

test("normalization does not repaint a different tab selected during save", async () => {
  const { pane, note, tab, editor, rawBody } = createNormalizedSavePane();
  const normalized = pane.normalizePermanentBodyForSave(rawBody);
  pane.onStateChange = async (_reason, payload) => {
    pane.state.activeTabId = "another-tab";
    editor.value = "# Another note";
    return { ...note, body: payload.body };
  };

  await pane.performSaveActiveNote();

  assert.equal(tab.dirty, false);
  assert.equal(tab.body, normalized);
  assert.equal(editor.value, "# Another note");
  assert.deepEqual(editor.repaints, []);
  assert.deepEqual(editor.drafts, []);
});

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

test("clearing autosave cancels both interval and idle timeout handles", () => {
  const pane = Object.assign(Object.create(EditorPane.prototype), {
    autoSaveTimer: "interval-handle",
    autoSaveIdleTimer: "idle-handle"
  });
  const clearedIntervals = [];
  const clearedTimeouts = [];
  const originalClearInterval = globalThis.clearInterval;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.clearInterval = (handle) => {
    clearedIntervals.push(handle);
  };
  globalThis.clearTimeout = (handle) => {
    clearedTimeouts.push(handle);
  };

  try {
    pane.clearAutoSaveTimer();
  } finally {
    globalThis.clearInterval = originalClearInterval;
    globalThis.clearTimeout = originalClearTimeout;
  }

  assert.deepEqual(clearedIntervals, ["interval-handle"]);
  assert.deepEqual(clearedTimeouts, ["interval-handle", "idle-handle"]);
  assert.equal(pane.autoSaveTimer, null);
  assert.equal(pane.autoSaveIdleTimer, null);
});
