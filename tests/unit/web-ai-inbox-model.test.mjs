import test from "node:test";
import assert from "node:assert/strict";

import {
  aiArtifactFromCanonical,
  aiInboxCounts,
  aiInboxEvaluationMetrics,
  aiInboxItemFromCanonical,
  aiInboxSummary,
  aiInboxTypeLabel,
  aiInboxTypeOptions,
  fieldSuggestionSummary,
  isNoteToNoteLinkSuggestion,
  isAdoptableFieldSuggestionArtifact,
  isPromotableNoteArtifact,
  latestFeedbackFlags,
  linkSuggestionSummary,
  notePromotionSummary,
  normalizeAiInboxFilters,
  selectedAiInboxItem
} from "../../apps/web/src/ai-inbox-model.js";

test("AI inbox model normalizes filters and counts", () => {
  assert.deepEqual(normalizeAiInboxFilters({ view: "unknown", type: "Nope", limit: 999 }), {
    view: "pending",
    type: "all",
    sourceNoteId: "",
    privacyMode: "",
    limit: 100
  });
  assert.deepEqual(aiInboxCounts({ pending: 2.7, reviewed: "3", archived: -1, all: "x" }), {
    pending: 2,
    reviewed: 3,
    archived: 0,
    all: 0
  });
  assert.equal(normalizeAiInboxFilters({ type: "InsightCard" }).type, "InsightCard");
  assert.equal(normalizeAiInboxFilters({ type: "WritingMove" }).type, "WritingMove");
});

test("AI inbox model exposes labels for insight artifact types", () => {
  const optionValues = aiInboxTypeOptions().map((item) => item.value);
  for (const type of ["InsightCard", "BridgeCard", "TensionCard", "SourceGap", "WritingMove"]) {
    assert.equal(optionValues.includes(type), true);
  }
  assert.equal(aiInboxTypeLabel("InsightCard"), "洞见卡片");
  assert.equal(aiInboxTypeLabel("BridgeCard"), "桥接卡片");
  assert.equal(aiInboxTypeLabel("TensionCard"), "张力卡片");
  assert.equal(aiInboxTypeLabel("SourceGap"), "证据缺口");
  assert.equal(aiInboxTypeLabel("WritingMove"), "写作动作");
});

test("AI inbox model picks selected item and summarizes visible view", () => {
  const items = [
    { artifactId: "artifact_1", title: "One" },
    { artifactId: "artifact_2", title: "Two" }
  ];
  assert.equal(selectedAiInboxItem(items, "artifact_2").title, "Two");
  assert.equal(selectedAiInboxItem(items, "missing").artifactId, "artifact_1");
  assert.deepEqual(aiInboxSummary({ items, counts: { pending: 7 }, filters: { view: "pending" } }), {
    visible: 2,
    view: "pending",
    viewCount: 7,
    counts: { pending: 7, reviewed: 0, archived: 0, all: 0 }
  });
});

test("AI inbox model can hydrate runtime list items from canonical payloads", () => {
  const item = aiInboxItemFromCanonical({
    artifact_id: "artifact_1",
    type: "ReflectionPrompt",
    title: "Ask the harder question",
    summary: "Push the current claim until it breaks.",
    status: "pending_review",
    action_state: "needs_review",
    origin: "ai_generated",
    privacy_mode: "normal",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:05:00.000Z",
    agent_run_id: "run_1",
    context_pack_id: "ctx_1",
    primary_source_note_id: "pn_1",
    source_note_ids: ["pn_1"],
    source_doc_ids: ["src_1"],
    decision_count: 1,
    latest_decision: {
      decision_id: "decision_1",
      artifact_id: "artifact_1",
      decision: "accepted",
      user_id: "user_1",
      note_id: "pn_1",
      comment: "keep",
      feedback: {
        useful: true,
        noisy: false,
        wrong: false,
        already_known: false,
        privacy_concern: true
      },
      created_at: "2026-05-18T12:05:00.000Z"
    },
    confidence: {
      score: 0.72,
      label: "medium",
      reason: "solid"
    }
  });

  assert.equal(item.artifactId, "artifact_1");
  assert.equal(item.actionState, "needs_review");
  assert.equal(item.primarySourceNoteId, "pn_1");
  assert.equal(item.latestDecision.feedback.useful, true);
  assert.equal(item.latestDecision.feedback.privacyConcern, true);
});

