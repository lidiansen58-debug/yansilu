import test from "node:test";
import assert from "node:assert/strict";
import { hasIndependentGraphRelationComposer } from "../../apps/web/src/relation-composer-context.js";

test("a graph composer can survive sidebar refresh without an active editor note", () => {
  const draft = { open: true, sourceNoteId: "source", entryRoute: { returnTo: "graph" } };
  assert.equal(hasIndependentGraphRelationComposer({ module: "graph", notes: [{ id: "source" }] }, draft), true);
  assert.equal(hasIndependentGraphRelationComposer({ module: "graph", selectedFileId: "other", notes: [{ id: "source" }] }, draft), true);
});

test("a graph composer is not preserved after leaving graph, deleting source or switching vault", () => {
  const draft = { open: true, sourceNoteId: "source", entryRoute: { returnTo: "graph" } };
  assert.equal(hasIndependentGraphRelationComposer({ module: "notes", notes: [{ id: "source" }] }, draft), false);
  assert.equal(hasIndependentGraphRelationComposer({ module: "graph", notes: [{ id: "other-vault" }] }, draft), false);
  assert.equal(hasIndependentGraphRelationComposer({ module: "graph", notes: [] }, draft), false);
  assert.equal(hasIndependentGraphRelationComposer({ module: "graph", notes: [{ id: "source" }] }, { ...draft, open: false }), false);
  assert.equal(hasIndependentGraphRelationComposer({ module: "graph", notes: [{ id: "source" }] }, { ...draft, entryRoute: { returnTo: "right-sidebar" } }), false);
});
