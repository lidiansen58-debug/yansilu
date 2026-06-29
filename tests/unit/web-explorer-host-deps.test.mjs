import test from "node:test";
import assert from "node:assert/strict";
import { createExplorerPaneHostDeps } from "../../apps/web/src/explorer-host-deps.js";

test("explorer host deps collect pane elements and callbacks outside prototype shell", () => {
  const calls = [];
  const elements = new Map();
  const state = { selectedFolderId: "dir-1" };
  const deps = createExplorerPaneHostDeps({
    $: (id) => {
      if (!elements.has(id)) elements.set(id, { id });
      return elements.get(id);
    },
    state,
    contextMenu: { id: "menu" },
    createBoxDialog: { id: "dialog" },
    desktopCommands: {
      browseDirectory: (...args) => calls.push(["browse", ...args]),
      revealInFileManager: (...args) => calls.push(["reveal", ...args]),
      openDirectory: (...args) => calls.push(["open-dir", ...args])
    },
    openNoteById: (...args) => calls.push(["open-note", ...args]),
    setStatus: (...args) => calls.push(["status", ...args]),
    handleStateChange: (...args) => calls.push(["state", ...args]),
    selectPermanentDirectory: async () => "permanent",
    selectNoteMoveDirectory: async () => "move",
    resolveNotePath: (...args) => {
      calls.push(["path", ...args]);
      return "note.md";
    }
  });

  assert.equal(deps.state, state);
  assert.equal(deps.elements.searchInput.id, "searchInput");
  assert.equal(deps.elements.listArea.id, "listArea");
  assert.equal(deps.contextMenu.id, "menu");
  assert.equal(deps.createBoxDialog.id, "dialog");
  deps.onOpenNote("note-1");
  deps.onStatus("ok");
  deps.onStateChange("refresh");
  deps.desktopFile.revealPath("note.md");
  deps.desktopFile.openPath("dir");
  assert.equal(deps.resolveNotePath("note-1"), "note.md");

  assert.deepEqual(calls, [
    ["open-note", "note-1"],
    ["status", "ok"],
    ["state", "refresh"],
    ["reveal", "note.md"],
    ["open-dir", "dir"],
    ["path", "note-1"]
  ]);
});
