import test from "node:test";
import assert from "node:assert/strict";

import { renderAiSuggestionsPanel } from "../../apps/web/src/ai-suggestions-panel.js";

const suggestion = {
  id: "suggestion_1",
  target: { type: "permanent_note", id: "pn_1", title: "Inbox review target", field: "thesis" },
  scope: "note_field",
  content: "A reviewable claim starts life as a draft.",
  status: "suggested",
  origin: "ai_generated",
  provenance: { humanConfirmed: false, humanEdited: false },
  history: []
};

function detailPane(html = "") {
  return html.split('<div class="ai-suggestion-modal-dialog">')[1] || "";
}

function listPane(html = "") {
  const afterStart = html.split('<section class="ai-inbox-list-pane">')[1] || "";
  return afterStart.split('<div class="ai-suggestion-modal"')[0] || afterStart;
}

function visibleText(html = "") {
  return html.replace(/<[^>]*>/g, " ");
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
  assert.match(html, /Inbox review target/);
  assert.match(html, /核心观点/);
  assert.match(html, /缺：核心观点/);
  assert.match(html, /AI 建议：核心观点：A reviewable claim starts life as a draft/);
  assert.match(html, /处理建议/);
  assert.doesNotMatch(html, /来自：AI 整理/);
  assert.match(html, /保存这篇建议/);
  assert.match(html, /暂不处理/);
  assert.doesNotMatch(html, /data-ai-suggestion-open-note=/);
  assert.doesNotMatch(html, /permanent_note \/ pn_1 \/ thesis/);
  assert.doesNotMatch(html, /note_field/);
  assert.doesNotMatch(html, /\{"thesis"/);
  assert.doesNotMatch(visibleText(html), /\bpn_[\w-]+/);
});

test("AI suggestions panel opens suggestions in one modal action area", () => {
  const pane = detailPane(renderAiSuggestionsPanel({
    items: [suggestion],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: suggestion
  }));

  assert.ok(pane.indexOf("<h3>核心观点</h3>") > -1);
  assert.ok(pane.indexOf("ai-suggestion-detail-tools") < pane.indexOf("<h3>核心观点</h3>"));
  assert.doesNotMatch(pane, /ai-suggestion-action-row/);
  assert.doesNotMatch(pane, /打开笔记/);
  assert.match(pane, /data-ai-suggestion-close="true"/);
  assert.match(pane, /data-ai-suggestion-group-status="adopted_as_draft"/);
  assert.match(pane, /data-ai-suggestion-group-status="rejected"/);
  assert.equal((pane.match(/ai-suggestion-modal-actions/g) || []).length, 1);
});

test("AI suggestions detail keeps the note title when latest detail omits it", () => {
  const pane = detailPane(renderAiSuggestionsPanel({
    items: [suggestion],
    total: 1,
    selectedSuggestionId: "suggestion_1",
    detail: {
      ...suggestion,
      target: { type: "permanent_note", id: "pn_1", field: "three_line_summary" },
      content: { threeLineSummary: ["First line", "Second line", "Third line"] }
    }
  }));

  assert.match(pane, /Inbox review target/);
  assert.match(pane, /缺：三行摘要/);
  assert.match(pane, /<h3>三行摘要<\/h3>/);
  assert.doesNotMatch(pane, /<h2>三行摘要<\/h2>/);
  assert.doesNotMatch(visibleText(pane), /\bpn_[\w-]+/);
  assert.doesNotMatch(pane, /data-ai-suggestion-open-note=/);
});

test("AI suggestions panel replaces vague missing-note titles with the work to do", () => {
  const untitledSuggestion = {
    ...suggestion,
    id: "suggestion_missing_title",
    target: { type: "permanent_note", id: "pn_missing_title", field: "thesis" },
    content: "临时记录必须承诺下一步"
  };
  const html = renderAiSuggestionsPanel({
    items: [untitledSuggestion],
    total: 1,
    selectedSuggestionId: "suggestion_missing_title",
    detail: untitledSuggestion
  });

  assert.match(html, /未命名笔记/);
  assert.match(html, /缺：核心观点/);
  assert.match(html, /AI 建议：核心观点：临时记录必须承诺下一步/);
  assert.doesNotMatch(html, /缺少笔记标题/);
  assert.doesNotMatch(html, /这篇笔记/);
  assert.doesNotMatch(visibleText(html), /\bpn_[\w-]+/);
});

test("AI suggestions panel groups several suggestions from the same note", () => {
  const html = renderAiSuggestionsPanel({
    items: [
      suggestion,
      {
        ...suggestion,
        id: "suggestion_summary",
        target: { ...suggestion.target, field: "three_line_summary" },
        content: { threeLineSummary: ["First line", "Second line", "Third line"] }
      }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_1",
    detail: suggestion
  });
  const list = listPane(html);
  const pane = detailPane(html);

  assert.equal((list.match(/class="ai-inbox-item(?:\s|")/g) || []).length, 1);
  assert.match(list, /Inbox review target/);
  assert.match(list, /缺：核心观点、三行摘要/);
  assert.match(list, /核心观点：A reviewable claim starts life as a draft/);
  assert.match(list, /三行摘要：First line Second line Third line/);
  assert.match(list, /处理建议/);
  assert.match(pane, /<h3>核心观点<\/h3>/);
  assert.match(pane, /<h3>三行摘要<\/h3>/);
  assert.match(pane, /data-ai-suggestion-ids="suggestion_1,suggestion_summary"/);
  assert.equal((pane.match(/data-ai-suggestion-group-status=/g) || []).length, 2);
  assert.doesNotMatch(pane, /处理这项/);
  assert.doesNotMatch(visibleText(html), /\bpn_[\w-]+/);
});

