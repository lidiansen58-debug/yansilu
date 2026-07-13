import test from "node:test";
import assert from "node:assert/strict";

import { renderAiInboxPanel } from "../../apps/web/src/ai-inbox-panel.js";

const item = {
  artifactId: "artifact_link_1",
  type: "LinkSuggestion",
  title: "Connect recall and spacing",
  summary: "These notes should probably be linked.",
  status: "pending_review",
  privacyMode: "normal",
  sourceNoteIds: ["note_a", "note_b"],
  updatedAt: "2026-05-13T10:00:00.000Z",
  confidence: { label: "high" }
};

const artifact = {
  id: "artifact_link_1",
  type: "LinkSuggestion",
  title: "Connect recall and spacing",
  summary: "These notes should probably be linked.",
  body: "The two notes share an evidence chain.",
  status: "pending_review",
  agentRunId: "run_1",
  contextPackId: "ctx_1",
  sources: { noteIds: ["note_a", "note_b"] },
  confidence: { label: "high", score: 0.9 },
  privacy: { mode: "normal" },
  payload: {
    from: { kind: "note", id: "note_a" },
    to: { kind: "note", id: "note_b" },
    relationType: "supports",
    rationale: "The first note supports the second."
  },
  userDecisions: []
};

test("AI inbox panel renders filters, list, detail, feedback, and accept-link action", () => {
  const html = renderAiInboxPanel({
    items: [item],
    counts: { pending: 1, reviewed: 2, archived: 0, all: 3 },
    filters: { view: "pending", type: "all" },
    evaluationSummary: {
      filter: { view: "pending", type: "", sourceNoteId: "", privacyMode: "" },
      artifacts: { total: 1, withDecision: 0 },
      decisions: { total: 0, latest: {} },
      feedback: { all: { useful: 0, noisy: 0, wrong: 0, alreadyKnown: 0, privacyConcern: 0 } }
    },
    selectedArtifactId: "artifact_link_1",
    detail: { item, artifact }
  });

  assert.match(html, /AI 建议/);
  assert.match(html, /class="ai-inbox-view-strip"/);
  assert.match(html, /class="ai-inbox-helper-row"/);
  assert.ok(html.indexOf("ai-inbox-view-strip") < html.indexOf("ai-inbox-grid"));
  assert.doesNotMatch(html, /处理质量/);
  assert.match(html, /待判断/);
  assert.match(html, /data-ai-inbox-view="pending"/);
  assert.match(html, /id="aiInboxTypeFilter"/);
  assert.match(html, /data-ai-inbox-artifact-id="artifact_link_1"/);
  assert.match(html, /data-ai-inbox-open-note="note_a"/);
  assert.match(html, /data-ai-inbox-decision="accepted"/);
  assert.match(html, /data-ai-inbox-feedback="privacyConcern"/);
  assert.match(html, /data-ai-inbox-accept-link="artifact_link_1"/);
  assert.match(html, /建立为笔记关系/);
});

test("AI inbox panel hides artifact decision buttons after the item is already reviewed", () => {
  const reviewedItem = { ...item, status: "ignored", actionState: "reviewed" };
  const html = renderAiInboxPanel({
    items: [reviewedItem],
    counts: { pending: 0, reviewed: 1, archived: 0, all: 1 },
    filters: { view: "reviewed", type: "all" },
    selectedArtifactId: "artifact_link_1",
    detail: { item: reviewedItem, artifact: { ...artifact, status: "ignored" } }
  });

  assert.match(html, /这条建议已经处理过/);
  assert.doesNotMatch(html, /data-ai-inbox-decision="accepted"/);
  assert.doesNotMatch(html, /data-ai-inbox-decision="ignored"/);
  assert.doesNotMatch(html, /data-ai-inbox-decision="archived"/);
});

test("AI inbox panel disables accept-link for non-note endpoints", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_link_2" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_link_2",
    detail: {
      item: { ...item, artifactId: "artifact_link_2" },
      artifact: {
        ...artifact,
        id: "artifact_link_2",
        payload: {
          from: { kind: "note", id: "note_a" },
          to: { kind: "source_doc", id: "src_1" }
        }
      }
    }
  });

  assert.match(html, /不能直接写入图谱/);
  assert.match(html, /data-ai-inbox-accept-link="artifact_link_2"[\s\S]*disabled/);
  assert.doesNotMatch(html, /data-ai-inbox-open-note="src_1"/);
});

