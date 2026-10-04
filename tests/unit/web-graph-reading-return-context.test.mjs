import test from "node:test";
import assert from "node:assert/strict";
import { captureGraphReadingReturnContext, restoreGraphReadingReturnContext } from "../../apps/web/src/graph-reading-return-context.js";

test("return from reading restores the selected relation and original folder once", () => {
  const graph = { selection: { kind: "edge", edgeKey: "id:real" }, focusContextCollapsed: false };
  const app = { module: "graph", selectedFolderId: "original-scope" };
  captureGraphReadingReturnContext(graph, app, "vault-a", "note-b");
  graph.selection = null;
  Object.assign(app, { module: "explorer", selectedFileId: "note-b", selectedFolderId: "note-folder" });
  assert.equal(restoreGraphReadingReturnContext(graph, app, "vault-a"), true);
  assert.deepEqual(graph.selection, { kind: "edge", edgeKey: "id:real" });
  assert.equal(graph.focusContextCollapsed, false);
  assert.equal(app.selectedFolderId, "original-scope");
  assert.equal(restoreGraphReadingReturnContext(graph, app, "vault-a"), false);
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
