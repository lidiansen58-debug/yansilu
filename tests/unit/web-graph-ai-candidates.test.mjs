import assert from "node:assert/strict";
import test from "node:test";

import {
  graphBlockedAiRelationPairKeysForNote,
  graphCandidateCanSaveRelation,
  graphCandidateCountKey,
  graphCandidateEndpointIds,
  graphCandidatePercent,
  graphMergeRelationCandidatesForDisplay,
  graphPendingAiCandidateCount,
  graphRelationPairKey
} from "../../apps/web/src/graph-ai-candidates.js";

test("graph AI candidates resolve endpoints from common payload shapes", () => {
  assert.deepEqual(graphCandidateEndpointIds({
    from_note_id: "a",
    targetNoteIds: ["b"]
  }), { sourceNoteId: "a", targetNoteId: "b" });
  assert.deepEqual(graphCandidateEndpointIds({
    actionSourceNoteId: "source",
    counterpartNoteId: "target"
  }), { sourceNoteId: "source", targetNoteId: "target" });

  assert.equal(graphCandidateCountKey({ noteIds: ["b", "a"] }), "a::b");
  assert.equal(graphCandidateCountKey({ actionSourceNoteId: "b", counterpartNoteId: "a" }), "a::b");
  assert.equal(graphRelationPairKey("b", "a"), "a::b");
});

test("graph AI candidates reject no-relation or rejected outputs", () => {
  assert.equal(graphCandidateCanSaveRelation({ sourceNoteId: "a", targetNoteId: "b", relationType: "supports" }), true);
  assert.equal(graphCandidateCanSaveRelation({ sourceNoteId: "a", targetNoteId: "b", aiDecision: "reject", relationType: "supports" }), false);
  assert.equal(graphCandidateCanSaveRelation({ sourceNoteId: "a", targetNoteId: "b", aiRelationType: "no_relation" }), false);
});

test("graph AI candidate percent handles confidence and coarse score", () => {
  assert.equal(graphCandidatePercent({ confidence: 0.72 }), 72);
  assert.equal(graphCandidatePercent({ aiConfidence: 83 }), 83);
  assert.equal(graphCandidatePercent({ coarseScore: 0.34 }), 34);
  assert.equal(graphCandidatePercent({}), 45);
});

test("graph AI candidate merge keeps AI candidates and deduplicates local fallbacks", () => {
  const result = graphMergeRelationCandidatesForDisplay(
    [{ sourceNoteId: "a", targetNoteId: "b", relationType: "supports" }],
    [
      { sourceNoteId: "b", targetNoteId: "a", relationType: "same_topic" },
      { sourceNoteId: "a", targetNoteId: "c", relationType: "bridges" }
    ],
    { limit: 5 }
  );

  assert.deepEqual(result.map((candidate) => [candidate.targetNoteId, candidate.candidateSource]), [
    ["b", "ai"],
    ["c", "local"]
  ]);

  const snakeCaseResult = graphMergeRelationCandidatesForDisplay(
    [{ source_note_id: "a", target_note_id: "b", relation_type: "supports" }],
    [{ sourceNoteId: "b", targetNoteId: "a", relationType: "same_topic" }],
    { limit: 5 }
  );
  assert.equal(snakeCaseResult.length, 1);
  assert.equal(snakeCaseResult[0].candidateSource, "ai");
});

test("graph AI candidate counts exclude existing and bridge duplicates", () => {
  const bridge = { sourceNoteId: "a", targetNoteId: "b", relationType: "bridges", componentBridge: true };
  const ordinary = { sourceNoteId: "a", targetNoteId: "c", relationType: "supports" };
  const existing = { sourceNoteId: "a", targetNoteId: "d", relationType: "supports" };

  const bridgeResult = graphPendingAiCandidateCount([bridge, ordinary, existing], {
    existingRelationPairKeys: new Set(["a::d"]),
    bridgeOnly: true
  });
  assert.equal(bridgeResult.count, 1);
  assert.deepEqual([...bridgeResult.pairKeys], ["a::b"]);

  const ordinaryResult = graphPendingAiCandidateCount([bridge, ordinary, existing], {
    existingRelationPairKeys: new Set(["a::d"]),
    excludePairs: bridgeResult.pairKeys,
    excludeBridge: true
  });
  assert.equal(ordinaryResult.count, 1);
  assert.deepEqual([...ordinaryResult.pairKeys], ["a::c"]);
});

test("graph blocked AI candidate pairs track rejected candidates for a note", () => {
  const blocked = graphBlockedAiRelationPairKeysForNote("a", {
    relationCandidates: [
      { sourceNoteId: "a", targetNoteId: "b", aiDecision: "reject", relationType: "supports" },
      { sourceNoteId: "a", targetNoteId: "c", relationType: "supports" }
    ],
    bridgeCandidates: [
      { sourceNoteId: "d", targetNoteId: "a", aiRelationType: "no_relation" },
      { actionSourceNoteId: "a", counterpartNoteId: "e", aiDecision: "reject", relationType: "bridges" }
    ]
  });

  assert.deepEqual([...blocked].sort(), ["a::b", "a::d", "a::e"]);
});
