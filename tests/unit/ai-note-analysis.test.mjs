import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzePermanentNoteLocally,
  analyzePermanentNoteForReview,
  analyzePermanentNoteGraphLocally,
  buildPermanentNoteLocalModelRequest,
  buildPermanentNoteAnalysisReviewItems,
  buildPermanentNoteGraphReviewItems,
  createAiInbox,
  createInMemoryArtifactStore,
  mergePermanentNoteLocalModelResponse,
  normalizePermanentNoteAnalysisInput,
  noteAnalysisPrincipleCheckIds,
  tokenizeNoteAnalysisText
} from "../../packages/ai-orchestrator/src/index.mjs";

function check(result, checkId) {
  return result.principleChecks.find((item) => item.checkId === checkId);
}

test("local permanent note analysis flags notes that still look like raw material", () => {
  const result = analyzePermanentNoteLocally({
    noteId: "pn_material",
    title: "关于知识管理",
    body: "# 关于知识管理\n\n## 摘录\n\n这是一段资料摘录，还没有形成我的判断。"
  });

  assert.equal(result.noteId, "pn_material");
  assert.equal(result.analysisMode, "local_rule");
  assert.equal(result.analysisStatus, "warning");
  assert.equal(result.distillation.status, "warning");
  assert.ok(result.distillation.reasons.includes("thesis_missing"));
  assert.equal(check(result, "judgment_not_material").status, "warning");
  assert.equal(check(result, "has_thesis").status, "warning");
  assert.equal(result.provenance.modelUsed, false);
  assert.equal(result.provenance.canAutoConfirm, false);
  assert.ok(result.recommendedActions.some((item) => item.actionId === "write_thesis"));
});

test("local permanent note analysis passes mature reusable notes", () => {
  const result = analyzePermanentNoteLocally({
    noteId: "pn_ready",
    title: "AI 候选不能直接成为判断",
    thesis: "AI 可以帮助用户发现结构，但不能替用户确认永久判断。",
    threeLineSummary: [
      "AI 的价值在于暴露结构、缺口和可能关系。",
      "永久笔记代表用户愿意承担的判断，因此需要确认边界。",
      "这个原则能防止研思录变成自动代写工具。"
    ],
    boundaryOrCounterpoint: "如果只是临时草稿，可以先保留为候选而不是确认。",
    citations: [{ source_id: "src_design", locator: "design-notes" }]
  });

  assert.equal(result.analysisStatus, "pass");
  assert.equal(result.distillation.status, "pass");
  assert.equal(result.originality.status, "pass");
  assert.equal(check(result, "judgment_not_material").status, "pass");
  assert.equal(check(result, "traceable_sources").status, "pass");
  assert.deepEqual(result.relationCandidates, []);
});

test("local permanent note analysis reuses originality guard for copied source text", () => {
  const result = analyzePermanentNoteLocally({
    noteId: "pn_copied",
    thesis: "A copied claim that should stay as a literature note",
    citations: [{ source_id: "src_1", locator: "p. 1" }],
    literatureNotes: [
      {
        id: "ln_1",
        source_id: "src_1",
        quote_text: "A copied claim that should stay as a literature note",
        locator: "p. 1"
      }
    ],
    options: {
      originalityPlan: { warnThreshold: 0.5, blockThreshold: 0.8 }
    }
  });

  assert.equal(result.analysisStatus, "blocked");
  assert.equal(result.originality.status, "blocked");
  assert.ok(result.originality.reasons.includes("similarity_above_block_threshold"));
  assert.equal(result.originality.recommendedAction, "rewrite_as_original_judgment");
  assert.ok(result.recommendedActions.some((item) => item.actionId === "review_originality"));
});

