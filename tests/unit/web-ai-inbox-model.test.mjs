import test from "node:test";
import assert from "node:assert/strict";

import {
  aiInboxCounts,
  aiInboxEvaluationMetrics,
  aiInboxSummary,
  isNoteToNoteLinkSuggestion,
  latestFeedbackFlags,
  linkSuggestionSummary,
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
      }
    }).map((item) => [item.key, item.value]),
    [
      ["artifacts", 4],
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
