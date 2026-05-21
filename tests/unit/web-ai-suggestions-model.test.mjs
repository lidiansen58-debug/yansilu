import test from "node:test";
import assert from "node:assert/strict";

import {
  aiSuggestionDetailFromResponse,
  aiSuggestionActionSet,
  aiSuggestionFromCanonical
} from "../../apps/web/src/ai-suggestions-model.js";

test("AI suggestions model hydrates runtime suggestions from canonical payloads", () => {
  const suggestion = aiSuggestionFromCanonical({
    id: "suggestion_1",
    target: {
      type: "permanent_note",
      id: "pn_1",
      field: "thesis"
    },
    scope: "note_field",
    content: "A reviewable claim starts life as a draft.",
    status: "confirmed",
    origin: "ai_generated",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:05:00.000Z",
    model: { providerId: "openai" },
    source_artifact_id: "artifact_1",
    provenance: {
      content_origin: "ai_generated",
      human_confirmed: true,
      human_edited: true
    },
    history: [
      {
        from_status: "suggested",
        to_status: "adopted_as_draft",
        action: "adopt_as_draft",
        actor: "user",
        user_id: "user_1",
        comment: "keep as draft",
        created_at: "2026-05-18T12:02:00.000Z"
      }
    ]
  });

  assert.equal(suggestion.id, "suggestion_1");
  assert.equal(suggestion.target.type, "permanent_note");
  assert.equal(suggestion.target.field, "thesis");
  assert.equal(suggestion.status, "confirmed");
  assert.equal(suggestion.sourceArtifactId, "artifact_1");
  assert.equal(suggestion.provenance.humanConfirmed, true);
  assert.equal(suggestion.provenance.humanEdited, true);
  assert.equal(suggestion.history[0].toStatus, "adopted_as_draft");
  assert.equal(suggestion.history[0].userId, "user_1");
});

test("AI suggestions model only exposes confirm after the edited step", () => {
  assert.deepEqual(aiSuggestionActionSet({ status: "suggested" }), ["adopted_as_draft", "rejected"]);
  assert.deepEqual(aiSuggestionActionSet({ status: "adopted_as_draft" }), ["edited"]);
  assert.deepEqual(aiSuggestionActionSet({ status: "edited" }), ["confirmed"]);
});

test("AI suggestions model hydrates canonical suggestion detail with trace and review events", () => {
  const detail = aiSuggestionDetailFromResponse({
    canonical: {
      item: {
        id: "suggestion_1",
        target: {
          type: "permanent_note",
          id: "pn_1",
          field: "thesis"
        },
        scope: "note_field",
        content: { thesis: "A reviewable claim starts life as a draft." },
        status: "edited",
        origin: "ai_generated",
        source_artifact_id: "artifact_1",
        provenance: {
          content_origin: "ai_generated",
          human_confirmed: false,
          human_edited: true
        },
        history: []
      },
      trace: {
        suggestion_id: "suggestion_1",
        source_artifact_id: "artifact_1",
        primary_source_note_id: "pn_1",
        source_note_ids: ["pn_1"],
        target_note_id: "pn_1",
        target_field: "thesis",
        suggestion_status: "edited"
      },
      review_events: [
        {
          adoption_event_id: "evt_1",
          subject_kind: "suggestion",
          subject_id: "suggestion_1",
          event_type: "edited",
          actor_type: "user",
          actor_id: "user_1",
          target: {
            kind: "note_field",
            id: "pn_1",
            field: "thesis"
          },
          comment: "Tightened the wording.",
          feedback: {
            useful: true,
            privacy_concern: false
          },
          metadata: {
            from_status: "adopted_as_draft",
            to_status: "edited",
            note_id: "pn_1"
          },
          created_at: "2026-05-18T12:04:00.000Z"
        }
      ],
      latest_review_event: {
        adoption_event_id: "evt_1",
        subject_kind: "suggestion",
        subject_id: "suggestion_1",
        event_type: "edited",
        actor_type: "user",
        actor_id: "user_1",
        target: {
          kind: "note_field",
          id: "pn_1",
          field: "thesis"
        },
        comment: "Tightened the wording.",
        feedback: {
          useful: true
        },
        metadata: {
          from_status: "adopted_as_draft",
          to_status: "edited",
          note_id: "pn_1"
        },
        created_at: "2026-05-18T12:04:00.000Z"
      },
      artifact: {
        id: "artifact_1",
        type: "InsightCard",
        title: "Field suggestion artifact",
        summary: "Suggest a tighter thesis.",
        body: "",
        status: "adopted_as_draft",
        origin: "ai_generated",
        created_at: "2026-05-18T12:00:00.000Z",
        updated_at: "2026-05-18T12:04:00.000Z",
        agent_run_id: "run_1",
        context_pack_id: "ctx_1",
        sources: {
          note_ids: ["pn_1"],
          source_doc_ids: [],
          artifact_ids: [],
          external_urls: []
        },
        provenance: {
          content_origin: "ai_generated",
          citation_required: false,
          human_accepted: true,
          human_rewritten: true
        },
        confidence: {
          score: 0.85,
          label: "high",
          reason: "good fit"
        },
        privacy: {
          mode: "normal",
          cloud_model_used: false
        },
        user_decisions: [],
        payload: {
          fieldSuggestion: {
            status: "edited"
          }
        }
      }
    }
  });

  assert.equal(detail.item.id, "suggestion_1");
  assert.equal(detail.trace.targetNoteId, "pn_1");
  assert.equal(detail.reviewEvents[0].adoptionEventId, "evt_1");
  assert.equal(detail.reviewEvents[0].metadata.toStatus, "edited");
  assert.equal(detail.latestReviewEvent.eventType, "edited");
  assert.equal(detail.linkedArtifact.status, "adopted_as_draft");
});
