import test from "node:test";
import assert from "node:assert/strict";

import {
  graphFollowupActionForRelationType,
  graphIsolatedNodeIds,
  graphNextActionForSummary,
  graphWritingCandidateNoteIds,
  graphWritingFollowupEntryPlan
} from "../../apps/web/src/graph-followup.js";

test("graph followup action maps conflict relations to tension", () => {
  assert.equal(graphFollowupActionForRelationType("counterexample_to"), "tension");
  assert.equal(graphFollowupActionForRelationType("qualifies"), "tension");
});

test("graph followup action maps bridges to bridge followup", () => {
  assert.equal(graphFollowupActionForRelationType("bridges"), "bridge");
  assert.equal(graphFollowupActionForRelationType("unexpected_connection"), "bridge");
  assert.equal(graphFollowupActionForRelationType("reframes"), "bridge");
});

test("graph followup action defaults ordinary relations to relation followup", () => {
  assert.equal(graphFollowupActionForRelationType("supports"), "relations");
  assert.equal(graphFollowupActionForRelationType("associated_with"), "relations");
});

test("graph next action prefers relation followup when graph only has untyped relations", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    untypedFromNoteId: "pn_rel_1",
    untypedRelationId: "lnk_rel_1"
  });

  assert.equal(nextAction.action, "relations-edit");
  assert.equal(nextAction.noteId, "pn_rel_1");
  assert.equal(nextAction.relationId, "lnk_rel_1");
});

test("graph next action prefers tension followup before bridge followup", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    conflictFromNoteId: "pn_tension_1",
    bridgeNoteId: "pn_bridge_1"
  });

  assert.equal(nextAction.action, "tension");
  assert.equal(nextAction.noteId, "pn_tension_1");
});

test("graph next action offers bridge followup when bridge gaps exist without tensions", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    bridgeNoteId: "pn_bridge_1",
    bridgeTargetNoteId: "pn_bridge_target_1"
  });

  assert.equal(nextAction.action, "bridge");
  assert.equal(nextAction.noteId, "pn_bridge_1");
  assert.equal(nextAction.targetNoteId, "pn_bridge_target_1");
  assert.equal(nextAction.relationType, "bridges");
});

test("graph next action keeps sparse multi-note slices in relation-building mode", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    firstNodeId: "pn_sparse_1",
    visibleNodeCount: 3,
    visibleEdgeCount: 1
  });

  assert.equal(nextAction.action, "relations");
  assert.equal(nextAction.noteId, "pn_sparse_1");
  assert.equal(nextAction.actionLabel, "先补关键关系");
  assert.match(nextAction.note, /显式关系/);
  assert.match(nextAction.note, /写作中心/);
});

test("graph next action prefers isolated-note followup before entering the writing center", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    isolatedNoteId: "pn_isolated_1",
    isolatedCount: 2
  });

  assert.equal(nextAction.action, "relations");
  assert.equal(nextAction.noteId, "pn_isolated_1");
  assert.equal(nextAction.actionLabel, "先补孤立观点");
  assert.match(nextAction.note, /2/);
  assert.match(nextAction.note, /孤立|关系网络/);
});

test("graph next action points to writing center once structure is already clear", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.actionLabel, "进入写作中心");
  assert.match(nextAction.note, /写作中心|主题|项目/);
  assert.match(nextAction.note, /带进写作中心/);
});

test("graph writing followup preloads current scope notes when basket is empty and scope is small", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: [],
    candidateNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, ["n1", "n2"]);
  assert.match(plan.statusMessage, /带入当前可见图谱里的 2 条永久笔记/);
});

test("graph writing followup appends newly visible notes into an existing basket", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: ["n1"],
    candidateNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, ["n2"]);
  assert.match(plan.statusMessage, /1 条永久笔记加入写作篮/);
});

test("graph writing followup avoids auto-prefill when current scope is too large", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: [],
    candidateNoteIds: ["n1", "n2", "n3", "n4", "n5", "n6"]
  });

  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /当前可见图谱里有 6 条可用永久笔记/);
  assert.match(plan.statusMessage, /2-5 条加入写作篮/);
});

test("graph writing followup keeps current basket untouched when the whole visible slice is already present", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: ["n1", "n2"],
    candidateNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /已经都在写作篮中|继续推进/);
});

test("graph writing candidate note ids keep only visible eligible notes in visible order", () => {
  const notesById = new Map([
    ["n-visible-1", { id: "n-visible-1", ok: true }],
    ["n-visible-2", { id: "n-visible-2", ok: false }],
    ["n-visible-3", { id: "n-visible-3", ok: true }]
  ]);

  const ids = graphWritingCandidateNoteIds(["n-visible-1", "n-visible-2", "n-visible-1", "n-visible-3"], {
    noteLookup: (id) => notesById.get(id) || null,
    isEligible: (note) => note.ok
  });

  assert.deepEqual(ids, ["n-visible-1", "n-visible-3"]);
});

test("graph isolated node ids ignore hidden nodes when the current graph view is filtered", () => {
  const isolatedIds = graphIsolatedNodeIds(
    [
      { id: "n1" },
      { id: "n2" },
      { id: "n3" }
    ],
    [
      { fromNoteId: "n1", toNoteId: "n2" }
    ],
    { filterActive: true }
  );

  assert.deepEqual(isolatedIds, []);
});

test("graph isolated node ids still report true isolates in the full unfiltered view", () => {
  const isolatedIds = graphIsolatedNodeIds(
    [
      { id: "n1" },
      { id: "n2" },
      { id: "n3" }
    ],
    [
      { fromNoteId: "n1", toNoteId: "n2" }
    ],
    { filterActive: false }
  );

  assert.deepEqual(isolatedIds, ["n3"]);
});