test("AI inbox panel renders draft note promotion for QuestionCard artifacts", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_question_1", type: "QuestionCard", title: "A question" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_question_1",
    detail: {
      item: { ...item, artifactId: "artifact_question_1", type: "QuestionCard", title: "A question" },
      artifact: {
        ...artifact,
        id: "artifact_question_1",
        type: "QuestionCard",
        title: "A question",
        payload: { question: "What needs testing?" }
      }
    }
  });

  assert.match(html, /可生成草稿笔记/);
  assert.match(html, /生成草稿笔记/);
  assert.match(html, /data-ai-inbox-promote-note="artifact_question_1"/);
});

test("AI inbox panel names missing-relation graph messages as pending-relation notes", () => {
  const missingRelationItem = {
    ...item,
    artifactId: "artifact_missing_relation_1",
    type: "QuestionCard",
    title: "Isolated permanent note",
    summary: "Graph note needs a relation",
    primarySourceNoteId: "pn_missing_relation"
  };
  const html = renderAiInboxPanel({
    items: [missingRelationItem],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_missing_relation_1",
    detail: {
      item: missingRelationItem,
      artifact: {
        ...artifact,
        id: "artifact_missing_relation_1",
        type: "QuestionCard",
        title: "Isolated permanent note",
        summary: "Graph note needs a relation",
        payload: {
          suggestedAction: "review_missing_relations",
          noteId: "pn_missing_relation",
          noteTitle: "Graph note needs a relation"
        }
      }
    }
  });

  assert.ok(html.includes("《Graph note needs a relation》还没有进入关系网"));
  assert.ok(html.includes("Graph note needs a relation"));
  assert.ok(html.includes("处理关联"));
  assert.ok(html.includes("这条永久笔记还没有关联"));
  assert.doesNotMatch(html, /未关联笔记/);
  assert.doesNotMatch(html, /未入关系网/);
  assert.doesNotMatch(html, /打开笔记处理关联/);
});

test("AI inbox panel renders field suggestion adoption for InsightCard artifacts", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_field_1", type: "InsightCard", title: "字段建议：补充 thesis" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_field_1",
    detail: {
      item: { ...item, artifactId: "artifact_field_1", type: "InsightCard", title: "字段建议：补充 thesis" },
      artifact: {
        ...artifact,
        id: "artifact_field_1",
        type: "InsightCard",
        title: "字段建议：补充 thesis",
        body: "AI 建议必须先成为草稿。",
        payload: {
          targetField: "thesis",
          fieldSuggestion: {
            target: { type: "permanent_note", id: "pn_1", field: "thesis" },
            content: { thesis: "AI 建议必须先成为草稿。" }
          }
        }
      }
    }
  });

  assert.match(html, /可采纳为观点草稿/);
  assert.match(html, /写入草稿/);
  assert.match(html, /data-ai-inbox-adopt-field="artifact_field_1"/);
  assert.match(html, /data-ai-inbox-suggestion-id=""/);
});