test("AI suggestions panel does not present the note title as generated content", () => {
  const title = "02 什么是永久笔记？";
  const html = renderAiSuggestionsPanel({
    items: [
      {
        ...suggestion,
        id: "suggestion_title_thesis",
        target: { ...suggestion.target, title, field: "thesis" },
        content: title
      },
      {
        ...suggestion,
        id: "suggestion_title_summary",
        target: { ...suggestion.target, title, field: "three_line_summary" },
        content: { threeLineSummary: [title] }
      }
    ],
    total: 2,
    selectedSuggestionId: "suggestion_title_thesis",
    detail: {
      ...suggestion,
      id: "suggestion_title_thesis",
      target: { ...suggestion.target, title, field: "thesis" },
      content: title
    }
  });
  const list = listPane(html);
  const pane = detailPane(html);

  assert.match(list, /AI 建议：暂无可用内容/);
  assert.doesNotMatch(list, /核心观点：02 什么是永久笔记/);
  assert.doesNotMatch(list, /三行摘要：02 什么是永久笔记/);
  assert.match(pane, /没有生成可用建议/);
  assert.doesNotMatch(pane, /保存这篇建议/);
  assert.match(pane, /data-ai-suggestion-group-status="rejected"/);
  assert.match(pane, /data-ai-suggestion-ids="suggestion_title_thesis,suggestion_title_summary"/);
});

test("AI suggestions panel only lets the selected grouped suggestion be edited", () => {
  const summarySuggestion = {
    ...suggestion,
    id: "suggestion_summary",
    status: "adopted_as_draft",
    target: { ...suggestion.target, field: "three_line_summary" },
    content: { threeLineSummary: ["First line", "Second line", "Third line"] }
  };
  const pane = detailPane(renderAiSuggestionsPanel({
    items: [
      { ...suggestion, status: "adopted_as_draft" },
      summarySuggestion
    ],
    total: 2,
    selectedSuggestionId: "suggestion_1",
    detail: { ...suggestion, status: "adopted_as_draft" },
    actionSuggestionId: "suggestion_summary",
    actionError: "Second suggestion failed"
  }));
  const summaryStart = pane.indexOf("<h3>三行摘要</h3>");
  const summarySection = pane.slice(summaryStart, pane.indexOf("</section>", summaryStart));

  assert.match(pane, /id="aiSuggestionContentEditor"/);
  assert.doesNotMatch(pane, /id="aiSuggestionContentEditor-suggestion_summary"/);
  assert.match(summarySection, /class="ai-suggestion-content-text"/);
  assert.match(summarySection, /Second suggestion failed/);
  assert.match(summarySection, /data-ai-suggestion-id="suggestion_summary"[\s\S]*处理这项/);
  assert.doesNotMatch(summarySection, /我已改好/);
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

  assert.doesNotMatch(html, /放到哪里/);
  assert.doesNotMatch(html, /来源笔记/);
  assert.doesNotMatch(html, /目标笔记/);
  assert.match(html, /处理记录/);
  assert.match(html, /Tightened the wording/);
  assert.match(html, /data-ai-suggestion-status="confirmed"/);
  assert.match(html, /确认写入/);
  assert.doesNotMatch(html, /artifact_trace/);
  assert.doesNotMatch(html, /关联对象/);
  assert.doesNotMatch(html, /字段建议状态/);
  assert.doesNotMatch(html, />thesis</);
  assert.doesNotMatch(html, /\{\s*&quot;thesis&quot;/);
  assert.doesNotMatch(visibleText(html), /\bpn_[\w-]+/);
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

  assert.match(html, /这条整理暂时找不到要打开的笔记/);
  assert.doesNotMatch(html, /data-ai-suggestion-open-note=/);
  assert.doesNotMatch(html, /Trace placeholder:/);
  assert.doesNotMatch(visibleText(html), /\bpn_[\w-]+/);
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

  assert.match(html, /核心观点/);
  assert.doesNotMatch(html, /目标笔记<\/dt><dd>pn_trace/);
  assert.doesNotMatch(html, /放到哪里/);
  assert.doesNotMatch(html, /artifact_trace_priority/);
  assert.doesNotMatch(visibleText(html), /\bpn_[\w-]+/);
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

  assert.match(pane, /核心观点/);
  assert.doesNotMatch(visibleText(pane), /\bpn_[\w-]+/);
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
  assert.match(loadingPane, /核心观点/);
  assert.doesNotMatch(visibleText(loadingPane), /\bpn_[\w-]+/);

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
  assert.match(errorPane, /核心观点/);
  assert.doesNotMatch(visibleText(errorPane), /\bpn_[\w-]+/);
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
  assert.match(staleNoticePane, /核心观点/);
  assert.doesNotMatch(visibleText(staleNoticePane), /\bpn_[\w-]+/);
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
