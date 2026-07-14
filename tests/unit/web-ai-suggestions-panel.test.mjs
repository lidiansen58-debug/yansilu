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

function detailPane(html = "") {
  return html.split('<section class="ai-inbox-detail-pane">')[1] || "";
}

test("AI suggestions panel hides internal filters and renders readable list/detail text", () => {
  const html = renderAiSuggestionsPanel({
    items: [suggestion],
    total: 1,
    filters: { status: "suggested", targetType: "permanent_note", targetId: "pn_1", scope: "note_field" },
    selectedSuggestionId: "suggestion_1",
    detail: suggestion
  });

  assert.match(html, /待处理/);
  assert.match(html, /id="aiSuggestionStatusFilter"/);
  assert.doesNotMatch(html, /id="aiSuggestionTargetTypeFilter"/);
  assert.doesNotMatch(html, /id="aiSuggestionTargetIdFilter"/);
  assert.doesNotMatch(html, /id="aiSuggestionScopeFilter"/);
  assert.match(html, /pn_1 · 核心观点/);
  assert.match(html, /永久笔记/);
  assert.match(html, /写入：核心观点/);
  assert.match(html, /来自：AI 整理/);
  assert.match(html, /建议内容/);
  assert.match(html, /保存为草稿/);
  assert.match(html, /忽略/);
  assert.doesNotMatch(html, /permanent_note \/ pn_1 \/ thesis/);
  assert.doesNotMatch(html, /note_field/);
  assert.doesNotMatch(html, /\{"thesis"/);
});

test("AI suggestions panel keeps primary actions next to the selected suggestion header", () => {
  const pane = detailPane(renderAiSuggestionsPanel({
    items: [suggestion],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: suggestion
  }));

  assert.ok(pane.indexOf("ai-suggestion-action-row") > -1);
  assert.ok(pane.indexOf("ai-suggestion-action-row") < pane.indexOf("建议内容"));
  assert.match(pane, /打开笔记/);
  assert.match(pane, /保存为草稿/);
  assert.match(pane, /忽略/);
});

test("AI suggestions panel renders edited action for adopted draft suggestions in plain language", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, status: "adopted_as_draft" }],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: { ...suggestion, status: "adopted_as_draft" }
  });

  assert.match(html, /已存草稿/);
  assert.match(html, /data-ai-suggestion-status="edited"/);
  assert.match(html, /我已改好/);
  assert.match(html, /打开笔记改到满意后/);
  assert.match(html, /id="aiSuggestionContentEditor"/);
});

test("AI suggestions panel surfaces canonical traceability without artifact ids or raw field names", () => {
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
        payload: { fieldSuggestion: { status: "edited" } }
      }
    }
  });

  assert.match(html, /放到哪里/);
  assert.match(html, /保存位置<\/dt><dd>核心观点/);
  assert.match(html, /当前状态<\/dt><dd>已经改过，可以确认写入。/);
  assert.match(html, /处理记录/);
  assert.match(html, /Tightened the wording/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
  assert.match(html, /确认写入/);
  assert.doesNotMatch(html, /artifact_trace/);
  assert.doesNotMatch(html, /关联对象/);
  assert.doesNotMatch(html, /字段建议状态/);
  assert.doesNotMatch(html, />thesis</);
  assert.doesNotMatch(html, /\{\s*&quot;thesis&quot;/);
});

test("AI suggestions panel renders readable guidance when detail is incomplete", () => {
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

  assert.match(html, /这条建议缺少完整来源/);
  assert.match(html, /缺少目标笔记/);
  assert.match(html, /data-ai-suggestion-open-note=""[\s\S]*disabled/);
  assert.doesNotMatch(html, /Trace placeholder:/);
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

  assert.match(html, /pn_trace · 核心观点/);
  assert.match(html, /目标笔记<\/dt><dd>pn_trace/);
  assert.match(html, /保存位置<\/dt><dd>核心观点/);
  assert.doesNotMatch(html, /artifact_trace_priority/);
});