test("AI inbox panel keeps traceability and review history out of the main detail", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_field_trace", type: "InsightCard", title: "Field suggestion trace" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_field_trace",
    detail: {
      item: { ...item, artifactId: "artifact_field_trace", type: "InsightCard", title: "Field suggestion trace" },
      artifact: {
        ...artifact,
        id: "artifact_field_trace",
        type: "InsightCard",
        title: "Field suggestion trace",
        body: "AI suggestions should become a draft before they become a judgment.",
        payload: {
          targetField: "thesis",
          fieldSuggestion: {
            target: { type: "permanent_note", id: "pn_1", field: "thesis" },
            content: { thesis: "AI suggestions should become a draft before they become a judgment." }
          }
        }
      },
      suggestion: {
        id: "suggestion_field_trace",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "AI suggestions should become a draft before they become a judgment." },
        status: "adopted_as_draft",
        sourceArtifactId: "artifact_field_trace",
        provenance: { contentOrigin: "ai_generated", humanEdited: false, humanConfirmed: false }
      },
      suggestionReviewEvents: [
        {
          adoptionEventId: "evt_field_trace",
          eventType: "adopted_as_draft",
          createdAt: "2026-05-18T12:05:00.000Z",
          metadata: { fromStatus: "suggested", toStatus: "adopted_as_draft" },
          comment: "Use as draft."
        }
      ],
      trace: {
        suggestionId: "suggestion_field_trace",
        sourceArtifactId: "artifact_field_trace",
        sourceNoteIds: ["pn_1"],
        targetNoteId: "pn_1",
        targetField: "thesis",
        suggestionStatus: "adopted_as_draft"
      }
    }
  });

  assert.match(html, /观点草稿建议/);
  assert.doesNotMatch(html, /Suggestion trace/);
  assert.doesNotMatch(html, /Next step/);
  assert.doesNotMatch(html, /Reviewed content/);
  assert.doesNotMatch(html, /Suggestion provenance/);
  assert.doesNotMatch(html, /Suggestion history/);
  assert.match(html, /data-ai-inbox-suggestion-status="edited"/);
  assert.match(html, /data-ai-inbox-suggestion-id="suggestion_field_trace"/);
  assert.doesNotMatch(html, /id="aiInboxSuggestionContentEditor"/);
  assert.match(html, /data-ai-inbox-open-note="note_a"[\s\S]*打开来源笔记 1/);
});

test("AI inbox panel hides incomplete trace placeholders from the main detail", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_field_placeholder", type: "InsightCard", title: "Field suggestion placeholder" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_field_placeholder",
    detail: {
      item: { ...item, artifactId: "artifact_field_placeholder", type: "InsightCard", title: "Field suggestion placeholder" },
      artifact: {
        ...artifact,
        id: "artifact_field_placeholder",
        type: "InsightCard",
        title: "Field suggestion placeholder",
        payload: {
          fieldSuggestionId: "suggestion_field_placeholder",
          fieldSuggestion: {
            status: "suggested"
          }
        }
      },
      trace: {}
    }
  });

  assert.match(html, /观点草稿建议/);
  assert.doesNotMatch(html, /这条建议的来源或目标信息不完整/);
  assert.doesNotMatch(html, /这条建议还没有连接到目标笔记/);
  assert.doesNotMatch(html, /data-ai-inbox-open-note=""[\s\S]*disabled/);
});

test("AI inbox panel keeps canonical trace fields inside collapsed technical details", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_field_trace_priority", type: "InsightCard", title: "Field suggestion trace priority" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_field_trace_priority",
    detail: {
      item: { ...item, artifactId: "artifact_field_trace_priority", type: "InsightCard", title: "Field suggestion trace priority" },
      artifact: {
        ...artifact,
        id: "artifact_field_trace_priority",
        type: "InsightCard",
        payload: {
          fieldSuggestionId: "suggestion_trace_priority",
          fieldSuggestion: {
            status: "edited"
          }
        }
      },
      suggestion: {
        id: "suggestion_trace_priority",
        target: { type: "permanent_note", id: "", field: "" },
        scope: "note_field",
        content: { thesis: "Trace should prefer canonical fields." },
        status: "edited",
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
  assert.match(html, /目标笔记<\/dt><dd>pn_trace/);
  assert.match(html, /目标字段<\/dt><dd>thesis/);
  assert.doesNotMatch(html, /来源或目标信息不完整/);
});

test("AI inbox panel advances suggestion review actions from edited to confirmed", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_field_confirm", type: "InsightCard", title: "Field suggestion confirm" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_field_confirm",
    detail: {
      item: { ...item, artifactId: "artifact_field_confirm", type: "InsightCard", title: "Field suggestion confirm", status: "adopted_as_draft" },
      artifact: {
        ...artifact,
        id: "artifact_field_confirm",
        type: "InsightCard",
        status: "adopted_as_draft",
        userDecisions: [{ decision: "adopted_as_draft", noteId: "pn_1" }]
      },
      suggestion: {
        id: "suggestion_field_confirm",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Edited content awaiting confirmation." },
        status: "edited",
        sourceArtifactId: "artifact_field_confirm",
        provenance: { contentOrigin: "ai_generated", humanEdited: true, humanConfirmed: false }
      },
      suggestionReviewEvents: [
        {
          adoptionEventId: "evt_field_confirm",
          eventType: "edited",
          createdAt: "2026-05-18T12:10:00.000Z",
          metadata: { fromStatus: "adopted_as_draft", toStatus: "edited" },
          comment: "Tightened the wording."
        }
      ],
      trace: {
        suggestionId: "suggestion_field_confirm",
        sourceArtifactId: "artifact_field_confirm",
        sourceNoteIds: ["pn_1"],
        targetNoteId: "pn_1",
        targetField: "thesis",
        suggestionStatus: "edited"
      }
    }
  });

  assert.match(html, /data-ai-inbox-suggestion-status="confirmed"/);
  assert.match(html, /确认/);
  assert.doesNotMatch(html, /Ready to confirm/);
  assert.doesNotMatch(html, /Reviewed content/);
});

