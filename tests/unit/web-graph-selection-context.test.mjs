import test from "node:test";
import assert from "node:assert/strict";
import { captureGraphRequestContext } from "../../apps/web/src/graph-selection-context.js";

function harness() {
  let directory = "folder-a";
  let deps = { state: { module: "graph" }, graphState: { item: {}, aiAnalysis: {}, selection: { kind: "node", noteId: "note-1" } }, graphScopeDirectoryId: () => directory };
  return { get: () => deps, replace: value => { deps = value; }, changeDirectory: () => { directory = "folder-b"; } };
}

test("request context tolerates selection normalization and reads the current dependency provider", () => {
  const h = harness();
  const current = captureGraphRequestContext(h.get);
  h.replace({ ...h.get(), graphState: { ...h.get().graphState, selection: { kind: "node", noteId: "note-1" } } });
  assert.equal(current(), true);
  h.get().graphState.selection.noteId = "note-2";
  assert.equal(current(), false);
});

for (const change of ["graph", "directory", "module", "analysis"]) {
  test(`request context rejects changed ${change} when analysis is included`, () => {
    const h = harness();
    const current = captureGraphRequestContext(h.get, { includeAnalysis: true });
    if (change === "graph") h.get().graphState.item = {};
    if (change === "directory") h.changeDirectory();
    if (change === "module") h.get().state.module = "writing";
    if (change === "analysis") h.get().graphState.aiAnalysis = {};
    assert.equal(current(), false);
  });
}

test("a context without analysis can survive an analysis refresh", () => {
  const h = harness();
  const current = captureGraphRequestContext(h.get);
  h.get().graphState.aiAnalysis = {};
  assert.equal(current(), true);
});
