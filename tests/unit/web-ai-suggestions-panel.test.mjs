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

test("AI suggestions panel surfaces canonical traceability and review history inside suggestion detail", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_trace", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_trace",
    detail: {
      item: {
        ...suggestion,
        id: "suggestion_trace",
        status: "edited",
        content: { thesis: "A reviewable claim starts life as a draft." },
        sourceArtifactId: "artifact_trace",
        provenance: { humanConfirmed: false, humanEdited: true, contentOrigin: "ai_generated" },
        history: []
      },
      trace: {
        suggestionId: "suggestion_trace",
        sourceArtifactId: "artifact_trace",
        sourceNoteIds: ["pn_1"],
        targetNoteId: "pn_1",
        targetField: "thesis",
        suggestionStatus: "edited"
      },
      reviewEvents: [
        {
          adoptionEventId: "evt_trace",
          eventType: "edited",
          createdAt: "2026-05-18T12:04:00.000Z",
          metadata: { fromStatus: "adopted_as_draft", toStatus: "edited" },
          comment: "Tightened the wording."
        }
      ],
      linkedArtifact: {
        id: "artifact_trace",
        type: "InsightCard",
        title: "Field suggestion artifact",
        status: "adopted_as_draft",
        payload: {
          fieldSuggestion: {
            status: "edited"
          }
        }
      }
    }
  });

  assert.match(html, /Source artifact/);
  assert.match(html, /artifact_trace/);
  assert.match(html, /Linked artifact/);
  assert.match(html, /Field suggestion status/);
  assert.match(html, /Review history/);
  assert.match(html, /Review event: evt_trace/);
  assert.match(html, /Tightened the wording/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
});

test("AI suggestions panel renders trace placeholders and target-missing guidance when detail is incomplete", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_missing_target", target: { type: "permanent_note", id: "", field: "" }, sourceArtifactId: "" }],
    total: 1,
    selectedSuggestionId: "suggestion_missing_target",
    detail: {
      ...suggestion,
      id: "suggestion_missing_target",
      target: { type: "permanent_note", id: "", field: "" },
      sourceArtifactId: ""
    }
  });

  assert.match(html, /Trace/);
  assert.match(html, /Trace placeholder: this linked review item exists, but its source\/target trace is incomplete\./);
  assert.match(html, /missing target note/);
  assert.match(html, /is not connected to a target note yet/i);
  assert.match(html, /data-ai-suggestion-open-note=""[\s\S]*disabled/);
});

test("AI suggestions panel prefers canonical trace fields over incomplete item targets", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_trace_priority", target: { type: "permanent_note", id: "", field: "" } }],
    total: 1,
    selectedSuggestionId: "suggestion_trace_priority",
    detail: {
      item: {
        ...suggestion,
        id: "suggestion_trace_priority",
        target: { type: "permanent_note", id: "", field: "" },
        sourceArtifactId: ""
      },
      trace: {
        suggestionId: "suggestion_trace_priority",
        sourceArtifactId: "artifact_trace_priority",
        sourceNoteIds: ["pn_trace"],
        targetNoteId: "pn_trace",
        targetField: "thesis",
        suggestionStatus: "edited"
      }
    }
  });

  assert.match(html, /artifact_trace_priority/);
  assert.match(html, /Target note<\/dt><dd>pn_trace/);
  assert.match(html, /Target field<\/dt><dd>thesis/);
  assert.doesNotMatch(html, /Trace placeholder:/);
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

test("AI suggestions panel does not keep rendering stale detail when selection has moved", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: {
      item: { ...suggestion, id: "suggestion_a", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      trace: { sourceArtifactId: "artifact_a", targetNoteId: "pn_a", targetField: "thesis" }
    }
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /permanent_note \/ pn_a \/ thesis/);
  assert.match(detailPane, /permanent_note \/ pn_b \/ thesis/);
});

test("AI suggestions panel renders a loading placeholder while the selected detail is hydrating", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_loading", status: "adopted_as_draft" }],
    total: 1,
    selectedSuggestionId: "suggestion_loading",
    detail: null,
    detailLoading: true
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /Loading suggestion detail/);
  assert.doesNotMatch(detailPane, /id="aiSuggestionContentEditor"/);
});

test("AI suggestions panel keeps the list visible when detail loading fails", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_detail_error" }],
    total: 1,
    selectedSuggestionId: "suggestion_detail_error",
    detail: null,
    detailError: "detail boom"
  });

  assert.match(html, /data-ai-suggestion-id="suggestion_detail_error"/);
  assert.match(html, /AI suggestion detail failed to load: detail boom/);
  assert.doesNotMatch(html, /AI suggestions failed to load/);
});

test("AI suggestions panel surfaces review action errors inside the detail pane", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_error", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_error",
    detail: { ...suggestion, id: "suggestion_action_error", status: "edited" },
    actionError: "action boom"
  });

  assert.match(html, /AI suggestion review failed: action boom/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
});

test("AI suggestions panel renders loading and empty states", () => {
  assert.match(renderAiSuggestionsPanel({ loading: true }), /Loading AI suggestions/);
  assert.match(renderAiSuggestionsPanel({ items: [], total: 0 }), /No AI suggestions match these filters/);
});
