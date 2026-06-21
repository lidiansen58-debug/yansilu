import assert from "node:assert/strict";
import test from "node:test";

import {
  graphCandidateHasExistingRelation,
  graphConnectedNoteIdsForNote,
  graphDirectNetworkEdgeCount,
  graphDirectNetworkEdgesForNote,
  graphExistingRelationBetweenNotes,
  graphExistingRelationPairKeys,
  graphIsolatedNodeIdsForGraph,
  graphLinkedNoteIdsForNetwork,
  graphRelationOtherEndpoint,
  graphRelationSaveResultForNote
} from "../../apps/web/src/graph-relation-state-query.js";

test("graph relation state query treats visible relations as bidirectional network edges", () => {
  const edges = [
    { id: "ab", fromNoteId: "a", toNoteId: "b", status: "confirmed" },
    { id: "ca", fromNoteId: "c", toNoteId: "a", status: "draft" },
    { id: "ad", fromNoteId: "a", toNoteId: "d", status: "dismissed" }
  ];

  assert.deepEqual(graphDirectNetworkEdgesForNote("a", edges).map((edge) => edge.id), ["ab", "ca"]);
  assert.equal(graphDirectNetworkEdgeCount("a", edges), 2);
  assert.deepEqual([...graphConnectedNoteIdsForNote("a", edges)].sort(), ["b", "c"]);
  assert.equal(graphRelationOtherEndpoint(edges[1], "a"), "c");
  assert.equal(graphExistingRelationBetweenNotes(edges, "b", "a"), edges[0]);
});

test("graph relation state query allows callers to decide which statuses count", () => {
  const edges = [
    { fromNoteId: "a", toNoteId: "b", status: "suggested" },
    { fromNoteId: "a", toNoteId: "c", status: "confirmed" }
  ];
  const onlyConfirmed = (status = "") => String(status || "").trim() === "confirmed";

  assert.deepEqual([...graphConnectedNoteIdsForNote("a", edges, { relationStatusCountsAsNetworkEdge: onlyConfirmed })], ["c"]);
  assert.deepEqual([...graphLinkedNoteIdsForNetwork(edges, { relationStatusCountsAsNetworkEdge: onlyConfirmed })].sort(), ["a", "c"]);
});

test("graph relation state query finds isolated nodes from the same network rule", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const edges = [
    { fromNoteId: "a", toNoteId: "b", status: "confirmed" },
    { fromNoteId: "c", toNoteId: "d", status: "dismissed" }
  ];

  assert.deepEqual([...graphIsolatedNodeIdsForGraph(nodes, edges)].sort(), ["c", "d"]);
});

test("graph relation state query exposes existing relation and save result lookups", () => {
  const edges = [
    { fromNoteId: "source", toNoteId: "target", relationType: "same_topic", status: "confirmed" }
  ];

  assert.deepEqual([...graphExistingRelationPairKeys(edges)], ["source::target"]);
  assert.equal(graphCandidateHasExistingRelation({ sourceNoteId: "target", targetNoteId: "source" }, edges), true);
  assert.equal(graphCandidateHasExistingRelation({ sourceNoteId: "source", targetNoteId: "other" }, edges), false);
  assert.deepEqual(graphRelationSaveResultForNote("source", { source: { targetTitle: "Target" } }), { targetTitle: "Target" });
  assert.deepEqual(graphRelationSaveResultForNote("missing", { source: { targetTitle: "Target" } }), {});
});
