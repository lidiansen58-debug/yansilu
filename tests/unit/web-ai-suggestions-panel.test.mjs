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

  assert.match(html, /AI suggestions|AI 建议/);
  assert.match(html, /id="aiSuggestionStatusFilter"/);
  assert.match(html, /id="aiSuggestionTargetTypeFilter"/);
  assert.match(html, /data-ai-suggestion-id="suggestion_1"/);
  assert.match(html, /permanent_note \/ pn_1 \/ thesis/);
  assert.match(html, /Adopt as draft|采纳为草稿/);
  assert.match(html, /Reject|拒绝/);
});

test("AI suggestions panel renders edited action for adopted draft suggestions", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, status: "adopted_as_draft" }],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: { ...suggestion, status: "adopted_as_draft" }
  });

  assert.match(html, /Mark edited|标记已编辑|标记为已编辑/);
  assert.match(html, /data-ai-suggestion-status="edited"/);
  assert.match(html, /Open target note|打开目标笔记/);
  assert.match(html, /id="aiSuggestionContentEditor"/);
  assert.match(html, /edit the adopted draft in the note itself|打开目标笔记，在笔记里直接编辑已采纳的草稿/i);
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

  assert.match(html, /Source artifact|来源对象/);
  assert.match(html, /artifact_trace/);
  assert.match(html, /Linked artifact|关联对象/);
  assert.match(html, /Field suggestion status|字段建议状态/);
  assert.match(html, /Review history|审阅历史/);
  assert.match(html, /Review event: evt_trace|审阅事件：evt_trace/);
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

  assert.match(html, /Trace|来源链路/);
  assert.match(html, /Trace placeholder: this linked review item exists, but its source\/target trace is incomplete\.|这条关联审阅项已经存在，但来源\/目标链路还不完整。/);
  assert.match(html, /missing target note|缺少目标笔记/);
  assert.match(html, /This linked review item is not connected to a target note yet\.|这条关联审阅项还没有连接到目标笔记。/i);
  assert.match(html, /data-ai-suggestion-open-note=""[\s\S]*disabled/);
});

test("AI suggestions panel prefers canonical trace fields over incomplete item targets", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      {
        ...suggestion,
        id: "suggestion_trace_priority",
        status: "edited",
        target: { type: "permanent_note", id: "", field: "" }
      }
    ],
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
  assert.match(html, /Target note<\/dt><dd>pn_trace|目标笔记<\/dt><dd>pn_trace/);
  assert.match(html, /Target field<\/dt><dd>thesis|目标字段<\/dt><dd>thesis/);
  assert.doesNotMatch(html, /Trace placeholder:/);
});

test("AI suggestions panel renders confirm action only after a suggestion is edited", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: { ...suggestion, status: "edited" }
  });

  assert.match(html, /Confirm|确认/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
  assert.match(html, /Ready to confirm|可确认/);
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
  assert.match(detailPane, /Review safety|审阅安全/);
  assert.match(detailPane, /Load the latest detail before running review actions|先加载最新详情，再执行审阅动作/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-status=/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-open-note=/);
});

test("AI suggestions panel stops on review safety when the latest detail has not loaded yet", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_pending", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_pending",
    detail: null
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /Review safety|审阅安全/);
  assert.match(detailPane, /Load the latest detail before running review actions|先加载最新详情，再执行审阅动作/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-status=/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-open-note=/);
  assert.doesNotMatch(detailPane, /id="aiSuggestionContentEditor"/);
});

test("AI suggestions panel keeps review safety visible while the selected latest detail is hydrating", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_loading", status: "adopted_as_draft" }],
    total: 1,
    selectedSuggestionId: "suggestion_loading",
    detail: null,
    detailSuggestionId: "suggestion_loading",
    detailLoading: true
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /Review safety|审阅安全/);
  assert.match(detailPane, /Loading latest detail|正在加载最新详情/);
  assert.match(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.doesNotMatch(detailPane, /id="aiSuggestionContentEditor"/);
});

test("AI suggestions panel keeps review safety visible when the selected latest detail fails to load", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_detail_error" }],
    total: 1,
    selectedSuggestionId: "suggestion_detail_error",
    detail: null,
    detailSuggestionId: "suggestion_detail_error",
    detailError: "detail boom"
  });

  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(html, /data-ai-suggestion-id="suggestion_detail_error"/);
  assert.match(detailPane, /Review safety|审阅安全/);
  assert.match(detailPane, /AI suggestion detail failed to load: detail boom|AI 建议详情加载失败：detail boom/);
  assert.doesNotMatch(html, /AI suggestions failed to load|AI 建议加载失败/);
});

test("AI suggestions panel does not keep rendering stale detail loading after selection has moved", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    detailSuggestionId: "suggestion_a",
    detailLoading: true
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /Loading suggestion detail|正在加载建议详情/);
  assert.match(detailPane, /permanent_note \/ pn_b \/ thesis/);
});

test("AI suggestions panel does not keep rendering stale detail errors after selection has moved", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    detailSuggestionId: "suggestion_a",
    detailError: "detail boom"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /AI suggestion detail failed to load: detail boom|AI 建议详情加载失败：detail boom/);
  assert.match(detailPane, /permanent_note \/ pn_b \/ thesis/);
});

