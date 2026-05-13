import test from "node:test";
import assert from "node:assert/strict";

import {
  createAiInbox,
  createInMemoryArtifactStore
} from "../../packages/ai-orchestrator/src/index.mjs";

function createArtifact(store, input = {}) {
  return store.createArtifact({
    id: input.id,
    type: input.type || "ReflectionPrompt",
    title: input.title || input.id,
    summary: input.summary || "",
    agentRunId: input.agentRunId || "run_inbox_eval",
    sources: input.sources || { noteIds: ["note_eval"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
    privacy: input.privacy || { mode: "normal", cloudModelUsed: false },
    status: input.status || "pending_review",
    createdAt: input.createdAt || "2026-05-13T01:00:00.000Z",
    updatedAt: input.updatedAt || "2026-05-13T01:00:00.000Z",
    payload: input.payload || {}
  });
}

test("AI inbox evaluation summary aggregates decisions and feedback flags", () => {
  const artifactStore = createInMemoryArtifactStore();
  createArtifact(artifactStore, { id: "artifact_useful", type: "ReflectionPrompt" });
  createArtifact(artifactStore, { id: "artifact_noisy", type: "QuestionCard" });
  createArtifact(artifactStore, { id: "artifact_pending", type: "LinkSuggestion" });

  artifactStore.recordDecision("artifact_useful", {
    decision: "accepted",
    feedback: { useful: true },
    createdAt: "2026-05-13T01:05:00.000Z"
  });
  artifactStore.recordDecision("artifact_noisy", {
    decision: "ignored",
    feedback: { noisy: true, wrong: true, already_known: true },
    createdAt: "2026-05-13T01:10:00.000Z"
  });

  const inbox = createAiInbox({ artifactStore });
  const summary = inbox.evaluationSummary({ view: "all", sourceNoteId: "note_eval" });

  assert.equal(summary.filter.view, "all");
  assert.equal(summary.artifacts.total, 3);
  assert.equal(summary.artifacts.pending, 1);
  assert.equal(summary.artifacts.reviewed, 2);
  assert.equal(summary.artifacts.withDecision, 2);
  assert.equal(summary.artifacts.withoutDecision, 1);
  assert.equal(summary.typeCounts.ReflectionPrompt, 1);
  assert.equal(summary.typeCounts.QuestionCard, 1);
  assert.equal(summary.typeCounts.LinkSuggestion, 1);
  assert.equal(summary.agentRunCounts.run_inbox_eval, 3);
  assert.equal(summary.decisions.total, 2);
  assert.equal(summary.decisions.latest.accepted, 1);
  assert.equal(summary.decisions.latest.ignored, 1);
  assert.equal(summary.feedback.decisionsWithFeedback, 2);
  assert.equal(summary.feedback.all.useful, 1);
  assert.equal(summary.feedback.all.noisy, 1);
  assert.equal(summary.feedback.all.wrong, 1);
  assert.equal(summary.feedback.all.alreadyKnown, 1);
  assert.equal(summary.feedback.latest.useful, 1);
  assert.equal(summary.quality.overall.total, 3);
  assert.equal(summary.quality.overall.reviewed, 2);
  assert.equal(summary.quality.overall.accepted, 1);
  assert.equal(summary.quality.overall.reviewRate, 0.6667);
  assert.equal(summary.quality.overall.acceptanceRate, 0.5);
  assert.equal(summary.quality.overall.noisyRate, 0.5);
  assert.equal(summary.quality.byType.ReflectionPrompt.acceptanceRate, 1);
  assert.equal(summary.quality.byType.QuestionCard.noisyRate, 1);
  assert.equal(summary.quality.byType.LinkSuggestion.reviewRate, 0);
  assert.equal(summary.quality.byAgentRun.run_inbox_eval.total, 3);
  assert.equal(summary.quality.byModelTier.unknown.total, 3);
});

test("AI inbox evaluation summary honors view and type filters", () => {
  const artifactStore = createInMemoryArtifactStore();
  createArtifact(artifactStore, { id: "artifact_reflection", type: "ReflectionPrompt" });
  createArtifact(artifactStore, { id: "artifact_question", type: "QuestionCard" });
  artifactStore.recordDecision("artifact_reflection", { decision: "accepted", useful: true });
  artifactStore.recordDecision("artifact_question", { decision: "archived", privacyConcern: true });

  const inbox = createAiInbox({ artifactStore });
  const reviewed = inbox.evaluationSummary({ view: "reviewed" });
  const archived = inbox.evaluationSummary({ view: "archived" });
  const reflection = inbox.evaluationSummary({ view: "all", type: "ReflectionPrompt" });

  assert.equal(reviewed.artifacts.total, 1);
  assert.equal(reviewed.decisions.latest.accepted, 1);
  assert.equal(archived.artifacts.total, 1);
  assert.equal(archived.decisions.latest.archived, 1);
  assert.equal(archived.feedback.latest.privacyConcern, 1);
  assert.equal(reflection.artifacts.total, 1);
  assert.equal(reflection.typeCounts.ReflectionPrompt, 1);
});

test("AI inbox treats type=all as unfiltered for direct API callers", () => {
  const artifactStore = createInMemoryArtifactStore();
  createArtifact(artifactStore, { id: "artifact_reflection", type: "ReflectionPrompt" });
  createArtifact(artifactStore, { id: "artifact_question", type: "QuestionCard" });

  const inbox = createAiInbox({ artifactStore });

  assert.equal(inbox.listItems({ view: "pending", type: "all" }).length, 2);
  assert.equal(inbox.counts({ type: "all" }).pending, 2);
  assert.equal(inbox.evaluationSummary({ view: "all", type: "all" }).artifacts.total, 2);
});