test("AI inbox panel surfaces review action errors inside the detail pane", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_action_error", type: "InsightCard", title: "Field suggestion error" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_action_error",
    actionArtifactId: "artifact_action_error",
    actionSuggestionId: "suggestion_action_error",
    actionError: "action boom",
    detail: {
      item: { ...item, artifactId: "artifact_action_error", type: "InsightCard", title: "Field suggestion error", status: "adopted_as_draft" },
      artifact: {
        ...artifact,
        id: "artifact_action_error",
        type: "InsightCard",
        status: "adopted_as_draft"
      },
      suggestion: {
        id: "suggestion_action_error",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Edited content awaiting confirmation." },
        status: "edited",
        sourceArtifactId: "artifact_action_error",
        provenance: { contentOrigin: "ai_generated", humanEdited: true, humanConfirmed: false }
      }
    }
  });

  assert.match(html, /建议处理失败：action boom/);
  assert.match(html, /data-ai-inbox-suggestion-status="confirmed"/);
});

test("AI inbox panel does not keep rendering stale detail loading after selection has moved", () => {
  const html = renderAiInboxPanel({
    items: [
      { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      { ...item, artifactId: "artifact_b", title: "Selected artifact B" }
    ],
    counts: { pending: 2 },
    selectedArtifactId: "artifact_b",
    detail: { item: { ...item, artifactId: "artifact_b", title: "Selected artifact B" } },
    detailArtifactId: "artifact_a",
    detailLoading: true
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /正在读取建议详情/);
  assert.match(detailPane, /Selected artifact B/);
});

test("AI inbox panel does not keep rendering stale detail errors after selection has moved", () => {
  const html = renderAiInboxPanel({
    items: [
      { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      { ...item, artifactId: "artifact_b", title: "Selected artifact B" }
    ],
    counts: { pending: 2 },
    selectedArtifactId: "artifact_b",
    detail: { item: { ...item, artifactId: "artifact_b", title: "Selected artifact B" } },
    detailArtifactId: "artifact_a",
    detailError: "detail boom"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /detail boom/);
  assert.match(detailPane, /Selected artifact B/);
});

test("AI inbox panel does not mutate scoped detail or action errors back onto the input state", () => {
  const state = {
    items: [
      { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      { ...item, artifactId: "artifact_b", title: "Selected artifact B" }
    ],
    counts: { pending: 2 },
    selectedArtifactId: "artifact_b",
    detail: { item: { ...item, artifactId: "artifact_b", title: "Selected artifact B" } },
    detailArtifactId: "artifact_a",
    detailError: "detail boom",
    actionArtifactId: "artifact_a",
    actionError: "action boom"
  };

  renderAiInboxPanel(state);

  assert.equal(state.detailError, "detail boom");
  assert.equal(state.actionError, "action boom");
});

test("AI inbox panel surfaces inline no-op review notices inside the detail pane", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_action_notice", type: "InsightCard", title: "Field suggestion notice" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_action_notice",
    actionNoticeArtifactId: "artifact_action_notice",
    actionNoticeSuggestionId: "suggestion_action_notice",
    actionNotice: "This reviewed suggestion is already confirmed.",
    actionNoticeTone: "ok",
    detail: {
      item: { ...item, artifactId: "artifact_action_notice", type: "InsightCard", title: "Field suggestion notice", status: "adopted_as_draft" },
      artifact: {
        ...artifact,
        id: "artifact_action_notice",
        type: "InsightCard",
        status: "adopted_as_draft"
      },
      suggestion: {
        id: "suggestion_action_notice",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Edited content awaiting confirmation." },
        status: "confirmed",
        sourceArtifactId: "artifact_action_notice",
        provenance: { contentOrigin: "ai_generated", humanEdited: true, humanConfirmed: true }
      }
    }
  });

  assert.match(html, /data-ai-inbox-action-notice="true"/);
  assert.match(html, /This reviewed suggestion is already confirmed\./);
});

test("AI inbox panel does not surface stale suggestion review notices when the artifact stays selected but the suggestion changes", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_action_notice", type: "InsightCard", title: "Field suggestion notice" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_action_notice",
    actionNoticeArtifactId: "artifact_action_notice",
    actionNoticeSuggestionId: "suggestion_old",
    actionNotice: "This reviewed suggestion is already confirmed.",
    actionNoticeTone: "ok",
    detail: {
      item: { ...item, artifactId: "artifact_action_notice", type: "InsightCard", title: "Field suggestion notice", status: "adopted_as_draft" },
      artifact: {
        ...artifact,
        id: "artifact_action_notice",
        type: "InsightCard",
        status: "adopted_as_draft"
      },
      suggestion: {
        id: "suggestion_new",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Edited content awaiting confirmation." },
        status: "edited",
        sourceArtifactId: "artifact_action_notice",
        provenance: { contentOrigin: "ai_generated", humanEdited: true, humanConfirmed: false }
      }
    }
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /This reviewed suggestion is already confirmed\./);
  assert.match(detailPane, /data-ai-inbox-suggestion-id="suggestion_new"/);
  assert.match(detailPane, /data-ai-inbox-suggestion-status="confirmed"/);
});

