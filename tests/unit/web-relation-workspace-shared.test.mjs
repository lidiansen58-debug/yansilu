import test from "node:test";
import assert from "node:assert/strict";

import {
  relationWorkspaceDirectEdges,
  relationWorkspaceAvailableTargetCandidates,
  relationWorkspaceExistingEdge,
  relationWorkspaceNextTargetCandidate,
  relationWorkspaceOtherEndpoint
} from "../../apps/web/src/relation-workspace-shared.js";

test("available recommendation targets exclude self, duplicates and both saved directions", () => {
  const candidates = [null, { targetNoteId: " a " }, { targetNoteId: "b" },
    { targetNoteId: "c" }, { targetNoteId: "d" }, { targetNoteId: " d " }, { targetNoteId: "e" }];
  const edges = [{ fromNoteId: "a", toNoteId: "b" }, { fromNoteId: "c", toNoteId: "a" }];
  const options = { sourceNoteId: "a", edges, excludeTargetIds: ["e"] };
  assert.deepEqual(relationWorkspaceAvailableTargetCandidates(candidates, options), [{ targetNoteId: "d" }]);
  assert.deepEqual(relationWorkspaceNextTargetCandidate(candidates, options), { targetNoteId: "d" });
});

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
