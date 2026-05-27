import test from "node:test";
import assert from "node:assert/strict";

import {
  aiInboxItemToCanonical,
  artifactDecisionToCanonicalAdoptionEvent,
  artifactToCanonical,
  normalizeArtifact,
  normalizeScheduledAgentTask,
  normalizeSuggestion,
  scheduledTaskToCanonical,
  suggestionToCanonical,
  suggestionTransitionToCanonicalAdoptionEvent,
  toAiInboxItem,
  transitionSuggestionStatus
} from "../../packages/ai-orchestrator/src/index.mjs";

test("canonical artifact adapter converts runtime camelCase into shared snake_case payload", () => {
  const artifact = normalizeArtifact(
    {
      id: "artifact_bridge_1",
      type: "BridgeCard",
      title: "Bridge claim",
      summary: "Two notes can be bridged.",
      body: { thesis: "Bridge concept" },
      agentRunId: "run_bridge_1",
      contextPackId: "ctx_bridge_1",
      sources: {
        noteIds: ["pn_1"],
        sourceDocIds: ["src_1"],
        artifactIds: ["artifact_prev"],
        externalUrls: ["https://example.test/bridge"]
      },
      provenance: {
        contentOrigin: "ai_generated",
        citationRequired: true,
        humanAccepted: true,
        humanRewritten: false
      },
      confidence: {
        score: 0.88,
        label: "high",
        reason: "Strong overlap"
      },
      privacy: {
        mode: "normal",
        cloudModelUsed: true
      },
      payload: {
        fieldSuggestionId: "suggestion_bridge_1"
      },
      userDecisions: [
        {
          decisionId: "decision_bridge_1",
          artifactId: "artifact_bridge_1",
          decision: "accepted",
          userId: "user_1",
          noteId: "pn_1",
          comment: "use this",
          feedback: { useful: true, privacyConcern: false },
          createdAt: "2026-05-18T12:05:00.000Z"
        }
      ]
    },
    { now: "2026-05-18T12:00:00.000Z" }
  );

  const canonical = artifactToCanonical(artifact);

  assert.equal(canonical.agent_run_id, "run_bridge_1");
  assert.equal(canonical.context_pack_id, "ctx_bridge_1");
  assert.deepEqual(canonical.sources.note_ids, ["pn_1"]);
  assert.deepEqual(canonical.sources.source_doc_ids, ["src_1"]);
  assert.equal(canonical.provenance.citation_required, true);
  assert.equal(canonical.privacy.cloud_model_used, true);
  assert.equal(canonical.field_suggestion_id, "suggestion_bridge_1");
  assert.equal(canonical.user_decisions[0].decision_id, "decision_bridge_1");
  assert.equal(canonical.user_decisions[0].feedback.useful, true);
  assert.equal(canonical.user_decisions[0].feedback.privacy_concern, false);
}
);

