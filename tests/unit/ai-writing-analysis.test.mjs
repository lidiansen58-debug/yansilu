import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWritingStrongModelRequest,
  mergeWritingStrongModelResponse
} from "../../packages/ai-orchestrator/src/index.mjs";

test("writing strong-model request requires explicit user confirmation", () => {
  assert.throws(
    () =>
      buildWritingStrongModelRequest({
        writingGoal: "Draft a source-grounded essay",
        notes: [{ noteId: "pn_1", thesis: "AI output needs review." }]
      }),
    /requires explicit user confirmation/
  );
});

test("writing strong-model request is remote-confirmed and review-only", () => {
  const request = buildWritingStrongModelRequest(
    {
      userConfirmedRemoteModel: true,
      projectId: "wp_1",
      writingGoal: "Explain why permanent-note AI suggestions need review.",
      audience: "research notes users",
      notes: [
        {
          noteId: "pn_review",
          title: "AI suggestions need review",
          thesis: "AI suggestions must remain candidates until the user accepts them.",
          body: "The system should expose source note ids and avoid writing final prose."
        }
      ],
      model: "gpt-strong"
    },
    { now: "2026-05-15T12:00:00.000Z" }
  );

  assert.equal(request.requestType, "writing_strong_model_analysis");
  assert.equal(request.privacy.mode, "remote_after_confirmation");
  assert.equal(request.privacy.cloudModelAllowed, true);
  assert.equal(request.privacy.cloudModelUsed, false);
  assert.equal(request.privacy.userConfirmed, true);
  assert.equal(request.canAutoConfirm, false);
  assert.equal(request.model.model, "gpt-strong");
  assert.deepEqual(Object.keys(request.responseContract), ["writingMoves", "outlineDrafts", "sourceGaps"]);
  const payload = JSON.parse(request.messages[1].content);
  assert.equal(payload.privacyMode, "remote_after_user_confirmation");
  assert.equal(payload.project.projectId, "wp_1");
  assert.equal(payload.notes[0].noteId, "pn_review");
  assert.match(payload.instructions.join("\n"), /Do not write final prose/);
});

test("writing analysis request allows local-only execution without remote confirmation", () => {
  const request = buildWritingStrongModelRequest({
    privacyMode: "local_only",
    writingGoal: "提炼当前材料",
    notes: [{ noteId: "fn_local", body: "本地材料只应发送给本机模型。" }],
    model: "qwen-local"
  });

  assert.equal(request.privacy.mode, "local_only");
  assert.equal(request.privacy.cloudModelAllowed, false);
  assert.equal(request.privacy.userConfirmed, false);
  const payload = JSON.parse(request.messages[1].content);
  assert.equal(payload.privacyMode, "local_only");
});

test("writing strong-model response becomes pending review artifacts only", () => {
  const request = buildWritingStrongModelRequest({
    userConfirmedRemoteModel: true,
    writingGoal: "Prepare a review-first essay outline.",
    notes: [{ noteId: "pn_review", thesis: "AI suggestions need review." }]
  });
  const result = mergeWritingStrongModelResponse(
    request,
    {
      content: `{
        "writingMoves": [
          {
            "moveType": "claim",
            "text": "Open by separating AI discovery from user judgment.",
            "sourceNoteIds": ["pn_review"],
            "suggestedLocation": "introduction",
            "whyItMatters": "It frames the authorship boundary."
          }
        ],
        "outlineDrafts": [
          {
            "title": "Review-first AI outline",
            "sections": ["Problem", "Boundary", "Workflow"],
            "sourceNoteIds": ["pn_review"],
            "gaps": ["Need a concrete example."]
          }
        ],
        "sourceGaps": [
          {
            "gap": "example_missing",
            "claim": "Review queues reduce accidental adoption.",
            "requiredSourceType": "note",
            "relatedNoteIds": ["pn_review"],
            "suggestedAction": "find_supporting_note"
          }
        ]
      }`
    },
    {
      agentRunId: "run_writing_response",
      artifactIdSalt: "writing_test",
      now: "2026-05-15T12:05:00.000Z"
    }
  );

  assert.equal(result.analysisMode, "remote_strong_model_writing");
  assert.equal(result.provenance.modelUsed, true);
  assert.equal(result.provenance.cloudModelUsed, true);
  assert.equal(result.provenance.canAutoConfirm, false);
  assert.equal(result.summary.canAutoConfirm, false);
  assert.equal(result.summary.artifactCount, 3);
  assert.deepEqual(result.artifacts.map((item) => item.type), ["WritingMove", "OutlineDraft", "SourceGap"]);
  assert.ok(result.artifacts.every((item) => item.status === "pending_review"));
  assert.ok(result.artifacts.every((item) => item.origin === "ai_generated"));
  assert.ok(result.artifacts.every((item) => item.privacy.cloudModelUsed === true));
  assert.equal(result.artifacts[0].payload.sourceNoteIds[0], "pn_review");
});

test("local-only writing response keeps local provenance", () => {
  const request = buildWritingStrongModelRequest({
    privacyMode: "local_only",
    writingGoal: "提炼当前材料",
    notes: [{ noteId: "fn_local", body: "本地材料。" }]
  });
  const result = mergeWritingStrongModelResponse(
    request,
    {
      content: `{"writingMoves":[{"moveType":"claim","text":"本地模型提出一个判断。","sourceNoteIds":["fn_local"]}]}`
    },
    { privacyMode: "local_only", artifactIdSalt: "local_writing" }
  );

  assert.equal(result.analysisMode, "local_model_writing");
  assert.equal(result.provenance.cloudModelUsed, false);
  assert.equal(result.provenance.userConfirmedRemoteModel, false);
  assert.ok(result.artifacts.every((item) => item.privacy.cloudModelUsed === false));
});