test("AI suggestions panel renders confirm action only after a suggestion is edited", () => {
  const html = renderAiSuggestionsPanel({
    items: [{ ...suggestion, status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: { ...suggestion, status: "edited" }
  });

  assert.match(html, /确认写入/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
  assert.match(html, /可以确认/);
  assert.match(html, /id="aiSuggestionContentEditor"/);
});

test("AI suggestions panel does not keep rendering stale detail when selection has moved", () => {
  const pane = detailPane(renderAiSuggestionsPanel({
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
  }));

  assert.doesNotMatch(pane, /pn_a · 核心观点/);
  assert.match(pane, /pn_b · 核心观点/);
  assert.match(pane, /正在确认/);
  assert.match(pane, /先读取最新内容/);
  assert.doesNotMatch(pane, /data-ai-suggestion-status=/);
  assert.doesNotMatch(pane, /data-ai-suggestion-open-note=/);
});

test("AI suggestions panel stops on safety while selected latest detail is unavailable", () => {
  const pane = detailPane(renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_pending", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_pending",
    detail: null
  }));

  assert.match(pane, /正在确认/);
  assert.match(pane, /先读取最新内容/);
  assert.doesNotMatch(pane, /data-ai-suggestion-status=/);
  assert.doesNotMatch(pane, /data-ai-suggestion-open-note=/);
  assert.doesNotMatch(pane, /id="aiSuggestionContentEditor"/);
});

test("AI suggestions panel keeps safety state visible while latest detail hydrates or fails", () => {
  const loadingPane = detailPane(renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_loading", status: "adopted_as_draft" }],
    total: 1,
    selectedSuggestionId: "suggestion_loading",
    detail: null,
    detailSuggestionId: "suggestion_loading",
    detailLoading: true
  }));
  assert.match(loadingPane, /正在加载最新内容/);
  assert.match(loadingPane, /class="ai-inbox-detail is-busy"/);

  const errorPane = detailPane(renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_detail_error" }],
    total: 1,
    selectedSuggestionId: "suggestion_detail_error",
    detail: null,
    detailSuggestionId: "suggestion_detail_error",
    detailError: "detail boom"
  }));
  assert.match(errorPane, /详情加载失败：detail boom/);
  assert.doesNotMatch(errorPane, /待处理加载失败/);
});

test("AI suggestions panel ignores stale detail loading and errors after selection has moved", () => {
  const loadingPane = detailPane(renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    detailSuggestionId: "suggestion_a",
    detailLoading: true
  }));
  assert.doesNotMatch(loadingPane, /正在加载建议详情/);
  assert.match(loadingPane, /pn_b · 核心观点/);

  const errorPane = detailPane(renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    detailSuggestionId: "suggestion_a",
    detailError: "detail boom"
  }));
  assert.doesNotMatch(errorPane, /详情加载失败：detail boom/);
  assert.match(errorPane, /pn_b · 核心观点/);
});

test("AI suggestions panel surfaces scoped action errors and notices only for the selected suggestion", () => {
  const errorHtml = renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_error", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_error",
    detail: { ...suggestion, id: "suggestion_action_error", status: "edited" },
    actionSuggestionId: "suggestion_action_error",
    actionError: "action boom"
  });
  assert.match(errorHtml, /处理失败：action boom/);
  assert.match(errorHtml, /data-ai-suggestion-status="confirmed"/);

  const staleNoticePane = detailPane(renderAiSuggestionsPanel({
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
  }));
  assert.doesNotMatch(staleNoticePane, /This reviewed suggestion is already confirmed\./);
  assert.match(staleNoticePane, /pn_b · 核心观点/);
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

