import test from "node:test";
import assert from "node:assert/strict";

import {
  allowedNextSuggestionStatuses,
  canTransitionSuggestionStatus,
  normalizeSuggestion,
  suggestionStatuses,
  transitionSuggestionStatus
} from "../../packages/ai-orchestrator/src/index.mjs";

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

function createSuggestion(input = {}) {
  return normalizeSuggestion(
    {
      id: "suggestion_thesis_1",
      target: { type: "note", id: "note_1", field: "thesis" },
      scope: "field",
      content: "Distilled notes become writing when claims are confirmed.",
      ...input
    },
    { now: "2026-05-13T02:00:00.000Z" }
  );
}

test("normalizeSuggestion creates a reviewable AI candidate with target, scope, content, and status", () => {
  const suggestion = createSuggestion();

  assert.equal(suggestion.id, "suggestion_thesis_1");
  assert.deepEqual(suggestion.target, { type: "note", id: "note_1", field: "thesis" });
  assert.equal(suggestion.scope, "field");
  assert.equal(suggestion.content, "Distilled notes become writing when claims are confirmed.");
  assert.equal(suggestion.status, "suggested");
  assert.equal(suggestion.origin, "ai_generated");
  assert.equal(suggestion.provenance.humanConfirmed, false);
  assert.ok(suggestionStatuses().includes("confirmed"));
});

test("normalizeSuggestion rejects candidates missing required review boundaries", () => {
  expectCode(
    () => createSuggestion({ target: { type: "note" } }),
    "AI_SUGGESTION_TARGET_REQUIRED"
  );
  expectCode(
    () => createSuggestion({ scope: "" }),
    "AI_SUGGESTION_SCOPE_REQUIRED"
  );
  expectCode(
    () => createSuggestion({ content: "" }),
    "AI_SUGGESTION_CONTENT_REQUIRED"
  );
  expectCode(
    () => createSuggestion({ status: "accepted" }),
    "AI_SUGGESTION_STATUS_INVALID"
  );
});

test("suggestion status machine allows user-mediated draft, edit, and confirm transitions", () => {
  const suggested = createSuggestion();

  assert.deepEqual(allowedNextSuggestionStatuses("suggested"), ["adopted_as_draft", "rejected"]);
  assert.equal(canTransitionSuggestionStatus("suggested", "adopted_as_draft"), true);

  const draft = transitionSuggestionStatus(suggested, "adopted_as_draft", {
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1",
    createdAt: "2026-05-13T02:05:00.000Z"
  });
  const edited = transitionSuggestionStatus(draft, "edited", {
    action: "edit",
    actor: "user",
    userId: "user_1",
    content: "Distilled notes become writing when the user confirms the claim.",
    createdAt: "2026-05-13T02:10:00.000Z"
  });
  const confirmed = transitionSuggestionStatus(edited, "confirmed", {
    action: "confirm",
    actor: "user",
    userId: "user_1",
    createdAt: "2026-05-13T02:15:00.000Z"
  });

  assert.equal(draft.status, "adopted_as_draft");
  assert.equal(edited.status, "edited");
  assert.equal(edited.content, "Distilled notes become writing when the user confirms the claim.");
  assert.equal(edited.provenance.humanEdited, true);
  assert.equal(confirmed.status, "confirmed");
  assert.equal(confirmed.provenance.humanConfirmed, true);
  assert.deepEqual(
    confirmed.history.map((item) => `${item.fromStatus}->${item.toStatus}`),
    ["suggested->adopted_as_draft", "adopted_as_draft->edited", "edited->confirmed"]
  );
});

test("suggestion status machine forbids direct AI suggestion confirmation", () => {
  const suggested = createSuggestion();

  assert.equal(canTransitionSuggestionStatus("suggested", "confirmed"), false);
  expectCode(
    () =>
      transitionSuggestionStatus(suggested, "confirmed", {
        action: "confirm",
        actor: "user",
        userId: "user_1"
      }),
    "AI_SUGGESTION_TRANSITION_INVALID"
  );
});

test("confirmed suggestions require explicit user confirmation", () => {
  const draft = transitionSuggestionStatus(createSuggestion(), "adopted_as_draft", {
    action: "adopt_as_draft",
    actor: "user",
    userId: "user_1"
  });
  const edited = transitionSuggestionStatus(draft, "edited", {
    action: "edit",
    actor: "user",
    userId: "user_1"
  });

  expectCode(
    () => transitionSuggestionStatus(edited, "confirmed", { action: "confirm", actor: "ai" }),
    "AI_SUGGESTION_CONFIRMATION_REQUIRED"
  );
  expectCode(
    () => transitionSuggestionStatus(edited, "confirmed", { action: "auto_confirm", actor: "system" }),
    "AI_SUGGESTION_CONFIRMATION_REQUIRED"
  );

  const confirmed = transitionSuggestionStatus(edited, "confirmed", {
    userConfirmed: true,
    userId: "user_1"
  });
  assert.equal(confirmed.status, "confirmed");
});

test("rejected and confirmed suggestions are terminal", () => {
  const rejected = transitionSuggestionStatus(createSuggestion(), "rejected", {
    action: "reject",
    actor: "user",
    userId: "user_1"
  });

  expectCode(
    () => transitionSuggestionStatus(rejected, "edited", { action: "edit", actor: "user", userId: "user_1" }),
    "AI_SUGGESTION_TRANSITION_INVALID"
  );

  const confirmed = transitionSuggestionStatus(
    transitionSuggestionStatus(
      transitionSuggestionStatus(createSuggestion({ id: "suggestion_thesis_2" }), "adopted_as_draft", {
        action: "adopt_as_draft",
        actor: "user",
        userId: "user_1"
      }),
      "edited",
      { action: "edit", actor: "user", userId: "user_1" }
    ),
    "confirmed",
    { action: "confirm", actor: "user", userId: "user_1" }
  );

  expectCode(
    () => transitionSuggestionStatus(confirmed, "edited", { action: "edit", actor: "user", userId: "user_1" }),
    "AI_SUGGESTION_TRANSITION_INVALID"
  );
});
