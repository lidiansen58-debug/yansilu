import test from "node:test";
import assert from "node:assert/strict";
import { applyMovedNoteToClientState } from "../../apps/web/src/note-move-client-state.js";

test("a confirmed move advances the clean tab save baseline with rewritten attachment paths", () => {
  const state = {
    notes: [{ id: "n1", folderId: "old", body: "![图](../assets/image.png)", fileRevision: "before" }],
    tabs: [
      { noteId: "n1", body: "old", savedBody: "old", savedFileRevision: "before", dirty: false },
      { noteId: "n1", body: "local edits", savedBody: "old", savedFileRevision: "before", dirty: true },
      { noteId: "other", body: "other", savedFileRevision: "unrelated", dirty: false }
    ]
  };
  assert.equal(applyMovedNoteToClientState(state, "n1", "new", {
    directoryId: "new", body: "![图](../../assets/image.png)", fileRevision: "after"
  }, { typeFromFolder: () => "fleeting", rootBoxIdFromFolder: () => "root" }), true);
  assert.equal(state.notes[0].fileRevision, "after");
  assert.equal(state.tabs[0].savedFileRevision, "after");
  assert.equal(state.tabs[0].savedBody, state.notes[0].body);
  assert.equal(state.tabs[1].body, "local edits");
  assert.equal(state.tabs[1].savedFileRevision, "before");
  assert.equal(state.tabs[2].savedFileRevision, "unrelated");
});
