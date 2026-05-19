import test from "node:test";
import assert from "node:assert/strict";

import { renderAiSuggestionsPanel } from "../../apps/web/src/ai-suggestions-panel.js";

const suggestion = {
  id: "suggestion_1",
  target: { type: "permanent_note", id: "pn_1", field: "thesis" },
  scope: "note_field",
  content: "A reviewable claim starts life as a draft.",
  status: "suggested",
  origin: "ai_generated",
  provenance: { humanConfirmed: false, humanEdited: false },
  history: []
};

test("AI suggestions panel renders filters, list, detail, and review actions", () => {
  const html = renderAiSuggestionsPanel({
    items: [suggestion],
    total: 1,
    filters: { status: "suggested", targetType: "permanent_note", targetId: "pn_1", scope: "note_field" },
    selectedSuggestionId: "suggestion_1",
    detail: suggestion
  });

  assert.match(html, /AI suggestions/);
  assert.match(html, /id="aiSuggestionStatusFilter"/);
  assert.match(html, /id="aiSuggestionTargetTypeFilter"/);
  assert.match(html, /data-ai-suggestion-id="suggestion_1"/);
  assert.match(html, /permanent_note \/ pn_1 \/ thesis/);
  assert.match(html, /Adopt as draft/);
  assert.match(html, /Reject/);
});

test("AI suggestions panel renders edited action for adopted draft suggestions", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, status: "adopted_as_draft" }],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: { ...suggestion, status: "adopted_as_draft" }
  });

  assert.match(html, /Mark edited/);
  assert.match(html, /data-ai-suggestion-status="edited"/);
  assert.match(html, /Open target note/);
  assert.match(html, /id="aiSuggestionContentEditor"/);
  assert.match(html, /edit the adopted draft in the note itself/i);
});

test("AI suggestions panel renders confirm action only after a suggestion is edited", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: { ...suggestion, status: "edited" }
  });

  assert.match(html, /Confirm/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
  assert.match(html, /Ready to confirm/);
  assert.match(html, /id="aiSuggestionContentEditor"/);
});

test("AI suggestions panel renders loading and empty states", () => {
  assert.match(renderAiSuggestionsPanel({ loading: true }), /Loading AI suggestions/);
  assert.match(renderAiSuggestionsPanel({ items: [], total: 0 }), /No AI suggestions match these filters/);
});
