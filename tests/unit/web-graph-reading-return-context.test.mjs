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

test("reading return captures zoom, focus depth and filters without sharing mutable state", () => {
  const graph = { zoom: "detail", expanded: true, focusDepth: "2", focusContextMode: "argument",
    filters: { relationType: "supports", status: "confirmed" }, readingLens: "insight" };
  const app = { module: "graph", selectedFileId: "a", selectedFolderId: "scope" };
  const viewport = { scrollLeft: 137, scrollTop: 83, getAttribute: () => "detail" };
  const root = { querySelector: selector => selector === ".graph-map-viewport" ? viewport : null };
  captureGraphReadingReturnContext(graph, app, "vault-a", "b", root);
  graph.filters.relationType = "contradicts";
  Object.assign(graph, { zoom: "fit", expanded: false, focusDepth: "1", readingLens: "overview" });
  Object.assign(app, { module: "explorer", selectedFileId: "b" });
  assert.equal(restoreGraphReadingReturnContext(graph, app, "vault-a"), true);
  assert.equal(graph.zoom, "detail");
  assert.equal(graph.expanded, true);
  assert.equal(graph.focusDepth, "2");
  assert.equal(graph.readingLens, "insight");
  assert.deepEqual(graph.filters, { relationType: "supports", status: "confirmed" });
  assert.equal(graph.readingReturnViewport.left, 137);
  assert.equal(graph.readingReturnViewport.top, 83);
});

test("invalid reading return clears a pending viewport from another context", () => {
  const graph = { readingReturnViewport: { left: 400, top: 200 } };
  assert.equal(restoreGraphReadingReturnContext(graph, { module: "explorer" }, "vault-b"), false);
  assert.equal(graph.readingReturnViewport, null);
});
