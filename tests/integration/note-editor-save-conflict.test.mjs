import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createNoteInDirectory, getNoteById, updateNoteContent } from "../../packages/domain/src/index.mjs";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { handleSaveNoteStateChange } from "../../apps/web/src/app-shell-save-note-state-actions.js";
import { saveEditorNoteWithRecovery } from "../../apps/web/src/editor-save-recovery.js";

test("unknown save receipt retries with a fresh operation but cannot overwrite a prior completed write", async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-note-save-unknown-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  await initVault(vault);
  const original = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Note", body: "# Note\n\nBASE" });
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  let operation = 0, calls = 0;
  const deps = { getVaultPath: () => vault, getStorage: () => storage, createSaveOperationId: () => `operation-${++operation}`,
    checkNoteSave: async () => ({ state: "unknown" }),
    updateNote: async (id, payload) => {
      calls++;
      const saved = await updateNoteContent(vault, id, payload);
      if (calls === 1) throw Object.assign(new Error("response lost"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
      return saved;
    }
  };
  const payload = body => ({ title: "Note", body, expectedBody: original.body, expectedRevision: original.fileRevision });
  await assert.rejects(saveEditorNoteWithRecovery(deps, original.id, payload("# Note\n\nFIRST SAVE")), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  await assert.rejects(saveEditorNoteWithRecovery(deps, original.id, payload("# Note\n\nLATEST INPUT")), { code: "NOTE_SAVE_CONFLICT" });
  const current = await getNoteById(vault, original.id);
  assert.equal(current.body.trimEnd(), "# Note\n\nFIRST SAVE");
  assert.equal(calls, 2);
  assert.equal(values.size, 0);
});

for (const metadataOnly of [false, true]) for (const automatic of [false, true]) test(`${automatic ? "automatic" : "manual"} editor save preserves external ${metadataOnly ? "metadata" : "body"} changes and stops conflict autosave`, async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-note-editor-conflict-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  await initVault(vault);
  const original = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Note", body: "# Note\n\nBASE" });
  const note = { ...original, folderId: "dir_original_default" };
  const tab = { id: "tab", noteId: note.id, title: "Note", savedTitle: "Note", body: "# Note\n\nMY-INPUT", savedBody: original.body, savedFileRevision: original.fileRevision, dirty: true };
  const state = { notes: [note], tabs: [tab], activeTabId: tab.id, folders: [] };
  let editorValue = tab.body, writes = 0;
  const pane = Object.assign(Object.create(EditorPane.prototype), {
    state, els: {}, getEditorValue: () => editorValue,
    setEditorValue: value => { editorValue = value; },
    isOriginalNote: () => false, renderRelated() {}, renderTabs() {}, renderSaveHint() {}, renderThinkingStatus() {},
    writeDraft() {}, clearDraft() {}, onStatus() {},
    onStateChange: (_reason, payload) => handleSaveNoteStateChange(payload, { state, editor: pane,
      updateNote: (id, patch) => { writes++; return updateNoteContent(vault, id, patch); } })
  });
  const file = path.join(vault, note.markdownPath);
  const disk = await fs.readFile(file, "utf8");
  const external = metadataOnly ? disk.replace("status: draft", "status: active") : disk.replace("BASE", "EXTERNAL");
  assert.notEqual(external, disk);
  await fs.writeFile(file, external, "utf8");
  if (automatic) await pane.autoSaveTabById(tab.id);
  else await pane.performSaveActiveNote();
  assert.equal(await fs.readFile(file, "utf8"), external);
  assert.equal(editorValue, "# Note\n\nMY-INPUT");
  assert.equal(tab.savedBody, original.body);
  assert.equal(tab.dirty, true);
  assert.equal(tab.saveUiState.mode, "conflict");
  assert.match(tab.saveUiState.message, /本次未覆盖/);
  assert.equal(tab.saveConflict, true);
  tab.saveUiState = { mode: "dirty", message: "" };
  editorValue += "\nMore typing after conflict";
  pane.scheduleAutoSave();
  assert.equal(pane.autoSaveTimer, null);
  assert.equal(pane.autoSaveIdleTimer, null);
  await pane.autoSaveTabById(tab.id);
  await pane.autoSaveActiveNote();
  assert.equal(writes, 1);
});