test("AI inbox model can hydrate runtime artifact detail objects from canonical payloads", () => {
  const artifact = aiArtifactFromCanonical({
    id: "artifact_1",
    type: "LinkSuggestion",
    title: "Connect these notes",
    summary: "The notes share an evidence chain.",
    body: { relationType: "supports" },
    status: "pending_review",
    origin: "ai_generated",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:05:00.000Z",
    agent_run_id: "run_1",
    context_pack_id: "ctx_1",
    model: { providerId: "openai" },
    sources: {
      note_ids: ["note_a", "note_b"],
      source_doc_ids: ["src_1"],
      artifact_ids: ["artifact_prev"],
      external_urls: ["https://example.test"]
    },
    provenance: {
      content_origin: "ai_generated",
      citation_required: true,
      human_accepted: false,
      human_rewritten: true
    },
    confidence: {
      score: 0.81,
      label: "high",
      reason: "clear overlap"
    },
    privacy: {
      mode: "local_only",
      cloud_model_used: false
    },
    user_decisions: [
      {
        decision_id: "decision_1",
        artifact_id: "artifact_1",
        decision: "revised",
        user_id: "user_1",
        note_id: "note_a",
        comment: "needs more precision",
        feedback: {
          useful: true,
          noisy: false,
          wrong: false,
          already_known: false,
          privacy_concern: false
        },
        created_at: "2026-05-18T12:05:00.000Z"
      }
    ],
    payload: {
      from: { kind: "note", id: "note_a" },
      to: { kind: "note", id: "note_b" }
    }
  });

  assert.equal(artifact.id, "artifact_1");
  assert.deepEqual(artifact.sources.noteIds, ["note_a", "note_b"]);
  assert.equal(artifact.provenance.citationRequired, true);
  assert.equal(artifact.privacy.mode, "local_only");
  assert.equal(artifact.userDecisions[0].feedback.useful, true);
});

test("AI inbox model derives evaluation metrics", () => {
  assert.deepEqual(
    aiInboxEvaluationMetrics({
      artifacts: { total: 4 },
      decisions: {
        total: 3,
        latest: {
          accepted: 1,
          adopted_as_draft: 1,
          linked_to_note: 1
        }
      },
      feedback: {
        all: {
          useful: 2,
          noisy: 1,
          wrong: 1,
          alreadyKnown: 1,
          privacyConcern: 0
        }
      },
      quality: {
        overall: {
          reviewRate: 0.75,
          acceptanceRate: 0.5
        }
      }
    }).map((item) => [item.key, item.value]),
    [
      ["artifacts", 4],
      ["review_rate", "75%"],
      ["acceptance_rate", "50%"],
      ["decisions", 3],
      ["accepted", 3],
      ["useful", 2],
      ["noisy", 1],
      ["wrong", 1],
      ["known", 1],
      ["privacy", 0]
    ]
  );
});

test("AI inbox model gates LinkSuggestion promotion to note-to-note endpoints", () => {
  const artifact = {
    type: "LinkSuggestion",
    summary: "Connect these notes.",
    confidence: { score: 0.81 },
    payload: {
      from: { kind: "note", id: "note_a" },
      to: { kind: "note", noteId: "note_b" },
      relationType: "supports"
    }
  };
  assert.equal(isNoteToNoteLinkSuggestion(artifact), true);
  assert.deepEqual(linkSuggestionSummary(artifact), {
    fromNoteId: "note_a",
    toNoteId: "note_b",
    fromKind: "note",
    toKind: "note",
    relationType: "supports",
    rationale: "Connect these notes.",
    confidence: 0.81,
    canAccept: true
  });

  assert.equal(
    isNoteToNoteLinkSuggestion({
      ...artifact,
      payload: { ...artifact.payload, to: { kind: "source_doc", id: "src_1" } }
    }),
    false
  );
});

