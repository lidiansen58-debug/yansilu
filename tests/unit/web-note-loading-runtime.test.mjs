import test from "node:test";
import assert from "node:assert/strict";

import {
  applyFetchedNoteBodyForRuntime,
  ensureNoteBodyLoadedForRuntime
} from "../../apps/web/src/note-loading-runtime.js";

test("note loading runtime applies fetched note fields and normalizers", () => {
  const note = { id: "n1", body: "old", title: "Old" };
  applyFetchedNoteBodyForRuntime(note, {
    body: "new",
    title: "New",
    status: "active",
    fileRevision: "a".repeat(64),
    originalitySimilarity: "0.2",
    authorship: { user_confirmed: true },
    thinkingStatus: { status: "ready" },
    threeLineSummary: ["a"],
    updatedAt: "now"
  }, {
    normalizeOptionalNumber: Number,
    normalizeAuthorshipItem: (value) => ({ ...value, normalized: true }),
    normalizeThinkingStatusItem: (value) => ({ ...value, normalized: true })
  });

  assert.equal(note.body, "new");
  assert.equal(note.title, "New");
  assert.equal(note.originalitySimilarity, 0.2);
  assert.equal(note.authorship.normalized, true);
  assert.equal(note.thinkingStatus.normalized, true);
  assert.equal(note.bodyLoaded, true);
  assert.equal(note.fileRevision, "a".repeat(64));
});

test("ensure note body loaded protects dirty tabs from fetched body overwrite", async () => {
  const state = {
    notes: [{ id: "n1", body: "local", bodyLoaded: false }],
    tabs: [{ id: "t1", noteId: "n1", body: "local edit", savedFileRevision: "old-version", dirty: true }],
    activeTabId: "t1"
  };

  await ensureNoteBodyLoadedForRuntime("n1", {
    state,
    fetchNote: async () => ({ id: "n1", body: "remote", fileRevision: "new-version" })
  });

  assert.equal(state.notes[0].body, "local");
  assert.equal(state.notes[0].bodyLoaded, true);
  assert.equal(state.tabs[0].body, "local edit");
  assert.equal(state.tabs[0].savedFileRevision, "old-version");
});

test("ensure note body loaded syncs clean tab metadata from fetched note", async () => {
  const calls = [];
  const state = {
    notes: [{ id: "n1", body: "old", title: "Old", bodyLoaded: false }],
    tabs: [{ id: "t1", noteId: "n1", body: "old", title: "Old", dirty: false }],
    activeTabId: "t1"
  };

  await ensureNoteBodyLoadedForRuntime("n1", {
    state,
    fetchNote: async () => ({ id: "n1", body: "new", title: "New", updatedAt: "now", fileRevision: "b".repeat(64) }),
    editor: {
      syncTabMetadataFromNote: (id) => calls.push(["sync", id]),
      fillEditorFromTab: () => calls.push(["fill"])
    }
  });

  assert.equal(state.notes[0].body, "new");
  assert.equal(state.tabs[0].savedBody, "new");
  assert.equal(state.tabs[0].savedFileRevision, "b".repeat(64));
  assert.equal(state.tabs[0].savedTitle, "New");
  assert.deepEqual(calls, [["sync", "n1"], ["fill"]]);
});
