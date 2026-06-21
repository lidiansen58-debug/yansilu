import test from "node:test";
import assert from "node:assert/strict";

import {
  relationWorkspaceDirectEdges,
  relationWorkspaceExistingEdge,
  relationWorkspaceNextTargetCandidate,
  relationWorkspaceOtherEndpoint
} from "../../apps/web/src/relation-workspace-shared.js";

test("relation workspace shared helpers treat saved edges as bidirectionally visible", () => {
  const edges = [
    { fromNoteId: "a", toNoteId: "b", status: "confirmed" },
    { fromNoteId: "c", toNoteId: "a", status: "confirmed" },
    { fromNoteId: "a", toNoteId: "d", status: "dismissed" }
  ];

  assert.equal(relationWorkspaceOtherEndpoint(edges[0], "a"), "b");
  assert.equal(relationWorkspaceOtherEndpoint(edges[1], "a"), "c");
  assert.deepEqual(
    relationWorkspaceDirectEdges("a", edges, { edgeCounts: (edge) => edge.status !== "dismissed" }).map((edge) => relationWorkspaceOtherEndpoint(edge, "a")),
    ["b", "c"]
  );
  assert.equal(relationWorkspaceExistingEdge(edges, "b", "a"), edges[0]);
});

test("relation workspace shared helpers choose the next unconnected target candidate", () => {
  const candidates = [
    { targetNoteId: "b" },
    { targetNoteId: "c" },
    { targetNoteId: "d" }
  ];
  const edges = [{ fromNoteId: "a", toNoteId: "b" }];

  assert.equal(relationWorkspaceNextTargetCandidate(candidates, { sourceNoteId: "a", edges })?.targetNoteId, "c");
  assert.equal(relationWorkspaceNextTargetCandidate(candidates, { sourceNoteId: "a", edges, excludeTargetIds: ["c"] })?.targetNoteId, "d");
});
