import test from "node:test";
import assert from "node:assert/strict";
import { revealSavedGraphRelation } from "../../apps/web/src/graph-saved-relation-reveal.js";

test("saved relation becomes visible and selected using the refreshed edge identity", () => {
  const graphState = { item: { edges: [{ id: "saved", fromNoteId: "a", toNoteId: "b", relationType: "supports" }] } };
  const calls = [];
  assert.equal(revealSavedGraphRelation(graphState, { id: "saved" }, {
    setRelationTypeFilter: filter => calls.push(filter), renderGraphPanel: () => calls.push("render")
  }), true);
  assert.deepEqual(graphState.selection, { kind: "edge", edgeKey: "id:saved" });
  assert.deepEqual(calls, ["all", "render"]);
});

test("an unavailable saved edge does not invent a selection or change the user's filter", () => {
  const graphState = { item: { edges: [] }, selection: { kind: "node", nodeId: "a" } };
  assert.equal(revealSavedGraphRelation(graphState, { id: "missing" }, {
    setRelationTypeFilter: () => { throw new Error("unexpected filter change"); }
  }), false);
  assert.deepEqual(graphState.selection, { kind: "node", nodeId: "a" });
});
