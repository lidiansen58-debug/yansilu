import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { createInitialState } from "../../apps/web/src/prototype-store.js";
import { handleSaveNoteStateChange } from "../../apps/web/src/app-shell-save-note-state-actions.js";

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

for (const automatic of [false, true]) test(`uncertain ${automatic ? "automatic" : "manual"} save pauses later autosaves and keeps the draft`, async () => {
  const { pane, tab, editor } = createNormalizedSavePane();
  let writes = 0;
  const baseline = tab.savedBody;
  pane.onStateChange = (_reason, payload) => handleSaveNoteStateChange(payload, {
    state: pane.state, editor: pane,
    updateNote: async () => { writes++; throw Object.assign(new Error("Result not confirmed"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" }); }
  });
  if (automatic) await pane.autoSaveTabById(tab.id);
  else await pane.performSaveActiveNote();
  assert.equal(tab.saveUiState.mode, "uncertain");
  assert.equal(tab.saveConflict, true);
  assert.equal(tab.dirty, true);
  assert.equal(tab.savedBody, baseline);
  assert.deepEqual(editor.cleared, []);
  tab.saveUiState = { mode: "dirty", message: "" };
  editor.value += "\nMore typing";
  pane.scheduleAutoSave();
  assert.equal(pane.autoSaveTimer, null);
  assert.equal(pane.autoSaveIdleTimer, null);
  await pane.autoSaveTabById(tab.id);
  await pane.autoSaveActiveNote();
  assert.equal(writes, 1);
});

test("restoring an ordinary draft retains its old baseline instead of accepting external changes", t => {
  const { pane, tab, note } = createNormalizedSavePane();
  const previous = globalThis.window;
  globalThis.window = { confirm: () => true };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  const draft = { body: "# My unsaved input", savedBody: "# OLD BASELINE", savedTitle: "Old title", savedFileRevision: "a".repeat(64) };
  tab.dirty = false;
  pane.readDraft = () => draft;
  pane.maybeRestoreDraft(tab, { ...note, body: "# EXTERNAL BODY", fileRevision: "b".repeat(64) });
  assert.equal(tab.body, draft.body);
  assert.equal(tab.savedBody, draft.savedBody);
  assert.equal(tab.savedFileRevision, draft.savedFileRevision);
  assert.equal(tab.savedTitle, draft.savedTitle);
  assert.equal(tab.dirty, true);
});

for (const automatic of [false, true]) test(`recovering an older receipt preserves current input for ${automatic ? "automatic" : "manual"} save`, async () => {
  const { pane, note, tab, editor, rawBody } = createNormalizedSavePane();
  pane.normalizePermanentBodyForSave = value => value;
  pane.scheduleAutoSave = () => {};
  const oldSubmission = "# Normalized note\n\nOLD SAVED SUBMISSION";
  pane.onStateChange = async () => ({ ...note, body: oldSubmission, fileRevision: "a".repeat(64), recoveredSave: true });
  if (automatic) await pane.autoSaveTabById(tab.id);
  else await pane.performSaveActiveNote();
  assert.equal(editor.value, rawBody);
  assert.equal(tab.body, rawBody);
  assert.equal(tab.savedBody, oldSubmission);
  assert.equal(tab.savedFileRevision, "a".repeat(64));
  assert.equal(tab.dirty, true);
  assert.equal(tab.saveUiState.mode, "dirty");
  assert.deepEqual(editor.cleared, []);
  assert.deepEqual(editor.repaints, []);
});

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

test("autosave uses the acknowledged canonical body as the next save baseline", async () => {
  const { pane, tab, note } = createNormalizedSavePane();
  const expected = tab.savedBody;
  let canonical;
  pane.onStateChange = async (_reason, payload) => {
    assert.equal(payload.expectedBody, expected);
    canonical = `${payload.body.trimEnd()}\n`;
    return { ...note, body: canonical };
  };
  await pane.autoSaveTabById(tab.id);
  assert.equal(tab.savedBody, canonical);
  assert.equal(tab.body, canonical);
  assert.equal(tab.dirty, false);
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

for (const succeeds of [true, false]) {
  test(`saving an earlier snapshot preserves edits made before switching tabs (${succeeds})`, async () => {
    const { pane, note, tab, editor, rawBody } = createNormalizedSavePane();
    const originalSavedBody = tab.savedBody;
    let finishCheck;
    pane.runOriginalityCheck = () => new Promise(resolve => { finishCheck = resolve; });
    let persistedBody;
    pane.onStateChange = (_reason, payload) => handleSaveNoteStateChange(payload, {
      state: pane.state, editor: pane,
      updateNote: async (_id, patch) => {
        if (!succeeds) throw new Error("Disk unavailable");
        persistedBody = patch.body;
        return { ...note, ...patch };
      }
    });
    const saving = pane.performSaveActiveNote();
    const latest = rawBody.replace("Normalized note", "Updated title") + "\n\nKeep this later thought.";
    editor.value = latest;
    pane.updateActiveTabFromEditor();
    pane.state.activeTabId = "another-tab";
    editor.value = "# Another note\n\nDo not replace this editor.";
    finishCheck({ status: "warning", similarity: 0 });
    await saving;

    assert.equal(tab.body, latest);
    assert.equal(tab.title, "Updated title");
    assert.equal(tab.dirty, true);
    assert.equal(tab.savedBody, succeeds ? persistedBody : originalSavedBody);
    assert.match(editor.value, /Do not replace this editor/);
    assert.deepEqual(editor.repaints, []);
    assert.deepEqual(editor.drafts, [latest]);
    assert.deepEqual(editor.cleared, []);
  });
}

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

for (const kind of ["fleeting", "literature"]) {
  for (const succeeds of [true, false]) {
    test(`${kind} editor reports success only after persistence succeeds (${succeeds})`, async () => {
      const { pane, note, tab, editor } = createNormalizedSavePane();
      note.folderId = `dir_${kind}_default`;
      note.noteType = kind;
      pane.literatureCompletionState = () => ({ hasParaphrase: true, hasOriginalText: true, hasCitationMetadata: true });
      const messages = [];
      pane.onStatus = (message, tone) => messages.push({ message, tone });
      let finish;
      pane.onStateChange = () => new Promise(resolve => { finish = resolve; });
      const saving = pane.performSaveActiveNote({ markLiteratureComplete: kind === "literature" });
      const earlySuccesses = messages.filter(item => item.tone === "ok");
      finish(succeeds ? { ...note } : { ok: false, saveMode: "error", saveMessage: "Save failed" });
      await saving;

      assert.deepEqual(earlySuccesses, []);
      assert.equal(tab.dirty, !succeeds);
      assert.deepEqual(editor.cleared, succeeds ? [note.id] : []);
      assert.deepEqual(editor.drafts, succeeds ? [] : [tab.body]);
      assert.deepEqual(messages, succeeds ? [{
        message: kind === "literature" ? "文献笔记已完成" : "当前修改已同步", tone: "ok"
      }] : []);
    });
  }
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
