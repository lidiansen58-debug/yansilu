import test from "node:test";
import assert from "node:assert/strict";
import { installMobileNoteEventBindings } from "../../apps/web/src/mobile-note-event-bindings.js";

function button() {
  let clickHandler = null;
  return {
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    },
    click() {
      clickHandler?.({});
    }
  };
}

test("mobile note binding creates a note in the resolved explorer folder", () => {
  const calls = [];
  const newNoteButton = button();
  const state = {
    selectedFolderId: "old-dir",
    browserRootId: "old-root",
    selectedFileId: "note-1"
  };

  installMobileNoteEventBindings({
    $: (id) => (id === "btnMobileNewNote" ? newNoteButton : null),
    state,
    resolveExplorerNewNoteFolderId: () => "dir-2",
    folderById: (_, id) => (id === "dir-2" ? { id, parentId: "root-2" } : null),
    rootBoxIdFromFolder: (_, id) => `root-for-${id}`,
    handleStateChange: (...args) => calls.push(args)
  });

  newNoteButton.click();

  assert.equal(state.selectedFolderId, "dir-2");
  assert.equal(state.browserRootId, "root-for-dir-2");
  assert.equal(state.selectedFileId, null);
  assert.deepEqual(calls, [["create-note-in-selected-folder"]]);
});

test("mobile note binding still creates when resolved folder is missing", () => {
  const calls = [];
  const newNoteButton = button();
  const state = {
    selectedFolderId: "old-dir",
    browserRootId: "old-root",
    selectedFileId: "note-1"
  };

  installMobileNoteEventBindings({
    $: (id) => (id === "btnMobileNewNote" ? newNoteButton : null),
    state,
    resolveExplorerNewNoteFolderId: () => "missing-dir",
    folderById: () => null,
    handleStateChange: (...args) => calls.push(args)
  });

  newNoteButton.click();

  assert.equal(state.selectedFolderId, "old-dir");
  assert.equal(state.browserRootId, "old-root");
  assert.equal(state.selectedFileId, "note-1");
  assert.deepEqual(calls, [["create-note-in-selected-folder"]]);
});