test("AI inbox panel does not surface stale review notices after selection has moved", () => {
  const html = renderAiInboxPanel({
    items: [
      { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      { ...item, artifactId: "artifact_b", title: "Selected artifact B" }
    ],
    counts: { reviewed: 2 },
    selectedArtifactId: "artifact_b",
    actionNoticeArtifactId: "artifact_a",
    actionNotice: "This reviewed suggestion is already confirmed.",
    actionNoticeTone: "ok",
    detail: {
      item: { ...item, artifactId: "artifact_b", title: "Selected artifact B" },
      artifact: { ...artifact, id: "artifact_b", title: "Selected artifact B" }
    }
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /This reviewed suggestion is already confirmed\./);
  assert.match(detailPane, /data-ai-inbox-accept-link="artifact_b"/);
});

test("AI inbox panel does not keep rendering stale detail when selection has moved", () => {
  const html = renderAiInboxPanel({
    items: [
      { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      { ...item, artifactId: "artifact_b", title: "Selected artifact B" }
    ],
    counts: { pending: 2 },
    selectedArtifactId: "artifact_b",
    detail: {
      item: { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      artifact: { ...artifact, id: "artifact_a", title: "Selected artifact A" },
      suggestion: {
        id: "suggestion_stale_a",
        target: { type: "permanent_note", id: "pn_a", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Should not leak from stale detail." },
        status: "adopted_as_draft"
      }
    }
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /Selected artifact A/);
  assert.match(detailPane, /Selected artifact B/);
  assert.doesNotMatch(detailPane, /Should not leak from stale detail/);
  assert.match(detailPane, /正在读取详情/);
  assert.match(detailPane, /详情读取完成后再处理/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-decision=/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-suggestion-status=/);
});

test("AI inbox panel keeps owned review notices visible behind the review-safety gate", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_b", title: "Selected artifact B" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_b",
    actionNoticeArtifactId: "artifact_b",
    actionNotice: "另一条建议正在处理，请稍后再处理当前建议。",
    actionNoticeTone: "warn",
    detail: null
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /正在读取详情/);
  assert.match(detailPane, /data-ai-inbox-action-notice="true"/);
  assert.match(detailPane, /另一条建议正在处理/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-decision=/);
});

test("AI inbox panel keeps owned review errors visible behind the review-safety gate", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_b", title: "Selected artifact B" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_b",
    actionArtifactId: "artifact_b",
    actionError: "action boom",
    detail: null
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /正在读取详情/);
  assert.match(detailPane, /建议处理失败：action boom/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-decision=/);
});

test("AI inbox panel keeps owned busy state visible behind the review-safety gate", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_b", title: "Selected artifact B" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_b",
    actionLoading: true,
    actionArtifactId: "artifact_b",
    actionNoticeArtifactId: "artifact_b",
    actionNotice: "另一条建议正在处理，请稍后再处理当前建议。",
    actionNoticeTone: "warn",
    detail: null
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.match(detailPane, /正在读取详情/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-decision=/);
});

test("AI inbox panel does not keep review safety busy when the artifact stays selected but the in-flight action belongs to an older suggestion", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_b", title: "Selected artifact B", suggestionId: "suggestion_new" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_b",
    actionLoading: true,
    actionArtifactId: "artifact_b",
    actionSuggestionId: "suggestion_old",
    detail: null
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /正在读取详情/);
  assert.doesNotMatch(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-decision=/);
});

