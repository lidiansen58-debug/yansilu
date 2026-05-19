import test from "node:test";
import assert from "node:assert/strict";

import {
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