test("canonical inbox adapter projects artifact review fields into stable payload", () => {
  const artifact = normalizeArtifact(
    {
      id: "artifact_question_1",
      type: "QuestionCard",
      title: "Question title",
      summary: "Question summary",
      agentRunId: "run_question_1",
      sources: { noteIds: ["pn_2"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
      userDecisions: [
        {
          decisionId: "decision_question_1",
          artifactId: "artifact_question_1",
          decision: "ignored",
          userId: "user_1",
          noteId: "",
          comment: "not useful",
          feedback: { noisy: true },
          createdAt: "2026-05-18T12:07:00.000Z"
        }
      ],
      payload: {
        fieldSuggestionId: "suggestion_question_1"
      },
      status: "ignored"
    },
    { now: "2026-05-18T12:00:00.000Z" }
  );

  const runtimeItem = toAiInboxItem(artifact);
  const canonical = aiInboxItemToCanonical(runtimeItem);

  assert.equal(canonical.artifact_id, "artifact_question_1");
  assert.equal(canonical.action_state, "reviewed");
  assert.equal(canonical.primary_source_note_id, "pn_2");
  assert.equal(canonical.suggestion_id, "suggestion_question_1");
  assert.equal(canonical.latest_decision.decision, "ignored");
  assert.equal(canonical.latest_decision.feedback.noisy, true);
}
);

test("canonical suggestion and adoption-event adapters preserve user-mediated review flow", () => {
  const suggested = normalizeSuggestion(
    {
      id: "suggestion_1",
      target: { type: "permanent_note", id: "pn_3", field: "thesis" },
      scope: "note_field",
      content: "Clear claims survive review.",
      sourceArtifactId: "artifact_field_1"
    },
    { now: "2026-05-18T12:00:00.000Z" }
  );
  const confirmed = transitionSuggestionStatus(
    transitionSuggestionStatus(
      transitionSuggestionStatus(suggested, "adopted_as_draft", {
        action: "adopt_as_draft",
        actor: "user",
        userId: "user_1",
        createdAt: "2026-05-18T12:02:00.000Z"
      }),
      "edited",
      {
        action: "edit",
        actor: "user",
        userId: "user_1",
        content: "Clear claims survive review and rewriting.",
        createdAt: "2026-05-18T12:04:00.000Z"
      }
    ),
    "confirmed",
    {
      action: "confirm",
      actor: "user",
      userId: "user_1",
      createdAt: "2026-05-18T12:05:00.000Z"
    }
  );

  const canonicalSuggestion = suggestionToCanonical(confirmed);
  const canonicalEvent = suggestionTransitionToCanonicalAdoptionEvent(confirmed.history[2], confirmed);

  assert.equal(canonicalSuggestion.provenance.human_confirmed, true);
  assert.equal(canonicalSuggestion.provenance.human_edited, true);
  assert.equal(canonicalSuggestion.source_artifact_id, "artifact_field_1");
  assert.equal(canonicalSuggestion.history[2].to_status, "confirmed");
  assert.equal(canonicalEvent.subject_kind, "suggestion");
  assert.equal(canonicalEvent.event_type, "confirmed");
  assert.equal(canonicalEvent.target.field, "thesis");
  assert.equal(canonicalEvent.metadata.from_status, "edited");
}
);

test("canonical scheduled-task and artifact-decision adapters stabilize persistence and analytics payloads", () => {
  const task = normalizeScheduledAgentTask(
    {
      scheduledTaskId: "sched_1",
      workspaceId: "workspace_1",
      userId: "user_1",
      name: "Reflection reminder",
      status: "active",
      taskType: "reflection_prompt",
      agentId: "reflection_agent",
      schedule: { type: "interval", timezone: "local", intervalMinutes: 30 },
      scope: { noteIds: ["pn_4"], keywords: ["reflection"] },
      model: { userMode: "Balanced", maxTier: "standard", allowStrongReasoning: false },
      budget: { maxRunsPerPeriod: 2, maxEstimatedCostPerRun: 0.35, spentThisPeriod: 0.1, runsThisPeriod: 1 },
      privacy: { mode: "normal", allowCloudModels: true, requireConfirmationForPrivateNotes: true },
      output: { destination: "ai_inbox", artifactTypes: ["ReflectionPrompt"], notifyUser: "digest" },
      lastRunAt: "2026-05-18T12:30:00.000Z",
      lastRunStatus: "succeeded",
      lastRunReason: "",
      lastAgentRunId: "run_sched_1",
      nextRunAt: "2026-05-18T13:00:00.000Z"
    },
    {}
  );

  const canonicalTask = scheduledTaskToCanonical(task);
  const adoptionEvent = artifactDecisionToCanonicalAdoptionEvent(
    {
      decisionId: "decision_link_1",
      artifactId: "artifact_link_1",
      decision: "linked_to_note",
      userId: "user_1",
      noteId: "pn_5",
      comment: "good link",
      feedback: { useful: true },
      createdAt: "2026-05-18T13:05:00.000Z"
    },
    { id: "artifact_link_1", status: "linked_to_note" },
    {
      target: {
        kind: "relation",
        id: "rel_1"
      },
      metadata: {
        fromStatus: "pending_review",
        noteId: "pn_5"
      }
    }
  );

  assert.equal(canonicalTask.scheduled_task_id, "sched_1");
  assert.equal(canonicalTask.schedule.interval_minutes, 30);
  assert.deepEqual(canonicalTask.scope.note_ids, ["pn_4"]);
  assert.equal(canonicalTask.model.user_mode, "Balanced");
  assert.equal(canonicalTask.output.artifact_types[0], "ReflectionPrompt");
  assert.equal(canonicalTask.output.destination, "ai_inbox");
  assert.equal(adoptionEvent.subject_kind, "artifact");
  assert.equal(adoptionEvent.event_type, "linked_to_note");
  assert.equal(adoptionEvent.metadata.from_status, "pending_review");
  assert.equal(adoptionEvent.target.kind, "relation");
  assert.equal(adoptionEvent.target.id, "rel_1");
  assert.equal(adoptionEvent.feedback.useful, true);
}
);