test("AI inbox model normalizes latest feedback aliases", () => {
  assert.deepEqual(
    latestFeedbackFlags({
      latestDecision: {
        feedback: {
          useful: true,
          already_known: true,
          privacy_concern: true
        }
      }
    }),
    {
      useful: true,
      noisy: false,
      wrong: false,
      alreadyKnown: true,
      privacyConcern: true
    }
  );
});

test("AI inbox model gates note promotion to unpromoted question and reflection artifacts", () => {
  const question = {
    id: "artifact_question_1",
    type: "QuestionCard",
    title: "Where does spacing fail?",
    payload: { question: "Where does spacing fail?" },
    userDecisions: []
  };
  assert.equal(isPromotableNoteArtifact(question), true);
  assert.deepEqual(notePromotionSummary(question), {
    canPromote: true,
    promotedNoteId: "",
    suggestedTitle: "Where does spacing fail?",
    artifactType: "QuestionCard"
  });

  assert.equal(
    isPromotableNoteArtifact({
      ...question,
      userDecisions: [{ decision: "promoted_to_note", noteId: "note_1" }]
    }),
    false
  );
  assert.deepEqual(
    notePromotionSummary({
      id: "artifact_reflection_1",
      type: "ReflectionPrompt",
      title: "Try the opposite case",
      payload: { prompt: "Try the opposite case" },
      userDecisions: []
    }),
    {
      canPromote: true,
      promotedNoteId: "",
      suggestedTitle: "Try the opposite case",
      artifactType: "ReflectionPrompt"
    }
  );
  assert.equal(isPromotableNoteArtifact({ type: "LinkSuggestion" }), false);
});

test("AI inbox model identifies adoptable field suggestion artifacts", () => {
  const artifact = {
    id: "artifact_field_1",
    type: "InsightCard",
    body: "AI suggestions should stay draft until the user confirms them.",
    sources: { noteIds: ["pn_1"] },
    payload: {
      targetField: "thesis",
      fieldSuggestion: {
        target: { type: "permanent_note", id: "pn_1", field: "thesis" },
        content: { thesis: "AI suggestions should stay draft until the user confirms them." }
      }
    },
    userDecisions: []
  };

  assert.equal(isAdoptableFieldSuggestionArtifact(artifact), true);
  assert.deepEqual(fieldSuggestionSummary(artifact), {
    canAdopt: true,
    adopted: false,
    noteId: "pn_1",
    field: "thesis",
    fieldLabel: "一句话判断",
    value: "AI suggestions should stay draft until the user confirms them."
  });

  assert.equal(
    isAdoptableFieldSuggestionArtifact({
      ...artifact,
      userDecisions: [{ decision: "adopted_as_draft", noteId: "pn_1" }]
    }),
    false
  );

  const summaryArtifact = {
    ...artifact,
    payload: {
      targetField: "three_line_summary",
      fieldSuggestion: {
        target: { type: "permanent_note", id: "pn_1", field: "three_line_summary" },
        content: { threeLineSummary: ["Draft line one.", "Draft line two."] }
      }
    }
  };
  assert.equal(isAdoptableFieldSuggestionArtifact(summaryArtifact), false);
  assert.equal(
    isAdoptableFieldSuggestionArtifact({
      ...summaryArtifact,
      payload: {
        ...summaryArtifact.payload,
        fieldSuggestion: {
          ...summaryArtifact.payload.fieldSuggestion,
          content: { threeLineSummary: ["Draft line one.", "Draft line two.", "Draft line three."] }
        }
      }
    }),
    true
  );
});
