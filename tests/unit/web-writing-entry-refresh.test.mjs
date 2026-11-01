import test from "node:test";
import assert from "node:assert/strict";
import { loadWritingEntryMaterials } from "../../apps/web/src/writing-entry-refresh.js";
import { syncDirectoryTreeNotes } from "../../apps/web/src/directory-tree-note-sync.js";
import { applyLoadedNoteToClientState } from "../../apps/web/src/loaded-note-client-state.js";
import { handleSaveNoteStateChange } from "../../apps/web/src/app-shell-save-note-state-actions.js";

for (const change of ["none", "confirmation", "in-place save", "first article save", "project", "module", "vault"]) test(`delayed material snapshots respect ${change} during loading`, async () => {
  const pending = { id: "n", folderId: "original", body: "Old", status: "draft", authorship: { user_confirmed: false } };
  const state = { notes: [pending], tabs: [], module: "writing", noteMoveVaultScope: {} }, writingState = {};
  let release, reads = 0;
  const response = new Promise(resolve => { release = resolve; });
  const loading = loadWritingEntryMaterials({ state, writingState,
    loadWritingMaterials: ({ isCurrent }) => syncDirectoryTreeNotes("original", {
      state, isCurrent, descendantDirectoryIds: () => ["original"], folderById: () => ({}),
      fetchDirectoryNotes: () => ++reads === 1 ? response : Promise.resolve(structuredClone(state.notes)), mapNoteItem: item => item,
      upsertNotesForDirectory: (_id, notes) => { state.notes = notes; }
    })
  });
  if (change === "confirmation") applyLoadedNoteToClientState(state, { ...pending, body: "Confirmed body", status: "active", authorship: { user_confirmed: true } }, { refreshLoaded: true });
  if (change === "in-place save") await handleSaveNoteStateChange({ noteId: "n", body: "Newly saved body" }, {
    state, updateNote: async () => ({ ...pending, body: "Newly saved body", fileRevision: "new-revision" })
  });
  if (change === "first article save") state.notes = [...state.notes, { id: "article", folderId: "original", body: "New article" }];
  if (change === "project") writingState.project = { id: "new-project" };
  if (change === "module") state.module = "notes";
  if (change === "vault") state.noteMoveVaultScope = {};
  release([{ ...pending, body: "Earlier server snapshot" }]);
  await loading;
  assert.equal(state.notes[0].body, ["none", "project"].includes(change) ? "Earlier server snapshot" : change === "confirmation" ? "Confirmed body" : change === "in-place save" ? "Newly saved body" : "Old");
  if (change === "in-place save") assert.equal(state.notes[0].fileRevision, "new-revision");
  assert.equal(reads, ["confirmation", "in-place save", "first article save"].includes(change) ? 2 : 1);
  if (change === "confirmation") {
    assert.equal(state.notes[0].status, "active");
    assert.equal(state.notes[0].authorship.user_confirmed, true);
  }
});

test("continuously changing notes bound material refresh retries and leave actionable feedback", async () => {
  const state = { notes: [{ id: "n", body: "Original" }], module: "writing" }, writingState = {};
  let reads = 0;
  await loadWritingEntryMaterials({ state, writingState, loadWritingMaterials: async ({ isCurrent }) => {
    reads++; state.notes[0].body += "."; assert.equal(isCurrent(), false);
  } });
  assert.equal(reads, 3);
  assert.match(writingState.materialsError, /笔记仍在更新.*重新打开写作/);
});
