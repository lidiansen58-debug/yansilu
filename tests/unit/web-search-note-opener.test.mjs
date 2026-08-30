import test from "node:test";
import assert from "node:assert/strict";
import { createSearchNoteOpener } from "../../apps/web/src/search-note-opener.js";

function fixture() {
  const state = { notes: [], tabs: [] }, reads = {}, opened = [], modules = [];
  const open = createSearchNoteOpener({ state, fetchNote: id => new Promise(resolve => { reads[id] = resolve; }),
    mapNoteItem: item => ({ ...item, bodyLoaded: true }), openNoteById: id => { opened.push(id); return true; },
    activateModule: name => { modules.push(name); } });
  return { state, reads, opened, modules, open };
}

test("search activates the editor only after opening the selected note", async () => {
  const { reads, opened, modules, open } = fixture();
  const pending = open("a");
  assert.deepEqual(modules, []);
  reads.a({ id: "a", body: "Content" });
  await pending;
  assert.deepEqual(opened, ["a"]);
  assert.deepEqual(modules, ["explorer"]);
});

test("an unavailable search result does not navigate away", async () => {
  const { reads, modules, open } = fixture();
  const pending = open("missing");
  reads.missing(null);
  await assert.rejects(pending, /已不可用/);
  assert.deepEqual(modules, []);
});

test("search does not insert or open a response from the previous vault", async () => {
  const { state, reads, opened, modules, open } = fixture();
  const pending = open("old");
  state.noteMoveVaultScope = {};
  state.notes = [{ id: "new" }];
  reads.old({ id: "old", body: "private old text" });
  await pending;
  assert.deepEqual(state.notes, [{ id: "new" }]);
  assert.deepEqual(opened, []);
  assert.deepEqual(modules, []);
});

test("search does not apply results while vault switching is uncertain", async () => {
  const { state, reads, opened, open } = fixture();
  const pending = open("old");
  state.noteMoveVaultUncertain = true;
  reads.old({ id: "old", body: "old" });
  await pending;
  assert.deepEqual(state.notes, []);
  assert.deepEqual(opened, []);
});

test("only the latest search selection can insert and open a note", async () => {
  const { state, reads, opened, open } = fixture();
  let serial = 1;
  const a = open("a", { isCurrent: () => serial === 1 });
  serial = 2;
  const b = open("b", { isCurrent: () => serial === 2 });
  reads.b({ id: "b", body: "B" }); await b;
  reads.a({ id: "a", body: "A" }); await a;
  assert.deepEqual(opened, ["b"]);
  assert.deepEqual(state.notes.map(n => n.id), ["b"]);
});

test("closing search invalidates its pending open", async () => {
  const { state, reads, opened, open } = fixture();
  let current = true;
  const pending = open("a", { isCurrent: () => current });
  current = false;
  reads.a({ id: "a" }); await pending;
  assert.deepEqual(state.notes, []);
  assert.deepEqual(opened, []);
});

test("opening an already edited note does not overwrite its draft", async () => {
  const { state, reads, opened, open } = fixture();
  state.notes = [{ id: "a", body: "draft", bodyLoaded: true }];
  state.tabs = [{ noteId: "a", dirty: true }];
  await open("a");
  assert.deepEqual(reads, {});
  assert.equal(state.notes[0].body, "draft");
  assert.deepEqual(opened, ["a"]);
});

test("search fills an existing clean tab after its original body load failed", async () => {
  const { state, reads, open } = fixture();
  state.notes = [{ id: "a", body: "# Title", title: "Title", bodyLoaded: false }];
  state.tabs = [{ noteId: "a", body: "# Title", savedBody: "# Title", dirty: false }];
  const pending = open("a");
  reads.a({ id: "a", title: "Complete", body: "# Complete\nFull content" });
  await pending;
  assert.equal(state.tabs[0].body, state.notes[0].body);
  assert.equal(state.tabs[0].savedBody, state.notes[0].body);
  assert.equal(state.tabs[0].title, "Complete");
  assert.equal(state.notes[0].bodyLoaded, true);
});

test("search preserves a note edited while the read was pending", async () => {
  const { state, reads, open } = fixture();
  state.notes = [{ id: "a", body: "# Title", bodyLoaded: false }];
  state.tabs = [{ noteId: "a", body: "# Title", dirty: false }];
  const pending = open("a");
  state.tabs[0].body = "Unsaved work"; state.tabs[0].dirty = true;
  reads.a({ id: "a", body: "Old body" }); await pending;
  assert.equal(state.tabs[0].body, "Unsaved work");
});

test("search refreshes an already loaded clean note and its saved tab", async () => {
  const { state, reads, open } = fixture();
  state.notes = [{ id: "a", body: "Old body", bodyLoaded: true }];
  state.tabs = [{ noteId: "a", body: "Old body", savedBody: "Old body", dirty: false }];
  const pending = open("a");
  reads.a({ id: "a", title: "Latest", body: "Latest matching content" });
  await pending;
  assert.equal(state.notes[0].body, "Latest matching content");
  assert.equal(state.tabs[0].body, "Latest matching content");
  assert.equal(state.tabs[0].savedBody, "Latest matching content");
});

for (const change of ["saved", "renamed", "deleted"]) {
  test(`search cannot overwrite a concurrently ${change} note`, async () => {
    const { state, reads, open } = fixture();
    state.notes = [{ id: "a", body: "Initial", title: "Initial", bodyLoaded: true }];
    const pending = open("a");
    if (change === "saved") state.notes[0].body = "Newly saved";
    if (change === "renamed") state.notes[0].title = "Renamed";
    if (change === "deleted") state.notes = [];
    const expected = structuredClone(state.notes);
    reads.a({ id: "a", title: "Stale", body: "Stale" }); await pending;
    assert.deepEqual(state.notes, expected);
  });
}
