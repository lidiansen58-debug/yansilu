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
  assert.equal(graphFollowupActionForRelationType("contrasts"), "tension");
});

test("graph followup action maps qualifies relations to boundary followup", () => {
  assert.equal(graphFollowupActionForRelationType("qualifies"), "boundary");
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

test("graph next action routes qualifies relations to boundary followup before bridge followup", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    conflictFromNoteId: "pn_boundary_1",
    conflictRelationType: "qualifies",
    bridgeNoteId: "pn_bridge_1"
  });

  assert.equal(nextAction.action, "boundary");
  assert.equal(nextAction.noteId, "pn_boundary_1");
  assert.equal(nextAction.actionLabel, "去补边界");
  assert.match(nextAction.note, /适用条件|不成立/);
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

test("graph next action prefers strengthening thin rationale before entering the writing center", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    thinRationaleFromNoteId: "pn_basic_1",
    thinRationaleCount: 2
  });

  assert.equal(nextAction.action, "relations");
  assert.equal(nextAction.noteId, "pn_basic_1");
  assert.equal(nextAction.actionLabel, "先补关系理由");
  assert.match(nextAction.note, /2/);
  assert.match(nextAction.note, /显式关系/);
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

test("graph next action keeps no-candidate slices in graph cleanup mode before writing", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    firstNodeId: "pn_graph_1",
    writingEntryPlan: {
      mode: "no-candidates",
      candidateCount: 0,
      addedCount: 0,
      hasBasket: false
    }
  });

  assert.equal(nextAction.action, "relations");
  assert.equal(nextAction.noteId, "pn_graph_1");
  assert.equal(nextAction.actionLabel, "先补关系/边界");
  assert.match(nextAction.note, /还没有可直接推进写作的永久笔记/);
  assert.match(nextAction.note, /关系、边界|原创性检查/);
});

test("graph next action reuses continuity wording when the current slice already maps to an existing draft", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingContinuation: {
      projectId: "wp_existing",
      status: "打开当前草稿",
      hint: "当前图谱切片已经对应项目 wp_existing，而且当前草稿也已存在。直接打开当前草稿继续写，会比重新进入写作中心更连续。",
      actionLabel: "打开当前草稿"
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：打开当前草稿");
  assert.equal(nextAction.actionLabel, "打开当前草稿");
  assert.match(nextAction.note, /wp_existing|当前草稿/);
});

test("graph writing followup preloads current scope notes when basket is empty and scope is small", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: [],
    candidateNoteIds: ["n1", "n2"],
    scopeNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, ["n1", "n2"]);
  assert.match(plan.statusMessage, /2 条永久笔记带入写作篮/);
  assert.doesNotMatch(plan.statusMessage, /已从图谱进入写作中心/);
});

test("graph writing followup appends newly visible notes into an existing basket", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: ["n1"],
    candidateNoteIds: ["n1", "n2"],
    scopeNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, ["n2"]);
  assert.match(plan.statusMessage, /1 条永久笔记加入写作篮/);
  assert.match(plan.statusMessage, /继续当前写作篮推进/);
  assert.doesNotMatch(plan.statusMessage, /已从图谱进入写作中心/);
});

test("graph writing followup avoids auto-prefill when current scope is too large", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: [],
    candidateNoteIds: ["n1", "n2", "n3", "n4", "n5", "n6"],
    scopeNoteIds: ["n1", "n2", "n3", "n4", "n5", "n6"]
  });

  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /当前可见图谱里有 6 条可用永久笔记/);
  assert.match(plan.statusMessage, /2-5 条加入写作篮/);
  assert.doesNotMatch(plan.statusMessage, /已从图谱进入写作中心/);
});

test("graph writing followup keeps current basket untouched when the whole visible slice is already present", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: ["n1", "n2"],
    candidateNoteIds: ["n1", "n2"],
    scopeNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /已经都在写作篮中/);
  assert.match(plan.statusMessage, /继续当前写作篮推进/);
  assert.doesNotMatch(plan.statusMessage, /已打开写作中心/);
});

test("graph writing followup stays inside the current graph slice when no note is ready for writing", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: [],
    candidateNoteIds: [],
    scopeNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /当前图谱切片里还没有可直接推进写作的永久笔记/);
  assert.doesNotMatch(plan.statusMessage, /已从图谱进入写作中心/);
  assert.doesNotMatch(plan.statusMessage, /挑选可推进的永久笔记/);
});

test("graph writing followup keeps no-candidate no-basket feedback in graph cleanup mode", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: [],
    candidateNoteIds: [],
    scopeNoteIds: []
  });

  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /还没有可直接推进写作的永久笔记/);
  assert.match(plan.statusMessage, /先补关系、边界或完成原创性检查/);
  assert.doesNotMatch(plan.statusMessage, /已从图谱进入写作中心/);
  assert.doesNotMatch(plan.statusMessage, /挑选可推进的永久笔记/);
});

test("graph writing followup keeps basket-first wording when no new visible note is ready", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: ["n1"],
    candidateNoteIds: [],
    scopeNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /还没有适合新增到写作篮的永久笔记/);
  assert.match(plan.statusMessage, /继续当前写作篮/);
  assert.match(plan.statusMessage, /回到图谱补关系\/边界/);
  assert.doesNotMatch(plan.statusMessage, /已从图谱进入写作中心/);
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
    [{ id: "n1" }, { id: "n2" }, { id: "n3" }],
    [{ fromNoteId: "n1", toNoteId: "n2" }],
    { filterActive: true }
  );

  assert.deepEqual(isolatedIds, []);
});

test("graph isolated node ids still report true isolates in the full unfiltered view", () => {
  const isolatedIds = graphIsolatedNodeIds(
    [{ id: "n1" }, { id: "n2" }, { id: "n3" }],
    [{ fromNoteId: "n1", toNoteId: "n2" }],
    { filterActive: false }
  );

  assert.deepEqual(isolatedIds, ["n3"]);
});

test("graph next action prefers isolated-note followup over generic sparse guidance", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    firstNodeId: "pn_sparse_1",
    visibleNodeCount: 3,
    visibleEdgeCount: 1,
    isolatedNoteId: "pn_isolated_1",
    isolatedCount: 1
  });

  assert.equal(nextAction.action, "relations");
  assert.equal(nextAction.noteId, "pn_isolated_1");
  assert.equal(nextAction.actionLabel, "先补孤立观点");
  assert.match(nextAction.note, /关系网络|写作中心/);
});

test("graph next action prefers rationale followup over generic sparse guidance", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    firstNodeId: "pn_sparse_1",
    visibleNodeCount: 3,
    visibleEdgeCount: 1,
    thinRationaleFromNoteId: "pn_basic_1",
    thinRationaleCount: 1
  });

  assert.equal(nextAction.action, "relations");
  assert.equal(nextAction.noteId, "pn_basic_1");
  assert.equal(nextAction.actionLabel, "先补关系理由");
  assert.match(nextAction.note, /理由|写作中心/);
});
