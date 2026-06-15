import test from "node:test";
import assert from "node:assert/strict";

import {
  readComponentsExplorerPaneSource,
  readPrototypeAppSource,
  readPrototypeHtmlSource
} from "./copy-source-helpers.mjs";

test("explorer keeps a distinct current-note state when the editor still has an active tab", async () => {
  const source = await readComponentsExplorerPaneSource();
  const html = await readPrototypeHtmlSource();

  assert.ok(source.includes("currentEditorNoteId() {"));
  assert.ok(source.includes("const fileIsSelected = this.state.selectedFileId === note.id;"));
  assert.match(source, /const fileIsCurrent = [^;]*this\.currentEditorNoteId\(\) === note\.id;/);
  assert.ok(source.includes("item-badge-current"));
  assert.ok(source.includes('`${currentBadge}${disconnectedBadge}${thinkingBadge}${originalBadge}${associateButton}`'));
  assert.ok(source.includes('${fileIsSelected ? "active" : ""} ${fileIsCurrent ? "is-current-note" : ""}'));
  assert.ok(html.includes(".item-badge-current {"));
  assert.ok(html.includes(".file-row.is-current-note:not(.active) {"));
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
  const appSource = await readPrototypeAppSource();

  assert.ok(explorerSource.includes("expandCurrentEditorNotePathInRoot(rootId = this.state.browserRootId) {"));
  assert.ok(explorerSource.includes("const currentNoteId = this.currentEditorNoteId();"));
  assert.ok(explorerSource.includes("if (rootBoxIdFromFolder(this.state, note.folderId) !== cleanRootId) return false;"));
  assert.ok(explorerSource.includes("this.expandFolderPath(note.folderId);"));
  assert.ok(appSource.includes("explorer?.expandCurrentEditorNotePathInRoot?.(state.browserRootId);"));
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
  const source = await readPrototypeAppSource();

  assert.ok(source.includes("function applyExplorerSelectionContext({"));
  assert.ok(source.includes("state.selectedFileId = resolvedNote.id;"));
  assert.ok(source.includes("state.selectedFolderId = folder.id;"));
  assert.ok(source.includes("state.browserRootId = rootBoxIdFromFolder(state, folder.id);"));
  assert.ok(source.includes("if (clearSelectedFile) state.selectedFileId = null;"));
  assert.ok(source.includes("if (note) applyExplorerSelectionContext({ note, syncSearch: true, expandFolder: true });"));
  assert.ok(source.includes("applyExplorerSelectionContext({\n        folderId: String(payload.folderId || \"\").trim(),\n        clearSelectedFile: true,\n        expandFolder: true\n      });"));
  assert.ok(source.includes("applyExplorerSelectionContext({\n        noteId: String(payload.noteId || \"\").trim(),"));
});

test("switch-tab sync clears stale explorer file selection when there is no active tab", async () => {
  const source = await readPrototypeAppSource();

  assert.ok(source.includes("function syncExplorerContextToActiveTab() {"));
  assert.ok(source.includes("? applyExplorerSelectionContext({ noteId: activeTab.noteId, syncSearch: true, expandFolder: true })"));
  assert.ok(source.includes(': applyExplorerSelectionContext({ clearSelectedFile: true, expandFolder: false });'));
});
