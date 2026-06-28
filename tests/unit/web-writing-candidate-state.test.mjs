import test from "node:test";
import assert from "node:assert/strict";

import {
  writingCandidateNotesForRuntime,
  writingScopeDirectoryIdsForRuntime
} from "../../apps/web/src/writing-candidate-state.js";

test("writing candidate state resolves scope from selected folder or root fallback", () => {
  const calls = [];
  const descendantDirectoryIds = (id) => {
    calls.push(id);
    return [id, `${id}-child`];
  };

  assert.deepEqual(writingScopeDirectoryIdsForRuntime({ selectedFolderId: "dir-a", browserRootId: "root" }, { descendantDirectoryIds }), ["dir-a", "dir-a-child"]);
  assert.deepEqual(writingScopeDirectoryIdsForRuntime({ browserRootId: "root" }, { descendantDirectoryIds }), ["root", "root-child"]);
  assert.deepEqual(writingScopeDirectoryIdsForRuntime({}, { descendantDirectoryIds }), ["dir_original_default", "dir_original_default-child"]);
  assert.deepEqual(calls, ["dir-a", "root", "dir_original_default"]);
});

test("writing candidate state filters eligible scoped notes and sorts by recency", () => {
  const state = {
    notes: [
      { id: "old", title: "Old", folderId: "scope", updatedAt: "2026-01-01T00:00:00Z", eligible: true },
      { id: "new", title: "New", folderId: "scope", updatedAt: "2026-01-03T00:00:00Z", eligible: true },
      { id: "blocked", title: "Blocked", folderId: "scope", updatedAt: "2026-01-04T00:00:00Z", eligible: false },
      { id: "outside", title: "Outside", folderId: "other", updatedAt: "2026-01-05T00:00:00Z", eligible: true }
    ]
  };

  const notes = writingCandidateNotesForRuntime(state, {
    writingScopeDirectoryIds: () => ["scope"],
    isWritingEligibleNote: (note) => note.eligible
  });

  assert.deepEqual(notes.map((note) => note.id), ["new", "old"]);
});

test("writing candidate state uses title fallback sorting when recency ties", () => {
  const state = {
    notes: [
      { id: "b", title: "Beta", folderId: "scope", updatedAt: "", eligible: true },
      { id: "a", title: "Alpha", folderId: "scope", updatedAt: "", eligible: true }
    ]
  };

  const notes = writingCandidateNotesForRuntime(state, {
    writingScopeDirectoryIds: () => ["scope"],
    isWritingEligibleNote: () => true
  });

  assert.deepEqual(notes.map((note) => note.title), ["Alpha", "Beta"]);
});
