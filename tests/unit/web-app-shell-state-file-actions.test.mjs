import test from "node:test";
import assert from "node:assert/strict";

import {
  handleDirectoryDeleteStateChange,
  handleDirectoryMoveStateChange,
  handleDirectoryUpdateStateChange,
  handleNoteDeleteStateChange,
  handleNoteMoveStateChange
} from "../../apps/web/src/app-shell-state-file-actions.js";

function statusRecorder() {
  const calls = [];
  return {
    calls,
    setStatus(message, tone) {
      calls.push({ message, tone });
    }
  };
}

test("moving a dirty note preserves it and asks the user to save first", async () => {
  const status = statusRecorder();
  let moved = false;
  const result = await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state: { tabs: [{ noteId: "n1", dirty: true }] },
    moveNote: async () => { moved = true; },
    setStatus: status.setStatus
  });
  assert.equal(result, false);
  assert.equal(moved, false);
  assert.match(status.calls[0].message, /保存后再归类/);
});

for (const fail of [false, true]) {
  test(`note move locks interaction, rejects duplicate moves and releases on ${fail ? "failure" : "success"}`, async () => {
    const state = { tabs: [{ id: "t1", noteId: "n1", dirty: false }], activeTabId: "t1" };
    let resolveMove, locked = false, calls = 0, editorRefreshed = false;
    const pending = new Promise(resolve => { resolveMove = resolve; });
    const deps = {
      state,
      editor: { fillEditorFromTab: () => { assert.equal(locked, true); editorRefreshed = true; } },
      beginMoveInteraction: () => { locked = true; return () => { locked = false; }; },
      moveNote: async () => { calls++; await pending; if (fail) throw new Error("unavailable"); return { id: "n1" }; },
      moveNoteInClientState: () => assert.equal(locked, true)
    };
    const result = handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, deps);
    assert.equal(locked, true);
    assert.equal(state.pendingNoteMoveId, "n1");
    assert.equal(await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d3" }, deps), false);
    assert.equal(calls, 1);
    resolveMove();
    assert.equal(await result, !fail);
    assert.equal(editorRefreshed, !fail);
    assert.equal(locked, false);
    assert.equal(state.pendingNoteMoveId, "");
  });
}

test("state file actions move notes remotely before updating client state", async () => {
  const status = statusRecorder();
  const calls = [];
  let rendered = false;

  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    moveNote: async (noteId, directoryId) => {
      calls.push(["remote", noteId, directoryId]);
      return { id: noteId, directoryId };
    },
    moveNoteInClientState: (noteId, directoryId, moved) => calls.push(["client", noteId, directoryId, moved.directoryId]),
    setStatus: status.setStatus,
    renderAll: () => {
      rendered = true;
    }
  });

  assert.deepEqual(calls, [
    ["remote", "n1", "d2"],
    ["client", "n1", "d2", "d2"]
  ]);
  assert.equal(status.calls.at(-1).tone, "ok");
  assert.equal(rendered, true);
});

test("state file actions delete local fallback notes without remote delete", async () => {
  const calls = [];

  await handleNoteDeleteStateChange({ noteId: "n1" }, {
    usingLocalFallbackData: true,
    deleteNote: async () => calls.push("remote"),
    removeNoteFromClientState: (noteId) => calls.push(["client", noteId]),
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(calls, [["client", "n1"], "render"]);
});

test("state file actions update directory fsPath before syncing loaded descendants", async () => {
  const state = {
    browserRootId: "old-root",
    folders: [{ id: "d1", title: "Old", fsPath: "/vault/Old" }]
  };
  const calls = [];

  await handleDirectoryUpdateStateChange({ directoryId: "d1", patch: { title: "New" } }, {
    state,
    descendantDirectoryIds: (directoryId) => [`${directoryId}-child`],
    renamedDirectoryFsPath: () => "/vault/New",
    rootBoxIdFromFolder: () => "root-d1",
    updateDirectory: async (directoryId, patch) => {
      calls.push(["update", directoryId, patch]);
      return { id: directoryId };
    },
    syncDirectoriesFromApi: async () => calls.push("sync-directories"),
    syncLoadedNotesForDirectories: async (ids) => calls.push(["sync-notes", ids]),
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(calls, [
    ["update", "d1", { title: "New", fsPath: "/vault/New" }],
    "sync-directories",
    ["sync-notes", ["d1-child"]],
    "render"
  ]);
  assert.equal(state.browserRootId, "root-d1");
});

test("state file actions delete a directory and restore selected folder to root", async () => {
  const state = {
    browserRootId: "root",
    selectedFolderId: "d1",
    folders: [{ id: "root" }, { id: "d1" }]
  };

  await handleDirectoryDeleteStateChange({ directoryId: "d1" }, {
    state,
    deleteDirectory: async () => {}
  });

  assert.deepEqual(state.folders, [{ id: "root" }]);
  assert.equal(state.selectedFolderId, "root");
});

test("state file actions move a directory and select the moved directory after sync", async () => {
  const state = {
    selectedFolderId: "old",
    browserRootId: "old-root",
    folders: [{ id: "d1", fsPath: "/vault/D1" }, { id: "parent", fsPath: "/vault/Parent" }]
  };
  const calls = [];

  await handleDirectoryMoveStateChange({ directoryId: "d1", parentDirectoryId: "parent" }, {
    state,
    descendantDirectoryIds: () => ["d1", "child"],
    folderById: (_state, id) => state.folders.find((folder) => folder.id === id),
    movedDirectoryFsPath: () => "/vault/Parent/D1",
    rootBoxIdFromFolder: () => "root-d1",
    updateDirectory: async (directoryId, patch) => {
      calls.push(["update", directoryId, patch]);
      return { id: directoryId };
    },
    syncDirectoriesFromApi: async () => calls.push("sync-directories"),
    syncLoadedNotesForDirectories: async (ids) => calls.push(["sync-notes", ids])
  });

  assert.deepEqual(calls, [
    ["update", "d1", { parentDirectoryId: "parent", fsPath: "/vault/Parent/D1" }],
    "sync-directories",
    ["sync-notes", ["d1", "child"]]
  ]);
  assert.equal(state.selectedFolderId, "d1");
  assert.equal(state.browserRootId, "root-d1");
});
