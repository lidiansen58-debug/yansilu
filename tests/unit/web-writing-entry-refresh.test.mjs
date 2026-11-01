import test from "node:test";
import assert from "node:assert/strict";
import { loadWritingEntryMaterials } from "../../apps/web/src/writing-entry-refresh.js";
import { syncDirectoryTreeNotes } from "../../apps/web/src/directory-tree-note-sync.js";
import { applyLoadedNoteToClientState } from "../../apps/web/src/loaded-note-client-state.js";

for (const change of ["none", "confirmation", "entry"]) test(`delayed material snapshots respect ${change} during loading`, async () => {
  const pending = { id: "n", folderId: "original", body: "Old", status: "draft", authorship: { user_confirmed: false } };
  const state = { notes: [pending], tabs: [] }, writingState = {};
  let release, current = true;
  const response = new Promise(resolve => { release = resolve; });
  const loading = loadWritingEntryMaterials({ state, writingState,
    loadWritingMaterials: ({ isCurrent }) => syncDirectoryTreeNotes("original", {
      state, isCurrent, descendantDirectoryIds: () => ["original"], folderById: () => ({}),
      fetchDirectoryNotes: () => response, mapNoteItem: item => item,
      upsertNotesForDirectory: (_id, notes) => { state.notes = notes; }
    })
  }, () => current);
  if (change === "confirmation") applyLoadedNoteToClientState(state, { ...pending, body: "Confirmed body", status: "active", authorship: { user_confirmed: true } }, { refreshLoaded: true });
  if (change === "entry") current = false;
  release([{ ...pending, body: "Earlier server snapshot" }]);
  await loading;
  assert.equal(state.notes[0].body, change === "none" ? "Earlier server snapshot" : change === "confirmation" ? "Confirmed body" : "Old");
  if (change === "confirmation") {
    assert.equal(state.notes[0].status, "active");
    assert.equal(state.notes[0].authorship.user_confirmed, true);
  }
});
