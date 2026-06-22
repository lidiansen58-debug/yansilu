import test from "node:test";
import assert from "node:assert/strict";

import {
  readComponentsExplorerPaneSource,
  readPrototypeCssSource,
  readPrototypeHtmlSource
} from "./copy-source-helpers.mjs";
import {
  routeAppShellStateChange
} from "../../apps/web/src/app-shell-state-change-router.js";
import {
  handleGraphFocusNoteStateChange,
  handleSelectFolderStateChange
} from "../../apps/web/src/app-shell-state-navigation-actions.js";

test("explorer keeps a distinct current-note state when the editor still has an active tab", async () => {
  const source = await readComponentsExplorerPaneSource();
  const html = await readPrototypeHtmlSource();
  const css = await readPrototypeCssSource();

  assert.ok(source.includes("currentEditorNoteId() {"));
  assert.ok(source.includes("const fileIsSelected = this.state.selectedFileId === note.id;"));
  assert.match(source, /const fileIsCurrent = [^;]*this\.currentEditorNoteId\(\) === note\.id;/);
  assert.ok(source.includes("item-badge-current"));
  assert.ok(source.includes("const showAssociateButton = disconnected;"));
  assert.ok(source.includes('const trail = permanentSimplifiedScope'));
  assert.ok(source.includes('`${currentBadge}${thinkingBadge}${originalBadge}${associateButton}`'));
  assert.ok(source.includes('${fileIsSelected ? "active" : ""} ${fileIsCurrent ? "is-current-note" : ""}'));
  assert.ok(css.includes(".item-badge-current {"));
  assert.ok(css.includes(".file-row.is-current-note:not(.active) {"));
});

test("explorer pane emits selection intents instead of mutating shared selection state directly", async () => {
  const source = await readComponentsExplorerPaneSource();

  assert.ok(source.includes('this.onStateChange("create-note-in-selected-folder", { folderId });'));
  assert.ok(source.includes('this.onStateChange("select-folder", { folderId: id });'));
  assert.ok(source.includes('this.onStateChange("graph-focus-note", { noteId: id });'));
  assert.ok(source.includes('this.onStateChange("create-note-in-selected-folder", { folderId: this.state.selectedFolderId });'));
  assert.ok(source.includes('this.onStateChange("select-folder", { folderId: f.id });'));
  assert.ok(source.includes('this.onStateChange("create-note-in-selected-folder", { folderId: f.id });'));
  assert.doesNotMatch(source, /this\.state\.(selectedFolderId|selectedFileId|browserRootId)\s*=(?!=)/);
});

test("selecting a folder expands the current editor note path when it stays in the same root", async () => {
  const explorerSource = await readComponentsExplorerPaneSource();
  const calls = [];

  assert.ok(explorerSource.includes("expandCurrentEditorNotePathInRoot(rootId = this.state.browserRootId) {"));
  assert.ok(explorerSource.includes("const currentNoteId = this.currentEditorNoteId();"));
  assert.ok(explorerSource.includes("if (rootBoxIdFromFolder(this.state, note.folderId) !== cleanRootId) return false;"));
  assert.ok(explorerSource.includes("this.expandFolderPath(note.folderId);"));

  await handleSelectFolderStateChange({ folderId: "d2" }, {
    state: { module: "explorer", selectedFolderId: "d2", browserRootId: "root" },
    explorer: {
      expandCurrentEditorNotePathInRoot: (rootId) => calls.push(["expand-current-note", rootId])
    },
    applyExplorerSelectionContext: (context) => calls.push(["context", context]),
    syncNotesForDirectory: async (folderId) => calls.push(["sync-notes", folderId]),
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(calls, [
    ["context", { folderId: "d2", clearSelectedFile: true, expandFolder: true }],
    ["sync-notes", "d2"],
    ["expand-current-note", "root"],
    "render"
  ]);
});

test("explorer render auto-reveals the preferred row after rebuilding the tree", async () => {
  const source = await readComponentsExplorerPaneSource();

  assert.ok(source.includes("preferredVisibleRowSelector() {"));
  assert.ok(source.includes('if (selectedFileId) return `.explorer-item[data-kind="file"][data-id="${selectedFileId}"]`;'));
  assert.ok(source.includes('if (currentNoteId) return `.explorer-item[data-kind="file"][data-id="${currentNoteId}"]`;'));
  assert.ok(source.includes('if (selectedFolderId) return `.explorer-item[data-kind="folder"][data-id="${selectedFolderId}"]`;'));
  assert.ok(source.includes("revealPreferredVisibleRow() {"));
  assert.ok(source.includes('target.scrollIntoView({ block: "nearest" });'));
  assert.ok(source.includes("scheduleRevealPreferredVisibleRow() {"));
  assert.ok(source.includes("this.scheduleRevealPreferredVisibleRow();"));
});

test("app state sync funnels note and folder selection through one helper", async () => {
  const folderCalls = [];
  await handleSelectFolderStateChange({ folderId: " d2 " }, {
    state: { module: "explorer", selectedFolderId: "d2", browserRootId: "root" },
    applyExplorerSelectionContext: (context) => folderCalls.push(context),
    syncNotesForDirectory: async () => {},
    renderAll: () => {}
  });
  assert.equal(folderCalls[0].folderId, "d2");
  assert.equal(folderCalls[0].clearSelectedFile, true);
  assert.equal(folderCalls[0].expandFolder, true);

  const noteCalls = [];
  handleGraphFocusNoteStateChange({ noteId: " n1 " }, {
    state: { module: "explorer" },
    applyExplorerSelectionContext: (context) => noteCalls.push(context)
  });
  assert.deepEqual(noteCalls[0], {
    noteId: "n1",
    syncSearch: false,
    expandFolder: true
  });
});

test("switch-tab sync clears stale explorer file selection when there is no active tab", async () => {
  const calls = [];

  await routeAppShellStateChange("switch-tab", {}, {
    syncExplorerContextToActiveTab: () => calls.push("sync-tab"),
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(calls, ["sync-tab", "render"]);
});