test("local permanent note analysis creates suggested relation candidates without confirming graph edges", () => {
  const result = analyzePermanentNoteLocally({
    noteId: "pn_ai_boundary",
    title: "AI 候选边界",
    thesis: "AI 候选应该帮助用户看见关系，而不是自动替用户确认关系。",
    threeLineSummary: ["候选不是判断。", "确认动作属于用户。", "这能保护原创判断。"],
    boundaryOrCounterpoint: "低风险提示可以自动出现，但图谱边必须人工确认。",
    relatedNotes: [
      {
        noteId: "pn_relation_reason",
        title: "好的关联要写出为什么",
        thesis: "好的关联必须说明为什么相关，而不能只画一条线。",
        threeLineSummary: ["关系需要理由。", "理由帮助复查。", "理由让写作可追溯。"],
        boundaryOrCounterpoint: "弱关系可以留作候选。"
      },
      {
        noteId: "pn_unrelated",
        title: "咖啡设备清单",
        body: "磨豆机、水壶、滤杯。"
      }
    ],
    options: { minRelationConfidence: 0.1 }
  });

  assert.equal(result.relationCandidates.length, 1);
  assert.equal(result.relationCandidates[0].toNoteId, "pn_relation_reason");
  assert.equal(result.relationCandidates[0].status, "suggested");
  assert.notEqual(result.relationCandidates[0].status, "confirmed");
  assert.ok(result.relationCandidates[0].confidence >= 0.1);
  assert.ok(result.recommendedActions.some((item) => item.actionId === "review_relation_candidates"));
});

test("note analysis input normalization and tokenization expose stable helper contracts", () => {
  const input = normalizePermanentNoteAnalysisInput({
    note: { id: "pn_helpers", title: "Helper note", tags: ["AI", "", "写作"] }
  });

  assert.equal(input.note.noteId, "pn_helpers");
  assert.deepEqual(input.note.tags, ["AI", "写作"]);
  assert.ok(noteAnalysisPrincipleCheckIds().includes("authorship_boundary"));
  assert.ok(tokenizeNoteAnalysisText({ noteId: "pn_helpers", thesis: "AI helps writing decisions" }).includes("ai"));
});

test("note analysis review items convert local findings into pending artifacts and suggested fields", () => {
  const { analysis, reviewItems } = analyzePermanentNoteForReview(
    {
      noteId: "pn_review",
      title: "AI 关系候选",
      body: "# AI 关系候选\n\n这条笔记记录 AI 如何提示关系，但还没有确认判断。",
      relatedNotes: [
        {
          noteId: "pn_review_related",
          thesis: "AI 关系候选必须说明为什么相关，而不是直接写入图谱。"
        }
      ],
      options: { minRelationConfidence: 0.1 }
    },
    {
      agentRunId: "run_note_analysis_review",
      contextPackId: "ctx_note_analysis_review",
      now: "2026-05-15T09:00:00.000Z"
    }
  );

  assert.equal(analysis.noteId, "pn_review");
  assert.equal(reviewItems.noteId, "pn_review");
  assert.equal(reviewItems.summary.canAutoConfirm, false);
  assert.ok(reviewItems.artifacts.some((item) => item.type === "LinkSuggestion"));
  assert.ok(reviewItems.artifacts.every((item) => item.status === "pending_review"));
  assert.ok(reviewItems.artifacts.every((item) => item.origin === "system_rule"));
  assert.ok(reviewItems.suggestions.length >= 1);
  assert.ok(reviewItems.suggestions.every((item) => item.status === "suggested"));
  assert.ok(reviewItems.suggestions.every((item) => item.provenance.humanConfirmed === false));
  assert.ok(
    reviewItems.suggestions.every((suggestion) =>
      reviewItems.artifacts.some((artifact) => artifact.payload?.fieldSuggestion?.id === suggestion.id)
    )
  );

  const link = reviewItems.artifacts.find((item) => item.type === "LinkSuggestion");
  const fieldSuggestionArtifact = reviewItems.artifacts.find((item) => item.payload?.targetField === "thesis");
  assert.equal(link.payload.from.id, "pn_review");
  assert.equal(link.payload.to.id, "pn_review_related");
  assert.equal(link.status, "pending_review");
  assert.equal(fieldSuggestionArtifact.type, "InsightCard");
  assert.equal(fieldSuggestionArtifact.status, "pending_review");
  assert.equal(fieldSuggestionArtifact.payload.fieldSuggestionId, fieldSuggestionArtifact.payload.fieldSuggestion.id);
  assert.equal(fieldSuggestionArtifact.payload.fieldSuggestion.status, "suggested");
  assert.equal(fieldSuggestionArtifact.payload.fieldSuggestion.provenance.humanConfirmed, false);
});

