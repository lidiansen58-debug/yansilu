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

  assert.match(html, /AI 建议待办/);
  assert.match(html, /处理质量/);
  assert.match(html, /建议数/);
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

  assert.match(html, /只有“笔记到笔记”的关联建议才能进入图谱关系/);
  assert.match(html, /data-ai-inbox-accept-link="artifact_link_2"[\s\S]*disabled/);
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

  assert.match(html, /已经生成笔记 note_1/);
  assert.match(html, /data-ai-inbox-promote-note="artifact_question_2"[\s\S]*disabled/);
});

test("AI inbox panel renders loading and empty states", () => {
  assert.match(renderAiInboxPanel({ loading: true }), /正在读取 AI 建议/);
  assert.match(renderAiInboxPanel({ evaluationLoading: true }), /正在统计处理情况/);
  assert.match(renderAiInboxPanel({ evaluationError: "boom" }), /处理统计加载失败：boom/);
  assert.match(renderAiInboxPanel({ items: [], counts: {}, filters: { view: "reviewed" } }), /当前筛选下没有待处理建议/);
});
