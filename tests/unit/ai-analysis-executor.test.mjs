import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPermanentNoteLocalModelRequest,
  buildWritingStrongModelRequest,
  createMockProviderAdapter,
  runPermanentNoteLocalModelAnalysis,
  runWritingStrongModelAnalysis
} from "../../packages/ai-orchestrator/src/index.mjs";

test("permanent note local model executor blocks non-local adapters for local-only requests", async () => {
  const request = buildPermanentNoteLocalModelRequest({
    noteId: "pn_local_executor",
    title: "Local executor",
    body: "Local model execution must stay local."
  });
  const cloudAdapter = createMockProviderAdapter({ localExecution: false });

  await assert.rejects(
    () => runPermanentNoteLocalModelAnalysis(request, cloudAdapter),
    /local_only context cannot be sent to a cloud provider/
  );
});

test("permanent note local model executor runs local adapter and returns review items", async () => {
  const request = buildPermanentNoteLocalModelRequest({
    noteId: "pn_local_executor",
    title: "Local executor",
    body: "Local model execution should create reviewable relation and topic candidates.",
    relatedNotes: [{ noteId: "pn_related_executor", title: "Reviewable candidates", body: "Candidates remain reviewable." }]
  });
  const adapter = createMockProviderAdapter({
    localExecution: true,
    responses: [
      {
        status: "succeeded",
        providerId: "local_mock",
        modelRef: "local_mock:qwen",
        output: {
          type: "json",
          json: {
            distilledViewpoint: {
              thesis: "Local execution can propose reviewable note candidates.",
              threeLineSummary: ["Local execution proposes candidates.", "Review remains required.", "No note fields are confirmed."]
            },
            relationCandidates: [
              {
                toNoteId: "pn_related_executor",
                relationType: "supports",
                rationale: "Both notes describe reviewable candidates.",
                confidence: 0.7
              }
            ],
            topicCandidates: [{ title: "local execution", rationale: "The note discusses local execution." }]
          },
          content: "",
          toolCalls: []
        }
      }
    ]
  });

  const result = await runPermanentNoteLocalModelAnalysis(request, adapter, {
    agentRunId: "run_local_executor",
    artifactIdSalt: "local_executor"
  });

  assert.equal(adapter.callCount, 1);
  assert.equal(adapter.lastRequest.policy.privacyMode, "local_only");
  assert.equal(adapter.lastRequest.policy.allowCloud, false);
  assert.equal(adapter.lastRequest.settings.maxOutputTokens, 800);
  assert.equal(adapter.lastRequest.settings.timeoutMs, 60000);
  assert.equal(result.providerResponse.status, "succeeded");
  assert.equal(result.analysis.analysisMode, "local_model_assisted");
  assert.equal(result.reviewItems.summary.canAutoConfirm, false);
  assert.ok(result.reviewItems.artifacts.every((item) => item.status === "pending_review"));
});

test("writing strong model executor requires confirmed request and normalizes artifacts", async () => {
  const request = buildWritingStrongModelRequest({
    userConfirmedRemoteModel: true,
    writingGoal: "Prepare a source-grounded essay outline.",
    notes: [{ noteId: "pn_writing_executor", thesis: "Writing support must remain reviewable." }]
  });
  const adapter = createMockProviderAdapter({
    localExecution: false,
    responses: [
      {
        status: "succeeded",
        providerId: "remote_mock",
        modelRef: "remote_mock:strong",
        output: {
          type: "json",
          json: {
            writingMoves: [
              {
                moveType: "claim",
                text: "Start with the review boundary.",
                sourceNoteIds: ["pn_writing_executor"],
                suggestedLocation: "opening",
                whyItMatters: "It protects user authorship."
              }
            ],
            outlineDrafts: [
              {
                title: "Review boundary outline",
                sections: ["Boundary", "Workflow"],
                sourceNoteIds: ["pn_writing_executor"]
              }
            ],
            sourceGaps: []
          },
          content: "",
          toolCalls: []
        }
      }
    ]
  });

  const result = await runWritingStrongModelAnalysis(request, adapter, {
    agentRunId: "run_writing_executor",
    artifactIdSalt: "writing_executor"
  });

  assert.equal(adapter.callCount, 1);
  assert.equal(adapter.lastRequest.policy.privacyMode, "remote_after_confirmation");
  assert.equal(adapter.lastRequest.policy.allowCloud, true);
  assert.equal(adapter.lastRequest.settings.maxOutputTokens, undefined);
  assert.equal(adapter.lastRequest.settings.num_predict, undefined);
  assert.equal(result.providerResponse.status, "succeeded");
  assert.equal(result.analysisMode, "remote_strong_model_writing");
  assert.equal(result.summary.canAutoConfirm, false);
  assert.deepEqual(result.artifacts.map((item) => item.type), ["WritingMove", "OutlineDraft"]);
  assert.ok(result.artifacts.every((item) => item.status === "pending_review"));
});
