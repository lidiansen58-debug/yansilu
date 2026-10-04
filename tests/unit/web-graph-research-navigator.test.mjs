import test from "node:test";
import assert from "node:assert/strict";
import { graphClusterResearchMeta } from "../../apps/web/src/graph-research-navigator.js";

test("cluster key notes derive degree from actual internal and external relations", () => {
  const nodeMap = new Map(["a", "b", "c"].map((id) => [id, { id, title: id, degree: 0 }]));
  const edges = [
    { fromNoteId: "a", toNoteId: "b", status: "confirmed", rationale: "markdown_wikilink" },
    { fromNoteId: "a", toNoteId: "outside", status: "confirmed", createdBy: "manual" },
    { fromNoteId: "b", toNoteId: "b", status: "confirmed" },
    { fromNoteId: "c", toNoteId: "a", status: "rejected" }
  ];
  const meta = graphClusterResearchMeta({ memberIds: ["a", "b", "c"] }, { nodeMap, edges }, {
    graphRelationStatusCountsAsNetworkEdge: (status) => status === "confirmed"
  });
  assert.deepEqual(meta.coreNotes.map(({ id, degree }) => [id, degree]), [["a", 2], ["b", 2], ["c", 0]]);
  assert.equal(meta.memberEdges.length, 2);
  assert.equal(meta.externalEdges.length, 1);
  assert.equal(nodeMap.get("a").degree, 0);
});
