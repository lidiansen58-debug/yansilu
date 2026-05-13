import test from "node:test";
import assert from "node:assert/strict";

import {
  aiInboxCounts,
  aiInboxEvaluationMetrics,
  aiInboxSummary,
  aiInboxTypeLabel,
  aiInboxTypeOptions,
  isNoteToNoteLinkSuggestion,
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
  assert.equal(aiInboxTypeLabel("InsightCard"), "Insight cards");
  assert.equal(aiInboxTypeLabel("BridgeCard"), "Bridge cards");
  assert.equal(aiInboxTypeLabel("TensionCard"), "Tension cards");
  assert.equal(aiInboxTypeLabel("SourceGap"), "Source gaps");
  assert.equal(aiInboxTypeLabel("WritingMove"), "Writing moves");
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

test("AI inbox model derives evaluation metrics", () => {
  assert.deepEqual(
    aiInboxEvaluationMetrics({
      artifacts: { total: 4 },
      decisions: {
        total: 3,
        latest: {
          accepted: 1,
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
      ["accepted", 2],
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