test("AI inbox panel keeps review safety visible while the selected latest detail is hydrating", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_loading", title: "Loading artifact" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_loading",
    detail: null,
    detailArtifactId: "artifact_loading",
    detailLoading: true
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /正在读取详情/);
  assert.match(detailPane, /正在读取最新详情/);
  assert.match(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-decision=/);
});

test("AI inbox panel keeps review safety visible when the selected latest detail fails to load", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_detail_error", title: "Error artifact" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_detail_error",
    detail: null,
    detailArtifactId: "artifact_detail_error",
    detailError: "detail boom"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /正在读取详情/);
  assert.match(detailPane, /详情读取失败：detail boom/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-decision=/);
});

test("AI inbox panel does not surface stale review action errors after selection has moved", () => {
  const html = renderAiInboxPanel({
    items: [
      { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      { ...item, artifactId: "artifact_b", title: "Selected artifact B" }
    ],
    counts: { reviewed: 2 },
    selectedArtifactId: "artifact_b",
    actionArtifactId: "artifact_a",
    actionError: "action boom",
    detail: {
      item: { ...item, artifactId: "artifact_b", title: "Selected artifact B" },
      artifact: { ...artifact, id: "artifact_b", title: "Selected artifact B" }
    }
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /建议处理失败：action boom/);
  assert.match(detailPane, /data-ai-inbox-accept-link="artifact_b"/);
});

test("AI inbox panel does not surface stale suggestion review errors when the artifact stays selected but the suggestion changes", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_action_error", type: "InsightCard", title: "Field suggestion error" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_action_error",
    actionArtifactId: "artifact_action_error",
    actionSuggestionId: "suggestion_old",
    actionError: "action boom",
    detail: {
      item: { ...item, artifactId: "artifact_action_error", type: "InsightCard", title: "Field suggestion error", status: "adopted_as_draft" },
      artifact: {
        ...artifact,
        id: "artifact_action_error",
        type: "InsightCard",
        status: "adopted_as_draft"
      },
      suggestion: {
        id: "suggestion_new",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Edited content awaiting confirmation." },
        status: "edited",
        sourceArtifactId: "artifact_action_error",
        provenance: { contentOrigin: "ai_generated", humanEdited: true, humanConfirmed: false }
      }
    }
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /建议处理失败：action boom/);
  assert.match(detailPane, /data-ai-inbox-suggestion-id="suggestion_new"/);
  assert.match(detailPane, /data-ai-inbox-suggestion-status="confirmed"/);
});

test("AI inbox panel does not keep suggestion review actions disabled when the artifact stays selected but the action belongs to an older suggestion", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_action_loading", type: "InsightCard", title: "Field suggestion loading" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_action_loading",
    actionLoading: true,
    actionArtifactId: "artifact_action_loading",
    actionSuggestionId: "suggestion_old",
    detail: {
      item: { ...item, artifactId: "artifact_action_loading", type: "InsightCard", title: "Field suggestion loading", status: "adopted_as_draft" },
      artifact: {
        ...artifact,
        id: "artifact_action_loading",
        type: "InsightCard",
        status: "adopted_as_draft"
      },
      suggestion: {
        id: "suggestion_new",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Edited content awaiting confirmation." },
        status: "edited",
        sourceArtifactId: "artifact_action_loading",
        provenance: { contentOrigin: "ai_generated", humanEdited: true, humanConfirmed: false }
      }
    }
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /data-ai-inbox-suggestion-status="confirmed"/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-suggestion-status="confirmed"[^>]*disabled/);
  assert.doesNotMatch(detailPane, /<article class="ai-inbox-detail is-busy">/);
});

