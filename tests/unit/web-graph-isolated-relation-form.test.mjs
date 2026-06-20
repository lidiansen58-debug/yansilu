import assert from "node:assert/strict";
import test from "node:test";

import {
  graphIsolatedJoinNetworkFormModel
} from "../../apps/web/src/graph-isolated-relation-form.js";

const workflowTabKey = (value = "") => {
  const key = String(value || "").trim().toLowerCase();
  return ["ai", "manual"].includes(key) ? key : "ai";
};

const nodeTitle = (nodeMap, noteId, fallback = "") => nodeMap.get(noteId)?.title || fallback;

test("isolated relation form model defaults to the first AI candidate", () => {
  const model = graphIsolatedJoinNetworkFormModel(
    "source",
    {
      nodeMap: new Map([["source", { id: "source", title: "Source" }]]),
      aiCandidates: [{
        counterpartNoteId: "target",
        relationType: "supports",
        actionSourceNoteId: "source",
        rationaleDraft: "Because target supports source.",
        insightQuestionDraft: "What changes?"
      }]
    },
    {
      workflowTabKey,
      activeTabForNote: () => "ai",
      reversibleRelationTypes: new Set(["bridges", "same_topic", "associated_with"]),
      nodeTitle
    }
  );

  assert.equal(model.activeMode, "ai");
  assert.equal(model.activeAiTargetNoteId, "target");
  assert.equal(model.defaultRelationType, "supports");
  assert.equal(model.defaultRationale, "Because target supports source.");
  assert.equal(model.defaultRationaleSource, "ai");
  assert.equal(model.previewTargetNoteId, "target");
});

test("isolated relation form model switches to manual mode for preferred target", () => {
  const model = graphIsolatedJoinNetworkFormModel(
    "source",
    {
      nodeMap: new Map([
        ["source", { id: "source", title: "Source" }],
        ["manual", { id: "manual", title: "Manual target" }]
      ]),
      preferredTargetNoteId: "manual",
      manualTargets: [{ id: "manual", title: "Manual target" }]
    },
    { workflowTabKey, activeTabForNote: () => "ai", nodeTitle }
  );

  assert.equal(model.activeMode, "manual");
  assert.equal(model.selectedManualTargetNoteId, "manual");
  assert.equal(model.manualSearchText, "Manual target");
  assert.equal(model.defaultRelationType, "associated_with");
  assert.match(model.defaultRationale, /Manual target/);
  assert.equal(model.defaultRationaleSource, "manual");
});

test("isolated relation form model keeps AI and manual drafts separate", () => {
  const model = graphIsolatedJoinNetworkFormModel(
    "source",
    {
      relationDraft: {
        mode: "manual",
        targetNoteId: "manual",
        aiTargetNoteId: "ai",
        aiRelationType: "supports",
        aiRationale: "AI rationale should not leak.",
        manualTargetNoteId: "manual",
        manualRelationType: "bridges",
        manualRationale: "",
        manualRationaleSource: "user",
        manualInsightQuestion: "Manual question"
      },
      manualTargets: [{ id: "manual", title: "Manual target" }]
    },
    { workflowTabKey, activeTabForNote: () => "manual", nodeTitle }
  );

  assert.equal(model.activeMode, "manual");
  assert.equal(model.defaultRelationType, "bridges");
  assert.equal(model.defaultRationale, "");
  assert.equal(model.defaultRationaleSource, "user");
  assert.equal(model.hasActiveInsightQuestionDraft, true);
  assert.equal(model.draftInsightQuestion, "Manual question");
});

test("isolated relation form model downgrades directed AI candidates when current note is not the action source", () => {
  const model = graphIsolatedJoinNetworkFormModel(
    "current",
    {
      aiCandidates: [{
        counterpartNoteId: "other",
        relationType: "supports",
        actionSourceNoteId: "other",
        rationaleDraft: "This directed reason is unsafe from current."
      }]
    },
    {
      workflowTabKey,
      activeTabForNote: () => "ai",
      reversibleRelationTypes: new Set(["bridges", "same_topic", "associated_with"]),
      nodeTitle
    }
  );

  assert.equal(model.defaultRelationType, "associated_with");
  assert.equal(model.defaultRationale, "");
  assert.equal(model.defaultRationaleSource, "");
});
