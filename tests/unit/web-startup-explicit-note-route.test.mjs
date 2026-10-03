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

test("explicit startup reads ignore late success and failure after a vault switch", async () => {
  for (const fail of [false, true]) {
    const state = { notes: [], noteMoveVaultScope: {}, module: "settings" };
    let settle;
    const response = new Promise((resolve, reject) => { settle = fail ? reject : resolve; });
    const result = openExplicitStartupNoteRoute("old", {
      state, fetchNote: () => response,
      mapNoteItem: () => assert.fail("cannot map an old-vault response"),
      activateModule: () => assert.fail("cannot replace the new vault's navigation"),
      setStatus: () => assert.fail("cannot report an old-vault error"),
      openNoteById: () => assert.fail("cannot open an old-vault note")
    });
    const currentNotes = [{ id: "new", body: "New vault" }];
    state.noteMoveVaultScope = {};
    state.notes = currentNotes;
    settle(fail ? new Error("old request failed") : { id: "old", body: "Private old vault" });
    assert.deepEqual(await result, { route: "skipped" });
    assert.equal(state.notes, currentNotes);
    assert.equal(state.module, "settings");
  }
});

test("explicit startup reads cannot navigate while a vault switch is pending or uncertain", async () => {
  for (const flag of ["noteMoveVaultSwitching", "noteMoveVaultUncertain"]) {
    const state = { notes: [], noteMoveVaultScope: {} };
    let resolve;
    const pending = openExplicitStartupNoteRoute("n1", {
      state, fetchNote: () => new Promise(done => { resolve = done; }),
      activateModule: () => assert.fail("cannot navigate during a vault switch")
    });
    state[flag] = true;
    resolve({ id: "n1", body: "Old note" });
    assert.deepEqual(await pending, { route: "skipped" });
    assert.deepEqual(state.notes, []);
    const loaded = { notes: [{ id: "n1" }], [flag]: true };
    assert.deepEqual(await openExplicitStartupNoteRoute("n1", {
      state: loaded, activateModule: () => assert.fail("cannot open a loaded note during a vault switch")
    }), { route: "skipped" });
  }
});

test("explicit startup hydration merges concurrent directory loading without duplicating the note", async () => {
  const state = { notes: [] };
  let resolve;
  const pending = openExplicitStartupNoteRoute("n1", {
    state, fetchNote: () => new Promise(done => { resolve = done; }),
    mapNoteItem: item => ({ ...item, bodyLoaded: true }),
    openNoteById: id => assert.equal(state.notes.filter(note => note.id === id).length, 1)
  });
  state.notes.push({ id: "n1", folderId: "fleeting", bodyLoaded: false });
  resolve({ id: "n1", folderId: "fleeting", body: "Fetched body" });
  assert.deepEqual(await pending, { route: "note", noteId: "n1" });
  assert.equal(state.notes.length, 1);
  assert.equal(state.notes[0].body, "Fetched body");
});

test("explicit startup hydration preserves a note or dirty tab loaded during its request", async () => {
  for (const dirty of [false, true]) {
    const state = { notes: [], tabs: [] };
    let resolve;
    const pending = openExplicitStartupNoteRoute("n1", {
      state, fetchNote: () => new Promise(done => { resolve = done; })
    });
    const current = { id: "n1", folderId: "current-folder", body: "Current human text", bodyLoaded: !dirty };
    const tab = { noteId: "n1", body: "Unsaved human draft", dirty };
    state.notes.push(current);
    state.tabs.push(tab);
    resolve({ id: "n1", folderId: "old-folder", body: "Stale fetched text", bodyLoaded: true });
    assert.deepEqual(await pending, { route: "note", noteId: "n1" });
    assert.equal(state.notes.length, 1);
    assert.equal(state.notes[0], current);
    assert.equal(tab.body, "Unsaved human draft");
    assert.equal(state.selectedFolderId, "current-folder");
  }
});