test("note analysis field suggestions are visible in AI inbox without mutating source notes", () => {
  const analysis = analyzePermanentNoteLocally({
    noteId: "pn_inbox",
    title: "来源缺失的判断",
    body: "# 来源缺失的判断\n\n永久笔记需要能追溯来源，否则后续写作难以复核。",
    boundaryOrCounterpoint: "完全个人经验可以标注为个人观察。"
  });
  const reviewItems = buildPermanentNoteAnalysisReviewItems(analysis, {
    agentRunId: "run_note_analysis_inbox",
    now: "2026-05-15T09:05:00.000Z"
  });
  const store = createInMemoryArtifactStore();
  store.createMany(reviewItems.artifacts);
  const inbox = createAiInbox({ artifactStore: store });

  const pending = inbox.listItems({ view: "pending", sourceNoteId: "pn_inbox" });
  assert.equal(pending.length, reviewItems.artifacts.length);
  assert.ok(pending.every((item) => item.actionState === "needs_review"));
  assert.ok(pending.some((item) => item.type === "SourceGap"));
  assert.ok(pending.some((item) => item.type === "InsightCard"));
  assert.ok(
    store
      .listArtifacts({ sourceNoteId: "pn_inbox" })
      .some((item) => item.payload?.fieldSuggestion?.target?.field === "thesis")
  );
  assert.deepEqual(inbox.counts({ sourceNoteId: "pn_inbox" }).reviewed, 0);
});

test("local model request builder keeps permanent note analysis local-only and review-only", () => {
  const request = buildPermanentNoteLocalModelRequest(
    {
      noteId: "pn_local_model",
      title: "AI 初判需要本地优先",
      body: "# AI 初判需要本地优先\n\n永久笔记分析可以先由本地模型补充判断，但不能自动确认关系或改写笔记。",
      tags: ["AI", "本地模型"],
      relatedNotes: [
        {
          noteId: "pn_related_local",
          title: "本地模型只能产生候选",
          body: "本地模型输出仍然应该进入审阅流程。"
        }
      ],
      literatureNotes: [
        {
          noteId: "lit_local",
          title: "本地模型资料",
          body: "来源材料需要追溯。"
        }
      ]
    },
    null,
    { localModel: "qwen2.5:7b" }
  );

  assert.equal(request.requestType, "permanent_note_local_model_analysis");
  assert.equal(request.privacy.mode, "local_only");
  assert.equal(request.privacy.cloudModelUsed, false);
  assert.equal(request.model.model, "qwen2.5:7b");
  assert.equal(request.canAutoConfirm, false);
  assert.equal(request.messages.length, 2);
  assert.match(request.messages[0].content, /never confirm/);
  const payload = JSON.parse(request.messages[1].content);
  assert.equal(payload.privacyMode, "local_only");
  assert.equal(payload.note.noteId, "pn_local_model");
  assert.equal(payload.relatedNotes[0].noteId, "pn_related_local");
  assert.equal(payload.literatureNotes[0].noteId, "lit_local");
  assert.ok(payload.localRuleBaseline);
  assert.deepEqual(Object.keys(request.responseContract), [
    "distilledViewpoint",
    "relationCandidates",
    "topicCandidates",
    "principleWarnings"
  ]);
});

