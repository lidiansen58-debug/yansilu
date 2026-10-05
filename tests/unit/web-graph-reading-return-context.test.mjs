import test from "node:test";
import assert from "node:assert/strict";
import { captureGraphReadingReturnContext, restoreGraphReadingReturnContext } from "../../apps/web/src/graph-reading-return-context.js";

test("return from reading restores the selected relation and original folder once", () => {
  const graph = { selection: { kind: "edge", edgeKey: "id:real" }, focusContextCollapsed: false };
  const app = { module: "graph", selectedFolderId: "original-scope", selectedFileId: "note-a" };
  captureGraphReadingReturnContext(graph, app, "vault-a", "note-b");
  graph.selection = null;
  Object.assign(app, { module: "explorer", selectedFileId: "note-b", selectedFolderId: "note-folder" });
  assert.equal(restoreGraphReadingReturnContext(graph, app, "vault-a"), true);
  assert.deepEqual(graph.selection, { kind: "edge", edgeKey: "id:real" });
  assert.equal(graph.focusContextCollapsed, false);
  assert.equal(app.selectedFolderId, "original-scope");
  assert.equal(app.selectedFileId, "note-a");
  assert.equal(restoreGraphReadingReturnContext(graph, app, "vault-a"), false);
});

test("an unfocused graph returns to the whole graph rather than focusing the read note", () => {
  const graph = {};
  const app = { module: "graph", selectedFileId: null };
  captureGraphReadingReturnContext(graph, app, "vault-a", "note-b");
  Object.assign(app, { module: "explorer", selectedFileId: "note-b" });
  assert.equal(restoreGraphReadingReturnContext(graph, app, "vault-a"), true);
  assert.equal(app.selectedFileId, null);
});

test("a deleted original focus does not leave the returned graph focused on a missing note", () => {
  const graph = {};
  const app = { module: "graph", selectedFileId: "note-a", notes: [{ id: "note-a" }, { id: "note-b" }] };
  captureGraphReadingReturnContext(graph, app, "vault-a", "note-b");
  Object.assign(app, { module: "explorer", selectedFileId: "note-b", notes: [{ id: "note-b" }] });
  assert.equal(restoreGraphReadingReturnContext(graph, app, "vault-a"), true);
  assert.equal(app.selectedFileId, null);
});

test("reading context does not leak to another vault, note or module", () => {
  for (const override of [{ vault: "vault-b" }, { selectedFileId: "other-note" }, { module: "today" }]) {
    const graph = { selection: { kind: "node", nodeId: "a" } };
    const app = { module: "graph", selectedFolderId: "original" };
    captureGraphReadingReturnContext(graph, app, "vault-a", "b");
    graph.selection = null;
    Object.assign(app, { module: "explorer", selectedFileId: "b", selectedFolderId: "new", ...override });
    assert.equal(restoreGraphReadingReturnContext(graph, app, override.vault || "vault-a"), false);
    assert.equal(graph.selection, null);
    assert.equal(app.selectedFolderId, "new");
    assert.equal(graph.readingReturnContext, null);
  }
});