test("AI inbox panel still disables artifact-scoped controls when the artifact stays selected but the in-flight action belongs to an older suggestion", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_same", title: "Artifact with newer suggestion" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_same",
    detail: {
      item: { ...item, artifactId: "artifact_same", title: "Artifact with newer suggestion" },
      artifact: {
        ...artifact,
        id: "artifact_same",
        title: "Artifact with newer suggestion"
      },
      suggestion: { id: "suggestion_current", status: "edited", content: { thesis: "Current suggestion" } }
    },
    actionLoading: true,
    actionArtifactId: "artifact_same",
    actionSuggestionId: "suggestion_old",
    aiSummaryArtifactId: "artifact_same",
    aiSummarySuggestionId: "suggestion_current",
    aiSummary: "建议：建立关系",
    aiSummaryMeta: "local_private_gateway / qwen2.5:3b",
    aiSummaryRecommendedAction: "accept_link"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-suggestion-status="confirmed"[^>]*disabled/);
  assert.match(detailPane, /id="aiInboxDecisionComment"[^>]*disabled/);
  assert.match(detailPane, /data-ai-inbox-feedback="useful"[^>]*disabled/);
  assert.match(detailPane, /data-ai-inbox-open-note="note_a"[^>]*disabled/);
  assert.match(detailPane, /data-ai-inbox-decision="accepted"[^>]*disabled/);
  assert.match(detailPane, /data-ai-inbox-accept-link="artifact_same"[\s\S]*disabled/);
  assert.doesNotMatch(detailPane, /id="btnAiInboxSummarize"/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-recommended-action="accept_link"/);
});

test("AI inbox panel disables current-item actions while the current artifact action is still in flight", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_link_busy", title: "Busy link artifact" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_link_busy",
    actionLoading: true,
    actionArtifactId: "artifact_link_busy",
    detail: {
      item: { ...item, artifactId: "artifact_link_busy", title: "Busy link artifact" },
      artifact: { ...artifact, id: "artifact_link_busy", title: "Busy link artifact" },
      suggestion: {
        id: "suggestion_busy",
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        scope: "note_field",
        content: { thesis: "Edited content awaiting confirmation." },
        status: "edited",
        sourceArtifactId: "artifact_link_busy",
        provenance: { contentOrigin: "ai_generated", humanEdited: true, humanConfirmed: false }
      }
    },
    aiSummaryArtifactId: "artifact_link_busy",
    aiSummarySuggestionId: "suggestion_busy",
    aiSummary: "建议：建立关系",
    aiSummaryMeta: "local_private_gateway / qwen2.5:3b",
    aiSummaryRecommendedAction: "accept_link"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.match(detailPane, /class="ai-inbox-detail is-busy"/);
  assert.match(detailPane, /id="aiInboxDecisionComment"[^>]*disabled/);
  assert.match(detailPane, /data-ai-inbox-feedback="useful"[^>]*disabled/);
  assert.match(detailPane, /data-ai-inbox-decision="accepted"[^>]*disabled/);
  assert.match(detailPane, /data-ai-inbox-accept-link="artifact_link_busy"[\s\S]*disabled/);
  assert.match(detailPane, /data-ai-inbox-open-note="note_a"[^>]*disabled/);
  assert.doesNotMatch(detailPane, /id="aiInboxSuggestionContentEditor"/);
  assert.doesNotMatch(detailPane, /id="btnAiInboxSummarize"/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-recommended-action="accept_link"/);
});

test("AI inbox panel renders an actionable AI summary recommendation outside graph review items", () => {
  const insightItem = { ...item, artifactId: "artifact_insight_summary", type: "InsightCard", title: "Insight summary" };
  const insightArtifact = { ...artifact, id: "artifact_insight_summary", type: "InsightCard", title: "Insight summary" };
  const html = renderAiInboxPanel({
    items: [insightItem],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_insight_summary",
    detail: { item: insightItem, artifact: insightArtifact },
    aiSummaryArtifactId: "artifact_insight_summary",
    aiSummary: "建议：建立关系",
    aiSummaryMeta: "local_private_gateway / qwen2.5:3b",
    aiSummaryRecommendedAction: "accept_link"
  });

  assert.match(html, /建议建立关系/);
  assert.match(html, /data-ai-inbox-recommended-action="accept_link"/);
  assert.match(html, /建立关系/);
});

