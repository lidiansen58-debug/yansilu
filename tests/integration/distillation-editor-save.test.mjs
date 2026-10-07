import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createNoteInDirectory, updatePermanentNoteDistillation,
  confirmPermanentNoteDistillation, updateNoteContent, getNoteById } from "../../packages/domain/src/index.mjs";
import { handleSaveNoteDistillationStateChange, handleConfirmNoteDistillationStateChange } from "../../apps/web/src/app-shell-distillation-state-actions.js";
import { syncDistillationEditorResult } from "../../apps/web/src/distillation-editor-result.js";

for (const action of ["save", "confirm"]) {
  for (const timing of ["before-request", "after-state-sync", "rendered-merged-tab"]) {
    test(`${action}: ${timing} typing and confirmed viewpoint survive the following ordinary save`, async t => {
      const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-distillation-merge-"));
      t.after(() => fs.rm(vault, { recursive: true, force: true }));
      await initVault(vault);
      let note = await createNoteInDirectory(vault, { directoryId: "dir_original_default",
        body: "# Old title\n\nExisting prose.", thesis: "My confirmed claim" });
      if (action === "confirm") note = await updatePermanentNoteDistillation(vault, note.id, {
        title: "New chosen title", thesis: "My confirmed claim", expectedRevision: note.fileRevision });
      const tab = { noteId: note.id, title: note.title, savedTitle: note.title, body: note.body,
        savedBody: note.body, savedFileRevision: note.fileRevision, dirty: false };
      const state = { notes: [note], tabs: [tab] };
      let editorBody = note.body;
      if (timing !== "after-state-sync") {
        editorBody += "\n\nNewly typed text.";
        tab.body = editorBody;
        tab.dirty = true;
      }
      const previousBody = editorBody;
      const deps = { state, getVaultPath: () => vault,
        updatePermanentNoteDistillation: (id, input) => updatePermanentNoteDistillation(vault, id, input),
        confirmPermanentNoteDistillation: (id, input) => confirmPermanentNoteDistillation(vault, id, input) };
      const result = action === "save"
        ? await handleSaveNoteDistillationStateChange({ noteId: note.id, title: "New chosen title",
          thesis: "My confirmed claim", distillationStatus: "confirmed", expectedRevision: note.fileRevision }, deps)
        : await handleConfirmNoteDistillationStateChange({ noteId: note.id }, deps);
      if (timing === "after-state-sync") editorBody += "\n\nNewly typed text.";
      if (timing === "rendered-merged-tab") editorBody = tab.body;
      syncDistillationEditorResult({ activeTab: () => tab, getEditorValue: () => editorBody,
        fillEditorFromTab: () => { editorBody = tab.body; },
        onStatus: message => assert.fail(message) }, result, previousBody);
      assert.notEqual(tab.saveConflict, true);
      assert.equal(tab.title, "New chosen title");
      assert.match(editorBody, /Newly typed text/);
      assert.match(editorBody, /## 提炼观点/);
      assert.match(editorBody, /My confirmed claim/);
      await updateNoteContent(vault, note.id, { body: tab.body, title: tab.title,
        expectedBody: tab.savedBody, expectedRevision: tab.savedFileRevision });
      const saved = await getNoteById(vault, note.id);
      assert.equal(saved.title, "New chosen title");
      assert.match(saved.body, /## 提炼观点/);
      assert.match(saved.body, /Newly typed text/);
      assert.equal(saved.distillationStatus, "confirmed");
    });
  }
}

test("overlapping title edits retain input and cannot overwrite the saved viewpoint", async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-distillation-conflict-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  await initVault(vault);
  const note = await createNoteInDirectory(vault, { directoryId: "dir_original_default", body: "# Old title\n\nOriginal prose." });
  const tab = { noteId: note.id, title: "My unsaved title", savedTitle: note.title,
    body: "# My unsaved title\n\nMy unsaved prose.", savedBody: note.body,
    savedFileRevision: note.fileRevision, dirty: true };
  const localBody = tab.body, revision = tab.savedFileRevision;
  const result = await handleSaveNoteDistillationStateChange({ noteId: note.id, title: "Confirmed title",
    thesis: "Confirmed claim", distillationStatus: "confirmed", expectedRevision: revision }, {
    state: { notes: [note], tabs: [tab] },
    updatePermanentNoteDistillation: (id, input) => updatePermanentNoteDistillation(vault, id, input),
    confirmPermanentNoteDistillation: (id, input) => confirmPermanentNoteDistillation(vault, id, input)
  });
  const warnings = [];
  syncDistillationEditorResult({ activeTab: () => tab, getEditorValue: () => localBody,
    fillEditorFromTab: () => assert.fail("Must not replace conflicting input"),
    onStatus: message => warnings.push(message) }, result, localBody);
  assert.equal(tab.body, localBody);
  assert.equal(tab.savedFileRevision, revision);
  assert.equal(tab.saveConflict, true);
  assert.match(warnings[0], /冲突/);
  await assert.rejects(updateNoteContent(vault, note.id, { title: tab.title, body: tab.body,
    expectedBody: tab.savedBody, expectedRevision: tab.savedFileRevision }), error => error.code === "NOTE_SAVE_CONFLICT");
  const saved = await getNoteById(vault, note.id);
  assert.equal(saved.title, "Confirmed title");
  assert.match(saved.body, /Confirmed claim/);
  assert.match(saved.body, /## 提炼观点/);
});
