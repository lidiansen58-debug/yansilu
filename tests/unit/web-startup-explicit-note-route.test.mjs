import test from "node:test";
import assert from "node:assert/strict";
import { openExplicitStartupNoteRoute } from "../../apps/web/src/startup-explicit-note-route.js";

test("explicit routes hydrate a note outside the loaded directory before showing the editor", async () => {
  const state = { module: "today", notes: [] }, events = [];
  const result = await openExplicitStartupNoteRoute("literature-note", {
    state,
    fetchNote: async id => { assert.equal(id, "literature-note"); return { id, directoryId: "literature" }; },
    mapNoteItem: item => ({ ...item, folderId: item.directoryId }),
    rootBoxIdFromFolder: (_state, id) => id,
    activateModule: module => { state.module = module; events.push("show"); },
    openNoteById: id => { assert.equal(state.module, "explorer"); assert.equal(state.notes[0].id, id); events.push("open"); }
  });
  assert.deepEqual(result, { route: "note", noteId: "literature-note" });
  assert.equal(state.browserRootId, "literature");
  assert.equal(state.selectedFolderId, "literature");
  assert.deepEqual(events, ["show", "open"]);
});

test("missing and unreadable explicit notes do not silently route to home or create notes", async () => {
  for (const fail of [false, true]) {
    const state = { notes: [] }, messages = [];
    const result = await openExplicitStartupNoteRoute("missing", {
      state, fetchNote: async () => { if (fail) throw new Error("offline"); return null; },
      activateModule: module => { state.module = module; }, setStatus: (...args) => messages.push(args),
      openNoteById: () => assert.fail("cannot open an unreadable note")
    });
    assert.equal(result.route, fail ? "note_error" : "missing_note");
    assert.equal(state.module, "explorer");
    assert.deepEqual(state.notes, []);
    assert.equal(messages.length, 1);
  }
});