test("AI inbox panel does not keep rendering stale AI summary when selection has moved", () => {
  const html = renderAiInboxPanel({
    items: [
      { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      { ...item, artifactId: "artifact_b", title: "Selected artifact B" }
    ],
    counts: { pending: 2 },
    selectedArtifactId: "artifact_b",
    detail: {
      item: { ...item, artifactId: "artifact_a", title: "Selected artifact A" },
      artifact: { ...artifact, id: "artifact_a", title: "Selected artifact A" }
    },
    aiSummaryArtifactId: "artifact_a",
    aiSummary: "Old summary should not leak.",
    aiSummaryMeta: "provider_a / model_a",
    aiSummaryRecommendedAction: "accept_link"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /Old summary should not leak/);
  assert.doesNotMatch(detailPane, /建议建立关系/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-recommended-action=/);
});

test("AI inbox panel does not keep rendering stale AI summary when the artifact stays selected but the linked suggestion changes", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_insight_1", type: "InsightCard" }],
    counts: { pending: 1 },
    selectedArtifactId: "artifact_insight_1",
    detail: {
      item: { ...item, artifactId: "artifact_insight_1", type: "InsightCard" },
      artifact: {
        ...artifact,
        id: "artifact_insight_1",
        type: "InsightCard",
        payload: {
          fieldSuggestion: {
            id: "suggestion_current",
            status: "suggested",
            targetField: "summary"
          }
        }
      },
      suggestion: {
        id: "suggestion_current",
        status: "suggested",
        target: { kind: "note", id: "note_a", field: "summary" }
      }
    },
    aiSummaryArtifactId: "artifact_insight_1",
    aiSummarySuggestionId: "suggestion_old",
    aiSummary: "Old summary should not leak across suggestion changes.",
    aiSummaryMeta: "provider_a / model_a",
    aiSummaryRecommendedAction: "adopt_field_suggestion"
  });
  const detailPane = html.split('<section class="ai-inbox-detail-pane">')[1] || "";

  assert.doesNotMatch(detailPane, /Old summary should not leak across suggestion changes/);
  assert.doesNotMatch(detailPane, /建议建立关系/);
  assert.doesNotMatch(detailPane, /data-ai-inbox-recommended-action=/);
  assert.match(detailPane, /id="btnAiInboxSummarize"/);
  assert.doesNotMatch(detailPane, /id="btnAiInboxSummarize"[^>]*disabled/);
});

test("AI inbox panel disables draft note promotion after an artifact is promoted", () => {
  const html = renderAiInboxPanel({
    items: [{ ...item, artifactId: "artifact_question_2", type: "QuestionCard", status: "promoted_to_note" }],
    counts: { reviewed: 1 },
    selectedArtifactId: "artifact_question_2",
    detail: {
      item: { ...item, artifactId: "artifact_question_2", type: "QuestionCard", status: "promoted_to_note" },
      artifact: {
        ...artifact,
        id: "artifact_question_2",
        type: "QuestionCard",
        status: "promoted_to_note",
        userDecisions: [{ decision: "promoted_to_note", noteId: "note_1" }]
      }
    }
  });

  assert.match(html, /已经生成一条草稿笔记/);
  assert.match(html, /data-ai-inbox-promote-note="artifact_question_2"[\s\S]*disabled/);
});

test("AI inbox panel renders loading and empty states", () => {
  assert.match(renderAiInboxPanel({ loading: true }), /正在读取 AI 建议/);
  assert.match(renderAiInboxPanel({ evaluationLoading: true }), /正在统计处理情况/);
  assert.match(renderAiInboxPanel({ evaluationError: "boom" }), /处理统计加载失败：boom/);
  assert.match(renderAiInboxPanel({ items: [], counts: {}, filters: { view: "reviewed" } }), /当前筛选下没有待处理建议/);
});