test("local model response normalization keeps model findings review-only", () => {
  const request = buildPermanentNoteLocalModelRequest(
    {
      noteId: "pn_model_response",
      title: "Local model output still needs review",
      body: "A permanent note can ask a local model for candidates, but candidates must not mutate the note.",
      relatedNotes: [
        {
          noteId: "pn_model_related",
          title: "Reviewable graph candidates",
          body: "Graph edges generated by analysis remain suggestions until a person accepts them."
        }
      ]
    },
    null,
    { localModel: "qwen2.5:7b" }
  );

  const result = mergePermanentNoteLocalModelResponse(
    request,
    {
      content: `\`\`\`json
{
  "distilledViewpoint": {
    "thesis": "Local model analysis should create reviewable candidates, not confirmed note edits.",
    "threeLineSummary": [
      "The model can draft a concise claim.",
      "Its relations and topics remain provisional.",
      "The user must explicitly accept or edit every result."
    ],
    "confidenceReason": "The note states the review boundary directly."
  },
  "relationCandidates": [
    {
      "toNoteId": "pn_model_related",
      "relationType": "supports",
      "rationale": "Both notes describe reviewable graph candidates.",
      "confidence": 0.72
    }
  ],
  "topicCandidates": [
    {
      "title": "reviewable AI analysis",
      "rationale": "The note is about AI outputs entering review first."
    }
  ],
  "principleWarnings": [
    {
      "checkId": "authorship_boundary",
      "message": "Confirm that the model wording is the user's own judgment before adopting it.",
      "recommendedAction": "review_model_wording"
    }
  ]
}
\`\`\``
    },
    { agentRunId: "run_local_model_response", now: "2026-05-15T10:00:00.000Z" }
  );

  assert.equal(result.analysis.analysisMode, "local_model_assisted");
  assert.equal(result.analysis.provenance.modelUsed, true);
  assert.equal(result.analysis.provenance.cloudModelUsed, false);
  assert.equal(result.analysis.provenance.canAutoConfirm, false);
  assert.ok(result.analysis.distillation.reasons.includes("local_model_thesis_suggestion"));
  assert.equal(result.analysis.relationCandidates[0].toNoteId, "pn_model_related");
  assert.equal(result.analysis.relationCandidates[0].status, "suggested");
  assert.equal(result.analysis.principleChecks.find((item) => item.checkId === "authorship_boundary").status, "warning");
  assert.equal(result.reviewItems.summary.canAutoConfirm, false);
  assert.ok(result.reviewItems.artifacts.length >= 3);
  assert.ok(result.reviewItems.artifacts.every((item) => item.status === "pending_review"));
  assert.ok(result.reviewItems.artifacts.every((item) => item.origin === "local_model"));
  assert.ok(result.reviewItems.suggestions.every((item) => item.status === "suggested"));
  assert.ok(result.reviewItems.suggestions.every((item) => item.provenance.humanConfirmed === false));
  assert.ok(result.reviewItems.artifacts.some((item) => item.payload?.fieldSuggestion?.target?.field === "thesis"));
});

test("local graph analysis finds reviewable theme and bridge candidates without confirming edges", () => {
  const analysis = analyzePermanentNoteGraphLocally({
    notes: [
      {
        noteId: "pn_graph_a",
        title: "Reviewable AI relation candidates",
        thesis: "AI relation candidates should remain reviewable suggestions.",
        tags: ["ai-review"]
      },
      {
        noteId: "pn_graph_b",
        title: "Graph relation review boundary",
        thesis: "Graph relation candidates need human review before becoming edges.",
        tags: ["ai-review"]
      },
      {
        noteId: "pn_graph_c",
        title: "Writing synthesis",
        thesis: "Writing synthesis needs traceable note clusters.",
        tags: ["writing"]
      }
    ],
    relations: [],
    options: { minRelationConfidence: 0.05 }
  });
  const reviewItems = buildPermanentNoteGraphReviewItems(analysis, {
    agentRunId: "run_graph_analysis",
    artifactIdSalt: "graph_test",
    now: "2026-05-15T11:00:00.000Z"
  });

  assert.equal(analysis.analysisMode, "local_graph_rule");
  assert.equal(analysis.provenance.canAutoConfirm, false);
  assert.equal(analysis.topicCandidates[0].title, "ai-review");
  assert.ok(analysis.isolatedNotes.length >= 1);
  assert.ok(analysis.relationCandidates.some((candidate) => candidate.status === "suggested"));
  assert.ok(analysis.bridgeCandidates.some((candidate) => candidate.componentBridge === true));
  assert.equal(reviewItems.summary.canAutoConfirm, false);
  assert.ok(reviewItems.artifacts.some((item) => item.type === "InsightCard"));
  assert.ok(reviewItems.artifacts.some((item) => item.type === "LinkSuggestion"));
  assert.ok(reviewItems.artifacts.some((item) => item.type === "BridgeCard"));
  assert.ok(reviewItems.artifacts.some((item) => item.type === "QuestionCard"));
  assert.ok(reviewItems.artifacts.every((item) => item.status === "pending_review"));
  assert.ok(reviewItems.artifacts.every((item) => item.origin === "system_rule"));
});
