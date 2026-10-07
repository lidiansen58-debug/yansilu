import test from "node:test";
import assert from "node:assert/strict";
import { createDirectoryOptionRuntime } from "../../apps/web/src/directory-option-runtime.js";
import { preferredImportDirectoryIdFromOptions } from "../../apps/web/src/import-toolbar-model.js";
import { rootBoxIdFromFolder } from "../../apps/web/src/prototype-store.js";
import { escapeHtml } from "../../apps/web/src/editor-render-utils.js";

test("directory refresh includes newly created folders without changing a valid import destination", () => {
  const state = { selectedFolderId: "dir_original_default", folders: [
    { id: "dir_original_default", parentId: null }, { id: "kept", parentId: "dir_original_default" }
  ] };
  const select = { value: "kept", innerHTML: "" };
  const runtime = createDirectoryOptionRuntime(() => ({
    state, rootBoxIdFromFolder, preferredImportDirectoryIdFromOptions, escapeHtml,
    $: id => id === "importDirectoryId" ? select : null,
    directoryPathLabel: id => id === "new" ? "New <folder>" : id
  }));
  runtime.syncImportDirectoryOptions();
  assert.equal(select.value, "kept");
  state.folders.push({ id: "new", parentId: "dir_original_default" });
  runtime.syncImportDirectoryOptions();
  assert.match(select.innerHTML, /value="new"/);
  assert.match(select.innerHTML, /New &lt;folder&gt;/);
  assert.equal(select.value, "kept");
  state.folders = state.folders.filter(folder => folder.id !== "kept");
  runtime.syncImportDirectoryOptions();
  assert.equal(select.value, "dir_original_default");
});

test("a rebuilt export form restores an existing chosen child directory and rejects a deleted choice", () => {
  const state = { selectedFolderId: "dir_original_default", folders: [
    { id: "dir_original_default" }, { id: "child", parentId: "dir_original_default" }
  ] };
  const select = { value: "", innerHTML: "" };
  const runtime = createDirectoryOptionRuntime(() => ({
    state, escapeHtml, directoryPathLabel: id => id,
    isDirectoryUnderOriginalRoot: id => state.folders.some(folder => folder.id === id),
    $: id => id === "exportDirectoryId" ? select : null
  }));
  runtime.syncExportDirectoryOptions("child");
  assert.equal(select.value, "child");
  assert.match(select.innerHTML, /value="child"/);
  state.folders.pop();
  runtime.syncExportDirectoryOptions("child");
  assert.equal(select.value, "dir_original_default");
});
