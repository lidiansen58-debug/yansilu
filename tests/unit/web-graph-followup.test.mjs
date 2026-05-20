import test from "node:test";
import assert from "node:assert/strict";

import { graphFollowupActionForRelationType, graphNextActionForSummary, graphPathFollowupContext } from "../../apps/web/src/graph-followup.js";

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

test("graph path followup preserves relation-edit context for ordinary existing relations", () => {
  const followup = graphPathFollowupContext({
    id: "lnk_1",
    fromNoteId: "pn_from",
    toNoteId: "pn_to",
    relationType: "supports"
  });

  assert.equal(followup.action, "relations-edit");
  assert.equal(followup.noteId, "pn_from");
  assert.equal(followup.relationId, "lnk_1");
  assert.equal(followup.targetNoteId, "pn_to");
});

test("graph path followup preserves bridge context for bridge-like relations", () => {
  const followup = graphPathFollowupContext({
    id: "lnk_bridge",
    fromNoteId: "pn_bridge_from",
    toNoteId: "pn_bridge_to",
    relationType: "unexpected_connection"
  });

  assert.equal(followup.action, "bridge");
  assert.equal(followup.noteId, "pn_bridge_from");
  assert.equal(followup.targetNoteId, "pn_bridge_to");
  assert.equal(followup.relationType, "unexpected_connection");
});