test("AI suggestions panel surfaces review action errors inside the detail pane", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_error", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_error",
    detail: { ...suggestion, id: "suggestion_action_error", status: "edited" },
    actionSuggestionId: "suggestion_action_error",
    actionError: "action boom"
  });

  assert.match(html, /AI suggestion review failed: action boom|AI 建议审阅失败：action boom/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
});

test("AI suggestions panel does not mutate scoped detail or action state back onto the input state", () => {
  const state = {
    items: [{ ...suggestion, id: "suggestion_scoped_state", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_scoped_state",
    detail: { ...suggestion, id: "suggestion_scoped_state", status: "edited" },
    detailSuggestionId: "suggestion_other",
    detailError: "detail boom",
    actionSuggestionId: "suggestion_other",
    actionError: "action boom",
    actionNoticeSuggestionId: "suggestion_other",
    actionNotice: "This reviewed suggestion is already confirmed.",
    actionNoticeTone: "ok"
  };

  const html = renderAiSuggestionsPanel(state);

  assert.doesNotMatch(html, /detail boom/);
  assert.doesNotMatch(html, /action boom/);
  assert.equal(state.detailError, "detail boom");
  assert.equal(state.actionError, "action boom");
  assert.equal(state.actionNotice, "This reviewed suggestion is already confirmed.");
  assert.equal(state.actionNoticeTone, "ok");
});

test("AI suggestions panel surfaces inline review notices inside the detail pane", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_notice", status: "confirmed" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_notice",
    detail: { ...suggestion, id: "suggestion_action_notice", status: "confirmed" },
    actionNoticeSuggestionId: "suggestion_action_notice",
    actionNotice: "This reviewed suggestion is already confirmed.",
    actionNoticeTone: "ok"
  });

  assert.match(html, /data-ai-suggestion-action-notice="true"/);
  assert.match(html, /class="scheduled-task-empty tone-ok" data-ai-suggestion-action-notice="true"/);
  assert.match(html, /This reviewed suggestion is already confirmed\./);
});

test("AI suggestions panel keeps owned review notices visible behind the review-safety gate", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_notice", status: "confirmed" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_notice",
    detail: null,
    actionNoticeSuggestionId: "suggestion_action_notice",
    actionNotice: "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.",
    actionNoticeTone: "warn"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /Review safety|审阅安全/);
  assert.match(detailPane, /class="scheduled-task-empty tone-warn" data-ai-suggestion-action-notice="true"/);
  assert.match(detailPane, /Another AI suggestion review is still running/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-status=/);
});

test("AI suggestions panel keeps owned review errors visible behind the review-safety gate", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_error", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_error",
    detail: null,
    actionSuggestionId: "suggestion_action_error",
    actionError: "action boom"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /Review safety|审阅安全/);
  assert.match(detailPane, /AI suggestion review failed: action boom|AI 建议审阅失败：action boom/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-status=/);
});

test("AI suggestions panel keeps owned busy state visible behind the review-safety gate", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_busy", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_busy",
    detail: null,
    actionLoading: true,
    actionSuggestionId: "suggestion_busy",
    actionNoticeSuggestionId: "suggestion_busy",
    actionNotice: "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.",
    actionNoticeTone: "warn"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.match(detailPane, /Review safety|审阅安全/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-status=/);
});

test("AI suggestions panel does not surface stale review notices after selection has moved", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    actionNoticeSuggestionId: "suggestion_a",
    actionNotice: "This reviewed suggestion is already confirmed.",
    actionNoticeTone: "ok"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /This reviewed suggestion is already confirmed\./);
  assert.match(detailPane, /permanent_note \/ pn_b \/ thesis/);
});

test("AI suggestions panel does not surface stale review action errors after selection has moved", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    actionSuggestionId: "suggestion_a",
    actionError: "action boom"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /AI suggestion review failed: action boom|AI 建议审阅失败：action boom/);
  assert.match(detailPane, /permanent_note \/ pn_b \/ thesis/);
});

test("AI suggestions panel does not keep disabling review actions after selection has moved", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    actionLoading: true,
    actionSuggestionId: "suggestion_a"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /data-ai-suggestion-status="confirmed"/);
  assert.doesNotMatch(detailPane, /data-ai-suggestion-status="confirmed"[\s\S]*disabled/);
});

test("AI suggestions panel marks the current suggestion detail busy while its review action is in flight", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_busy", status: "edited", target: { type: "permanent_note", id: "pn_busy", field: "thesis" } }],
    total: 1,
    selectedSuggestionId: "suggestion_busy",
    detail: { ...suggestion, id: "suggestion_busy", status: "edited", target: { type: "permanent_note", id: "pn_busy", field: "thesis" } },
    actionLoading: true,
    actionSuggestionId: "suggestion_busy"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.match(detailPane, /id="aiSuggestionContentEditor"[^>]*disabled/);
  assert.match(detailPane, /data-ai-suggestion-open-note="pn_busy"[^>]*disabled/);
  assert.match(detailPane, /data-ai-suggestion-status="confirmed"[\s\S]*disabled/);
});

test("AI suggestions panel renders loading and empty states", () => {
  assert.match(renderAiSuggestionsPanel({ loading: true }), /Loading AI suggestions|正在加载 AI 建议/);
  assert.match(renderAiSuggestionsPanel({ items: [], total: 0 }), /No AI suggestions match these filters|没有匹配这些筛选条件的 AI 建议|没有符合这些筛选条件的 AI 建议/);
});
