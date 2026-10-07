import test from "node:test";
import assert from "node:assert/strict";
import { applyLoadedNoteToClientState } from "../../apps/web/src/loaded-note-client-state.js";

function fixture(dirty = false) {
  return {
    notes: [{ id: "n1", body: "previous body", bodyLoaded: true }],
    tabs: [{ noteId: "n1", body: dirty ? "local draft" : "previous body", savedBody: "previous body", savedFileRevision: "previous-revision", dirty }]
  };
}

test("explicitly refreshed note synchronizes the body and conflict baseline together", () => {
  const state = fixture();
  const loaded = { id: "n1", title: "Confirmed", body: "confirmed body", fileRevision: "confirmed-revision" };
  assert.equal(applyLoadedNoteToClientState(state, loaded, { refreshLoaded: true }), loaded);
  assert.equal(state.tabs[0].savedBody, "confirmed body");
  assert.equal(state.tabs[0].savedFileRevision, "confirmed-revision");
});

test("background reads and explicit refreshes cannot replace an unsaved draft or its baseline", () => {
  for (const refreshLoaded of [false, true]) {
    const state = fixture(true);
    const previous = state.notes[0];
    assert.equal(applyLoadedNoteToClientState(state, { id: "n1", body: "new body", fileRevision: "new-revision" }, { refreshLoaded }), previous);
    assert.equal(state.tabs[0].body, "local draft");
    assert.equal(state.tabs[0].savedBody, "previous body");
    assert.equal(state.tabs[0].savedFileRevision, "previous-revision");
  }
});

test("ordinary background reads keep an already loaded clean note unchanged", () => {
  const state = fixture();
  const previous = state.notes[0];
  assert.equal(applyLoadedNoteToClientState(state, { id: "n1", body: "new body", fileRevision: "new-revision" }), previous);
  assert.equal(state.tabs[0].savedFileRevision, "previous-revision");
});