test("AI suggestions panel keeps owned notices, errors, and busy state behind the safety gate", () => {
  const noticePane = detailPane(renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_notice", status: "confirmed" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_notice",
    detail: null,
    actionNoticeSuggestionId: "suggestion_action_notice",
    actionNotice: "Another AI suggestion review is still running.",
    actionNoticeTone: "warn"
  }));
  assert.match(noticePane, /正在确认/);
  assert.match(noticePane, /class="scheduled-task-empty tone-warn" data-ai-suggestion-action-notice="true"/);
  assert.doesNotMatch(noticePane, /data-ai-suggestion-status=/);

  const errorPane = detailPane(renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_action_error", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_action_error",
    detail: null,
    actionSuggestionId: "suggestion_action_error",
    actionError: "action boom"
  }));
  assert.match(errorPane, /处理失败：action boom/);
  assert.doesNotMatch(errorPane, /data-ai-suggestion-status=/);

  const busyPane = detailPane(renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_busy", status: "edited" }],
    total: 1,
    selectedSuggestionId: "suggestion_busy",
    detail: null,
    actionLoading: true,
    actionSuggestionId: "suggestion_busy"
  }));
  assert.match(busyPane, /class="ai-inbox-detail is-busy"/);
  assert.match(busyPane, /正在确认/);
});

test("AI suggestions panel does not keep disabling review actions after selection has moved", () => {
  const pane = detailPane(renderAiSuggestionsPanel({
    items: [
      { ...suggestion, id: "suggestion_a", status: "edited", target: { type: "permanent_note", id: "pn_a", field: "thesis" } },
      { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_b",
    detail: { ...suggestion, id: "suggestion_b", status: "edited", target: { type: "permanent_note", id: "pn_b", field: "thesis" } },
    actionLoading: true,
    actionSuggestionId: "suggestion_a"
  }));

  assert.match(pane, /data-ai-suggestion-status="confirmed"/);
  assert.doesNotMatch(pane, /data-ai-suggestion-status="confirmed"[\s\S]*disabled/);
});

test("AI suggestions panel marks the current suggestion detail busy while its review action is in flight", () => {
  const pane = detailPane(renderAiSuggestionsPanel({
    items: [{ ...suggestion, id: "suggestion_busy", status: "edited", target: { type: "permanent_note", id: "pn_busy", field: "thesis" } }],
    total: 1,
    selectedSuggestionId: "suggestion_busy",
    detail: { ...suggestion, id: "suggestion_busy", status: "edited", target: { type: "permanent_note", id: "pn_busy", field: "thesis" } },
    actionLoading: true,
    actionSuggestionId: "suggestion_busy"
  }));

  assert.match(pane, /class="ai-inbox-detail is-busy"/);
  assert.match(pane, /id="aiSuggestionContentEditor"[^>]*disabled/);
  assert.match(pane, /data-ai-suggestion-open-note="pn_busy"[^>]*disabled/);
  assert.match(pane, /data-ai-suggestion-status="confirmed"[\s\S]*disabled/);
});

test("AI suggestions panel renders loading and empty states", () => {
  assert.match(renderAiSuggestionsPanel({ loading: true }), /正在加载待处理/);
  assert.match(renderAiSuggestionsPanel({ items: [], total: 0 }), /没有符合筛选条件的待处理/);
});

test("AI suggestions compact mode keeps an empty automation tab quiet", () => {
  const html = renderAiSuggestionsPanel({
    items: [],
    total: 0,
    compact: true
  });

  assert.match(html, /现在没有待处理/);
  assert.doesNotMatch(html, /待处理内容/);
  assert.doesNotMatch(html, /id="btnAiSuggestionsApplyFilters"/);
  assert.doesNotMatch(html, /ai-inbox-detail-pane/);
  assert.doesNotMatch(html, /0\/0 条/);
});

test("AI suggestions compact mode keeps filters visible when an empty filter is active", () => {
  const html = renderAiSuggestionsPanel({
    items: [],
    total: 0,
    compact: true,
    filters: { status: "suggested" }
  });

  assert.match(html, /现在没有待处理/);
  assert.match(html, /id="btnAiSuggestionsApplyFilters"/);
  assert.match(html, /待确认/);
});
