import test from "node:test";
import assert from "node:assert/strict";
import { installAppGlobalKeyboardEvents } from "../../apps/web/src/app-global-keyboard-events.js";

function documentStub() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    keydown(event) {
      listeners.get("keydown")?.({
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: () => {
          event.prevented = true;
        },
        ...event
      });
    }
  };
}

test("global keyboard events handle rename delete and input guards", () => {
  const calls = [];
  const documentRef = documentStub();
  const state = {
    module: "explorer",
    selectedFileId: "note-1",
    selectedFolderId: "dir-1",
    activeTabId: "tab-1",
    tabs: [{ id: "tab-1", noteId: "note-1" }],
    notes: [{ id: "note-1" }]
  };
  installAppGlobalKeyboardEvents({
    documentRef,
    state,
    explorer: { handleContextAction: (...args) => calls.push(["context", ...args]) },
    noteDeleteKeyRoute: () => ({ handled: true, noteId: "note-1" }),
    renderAll: () => calls.push(["render"]),
    handleSystemMessageEscapeKey: () => ({ handled: false })
  });

  const inputEvent = { key: "F2", target: { tagName: "input" } };
  documentRef.keydown(inputEvent);
  assert.deepEqual(calls, []);
  assert.equal(inputEvent.prevented, undefined);

  const renameEvent = { key: "F2", target: { tagName: "div" } };
  documentRef.keydown(renameEvent);
  assert.deepEqual(calls, [["context", "rename", { kind: "file", id: "note-1" }], ["render"]]);
  assert.equal(renameEvent.prevented, true);

  calls.length = 0;
  const deleteEvent = { key: "Delete", target: { tagName: "div" } };
  documentRef.keydown(deleteEvent);
  assert.deepEqual(calls, [["context", "delete", { kind: "file", id: "note-1" }]]);
  assert.equal(deleteEvent.prevented, true);
});

test("global keyboard events switch tabs and navigate folders", () => {
  const calls = [];
  const documentRef = documentStub();
  const state = {
    module: "explorer",
    selectedFileId: "",
    selectedFolderId: "child",
    activeTabId: "tab-1",
    tabs: [{ id: "tab-1", noteId: "note-1" }, { id: "tab-2", noteId: "note-2" }],
    notes: [{ id: "note-1" }]
  };
  installAppGlobalKeyboardEvents({
    documentRef,
    state,
    editor: { fillEditorFromTab: () => calls.push(["fill"]) },
    syncExplorerContextToActiveTab: () => calls.push(["sync-context"]),
    folderById: (_, id) => (id === "child" ? { id, parentId: "parent" } : { id }),
    childFolders: () => [{ id: "grandchild" }],
    notesInFolder: () => [{ id: "note-1" }],
    openNoteById: (id) => calls.push(["open-note", id]),
    renderAll: () => calls.push(["render"]),
    setStatus: (...args) => calls.push(["status", ...args.slice(1)])
  });

  const nextTabEvent = { key: "ArrowRight", ctrlKey: true, target: { tagName: "div" } };
  documentRef.keydown(nextTabEvent);
  assert.equal(state.activeTabId, "tab-2");
  assert.equal(nextTabEvent.prevented, true);
  assert.deepEqual(calls, [["fill"], ["sync-context"], ["render"]]);

  calls.length = 0;
  const parentEvent = { key: "ArrowLeft", altKey: true, target: { tagName: "div" } };
  documentRef.keydown(parentEvent);
  assert.equal(state.selectedFolderId, "parent");
  assert.equal(parentEvent.prevented, true);
  assert.deepEqual(calls, [["status", "ok"], ["render"]]);

  calls.length = 0;
  const childEvent = { key: "ArrowRight", altKey: true, target: { tagName: "div" } };
  documentRef.keydown(childEvent);
  assert.equal(state.selectedFolderId, "grandchild");
  assert.equal(childEvent.prevented, true);
  assert.deepEqual(calls, [["status", "ok"], ["render"]]);
});
